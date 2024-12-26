// src/modules/webhooks/dto/webhook.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUrl,
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FileEventType } from '../../files/enums/file-event.enum';

// DTO pour la création d'un webhook
export class CreateWebhookDto {
  @ApiProperty({
    description: 'The URL that will receive the webhook events',
    example: 'https://api.example.com/webhook',
  })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({
    description: 'Secret key for signing webhook payloads',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  secret?: string;

  @ApiPropertyOptional({
    description: 'List of event types to subscribe to',
    type: [String],
    enum: FileEventType,
    example: [FileEventType.UPLOAD_COMPLETED, FileEventType.FILE_DELETED],
  })
  @IsArray()
  @IsEnum(FileEventType, { each: true })
  @IsOptional()
  events?: FileEventType[];

  @ApiPropertyOptional({
    description: 'Description of the webhook',
    example: 'Notification endpoint for file uploads',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of retry attempts',
    default: 3,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxRetries?: number;
}

// DTO pour la mise à jour d'un webhook
export class UpdateWebhookDto {
  @ApiPropertyOptional({
    description: 'The URL that will receive the webhook events',
  })
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({
    description: 'Secret key for signing webhook payloads',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  secret?: string;

  @ApiPropertyOptional({
    type: [String],
    enum: FileEventType,
  })
  @IsArray()
  @IsEnum(FileEventType, { each: true })
  @IsOptional()
  events?: FileEventType[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

// DTO pour la réponse webhook
export class WebhookResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  url: string;

  @ApiProperty({
    type: [String],
    enum: FileEventType,
  })
  events: FileEventType[];

  @ApiProperty()
  description: string;

  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  lastCalledAt?: Date;

  @ApiProperty()
  totalDeliveries: number;

  @ApiProperty()
  successfulDeliveries: number;
}

// DTO pour l'historique des livraisons
export class WebhookDeliveryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  webhookId: string;

  @ApiProperty()
  eventId: string;

  @ApiProperty()
  success: boolean;

  @ApiProperty({
    description: 'HTTP status code of the delivery',
  })
  statusCode?: number;

  @ApiProperty({
    description: 'Response body from the webhook endpoint',
  })
  response?: any;

  @ApiProperty({
    description: 'Error message if delivery failed',
  })
  error?: string;

  @ApiProperty({
    description: 'Time taken for the delivery in milliseconds',
  })
  duration: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({
    description: 'Number of retry attempts made',
  })
  attempts: number;
}

// Export l'ancien DTO pour la rétrocompatibilité
export class WebhookRegistrationDto extends CreateWebhookDto {}
