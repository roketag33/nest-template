import { PrismaService } from '../../src/prisma/prisma.service';

export class TestDatabase {
  constructor(private prisma: PrismaService) {}

  async cleanDatabase() {
    await this.prisma.user.deleteMany();
  }
}
