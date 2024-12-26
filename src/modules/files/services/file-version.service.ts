// src/modules/file/services/file-version.service.ts
import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from '@/prisma/prisma.service';
import { FileStorageService } from '../interfaces/file-storage.interface';
import { StorageProvider } from '../enums/storage-provider.enum';
import { Prisma } from '@prisma/client';
import { FILE_STORAGE_SERVICE } from '../constants/injection-tokens';

@Injectable()
export class FileVersionService {
  private readonly logger = new Logger(FileVersionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE_SERVICE)
    private readonly storageService: FileStorageService,
  ) {}

  async createVersion(
    fileId: string,
    newFile: Express.Multer.File,
    comment?: string,
  ): Promise<void> {
    const currentFile = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!currentFile) {
      throw new NotFoundException('Original file not found');
    }

    const uploadedFile = await this.storageService.upload(newFile, {
      basePath: `versions/${fileId}`,
      provider: currentFile.provider as StorageProvider,
    });

    if (!uploadedFile.path) {
      throw new Error('Failed to get path from uploaded file');
    }

    await this.prisma.fileVersion.create({
      data: {
        fileId,
        versionNumber: await this.getNextVersionNumber(fileId),
        path: uploadedFile.path,
        size: uploadedFile.size,
        comment,
        metadata: (uploadedFile.metadata as Prisma.JsonValue) || {},
      },
    });
  }

  private async getNextVersionNumber(fileId: string): Promise<number> {
    const latestVersion = await this.prisma.fileVersion.findFirst({
      where: { fileId },
      orderBy: { versionNumber: 'desc' },
    });

    return (latestVersion?.versionNumber || 0) + 1;
  }

  async listVersions(fileId: string) {
    return this.prisma.fileVersion.findMany({
      where: { fileId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async revertToVersion(fileId: string, versionNumber: number): Promise<void> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (!file.path) {
      throw new Error('Invalid file path');
    }

    const version = await this.prisma.fileVersion.findFirst({
      where: {
        fileId,
        versionNumber,
      },
    });

    if (!version) {
      throw new NotFoundException(`Version ${versionNumber} not found`);
    }

    // Créer une nouvelle version pour sauvegarder l'état actuel
    const currentVersionNumber = await this.getNextVersionNumber(fileId);
    await this.prisma.fileVersion.create({
      data: {
        fileId,
        versionNumber: currentVersionNumber,
        path: file.path,
        size: file.size,
        metadata: (file.metadata as Prisma.InputJsonValue) ?? {},
        comment: `Automatic backup before reverting to version ${versionNumber}`,
      },
    });

    // Mettre à jour le fichier principal
    await this.prisma.file.update({
      where: { id: fileId },
      data: {
        path: version.path || '',
        size: version.size,
        metadata: (version.metadata as Prisma.InputJsonValue) ?? {},
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `File ${fileId} reverted to version ${versionNumber}. Current state saved as version ${currentVersionNumber}`,
    );
  }

  async doesVersionExist(fileId: string, versionNumber: number): Promise<boolean> {
    const count = await this.prisma.fileVersion.count({
      where: {
        fileId,
        versionNumber,
      },
    });
    return count > 0;
  }

  async getVersion(fileId: string, versionNumber: number) {
    const version = await this.prisma.fileVersion.findFirst({
      where: {
        fileId,
        versionNumber,
      },
    });

    if (!version) {
      throw new NotFoundException(`Version ${versionNumber} not found for file ${fileId}`);
    }

    return version;
  }
}
