import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true, {
        responseTime: 'OK',
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      return this.getStatus(key, false, {
        message: e.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
