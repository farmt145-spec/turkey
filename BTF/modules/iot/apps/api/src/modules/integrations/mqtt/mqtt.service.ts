import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IClientOptions, MqttClient, connect } from 'mqtt';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private clients: Map<string, MqttClient> = new Map();

  constructor(private readonly prisma: PrismaService, private readonly eventEmitter: EventEmitter2) {}
  async onModuleInit() { await this.initializeBrokers(); }
  onModuleDestroy() { for (const client of this.clients.values()) client.end(); }

  private async initializeBrokers() {
    const integrations = await this.prisma.integration.findMany({ where: { type: 'MQTT_BROKER', isActive: true } });
    for (const integration of integrations) {
      const cfg = integration.config as any;
      const options: IClientOptions = { host: cfg.host, port: cfg.port || 1883, username: cfg.username, password: cfg.password, clientId: `bt-${integration.id}-${Date.now()}`, reconnectPeriod: 5000 };
      const client = connect(options);
      client.on('connect', () => {
        this.subscribeToTopics(client, integration.id);
        this.prisma.integration.update({ where: { id: integration.id }, data: { status: 'CONNECTED', lastSyncAt: new Date() } }).catch(() => {});
      });
      client.on('message', (topic, message) => { this.handleMessage(integration.id, topic, message.toString()); });
      client.on('error', (err) => { this.prisma.integration.update({ where: { id: integration.id }, data: { status: 'ERROR' } }).catch(() => {}); });
      this.clients.set(integration.id, client);
    }
  }

  private async subscribeToTopics(client: MqttClient, integrationId: string) {
    const devices = await this.prisma.device.findMany({ where: { integrationId, isActive: true }, select: { mqttTopic: true } });
    const topics = [...new Set(devices.map(d => d.mqttTopic).filter(Boolean).map(t => t.split('/').slice(0, -1).join('/') + '/#'))];
    for (const topic of topics) client.subscribe(topic, (err) => { if (err) this.logger.error(`Subscribe error: ${err.message}`); });
  }

  private async handleMessage(integrationId: string, topic: string, message: string) {
    try {
      const device = await this.prisma.device.findFirst({ where: { integrationId, mqttTopic: { startsWith: topic.split('/').slice(0, -1).join('/') } } });
      if (!device) return;
      let payload: any; try { payload = JSON.parse(message); } catch { payload = { raw: message }; }
      await this.prisma.telemetry.create({ data: { deviceId: device.id, rawValue: payload as any, processedValue: this.extractNumericValue(payload), unit: payload.unit, metadata: { topic, integrationId } as any } });
      await this.prisma.device.update({ where: { id: device.id }, data: { lastSeenAt: new Date(), status: 'ONLINE' } });
      this.eventEmitter.emit('telemetry.ingested', { deviceId: device.id, points: [{ timestamp: new Date().toISOString(), value: payload }] });
    } catch (err) { this.logger.error('MQTT message processing error:', err.message); }
  }

  private extractNumericValue(payload: any): number | null {
    if (typeof payload === 'number') return payload;
    if (payload.value !== undefined) return Number(payload.value);
    if (payload.temperature !== undefined) return Number(payload.temperature);
    return null;
  }
}
