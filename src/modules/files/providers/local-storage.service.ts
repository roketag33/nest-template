// src/modules/file/providers/local-storage.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FileStorageService,
  FileStorageOptions,
  UploadedFileInfo,
} from '../interfaces/file-storage.interface';
import { StorageProvider } from '../enums/storage-provider.enum';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class LocalStorageService implements FileStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const uploadDir = this.configService.get<string>('file.local.uploadDir');
    const baseUrl = this.configService.get<string>('file.local.baseUrl');

    if (!uploadDir || !baseUrl) {
      throw new Error(
        'Local storage configuration is incomplete. Please check your environment variables.',
      );
    }

    this.uploadDir = uploadDir;
    this.baseUrl = baseUrl;
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  async upload(file: Express.Multer.File, options?: FileStorageOptions): Promise<UploadedFileInfo> {
    try {
      const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
      const relativePath = options?.basePath
        ? path.join(options.basePath, uniqueFilename)
        : uniqueFilename;
      const fullPath = path.join(this.uploadDir, relativePath);

      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      // Save file
      await fs.writeFile(fullPath, file.buffer);

      // Create database record
      const fileRecord = await this.prisma.file.create({
        data: {
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: relativePath,
          url: `${this.baseUrl}/${relativePath}`,
          provider: StorageProvider.LOCAL,
          metadata: {
            encoding: file.encoding,
            originalName: file.originalname,
          },
        },
      });

      return {
        id: fileRecord.id,
        filename: fileRecord.filename,
        mimetype: fileRecord.mimetype,
        size: fileRecord.size,
        path: fileRecord.path || '',
        url: fileRecord.url || '',
        metadata: fileRecord.metadata as Record<string, any>,
        provider: fileRecord.provider as StorageProvider,
        createdAt: fileRecord.createdAt,
        updatedAt: fileRecord.updatedAt,
      };
    } catch (error) {
      this.logger.error('Error uploading file:', error);
      throw new InternalServerErrorException('Failed to upload file');
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
      const fullPath = path.join(this.uploadDir, file.path);
      return await fs.readFile(fullPath);
    } catch (error) {
      this.logger.error('Error reading file:', error);
      throw new InternalServerErrorException('Failed to read file');
    }
  }

  async delete(fileId: string): Promise<void> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || !file.path) {
      return;
    }

    try {
      const fullPath = path.join(this.uploadDir, file.path);
      await fs.unlink(fullPath);
      await this.prisma.file.delete({
        where: { id: fileId },
      });
    } catch (error) {
      this.logger.error(`Error deleting file ${fileId}:`, error);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  async getUrl(fileId: string): Promise<string> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || !file.url) {
      throw new BadRequestException('File not found or URL not available');
    }

    return file.url;
  }
}
