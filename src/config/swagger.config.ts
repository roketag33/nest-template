import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('NestJS API Template')
    .setDescription(
      `
      ## API Documentation
      
      ### Features
      - 🔐 Complete authentication system
      - 👥 User management
      - 📝 CRUD operations
      - ⚡ Performance optimized
      
      ### Authentication
      This API uses JWT Bearer token for authentication. 
      1. First, create a user or login
      2. Use the received token in the Authorization header
      
      ### Rate Limiting
      All endpoints are protected by rate limiting:
      - 100 requests per minute for public endpoints
      - 1000 requests per minute for authenticated endpoints
    `,
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addServer('http://localhost:3000', 'Local development')
    .addServer('https://api.production.com', 'Production')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customCss: '.swagger-ui .topbar { display: none }',
  });
}
