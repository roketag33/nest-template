// src/modules/file/services/upload-progress.service.ts
import { Injectable } from '@nestjs/common';
import { FileEventsService, FileEventType } from './file-events.service';

interface UploadProgress {
  uploadId: string;
  filename: string;
  totalChunks: number;
  uploadedChunks: Set<number>;
  startTime: Date;
  lastUpdateTime: Date;
}

@Injectable()
export class UploadProgressService {
  private uploads = new Map<string, UploadProgress>();

  constructor(private readonly fileEvents: FileEventsService) {}

  initializeUpload(uploadId: string, filename: string, totalChunks: number) {
    const progress: UploadProgress = {
      uploadId,
      filename,
      totalChunks,
      uploadedChunks: new Set(),
      startTime: new Date(),
      lastUpdateTime: new Date(),
    };

    this.uploads.set(uploadId, progress);

    this.fileEvents.emitEvent({
      type: FileEventType.UPLOAD_STARTED,
      uploadId,
      filename,
      totalChunks,
      progress: 0,
    });
  }

  updateProgress(uploadId: string, chunkNumber: number) {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    upload.uploadedChunks.add(chunkNumber);
    upload.lastUpdateTime = new Date();

    const progress = (upload.uploadedChunks.size / upload.totalChunks) * 100;

    this.fileEvents.emitEvent({
      type: FileEventType.UPLOAD_PROGRESS,
      uploadId,
      filename: upload.filename,
      currentChunk: chunkNumber,
      totalChunks: upload.totalChunks,
      progress,
    });

    if (upload.uploadedChunks.size === upload.totalChunks) {
      this.completeUpload(uploadId);
    }
  }

  private completeUpload(uploadId: string) {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    this.fileEvents.emitEvent({
      type: FileEventType.UPLOAD_COMPLETED,
      uploadId,
      filename: upload.filename,
      totalChunks: upload.totalChunks,
      progress: 100,
      metadata: {
        duration: Date.now() - upload.startTime.getTime(),
      },
    });

    this.uploads.delete(uploadId);
  }

  getProgress(uploadId: string): number {
    const upload = this.uploads.get(uploadId);
    if (!upload) return 0;

    return (upload.uploadedChunks.size / upload.totalChunks) * 100;
  }
}
