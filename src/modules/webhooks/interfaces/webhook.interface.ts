import { FileEventType } from '@/modules/files/enums/file-event.enum';

export interface WebhookEvent {
  id: string;
  type: FileEventType;
  payload: any;
  timestamp: Date;
  source: string;
}

export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  maxRetries: number;
  retryDelay: number;
}
