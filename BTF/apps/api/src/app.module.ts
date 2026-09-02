import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { FeedModule } from './modules/feed/feed.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    PrismaModule,
    FeedModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}