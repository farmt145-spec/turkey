import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AlarmSeverity, NotificationChannel, NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async sendAlarm(payload: { farmId: string; deviceId?: string; type: string; severity: AlarmSeverity; message: string; details?: Record<string, any> }) {
    const alarm = await this.prisma.alarm.create({
      data: {
        farmId: payload.farmId, deviceId: payload.deviceId,
        type: payload.type as any, severity: payload.severity,
        message: payload.message, details: payload.details as any,
      },
    });
    const channels = this.determineChannels(payload.severity);
    const users = await this.prisma.userFarm.findMany({ where: { farmId: payload.farmId }, include: { user: true } });
    for (const userFarm of users) {
      for (const channel of channels) {
        await this.prisma.notification.create({
          data: {
            farmId: payload.farmId, userId: userFarm.user.id,
            type: NotificationType.ALARM, channel,
            title: `ALARM: ${payload.type}`, message: payload.message,
            data: { alarmId: alarm.id, severity: payload.severity, details: payload.details } as any,
          },
        });
      }
    }
  }

  private determineChannels(severity: AlarmSeverity): NotificationChannel[] {
    switch (severity) {
      case 'EMERGENCY': return [NotificationChannel.PUSH, NotificationChannel.SMS, NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET];
      case 'CRITICAL': return [NotificationChannel.PUSH, NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET];
      case 'WARNING': return [NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET];
      default: return [NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET];
    }
  }
}
