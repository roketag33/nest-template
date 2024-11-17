import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const response = context.switchToHttp().getResponse();

        // Security Headers
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader('X-Frame-Options', 'SAMEORIGIN');
        response.setHeader('X-XSS-Protection', '1; mode=block');
        response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

        return next.handle().pipe(
            tap(() => {
                response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                response.setHeader('Pragma', 'no-cache');
                response.setHeader('Expires', '0');
            }),
        );
    }
}