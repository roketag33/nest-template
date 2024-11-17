import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import * as redisStore from 'cache-manager-redis-store';

@Module({
    imports: [
        CacheModule.registerAsync({
            isGlobal: true,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                store: redisStore as any,
                url: configService.get('REDIS_URL'),
                ttl: configService.get<number>('CACHE_TTL'),
                max: configService.get<number>('CACHE_MAX'),
            }),
        }),
    ],
    providers: [CacheService],
    exports: [CacheService],
})
export class RedisCacheModule {}