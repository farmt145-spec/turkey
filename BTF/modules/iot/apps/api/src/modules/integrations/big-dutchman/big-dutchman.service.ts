import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class BigDutchmanService {
  private readonly logger = new Logger(BigDutchmanService.name);
  constructor(private readonly prisma: PrismaService) {}
  @Cron(CronExpression.EVERY_MINUTE)
  async syncFeedSystems() {
    const integrations = await this.prisma.integration.findMany({ where: { type: 'BIG_DUTCHMAN', isActive: true }, include: { devices: true } });
    for (const integration of integrations) { /* implementation */ }
  }
}
