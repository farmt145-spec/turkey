import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
    if (!hasDatabaseUrl) {
      this.logger.warn('DATABASE_URL is not set. Prisma connection skipped.');
      return;
    }

    try {
      await this.$connect();
    } catch (error) {
      this.logger.warn('Prisma connection failed. Continuing in degraded mode.');
      this.logger.debug(String(error));
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
