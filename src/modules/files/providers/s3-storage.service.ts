// src/modules/files/providers/s3-storage.service.ts
import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FileStorageService,
  FileStorageOptions,
  UploadedFileInfo,
} from '../interfaces/file-storage.interface';
import { StorageProvider } from '../enums/storage-provider.enum';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  GetObjectCommandInput,
  DeleteObjectCommandInput,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class S3StorageService implements FileStorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly bucket: string;
  private readonly baseUrl: string;
  private readonly s3Client: S3Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const bucket = this.configService.get<string>('file.s3.bucket');
    const region = this.configService.get<string>('file.s3.region');
    const accessKeyId = this.configService.get<string>('file.s3.accessKeyId');
    const secretAccessKey = this.configService.get<string>('file.s3.secretAccessKey');

    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      throw new Error('S3 configuration incomplete. Please check your environment variables.');
    }

    this.bucket = bucket;
    this.baseUrl =
      this.configService.get<string>('file.s3.baseUrl') ||
      `https://${bucket}.s3.${region}.amazonaws.com`;

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async upload(file: Express.Multer.File, options?: FileStorageOptions): Promise<UploadedFileInfo> {
    try {
      const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
      const key = options?.basePath ? `${options.basePath}/${uniqueFilename}` : uniqueFilename;

      const uploadParams: PutObjectCommandInput = {
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: options?.public ? 'public-read' : 'private',
      };

      await this.s3Client.send(new PutObjectCommand(uploadParams));

      const url = options?.public ? `${this.baseUrl}/${key}` : await this.getSignedUrl(key);

      const fileRecord = await this.prisma.file.create({
        data: {
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: key,
          url,
          provider: StorageProvider.S3,
          metadata: {
            encoding: file.encoding,
            originalName: file.originalname,
            bucket: this.bucket,
            isPublic: options?.public || false,
          },
        },
      });

      return {
        id: fileRecord.id,
        filename: fileRecord.filename,
        mimetype: fileRecord.mimetype,
        size: fileRecord.size,
        path: fileRecord.path,
        url: fileRecord.url,
        metadata: fileRecord.metadata as Record<string, any>,
        provider: fileRecord.provider as StorageProvider,
        createdAt: fileRecord.createdAt,
        updatedAt: fileRecord.updatedAt,
      };
    } catch (error) {
      this.logger.error('Error uploading file to S3:', error);
      throw new InternalServerErrorException('Failed to upload file to S3');
    }
  }

  async download(fileId: string): Promise<Buffer> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || !file.path) {
      throw new BadRequestException('File not found or invalid path');
    }

    try {
      const params: GetObjectCommandInput = {
        Bucket: this.bucket,
        Key: file.path,
      };

      const response = await this.s3Client.send(new GetObjectCommand(params));

      if (!response.Body) {
        throw new InternalServerErrorException('Failed to retrieve file content');
      }

      const byteArray = await response.Body.transformToByteArray();
      return Buffer.from(byteArray);
    } catch (error) {
      this.logger.error('Error downloading file from S3:', error);
      throw new InternalServerErrorException('Failed to download file from S3');
    }
  }

  async delete(fileId: string): Promise<void> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || !file.path) {
      return; // Si le fichier n'existe pas, on considère la suppression comme réussie
    }

    try {
      const params: DeleteObjectCommandInput = {
        Bucket: this.bucket,
        Key: file.path,
      };

      await this.s3Client.send(new DeleteObjectCommand(params));
      await this.prisma.file.delete({
        where: { id: fileId },
      });
    } catch (error) {
      this.logger.error('Error deleting file from S3:', error);
      throw new InternalServerErrorException('Failed to delete file from S3');
    }
  }

  async getUrl(fileId: string): Promise<string> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || !file.path) {
      throw new BadRequestException('File not found or invalid path');
    }

    const metadata = file.metadata as Record<string, any>;

    if (metadata?.isPublic && file.url) {
      return file.url;
    }

    try {
      return await this.getSignedUrl(file.path);
    } catch (error) {
      this.logger.error('Error generating file URL:', error);
      throw new InternalServerErrorException('Failed to generate file URL');
    }
  }

  private async getSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    } catch (error) {
      this.logger.error('Error generating signed URL:', error);
      throw new InternalServerErrorException('Failed to generate signed URL');
    }
  }
}
