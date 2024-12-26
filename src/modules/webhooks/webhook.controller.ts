// src/modules/webhooks/controllers/webhook.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookResponseDto,
  WebhookDeliveryResponseDto,
} from './dto/webhook.dto';

@ApiTags('webhooks')
@ApiBearerAuth()
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @ApiOperation({
    summary: 'Register a new webhook',
    description: 'Create a new webhook endpoint to receive event notifications',
  })
  @ApiResponse({
    status: 201,
    description: 'Webhook successfully registered',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid webhook configuration' })
  async createWebhook(@Body() createWebhookDto: CreateWebhookDto): Promise<WebhookResponseDto> {
    try {
      return await this.webhookService.registerWebhook({
        url: createWebhookDto.url,
        secret: createWebhookDto.secret,
        events: createWebhookDto.events,
        description: createWebhookDto.description,
      });
    } catch (error) {
      throw new BadRequestException(`Failed to register webhook: ${error.message}`);
    }
  }

  @Get()
  @ApiOperation({
    summary: 'List all webhooks',
    description: 'Retrieve a list of all registered webhooks',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    type: Boolean,
    description: 'Filter by active/inactive webhooks',
  })
  @ApiResponse({
    status: 200,
    description: 'List of webhooks',
    type: [WebhookResponseDto],
  })
  async listWebhooks(@Query('active') active?: boolean): Promise<WebhookResponseDto[]> {
    return this.webhookService.getWebhooks(active);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get webhook details',
    description: 'Retrieve details of a specific webhook',
  })
  @ApiParam({
    name: 'id',
    description: 'Webhook ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook details',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async getWebhook(@Param('id') id: string): Promise<WebhookResponseDto> {
    const webhook = await this.webhookService.getWebhook(id);
    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }
    return webhook;
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update webhook',
    description: 'Update an existing webhook configuration',
  })
  @ApiParam({
    name: 'id',
    description: 'Webhook ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook updated successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async updateWebhook(
    @Param('id') id: string,
    @Body() updateWebhookDto: UpdateWebhookDto,
  ): Promise<WebhookResponseDto> {
    try {
      return await this.webhookService.updateWebhook(id, updateWebhookDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update webhook: ${error.message}`);
    }
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete webhook',
    description: 'Delete an existing webhook',
  })
  @ApiParam({
    name: 'id',
    description: 'Webhook ID',
  })
  @ApiResponse({ status: 204, description: 'Webhook deleted successfully' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async deleteWebhook(@Param('id') id: string): Promise<void> {
    try {
      await this.webhookService.deleteWebhook(id);
    } catch {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }
  }

  @Get(':id/deliveries')
  @ApiOperation({
    summary: 'Get webhook delivery history',
    description: 'Retrieve delivery history for a specific webhook',
  })
  @ApiParam({
    name: 'id',
    description: 'Webhook ID',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of deliveries to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of deliveries to skip',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook delivery history',
    type: [WebhookDeliveryResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async getDeliveryHistory(
    @Param('id') id: string,
    @Query('limit') limit = 100,
    @Query('offset') offset = 0,
  ): Promise<WebhookDeliveryResponseDto[]> {
    try {
      return await this.webhookService.getDeliveryHistory(id, limit, offset);
    } catch {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }
  }

  @Post(':id/ping')
  @ApiOperation({
    summary: 'Test webhook',
    description: 'Send a test ping to verify webhook configuration',
  })
  @ApiParam({
    name: 'id',
    description: 'Webhook ID',
  })
  @ApiResponse({ status: 200, description: 'Test ping sent successfully' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async pingWebhook(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.webhookService.pingWebhook(id);
      return {
        success: true,
        message: 'Test ping sent successfully',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to ping webhook: ${error.message}`);
    }
  }

  @Post(':id/retry/:deliveryId')
  @ApiOperation({
    summary: 'Retry failed delivery',
    description: 'Retry a failed webhook delivery',
  })
  @ApiParam({
    name: 'id',
    description: 'Webhook ID',
  })
  @ApiParam({
    name: 'deliveryId',
    description: 'Delivery ID',
  })
  @ApiResponse({ status: 200, description: 'Delivery retried successfully' })
  @ApiResponse({ status: 404, description: 'Webhook or delivery not found' })
  async retryDelivery(
    @Param('id') id: string,
    @Param('deliveryId') deliveryId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.webhookService.retryDelivery(id, deliveryId);
      return {
        success: true,
        message: 'Delivery retried successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to retry delivery: ${error.message}`);
    }
  }
}
