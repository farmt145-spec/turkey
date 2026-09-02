import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SkovService {
  private readonly logger = new Logger(SkovService.name);
  constructor(private readonly prisma: PrismaService) {}
  @Cron(CronExpression.EVERY_10_SECONDS)
  async syncSkovDevices() {
    const integrations = await this.prisma.integration.findMany({ where: { type: 'SKOV', isActive: true }, include: { devices: true } });
    for (const integration of integrations) { /* implementation */ }
  }
}
