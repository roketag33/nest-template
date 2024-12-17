// src/modules/monitoring/interceptors/metrics.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MonitoringService } from '../monitoring.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
    constructor(private monitoringService: MonitoringService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const startTime = process.hrtime();
        const request = context.switchToHttp().getRequest();

        return next.handle().pipe(
            tap({
                next: () => {
                    const response = context.switchToHttp().getResponse();
                    const [seconds, nanoseconds] = process.hrtime(startTime);
                    const duration = seconds + nanoseconds / 1e9;

                    // Enregistrer les métriques
                    this.monitoringService.recordRequestDuration(
                        request.route.path,
                        request.method,
                        response.statusCode,
                        duration
                    );
                    this.monitoringService.incrementRequestCount(
                        request.route.path,
                        request.method,
                        response.statusCode
                    );
                },
            }),
        );
    }
}