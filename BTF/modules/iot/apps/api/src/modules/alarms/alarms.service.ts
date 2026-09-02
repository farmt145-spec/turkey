import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AlarmSeverity, Prisma } from '@prisma/client';

@Injectable()
export class AlarmsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAlarms(farmId: string, filters: any) {
    const where: Prisma.AlarmWhereInput = { farmId };
    if (filters.severity) where.severity = filters.severity;
    if (filters.acknowledged !== undefined) where.isAcknowledged = filters.acknowledged;
    if (filters.deviceId) where.deviceId = filters.deviceId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }
    const [alarms, total] = await Promise.all([
      this.prisma.alarm.findMany({
        where,
        include: {
          device: { select: { name: true, deviceType: { select: { category: true } } } },
          acks: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.alarm.count({ where }),
    ]);
    return { alarms, total, page: Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1 };
  }

  async acknowledgeAlarm(alarmId: string, userId: string, comment?: string) {
    const alarm = await this.prisma.alarm.findUnique({ where: { id: alarmId } });
    if (!alarm) throw new NotFoundException('Alarm not found');
    await this.prisma.alarm.update({
      where: { id: alarmId },
      data: { isAcknowledged: true, acknowledgedBy: userId, acknowledgedAt: new Date() },
    });
    await this.prisma.alarmAcknowledgement.create({ data: { alarmId, userId, comment } });
    return { success: true };
  }

  async resolveAlarm(alarmId: string) {
    return this.prisma.alarm.update({ where: { id: alarmId }, data: { resolvedAt: new Date() } });
  }

  async getAlarmStats(farmId: string, period: '24h' | '7d' | '30d') {
    const now = new Date();
    let from: Date;
    switch (period) {
      case '24h': from = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
      case '7d': from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    }
    const [bySeverity, byType, total, unresolved] = await Promise.all([
      this.prisma.alarm.groupBy({ by: ['severity'], where: { farmId, createdAt: { gte: from } }, _count: { severity: true } }),
      this.prisma.alarm.groupBy({ by: ['type'], where: { farmId, createdAt: { gte: from } }, _count: { type: true } }),
      this.prisma.alarm.count({ where: { farmId, createdAt: { gte: from } } }),
      this.prisma.alarm.count({ where: { farmId, resolvedAt: null } }),
    ]);
    return { period, total, unresolved, bySeverity, byType, resolutionRate: total > 0 ? ((total - unresolved) / total) * 100 : 100 };
  }
}
