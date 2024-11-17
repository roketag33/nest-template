import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';
import * as compression from 'compression';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  // Création de l'application
  const app = await NestFactory.create(AppModule, {
    // Configuration des logs au démarrage
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Utilisation du logger Winston
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Configuration Swagger
  setupSwagger(app);

  // Security - Helmet
  app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: [`'self'`],
            styleSrc: [`'self'`, `'unsafe-inline'`],
            imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
            scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
          },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: {
          policy: 'cross-origin',
        },
      }),
  );

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Compression
  app.use(compression());

  // Cookie Parser
  app.use(cookieParser());

  // Global Validation Pipe
  app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Supprime les propriétés non décorées des DTOs
        transform: true, // Transforme automatiquement les payloads selon les DTOs
        forbidNonWhitelisted: true, // Rejette les requêtes avec des propriétés non whitelistées
        transformOptions: {
          enableImplicitConversion: true, // Conversion implicite des types
        },
        validateCustomDecorators: true, // Valide les décorateurs personnalisés
      }),
  );

  // Global Prefix
  app.setGlobalPrefix('api', {
    exclude: ['/health', '/docs'], // Exclus certains endpoints du prefix global
  });

  // Handle shutdown gracefully
  app.enableShutdownHooks();

  // Start the server
  const port = process.env.PORT || 3000;
  await app.listen(port);

  // Logging
  const logger = new Logger('Bootstrap');
  const baseUrl = await app.getUrl();

  logger.log(`🚀 Application is running on: ${baseUrl}`);
  logger.log(`📚 Swagger documentation is available on: ${baseUrl}/docs`);
  logger.log(`🔒 API is running in ${process.env.NODE_ENV} mode`);

  if (process.env.NODE_ENV === 'development') {
    logger.debug('Debug mode is enabled');
    logger.debug(`API base URL: ${baseUrl}/api`);
    logger.debug(`Swagger URL: ${baseUrl}/docs`);
    logger.debug(`Health check: ${baseUrl}/health`);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Application specific logging, throwing an error, or other logic here
});

bootstrap().catch((error) => {
  console.error('Error during bootstrap:', error);
  process.exit(1);
});