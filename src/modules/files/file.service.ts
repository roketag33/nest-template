import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FileStorageService,
  FileStorageOptions,
  UploadedFileInfo,
} from './interfaces/file-storage.interface';
import { StorageProvider } from './enums/storage-provider.enum';
import { LocalStorageService } from './providers/local-storage.service';
import { S3StorageService } from './providers/s3-storage.service';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly defaultProvider: StorageProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly localStorageService: LocalStorageService,
    private readonly s3StorageService: S3StorageService,
    private readonly prisma: PrismaService,
  ) {
    this.defaultProvider = this.configService.get<StorageProvider>(
      'file.defaultProvider',
      StorageProvider.LOCAL,
    );
  }

  private getStorageService(provider?: StorageProvider): FileStorageService {
    const selectedProvider = provider || this.defaultProvider;

    switch (selectedProvider) {
      case StorageProvider.LOCAL:
        return this.localStorageService;
      case StorageProvider.S3:
        return this.s3StorageService;
      default:
        throw new Error(`Unsupported storage provider: ${selectedProvider}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.file.count({
      where: { id },
    });
    return count > 0;
  }

  async upload(file: Express.Multer.File, options?: FileStorageOptions): Promise<UploadedFileInfo> {
    const storageService = this.getStorageService(options?.provider);

    try {
      const result = await storageService.upload(file, options);
      this.logger.log(`File uploaded successfully: ${result.filename}`);
      return result;
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`, error.stack);
      throw error;
    }
  }

  async download(fileId: string): Promise<Buffer> {
    // On récupère d'abord les métadonnées du fichier pour connaître le provider
    const file = await this.getFileInfo(fileId);
    const storageService = this.getStorageService(file.provider as StorageProvider);

    try {
      return await storageService.download(fileId);
    } catch (error) {
      this.logger.error(`Error downloading file: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(fileId: string): Promise<void> {
    const file = await this.getFileInfo(fileId);
    const storageService = this.getStorageService(file.provider as StorageProvider);

    try {
      await storageService.delete(fileId);
      this.logger.log(`File deleted successfully: ${fileId}`);
    } catch (error) {
      this.logger.error(`Error deleting file: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUrl(fileId: string): Promise<string> {
    const file = await this.getFileInfo(fileId);
    const storageService = this.getStorageService(file.provider as StorageProvider);

    try {
      return await storageService.getUrl(fileId);
    } catch (error) {
      this.logger.error(`Error getting file URL: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getFileInfo(fileId: string): Promise<UploadedFileInfo> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new Error('File not found');
    }

    return {
      id: file.id,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      url: file.url,
      metadata: file.metadata as Record<string, any>,
      provider: file.provider as StorageProvider,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }
}
