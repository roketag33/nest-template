import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MulterModule } from '@nestjs/platform-express';
import { Redis } from 'ioredis';

// Controllers
import { FileController } from './file.controller';

// Services
import { FileService } from './file.service';
import { FileValidatorService } from './services/file-validator.service';
import { ImageProcessorService } from './services/image-processor.service';
import { ChunkUploadService } from './services/chunk-upload.service';
import { FileVersionService } from './services/file-version.service';
import { UploadProgressService } from './services/upload-progress.service';
import { FileEventsService } from './services/file-events.service';

// Guards & Interceptors
import { UploadRateLimitGuard } from './guards/upload-rate-limit.guard';
import { FileLoggerInterceptor } from './interceptors/file-logger.interceptor';

// Gateways
import { FileProgressGateway } from './gateways/file-progress.gateway';

// Configuration
import fileConfig from './config/file.config';
import * as fs from 'node:fs';
import { LocalStorageService } from '@/modules/files/providers/local-storage.service';
import { S3StorageService } from '@/modules/files/providers/s3-storage.service';
import { FILE_STORAGE_SERVICE, REDIS_CLIENT } from '@/modules/files/constants/injection-tokens';

@Module({
  imports: [
    // Configuration du module
    ConfigModule.forFeature(fileConfig),

    // Configuration de Redis pour le rate limiting et le cache
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        config: {
          url: configService.get('REDIS_URL'),
        },
      }),
    }),

    // Configuration de Multer pour l'upload des fichiers
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        limits: {
          fileSize: configService.get('file.maxFileSize', 5 * 1024 * 1024), // 5MB par défaut
        },
      }),
    }),
  ],
  controllers: [FileController],
  providers: [
    // Services principaux
    FileService,
    FileValidatorService,
    ImageProcessorService,
    ChunkUploadService,
    FileVersionService,
    UploadProgressService,
    FileEventsService,
    FileProgressGateway,
    LocalStorageService,

    // S3 Service conditionnel
    {
      provide: S3StorageService,
      useFactory: (configService: ConfigService, fileConfig: any) => {
        const useS3 = configService.get('STORAGE_PROVIDER') === 's3';
        if (!useS3) {
          return null;
        }
        return new S3StorageService(configService, fileConfig);
      },
      inject: [ConfigService, 'FILE_CONFIG'],
    },

    // Provider pour le service de stockage
    {
      provide: FILE_STORAGE_SERVICE,
      useFactory: (
        configService: ConfigService,
        localService: LocalStorageService,
        s3Service: S3StorageService,
      ) => {
        const storageProvider = configService.get('STORAGE_PROVIDER', 'local');
        return storageProvider === 's3' ? s3Service : localService;
      },
      inject: [ConfigService, LocalStorageService, S3StorageService],
    },

    // Provider pour Redis
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL', 'redis://redis:6379');
        return new Redis(redisUrl);
      },
      inject: [ConfigService],
    },

    // Guard global pour le rate limiting
    {
      provide: APP_GUARD,
      useClass: UploadRateLimitGuard,
    },

    // Intercepteur global pour la journalisation
    {
      provide: APP_INTERCEPTOR,
      useClass: FileLoggerInterceptor,
    },

    // Configuration factory
    {
      provide: 'FILE_CONFIG',
      useFactory: (configService: ConfigService) => ({
        uploadDir: configService.get('file.local.uploadDir', 'uploads'),
        maxFileSize: configService.get('file.maxFileSize', 5 * 1024 * 1024),
        allowedMimeTypes: configService.get('file.allowedMimeTypes', [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
        ]),
        chunkSize: configService.get('file.chunkSize', 1 * 1024 * 1024), // 1MB
      }),
      inject: [ConfigService],
    },
  ],
  exports: [FileService, FileValidatorService, FileEventsService],
})
export class FileModule {
  constructor(private readonly configService: ConfigService) {}

  // Configuration optionnelle au démarrage du module
  async onModuleInit() {
    // Créer le dossier d'upload s'il n'existe pas
    const uploadDir = this.configService.get('file.local.uploadDir', 'uploads');
    try {
      await fs.promises.access(uploadDir);
    } catch {
      await fs.promises.mkdir(uploadDir, { recursive: true });
    }
  }
}
