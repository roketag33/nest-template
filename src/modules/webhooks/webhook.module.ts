import { Module, Global } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { RedisCacheModule } from '@/modules/cache/cache.module';

@Global()
@Module({
  imports: [
    RedisCacheModule
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
