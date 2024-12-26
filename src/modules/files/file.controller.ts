// src/modules/files/controllers/file.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  StreamableFile,
  Response,
  HttpStatus,
  UseFilters,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response as ExpressResponse } from 'express';
import { FileExceptionFilter } from './filters/file-exception.filter';
import { FileService } from './file.service';
import { FileValidatorService } from './services/file-validator.service';
import { ImageProcessorService } from './services/image-processor.service';
import { ChunkUploadService } from './services/chunk-upload.service';
import { FileVersionService } from './services/file-version.service';
import { UploadProgressService } from './services/upload-progress.service';
import { FileEventsService, FileEventType } from './services/file-events.service';

import { Public } from '@/common/decorators/public.decorator';
import {
  FileNotFoundException,
  FileUploadException,
  InvalidFileTypeException,
} from './exceptions/file.exceptions';
import { UploadFileDto } from '@/modules/files/dto/upload-file.dto';
import { ChunkUploadDto, InitChunkUploadDto } from '@/modules/files/dto/chunk-upload.dto';
import { WebhookRegistrationDto } from '@/modules/webhooks/dto/webhook.dto';
import { CreateVersionDto } from '@/modules/files/dto/version.dto';
import { StorageProvider } from '@/modules/files/enums/storage-provider.enum';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
@UseFilters(FileExceptionFilter)
export class FileController {
  constructor(
    private readonly fileService: FileService,
    private readonly fileValidator: FileValidatorService,
    private readonly imageProcessor: ImageProcessorService,
    private readonly chunkUpload: ChunkUploadService,
    private readonly fileVersion: FileVersionService,
    private readonly uploadProgress: UploadProgressService,
    private readonly fileEvents: FileEventsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Upload a file',
    description: 'Upload a single file with optional image processing',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileDto })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      properties: {
        id: { type: 'string' },
        filename: { type: 'string' },
        url: { type: 'string' },
        size: { type: 'number' },
        mimetype: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or parameters' })
  @ApiResponse({ status: 413, description: 'File too large' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
        errorHttpStatusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      }),
    )
    file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
  ) {
    try {
      await this.fileValidator.validateFile(file);

      if (uploadDto.processImage && file.mimetype.startsWith('image/')) {
        const { processed } = await this.imageProcessor.processImage(
          file.buffer,
          uploadDto.imageOptions,
        );
        file.buffer = processed;
      }

      const provider = uploadDto.provider || StorageProvider.LOCAL;

      const uploadedFile = await this.fileService.upload(file, {
        provider,
      });

      this.fileEvents.emitEvent({
        type: FileEventType.UPLOAD_COMPLETED,
        fileId: uploadedFile.id,
        filename: uploadedFile.filename,
      });

      return uploadedFile;
    } catch (error) {
      if (error instanceof InvalidFileTypeException) {
        throw error;
      }
      throw new FileUploadException('Failed to upload file', error.message);
    }
  }

  @Post('chunks/init')
  @ApiOperation({
    summary: 'Initialize chunked upload',
    description: 'Initialize a new chunked upload session',
  })
  @ApiResponse({
    status: 201,
    description: 'Upload initialized successfully',
    schema: {
      properties: { uploadId: { type: 'string' } },
    },
  })
  async initializeChunkedUpload(@Body() initData: InitChunkUploadDto) {
    try {
      const uploadId = await this.chunkUpload.initializeUpload(initData);
      this.uploadProgress.initializeUpload(uploadId, initData.filename, initData.totalChunks);
      return { uploadId };
    } catch (error) {
      throw new FileUploadException('Failed to initialize upload', error.message);
    }
  }

  @Post('chunks/:uploadId')
  @ApiOperation({
    summary: 'Upload a chunk',
    description: 'Upload a part of a file during chunked upload',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('chunk'))
  async uploadChunk(
    @Param('uploadId') uploadId: string,
    @UploadedFile() chunk: Express.Multer.File,
    @Body() chunkData: ChunkUploadDto,
  ) {
    try {
      const isComplete = await this.chunkUpload.handleChunk(chunk.buffer, {
        uploadId,
        ...chunkData,
      });

      this.uploadProgress.updateProgress(uploadId, chunkData.chunkNumber);

      if (isComplete) {
        const assembledFile = await this.chunkUpload.assembleFile(uploadId);
        const uploadedFile = await this.fileService.upload(assembledFile);

        this.fileEvents.emitEvent({
          type: FileEventType.UPLOAD_COMPLETED,
          fileId: uploadedFile.id,
          filename: uploadedFile.filename,
        });

        return { complete: true, file: uploadedFile };
      }

      return {
        complete: false,
        progress: this.uploadProgress.getProgress(uploadId),
      };
    } catch (error) {
      throw new FileUploadException('Chunk upload failed', error.message);
    }
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Download a file',
    description: 'Download a file by its ID',
  })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File stream' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(
    @Param('id') id: string,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    try {
      const fileInfo = await this.fileService.getFileInfo(id);
      const buffer = await this.fileService.download(id);

      res.set({
        'Content-Type': fileInfo.mimetype,
        'Content-Disposition': `attachment; filename="${fileInfo.filename}"`,
      });

      return new StreamableFile(buffer);
    } catch {
      throw new FileNotFoundException(id);
    }
  }

  @Get(':id/info')
  @ApiOperation({
    summary: 'Get file information',
    description: 'Get metadata about a file',
  })
  async getFileInfo(@Param('id') id: string) {
    const fileInfo = await this.fileService.getFileInfo(id);
    if (!fileInfo) {
      throw new FileNotFoundException(id);
    }
    return fileInfo;
  }

  @Get(':id/versions')
  @ApiOperation({
    summary: 'List file versions',
    description: 'Get all versions of a file',
  })
  async listVersions(@Param('id') id: string) {
    const fileExists = await this.fileService.exists(id);
    if (!fileExists) {
      throw new FileNotFoundException(id);
    }
    return this.fileVersion.listVersions(id);
  }

  @Post(':id/versions')
  @ApiOperation({
    summary: 'Create a new file version',
    description: 'Upload a new version of an existing file',
  })
  @UseInterceptors(FileInterceptor('file'))
  async createVersion(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() versionData: CreateVersionDto,
  ) {
    try {
      await this.fileValidator.validateFile(file);
      const version = await this.fileVersion.createVersion(id, file, versionData.comment);

      this.fileEvents.emitEvent({
        type: FileEventType.VERSION_CREATED,
        fileId: id,
        filename: file.originalname,
      });

      return version;
    } catch (error) {
      if (error instanceof FileNotFoundException) {
        throw error;
      }
      throw new FileUploadException('Failed to create version', error.message);
    }
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a file',
    description: 'Delete a file and all its versions',
  })
  async deleteFile(@Param('id') id: string) {
    try {
      await this.fileService.delete(id);

      this.fileEvents.emitEvent({
        type: FileEventType.FILE_DELETED,
        fileId: id,
      });

      return { message: 'File deleted successfully' };
    } catch {
      throw new FileNotFoundException(id);
    }
  }

  @Post('webhooks')
  @ApiOperation({
    summary: 'Register a webhook',
    description: 'Register a URL to receive file event notifications',
  })
  async registerWebhook(@Body() webhookData: WebhookRegistrationDto) {
    const webhookId = await this.fileEvents.registerWebhook({
      url: webhookData.url,
      events: webhookData.events,
    });
    return { webhookId };
  }

  @Delete('webhooks/:id')
  @ApiOperation({
    summary: 'Unregister a webhook',
    description: 'Remove a previously registered webhook',
  })
  async unregisterWebhook(@Param('id') id: string) {
    await this.fileEvents.unregisterWebhook(id);
    return { message: 'Webhook unregistered successfully' };
  }

  @Get('progress/:uploadId')
  @ApiOperation({
    summary: 'Get upload progress',
    description: 'Get the progress of a chunked upload',
  })
  async getUploadProgress(@Param('uploadId') uploadId: string) {
    return {
      progress: this.uploadProgress.getProgress(uploadId),
    };
  }
}
