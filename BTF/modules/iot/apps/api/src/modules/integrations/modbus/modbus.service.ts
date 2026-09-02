import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import ModbusRTU from 'modbus-serial';

@Injectable()
export class ModbusService implements OnModuleInit {
  private readonly logger = new Logger(ModbusService.name);
  private clients: Map<string, ModbusRTU> = new Map();

  constructor(private readonly prisma: PrismaService, private readonly eventEmitter: EventEmitter2) {}
  async onModuleInit() { await this.initializeConnections(); }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async pollDevices() {
    const integrations = await this.prisma.integration.findMany({
      where: { type: { in: ['MODBUS_TCP', 'MODBUS_RTU'] }, isActive: true },
      include: { devices: { include: { deviceType: true } } },
    });
    for (const integration of integrations) {
      const client = this.clients.get(integration.id);
      if (!client) continue;
      for (const device of integration.devices) {
        if (!device.isActive || device.modbusAddress === null) continue;
        try {
          const data = await this.readDevice(client, device);
          if (data !== null) await this.processTelemetry(device.id, data);
        } catch (err) {
          this.logger.error(`Modbus read error for ${device.name}:`, err.message);
          await this.prisma.device.update({ where: { id: device.id }, data: { status: 'ERROR' } });
        }
      }
    }
  }

  private async initializeConnections() {
    const integrations = await this.prisma.integration.findMany({ where: { type: { in: ['MODBUS_TCP', 'MODBUS_RTU'] }, isActive: true } });
    for (const integration of integrations) {
      const config = integration.config as any;
      const client = new ModbusRTU();
      try {
        if (integration.type === 'MODBUS_TCP') await client.connectTCP(config.host, { port: config.port || 502 });
        else await client.connectRTUBuffered(config.port, { baudRate: config.baudRate || 9600 });
        this.clients.set(integration.id, client);
        await this.prisma.integration.update({ where: { id: integration.id }, data: { status: 'CONNECTED', lastSyncAt: new Date() } });
      } catch (err) {
        await this.prisma.integration.update({ where: { id: integration.id }, data: { status: 'ERROR' } });
      }
    }
  }

  private async readDevice(client: ModbusRTU, device: any): Promise<any> {
    client.setID(device.modbusAddress);
    const config = device.config as any || {};
    const registerType = config.registerType || 'HOLDING_REGISTER';
    const address = config.registerAddress || 0;
    const length = config.registerLength || 1;
    let result;
    switch (registerType) {
      case 'HOLDING_REGISTER': result = await client.readHoldingRegisters(address, length); break;
      case 'INPUT_REGISTER': result = await client.readInputRegisters(address, length); break;
      case 'COIL': result = await client.readCoils(address, length); break;
      case 'DISCRETE_INPUT': result = await client.readDiscreteInputs(address, length); break;
      default: return null;
    }
    return this.parseValue(result.data, config.dataType || 'INT16', config.scale);
  }

  private parseValue(rawData: number[], dataType: string, scale?: number): any {
    let value: number;
    switch (dataType) {
      case 'INT16': value = rawData[0]; break;
      case 'UINT16': value = rawData[0] >>> 0; break;
      case 'INT32': value = (rawData[0] << 16) | rawData[1]; break;
      case 'FLOAT32': const buf = Buffer.alloc(4); buf.writeUInt16BE(rawData[0], 0); buf.writeUInt16BE(rawData[1], 2); value = buf.readFloatBE(0); break;
      default: value = rawData[0];
    }
    return scale ? value * scale : value;
  }

  private async processTelemetry(deviceId: string, value: any) {
    await this.prisma.telemetry.create({ data: { deviceId, rawValue: { value } as any, processedValue: typeof value === 'number' ? value : null, quality: 'GOOD' } });
    await this.prisma.device.update({ where: { id: deviceId }, data: { lastSeenAt: new Date(), status: 'ONLINE' } });
    this.eventEmitter.emit('telemetry.ingested', { deviceId, points: [{ timestamp: new Date().toISOString(), value }] });
  }
}
