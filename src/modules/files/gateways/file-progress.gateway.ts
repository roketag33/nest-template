import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WebhookService } from '@/modules/webhooks/webhook.service';
import { FileEventsService } from '../services/file-events.service';
import { FileEventType } from "@/modules/files/enums/file-event.enum";

// Interfaces
interface ProgressData {
  uploadId: string;
  progress: number;
  status: string;
  filename?: string;
  speed?: number;
  remainingTime?: number;
}

interface UploadStats {
  startTime: number;
  lastUpdate: number;
  bytesUploaded: number;
  totalSize: number;
}

interface SubscribeData {
  uploadId: string;
  totalSize: number;
}

interface ConfigData {
  maxFileSize: number;
  allowedTypes: string[];
  chunkSize: number;
}

@WebSocketGateway({
  namespace: 'files',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class FileProgressGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FileProgressGateway.name);
  private readonly connections = new Map<string, Set<string>>();
  private readonly uploadStats = new Map<string, UploadStats>();

  constructor(
    private readonly fileEvents: FileEventsService,
    private readonly webhookService: WebhookService,
  ) {}

  afterInit(server: Server): void {
    this.logger.log('WebSocket Gateway initialized');

    // Configuration globale du serveur
    server.use((socket, next) => {
      try {
        // Vous pouvez ajouter ici une logique de validation/authentification
        const token = socket.handshake.auth.token;
        if (token) {
          // Validation du token si nécessaire
          // this.validateToken(token)
        }
        next();
      } catch {
        next(new Error('Authentication failed'));
      }
    });
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);

    const config: ConfigData = {
      maxFileSize: Number(process.env.MAX_FILE_SIZE) || 5_242_880, // 5MB
      allowedTypes: process.env.ALLOWED_MIME_TYPES?.split(',') || [],
      chunkSize: Number(process.env.UPLOAD_CHUNK_SIZE) || 1_048_576, // 1MB
    };

    client.emit('config', config);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.cleanupClientConnections(client.id);
  }

  private cleanupClientConnections(clientId: string): void {
    this.connections.forEach((clients, uploadId) => {
      if (clients.has(clientId)) {
        clients.delete(clientId);
        if (clients.size === 0) {
          this.connections.delete(uploadId);
          this.uploadStats.delete(uploadId);
          this.logger.debug(`Cleaned up resources for upload ${uploadId}`);
        }
      }
    });
  }

  @SubscribeMessage('subscribeToUpload')
  handleSubscribeToUpload(
    client: Socket,
    data: SubscribeData,
  ): { status: string; uploadId: string } {
    this.logger.log(`Client ${client.id} subscribing to upload ${data.uploadId}`);

    if (!this.connections.has(data.uploadId)) {
      this.connections.set(data.uploadId, new Set<string>());
      this.uploadStats.set(data.uploadId, {
        startTime: Date.now(),
        lastUpdate: Date.now(),
        bytesUploaded: 0,
        totalSize: data.totalSize,
      });
    }

    const connections = this.connections.get(data.uploadId);
    if (connections) {
      connections.add(client.id);
      client.join(data.uploadId);
    }

    return { status: 'subscribed', uploadId: data.uploadId };
  }

  @SubscribeMessage('unsubscribeFromUpload')
  handleUnsubscribeFromUpload(
    client: Socket,
    uploadId: string,
  ): { status: string; uploadId: string } {
    this.logger.log(`Client ${client.id} unsubscribing from upload ${uploadId}`);

    const clients = this.connections.get(uploadId);
    if (clients) {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.connections.delete(uploadId);
        this.uploadStats.delete(uploadId);
        this.logger.debug(`Cleaned up resources for upload ${uploadId}`);
      }
    }

    client.leave(uploadId);
    return { status: 'unsubscribed', uploadId };
  }

  async updateProgress(data: ProgressData): Promise<void> {
    const stats = this.uploadStats.get(data.uploadId);
    if (!stats) {
      this.logger.warn(`No stats found for upload ${data.uploadId}`);
      return;
    }

    const now = Date.now();
    const timeDiff = now - stats.lastUpdate;
    const bytesUploaded = (data.progress / 100) * stats.totalSize;
    const bytesDiff = bytesUploaded - stats.bytesUploaded;

    const speed = bytesDiff / (timeDiff / 1000); // bytes per second
    const remainingBytes = stats.totalSize - bytesUploaded;
    const remainingTime = speed > 0 ? remainingBytes / speed : 0;

    const progressData: ProgressData = {
      ...data,
      speed,
      remainingTime,
    };

    // Mise à jour des statistiques
    stats.lastUpdate = now;
    stats.bytesUploaded = bytesUploaded;

    // Notification des clients WebSocket
    const clients = this.connections.get(data.uploadId);
    if (clients?.size) {
      this.server.to(Array.from(clients)).emit('uploadProgress', progressData);
    }

    // Notification webhook
    await this.webhookService.notify({
      id: crypto.randomUUID(),
      type: FileEventType.UPLOAD_PROGRESS,
      payload: progressData,
      timestamp: new Date(),
      source: 'file-upload',
    });

    // Nettoyage si l'upload est terminé
    if (data.progress === 100) {
      this.logger.log(`Upload ${data.uploadId} completed`);
      this.uploadStats.delete(data.uploadId);
    }
  }

  async notifyError(uploadId: string, error: Error | unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    const clients = this.connections.get(uploadId);
    if (clients?.size) {
      this.server.to(Array.from(clients)).emit('uploadError', {
        uploadId,
        error: errorMessage,
      });
    }

    await this.webhookService.notify({
      id: crypto.randomUUID(),
      type: FileEventType.UPLOAD_FAILED,
      payload: {
        uploadId,
        error: errorMessage,
      },
      timestamp: new Date(),
      source: 'file-upload',
    });

    // Nettoyage des ressources en cas d'erreur
    this.connections.delete(uploadId);
    this.uploadStats.delete(uploadId);
    this.logger.error(`Upload ${uploadId} failed: ${errorMessage}`);
  }
}
