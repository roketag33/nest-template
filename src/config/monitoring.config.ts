import { registerAs } from '@nestjs/config';

export default registerAs('monitoring', () => ({
  appName: process.env.APP_NAME || 'nest_app',
  metricsPath: process.env.METRICS_PATH || '/metrics',
  healthPath: process.env.HEALTH_PATH || '/health',
}));
