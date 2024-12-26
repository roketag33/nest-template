// src/modules/files/services/chunk-upload.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime-types';
import { Readable } from 'stream';
import { InitChunkUploadDto, ChunkUploadDto } from '../dto/chunk-upload.dto';

@Injectable()
export class ChunkUploadService {
  private readonly logger = new Logger(ChunkUploadService.name);
  private readonly tempDir: string;

  constructor(private readonly configService: ConfigService) {
    this.tempDir = this.configService.get('file.tempDir', 'temp/chunks');
    this.ensureTempDir();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  async initializeUpload(data: InitChunkUploadDto): Promise<string> {
    const uploadId = uuidv4();
    const uploadDir = path.join(this.tempDir, uploadId);
    await fs.mkdir(uploadDir);

    await fs.writeFile(
      path.join(uploadDir, 'metadata.json'),
      JSON.stringify({
        filename: data.filename,
        totalChunks: data.totalChunks,
        totalSize: data.totalSize,
        receivedChunks: [],
      }),
    );

    return uploadId;
  }

  async handleChunk(buffer: Buffer, data: ChunkUploadDto & { uploadId: string }): Promise<boolean> {
    const uploadDir = path.join(this.tempDir, data.uploadId);
    const chunkPath = path.join(uploadDir, `chunk.${data.chunkNumber}`);

    await fs.writeFile(chunkPath, buffer);

    const metadataPath = path.join(uploadDir, 'metadata.json');
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

    metadata.receivedChunks.push(data.chunkNumber);
    await fs.writeFile(metadataPath, JSON.stringify(metadata));

    return metadata.receivedChunks.length === metadata.totalChunks;
  }

  async assembleFile(uploadId: string): Promise<Express.Multer.File> {
    const uploadDir = path.join(this.tempDir, uploadId);
    const metadata = JSON.parse(await fs.readFile(path.join(uploadDir, 'metadata.json'), 'utf-8'));

    const chunks: Buffer[] = [];
    for (let i = 0; i < metadata.totalChunks; i++) {
      const chunkPath = path.join(uploadDir, `chunk.${i}`);
      chunks.push(await fs.readFile(chunkPath));
    }

    const buffer = Buffer.concat(chunks);

    try {
      await fs.rm(uploadDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Error cleaning up upload directory: ${error.message}`);
    }

    // Créer un objet qui correspond exactement au type Express.Multer.File
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: metadata.filename,
      encoding: '7bit',
      mimetype: mime.lookup(metadata.filename) || 'application/octet-stream',
      size: buffer.length,
      buffer,
      stream: Readable.from(buffer), // Création d'un Readable à partir du buffer
      destination: null as any, // ou une chaîne vide si préféré
      filename: null as any, // ou une chaîne vide si préféré
      path: null as any, // ou une chaîne vide si préféré
    };

    return file;
  }
}
