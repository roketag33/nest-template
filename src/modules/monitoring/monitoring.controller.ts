import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { PrismaHealthIndicator } from './health/prisma.health';

@Controller('metrics')
@ApiTags('metrics')
export class MetricsController extends PrometheusController {}

@ApiTags('monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
  ) {}

  @Get('health')
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'Vérifier la santé du système',
    description: 'Effectue des vérifications de santé sur différents composants du système',
  })
  check() {
    return this.health.check([() => this.prismaHealth.isHealthy('database')]);
  }
}
