import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth() {
    return {
      ok: true,
      module: 'health',
      timestamp: new Date().toISOString(),
    };
  }
}
