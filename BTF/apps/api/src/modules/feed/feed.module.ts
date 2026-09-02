import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [FeedController],
  providers: [FeedService, PrismaService],
})
export class FeedModule {}
