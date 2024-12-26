import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TestingModule, Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDatabase } from './helpers/test-database';

export class TestSetup {
  app: INestApplication;
  prisma: PrismaService;
  testDatabase: TestDatabase;

  async initialize() {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    this.prisma = this.app.get<PrismaService>(PrismaService);
    this.testDatabase = new TestDatabase(this.prisma);

    // Configuration globale
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await this.app.init();
    return this;
  }

  async close() {
    await this.app.close();
  }

  async cleanupDatabase() {
    await this.testDatabase.cleanDatabase();
  }
}
