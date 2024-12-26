import { FileEventType } from '../enums/file-event.enum';

export interface FileEvent {
  id?: string;
  type: FileEventType;
  fileId?: string;
  uploadId?: string;
  payload?: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}
