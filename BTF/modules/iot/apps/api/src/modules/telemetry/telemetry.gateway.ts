import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({ namespace: 'iot', cors: { origin: '*' } })
export class TelemetryGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(TelemetryGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(private readonly jwtService: JwtService, private readonly prisma: PrismaService) {}
  afterInit() { this.logger.log('WebSocket Gateway initialized'); }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.query.token;
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.data.farmIds = payload.farmIds || [];
      if (!this.userSockets.has(payload.sub)) this.userSockets.set(payload.sub, new Set());
      this.userSockets.get(payload.sub).add(client.id);
    } catch (err) { client.disconnect(); }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.userSockets.has(userId)) this.userSockets.get(userId).delete(client.id);
  }

  @SubscribeMessage('subscribe:farm')
  async handleFarmSubscription(client: Socket, farmId: string) {
    if (!client.data.farmIds.includes(farmId)) { client.emit('error', { message: 'Brak dostępu' }); return; }
    client.join(`farm:${farmId}`);
    const devices = await this.prisma.device.findMany({
      where: { farmId },
      select: { id: true, name: true, status: true, lastSeenAt: true, deviceType: { select: { category: true } } },
    });
    client.emit('devices:initial', devices);
  }

  @SubscribeMessage('subscribe:device')
  async handleDeviceSubscription(client: Socket, deviceId: string) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId }, select: { farmId: true } });
    if (!device || !client.data.farmIds.includes(device.farmId)) { client.emit('error', { message: 'Brak dostępu' }); return; }
    client.join(`device:${deviceId}`);
    const telemetry = await this.prisma.telemetry.findMany({ where: { deviceId }, orderBy: { timestamp: 'desc' }, take: 50 });
    client.emit('telemetry:history', telemetry.reverse());
  }

  @OnEvent('telemetry.ingested')
  broadcastTelemetry(data: { deviceId: string; points: any[] }) {
    this.server.to(`device:${data.deviceId}`).emit('telemetry:realtime', { deviceId: data.deviceId, timestamp: new Date().toISOString(), points: data.points });
  }

  @OnEvent('alarm.created')
  broadcastAlarm(alarm: any) { this.server.to(`farm:${alarm.farmId}`).emit('alarm:new', alarm); }

  @OnEvent('device.status.changed')
  broadcastDeviceStatus(data: { deviceId: string; status: string; farmId: string }) {
    this.server.to(`farm:${data.farmId}`).emit('device:status', { deviceId: data.deviceId, status: data.status, timestamp: new Date().toISOString() });
  }
}
