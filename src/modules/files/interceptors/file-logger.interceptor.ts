// src/modules/files/interceptors/file-logger.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FileEventsService, FileEventType } from '../services/file-events.service';

interface LogMetadata {
  operation: string;
  duration: number;
  status: 'success' | 'error';
  fileId?: string;
  error?: string;
  url?: string;
  method?: string;
}

type OperationType = 'upload' | 'chunk-upload' | 'download' | 'delete' | 'version' | 'unknown';

@Injectable()
export class FileLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('FileOperations');

  constructor(private readonly fileEvents: FileEventsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request; // Retrait de 'body' non utilisé
    const startTime = Date.now();
    const operation = this.getOperationType(method, url);

    return next.handle().pipe(
      tap({
        next: data => {
          const duration = Date.now() - startTime;

          const logData: LogMetadata = {
            operation,
            duration,
            status: 'success',
            url,
            method,
            ...(data?.id && { fileId: data.id }),
          };

          this.logger.log(logData);

          if (data?.id) {
            // N'inclure que les propriétés définies dans FileEvent
            this.fileEvents.emitEvent({
              type: this.mapOperationToEventType(operation, true),
              fileId: data.id,
              metadata: {
                url,
                method,
                operation,
                duration, // Déplacer duration dans metadata
              },
            });
          }
        },
        error: error => {
          const duration = Date.now() - startTime;

          const logData: LogMetadata = {
            operation,
            duration,
            status: 'error',
            error: error.message,
            url,
            method,
          };

          this.logger.error(logData);

          // N'inclure que les propriétés définies dans FileEvent
          this.fileEvents.emitEvent({
            type: this.mapOperationToEventType(operation, false),
            error: error.message,
            metadata: {
              url,
              method,
              operation,
              errorCode: error.status || 500,
              duration, // Déplacer duration dans metadata
            },
          });
        },
      }),
    );
  }

  private getOperationType(method: string, url: string): OperationType {
    if (url.includes('chunks')) return 'chunk-upload';
    if (url.includes('versions')) return 'version';

    switch (method.toUpperCase()) {
      case 'POST':
        return 'upload';
      case 'GET':
        return 'download';
      case 'DELETE':
        return 'delete';
      default:
        return 'unknown';
    }
  }

  private mapOperationToEventType(operation: OperationType, isSuccess: boolean): FileEventType {
    if (!isSuccess) {
      return FileEventType.UPLOAD_FAILED;
    }

    switch (operation) {
      case 'upload':
        return FileEventType.UPLOAD_COMPLETED;
      case 'chunk-upload':
        return FileEventType.UPLOAD_PROGRESS;
      case 'download':
        return FileEventType.DOWNLOAD_COMPLETED;
      case 'delete':
        return FileEventType.FILE_DELETED;
      case 'version':
        return FileEventType.VERSION_CREATED;
      case 'unknown':
      default:
        return FileEventType.UPLOAD_COMPLETED;
    }
  }

  private formatLogMessage(metadata: LogMetadata): string {
    const parts = [
      `Operation: ${metadata.operation}`,
      `Duration: ${metadata.duration}ms`,
      `Status: ${metadata.status}`,
    ];

    if (metadata.fileId) {
      parts.push(`FileID: ${metadata.fileId}`);
    }

    if (metadata.error) {
      parts.push(`Error: ${metadata.error}`);
    }

    return parts.join(' | ');
  }
}
