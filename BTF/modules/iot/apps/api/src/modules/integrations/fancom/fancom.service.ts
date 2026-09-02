import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class FancomService {
  private readonly logger = new Logger(FancomService.name);
  constructor(private readonly prisma: PrismaService) {}
  @Cron(CronExpression.EVERY_30_SECONDS)
  async syncFancomDevices() {
    const integrations = await this.prisma.integration.findMany({ where: { type: 'FANCOM', isActive: true }, include: { devices: { include: { deviceType: true } } } });
    for (const integration of integrations) {
      try {
        const config = integration.config as any;
        const readings = await this.fetchFancomData(config);
        for (const device of integration.devices) {
          const reading = readings[device.modbusAddress || 0];
          if (reading !== undefined) {
            await this.prisma.telemetry.create({ data: { deviceId: device.id, rawValue: reading as any, processedValue: typeof reading === 'number' ? reading : null, quality: 'GOOD' } });
          }
        }
        await this.prisma.integration.update({ where: { id: integration.id }, data: { status: 'CONNECTED', lastSyncAt: new Date() } });
      } catch (err) { this.logger.error(`Fancom sync error:`, err.message); }
    }
  }
  private async fetchFancomData(config: any): Promise<Record<number, any>> {
    return { 0: { temperature: 28.5, humidity: 65, co2: 2400 }, 1: { temperature: 29.1, setpoint: 28.0 } };
  }
}
