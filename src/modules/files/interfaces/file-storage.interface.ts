import { StorageProvider } from '@/modules/files/enums/storage-provider.enum';

export interface FileInfo {
  filename: string;
  mimetype: string;
  size: number;
  path?: string | null;
  url?: string | null;
  metadata?: Record<string, any>;
}

export interface UploadedFileInfo extends FileInfo {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  provider: StorageProvider;
}

export interface FileStorageOptions {
  provider: StorageProvider;
  basePath?: string;
  public?: boolean;
}

export interface FileStorageService {
  upload(file: Express.Multer.File, options?: FileStorageOptions): Promise<UploadedFileInfo>;
  download(fileId: string): Promise<Buffer>;
  delete(fileId: string): Promise<void>;
  getUrl(fileId: string): Promise<string>;
}
