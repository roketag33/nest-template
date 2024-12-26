import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '@/modules/files/constants/injection-tokens';

@Injectable()
export class UploadRateLimitGuard implements CanActivate {
  private rateLimiter: RateLimiterRedis;

  constructor(
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {
    this.rateLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'upload_limit',
      points: configService.get('upload.rateLimit.points', 10), // nombre d'uploads
      duration: configService.get('upload.rateLimit.duration', 3600), // période en secondes
      blockDuration: configService.get('upload.rateLimit.blockDuration', 3600), // durée du blocage
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip;

    try {
      await this.rateLimiter.consume(userId);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        throw new HttpException(
          {
            status: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too many upload requests',
            retryAfter: error.message,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return false;
    }
  }
}
