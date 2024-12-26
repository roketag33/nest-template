import { StorageProvider } from '../enums/storage-provider.enum';

export interface StorageConfig {
  provider: StorageProvider;
  basePath?: string;
  public?: boolean;
  metadata?: Record<string, any>;
}

export interface StorageResult {
  id: string;
  url: string;
  path: string;
  size: number;
  metadata?: Record<string, any>;
}
