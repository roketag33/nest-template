import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import * as retry from 'retry';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { PrismaService } from '@/prisma/prisma.service';
import {
  UpdateWebhookDto,
  WebhookDeliveryResponseDto,
  WebhookResponseDto,
} from '@/modules/webhooks/dto/webhook.dto';
import { FileEventType } from '@/modules/files/enums/file-event.enum';
import { Prisma, Webhook } from '@prisma/client';
import { WebhookEvent } from '@/modules/webhooks/interfaces/webhook.interface';
import { CacheService } from '@/modules/cache/cache.service';
import { Redis } from 'ioredis';

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  response?: any;
  error?: string;
  duration: number;
  attempt: number;
}

interface WebhookCache {
  url: string;
  secret: string;
  events: string; // Garde le type string car c'est une chaîne JSON
  maxRetries: number;
  retryDelay: number;
}

interface WebhookStats {
  total_calls: number;
  successes: number;
  failures: number;
  last_duration: number;
  last_call: number;
}

interface CachedWebhook {
  id: string;
  url: string;
  secret: string;
  events: string[]; // Version parsée du JSON
  maxRetries: number;
  retryDelay: number;
}

@Injectable()
export class WebhookService implements OnModuleInit {
  private readonly logger = new Logger(WebhookService.name);
  private readonly defaultMaxRetries: number;
  private readonly defaultRetryDelay: number;
  private rateLimiter: RateLimiterRedis;
  private rateLimiterClient: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.defaultMaxRetries = this.configService.get('webhook.maxRetries', 3);
    this.defaultRetryDelay = this.configService.get('webhook.retryDelay', 1000);
  }

  async onModuleInit() {
    const redisUrl = this.configService.get('REDIS_URL') || 'redis://redis:6379';
    this.rateLimiterClient = new Redis(redisUrl);

    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.rateLimiterClient,
      keyPrefix: 'webhook_limit',
      points: 60,
      duration: 60,
    });
    await this.loadWebhooksToCache();
  }

  async getWebhooks(active?: boolean): Promise<WebhookResponseDto[]> {
    const webhooks = await this.prisma.webhook.findMany({
      where: active !== undefined ? { enabled: active } : {},
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      webhooks.map(async webhook => {
        const stats = await this.getWebhookStats(webhook.id);
        return this.formatWebhookResponse(webhook, stats);
      }),
    );
  }

  async getWebhook(id: string): Promise<WebhookResponseDto> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    const stats = await this.getWebhookStats(id);
    return this.formatWebhookResponse(webhook, stats);
  }

  async updateWebhook(id: string, updateData: UpdateWebhookDto): Promise<WebhookResponseDto> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    const updatedWebhook = await this.prisma.webhook.update({
      where: { id },
      data: updateData,
    });

    if (updatedWebhook.enabled) {
      await this.cacheService.set(`webhook:${id}`, {
        url: updatedWebhook.url,
        secret: updatedWebhook.secret || '',
        events: JSON.stringify(updatedWebhook.events),
        maxRetries: updatedWebhook.maxRetries,
        retryDelay: updatedWebhook.retryDelay,
      } as WebhookCache);
    } else {
      await this.cacheService.del(`webhook:${id}`);
    }

    const stats = await this.getWebhookStats(id);
    return this.formatWebhookResponse(updatedWebhook, stats);
  }

  async getDeliveryHistory(
    id: string,
    limit: number,
    offset: number,
  ): Promise<WebhookDeliveryResponseDto[]> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    const deliveries = await this.prisma.webhookDelivery.findMany({
      where: { webhookId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return deliveries.map(delivery => ({
      id: delivery.id,
      webhookId: delivery.webhookId,
      eventId: delivery.eventId,
      success: delivery.success,
      statusCode: delivery.statusCode || undefined,
      response: delivery.response,
      error: delivery.error || undefined,
      duration: delivery.duration,
      createdAt: delivery.createdAt,
      attempts: delivery.attempt,
    }));
  }

  async registerWebhook(data: {
    url: string;
    secret?: string;
    events?: FileEventType[];
    description?: string;
  }): Promise<WebhookResponseDto> {
    const webhook = await this.prisma.webhook.create({
      data: {
        ...data,
        events: (data.events || ['*']) as Prisma.JsonArray,
        maxRetries: this.defaultMaxRetries,
        retryDelay: this.defaultRetryDelay,
        enabled: true,
      },
    });

    await this.cacheService.set(`webhook:${webhook.id}`, {
      url: webhook.url,
      secret: webhook.secret || '',
      events: JSON.stringify(webhook.events),
      maxRetries: webhook.maxRetries,
      retryDelay: webhook.retryDelay,
    } as WebhookCache);

    const [deliveriesCount, successCount] = await Promise.all([
      this.prisma.webhookDelivery.count({
        where: { webhookId: webhook.id },
      }),
      this.prisma.webhookDelivery.count({
        where: {
          webhookId: webhook.id,
          success: true,
        },
      }),
    ]);

    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events as FileEventType[],
      description: webhook.description || '',
      enabled: webhook.enabled,
      createdAt: webhook.createdAt,
      lastCalledAt: webhook.lastCalledAt || undefined,
      totalDeliveries: deliveriesCount,
      successfulDeliveries: successCount,
    };
  }

  async deleteWebhook(id: string): Promise<void> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    await this.prisma.webhook.delete({ where: { id } });
    await Promise.all([
      this.cacheService.del(`webhook:${id}`),
      this.cacheService.del(`webhook_stats:${id}`),
    ]);
  }

  async notify(event: WebhookEvent): Promise<void> {
    const webhooks = await Promise.all(
      (await this.prisma.webhook.findMany({ where: { enabled: true } })).map(async webhook => {
        const cached = await this.cacheService.get<WebhookCache>(`webhook:${webhook.id}`);
        return {
          id: webhook.id,
          ...cached,
          events: cached ? JSON.parse(cached.events) : [],
        } as CachedWebhook;
      }),
    );

    const relevantWebhooks = webhooks.filter(
      webhook => webhook.events.includes('*') || webhook.events.includes(event.type),
    );

    await Promise.all(relevantWebhooks.map(webhook => this.notifyWebhook(webhook.id, event)));
  }

  async pingWebhook(id: string): Promise<void> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    const pingEvent: WebhookEvent = {
      id: crypto.randomUUID(),
      type: FileEventType.WEBHOOK_PING,
      payload: {
        message: 'ping',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date(),
      source: 'system',
    };

    await this.notifyWebhook(id, pingEvent);
  }

  async retryDelivery(webhookId: string, deliveryId: string): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findFirst({
      where: {
        id: deliveryId,
        webhookId,
      },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.success) {
      throw new BadRequestException('Cannot retry successful delivery');
    }

    const event: WebhookEvent = {
      id: delivery.eventId,
      type: FileEventType.WEBHOOK_RETRY,
      payload: (delivery.response as Record<string, any>) || {},
      timestamp: new Date(),
      source: 'system',
    };

    await this.notifyWebhook(webhookId, event);
  }

  private async loadWebhooksToCache(): Promise<void> {
    const webhooks = await this.prisma.webhook.findMany({
      where: { enabled: true },
    });

    await Promise.all(
      webhooks.map(webhook =>
        this.cacheService.set(`webhook:${webhook.id}`, {
          url: webhook.url,
          secret: webhook.secret || '',
          events: JSON.stringify(webhook.events),
          maxRetries: webhook.maxRetries,
          retryDelay: webhook.retryDelay,
        } as WebhookCache),
      ),
    );
  }

  private async notifyWebhook(webhookId: string, event: WebhookEvent): Promise<void> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || !webhook.enabled) {
      return;
    }

    try {
      await this.rateLimiter.consume(webhookId);
    } catch {
      this.logger.warn(`Rate limit exceeded for webhook ${webhookId}`);
      return;
    }

    const operation = retry.operation({
      retries: webhook.maxRetries,
      factor: 2,
      minTimeout: webhook.retryDelay,
      maxTimeout: webhook.retryDelay * 10,
      randomize: true,
    });

    return new Promise<void>((resolve, reject) => {
      operation.attempt(async currentAttempt => {
        const startTime = Date.now();

        try {
          const signature = this.generateSignature(event, webhook.secret || undefined);
          const deliveryId = crypto.randomUUID();

          const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signature,
              'X-Webhook-ID': webhookId,
              'X-Delivery-ID': deliveryId,
              'X-Event-Type': event.type,
              'X-Attempt': currentAttempt.toString(),
              'User-Agent': 'NestJS-Webhook-Service/1.0',
            },
            body: JSON.stringify({
              ...event,
              deliveryId,
            }),
          });

          const responseData = response.headers.get('content-type')?.includes('application/json')
            ? await response.json()
            : await response.text();

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const duration = Date.now() - startTime;

          await this.logDelivery(webhookId, event.id, {
            success: true,
            statusCode: response.status,
            response: responseData,
            duration,
            attempt: currentAttempt,
          });

          await this.updateWebhookStats(webhookId, true, duration);
          await this.prisma.webhook.update({
            where: { id: webhookId },
            data: { lastCalledAt: new Date() },
          });

          resolve();
        } catch (error) {
          const duration = Date.now() - startTime;
          const shouldRetry = operation.retry(error);

          if (!shouldRetry) {
            await this.logDelivery(webhookId, event.id, {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              duration,
              attempt: currentAttempt,
            });

            await this.updateWebhookStats(webhookId, false, duration);
            reject(operation.mainError());
          }
        }
      });
    });
  }

  private generateSignature(event: WebhookEvent, secret: string | undefined): string {
    if (!secret) return '';

    const payload = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signString = `${timestamp}.${payload}`;

    return `t=${timestamp},s=${createHmac('sha256', secret).update(signString).digest('hex')}`;
  }

  private async updateWebhookStats(
    webhookId: string,
    success: boolean,
    duration: number,
  ): Promise<void> {
    const key = `webhook_stats:${webhookId}`;
    const currentStats = (await this.cacheService.get<WebhookStats>(key)) || {
      total_calls: 0,
      successes: 0,
      failures: 0,
      last_duration: 0,
      last_call: 0,
    };
    const durations = (await this.cacheService.get<number[]>(`${key}:durations`)) || [];

    await this.cacheService.set(key, {
      total_calls: currentStats.total_calls + 1,
      successes: success ? currentStats.successes + 1 : currentStats.successes,
      failures: !success ? currentStats.failures + 1 : currentStats.failures,
      last_duration: duration,
      last_call: Date.now(),
    } as WebhookStats);

    if (success) {
      durations.unshift(duration);
      durations.splice(100); // Keep only last 100
      await this.cacheService.set(`${key}:durations`, durations);
    }
  }

  private async logDelivery(
    webhookId: string,
    eventId: string,
    result: WebhookDeliveryResult,
  ): Promise<void> {
    await this.prisma.webhookDelivery.create({
      data: {
        webhookId,
        eventId,
        ...result,
        createdAt: new Date(),
      },
    });
  }

  private async getWebhookStats(webhookId: string) {
    const key = `webhook_stats:${webhookId}`;
    const stats = (await this.cacheService.get<WebhookStats>(key)) || {
      total_calls: 0,
      successes: 0,
      failures: 0,
      last_duration: 0,
      last_call: 0,
    };
    const durations = (await this.cacheService.get<number[]>(`${key}:durations`)) || [];

    return {
      totalCalls: stats.total_calls,
      successes: stats.successes,
      failures: stats.failures,
      lastDuration: stats.last_duration,
      lastCall: stats.last_call,
      averageDuration: durations.length
        ? durations.reduce((acc, val) => acc + val, 0) / durations.length
        : 0,
    };
  }

  private formatWebhookResponse(webhook: Webhook, stats: any): WebhookResponseDto {
    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events as FileEventType[],
      description: webhook.description || '',
      enabled: webhook.enabled,
      createdAt: webhook.createdAt,
      lastCalledAt: webhook.lastCalledAt || undefined,
      totalDeliveries: stats.totalCalls,
      successfulDeliveries: stats.successes,
    };
  }
}
