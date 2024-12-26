export interface ChunkInfo {
  uploadId: string;
  chunkNumber: number;
  totalChunks: number;
  originalFileName: string;
  size: number;
}

export interface UploadProgress {
  uploadId: string;
  progress: number;
  chunksReceived: number;
  totalChunks: number;
  speed?: number;
  estimatedTimeRemaining?: number;
}
