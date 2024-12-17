import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MonitoringService } from './monitoring.service';
import { MonitoringController, MetricsController } from './monitoring.controller';
import { PrismaHealthIndicator } from './health/prisma.health';
import * as MetricsConfig from './metrics-config';
import monitoringConfig from '../../config/monitoring.config';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forFeature(monitoringConfig),
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
      defaultLabels: {
        app: undefined, // Sera défini dynamiquement
      },
    }),
    TerminusModule,
    PrismaModule,
  ],
  controllers: [MonitoringController, MetricsController],
  providers: [
    {
      provide: 'PROMETHEUS_OPTIONS',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        defaultLabels: {
          app: configService.get('monitoring.appName'),
        },
      }),
    },
    MonitoringService,
    PrismaHealthIndicator,
    MetricsConfig.httpRequestDurationMetric,
    MetricsConfig.httpRequestsTotal,
    MetricsConfig.activeUsersGauge,
    MetricsConfig.errorCounter,
  ],
  exports: [MonitoringService],
})
export class MonitoringModule {}
