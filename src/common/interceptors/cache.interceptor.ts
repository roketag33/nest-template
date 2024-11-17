import {
    Injectable,
    ExecutionContext,
    CallHandler,
    Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '@/modules/cache/cache.service';

@Injectable()
export class HttpCacheInterceptor {
    constructor(private cacheService: CacheService) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Promise<Observable<any>> {
        if (context.getType() !== 'http') {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest();
        const cacheKey = this.generateCacheKey(request);

        // Skip cache for non-GET requests
        if (request.method !== 'GET') {
            return next.handle();
        }

        const cachedResponse = await this.cacheService.get(cacheKey);
        if (cachedResponse) {
            return of(cachedResponse);
        }

        return next.handle().pipe(
            tap(async (response) => {
                await this.cacheService.set(cacheKey, response);
            }),
        );
    }

    private generateCacheKey(request: any): string {
        // Generate a cache key based on the request URL and query parameters
        return `${request.url}${JSON.stringify(request.query)}`;
    }
}