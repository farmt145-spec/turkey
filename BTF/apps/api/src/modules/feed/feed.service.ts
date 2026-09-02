import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}

  getStatus() {
    return {
      ok: true,
      module: 'feed',
      timestamp: new Date().toISOString(),
    };
  }
}
