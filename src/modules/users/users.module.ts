import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisCacheModule } from '../cache/cache.module';
import {MailModule} from "@/modules/mail/mail.module";

@Module({
  imports: [
    PrismaModule,
    RedisCacheModule,
    MailModule
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}