// src/modules/file/services/file-events.service.ts
import { Injectable, Post } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebhookRegistrationDto, WebhookResponseDto } from '@/modules/webhooks/dto/webhook.dto';
import { WebhookService } from '@/modules/webhooks/webhook.service';
import { response } from 'express';
import { WebhookEvent } from '@/modules/webhooks/interfaces/webhook.interface';

export enum FileEventType {
  UPLOAD_STARTED = 'file.upload.started',
  UPLOAD_PROGRESS = 'file.upload.progress',
  UPLOAD_COMPLETED = 'file.upload.completed',
  UPLOAD_FAILED = 'file.upload.failed',
  DOWNLOAD_STARTED = 'file.download.started',
  DOWNLOAD_COMPLETED = 'file.download.completed',
  FILE_DELETED = 'file.deleted',
  VERSION_CREATED = 'file.version.created',
}

export interface FileEvent {
  type: FileEventType;
  fileId?: string;
  filename?: string;
  uploadId?: string;
  progress?: number;
  totalChunks?: number;
  currentChunk?: number;
  error?: any;
  metadata?: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class FileEventsService {
  private webhooks: Map<string, string> = new Map();
  private readonly webhookService: WebhookService;

  constructor(private eventEmitter: EventEmitter2) {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    Object.values(FileEventType).forEach(eventType => {
      this.eventEmitter.on(eventType, (event: FileEvent) => {
        this.notifyWebhooks(event);
      });
    });
  }

  private async notifyWebhooks(event: FileEvent) {
    this.webhooks.forEach(async (url, id) => {
      try {
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-ID': id,
          },
          body: JSON.stringify(event),
        });
      } catch (error) {
        console.error(`Failed to notify webhook ${id}:`, error);
      }
    });
  }

  @Post('webhooks')
  async registerWebhook(webhookData: WebhookRegistrationDto): Promise<WebhookResponseDto> {
    try {
      const response = await this.webhookService.registerWebhook(webhookData);

      // Assurons-nous que response a les propriétés attendues
      if (response && typeof response === 'object' && 'id' in response && 'url' in response) {
        this.webhooks.set(response.id as string, response.url as string);
        return response as WebhookResponseDto;
      }

      // Si la réponse n'a pas la forme attendue, lancez une erreur
      throw new Error('Invalid webhook response format');
    } catch (error) {
      console.error('Error registering webhook:', error);
      throw error;
    }
  }

  unregisterWebhook(id: string) {
    this.webhooks.delete(id);
  }

  emitEvent(event: Omit<FileEvent, 'timestamp'>) {
    const fullEvent: FileEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.eventEmitter.emit(event.type, fullEvent);

    const webhookEvent: WebhookEvent = {
      id: crypto.randomUUID(),
      type: event.type,
      payload: fullEvent,
      timestamp: new Date(),
      source: 'files',
    };

    this.webhookService.notify(webhookEvent);
  }
}
