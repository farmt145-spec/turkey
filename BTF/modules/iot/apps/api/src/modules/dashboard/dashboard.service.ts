import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { subHours, subDays } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getFarmOverview(farmId: string) {
    const [devices, onlineDevices, activeAlarms, recentAlarms, climateToday, feedSilos, predictions] = await Promise.all([
      this.prisma.device.count({ where: { farmId } }),
      this.prisma.device.count({ where: { farmId, status: 'ONLINE' } }),
      this.prisma.alarm.count({ where: { farmId, resolvedAt: null } }),
      this.prisma.alarm.findMany({
        where: { farmId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { device: { select: { name: true, deviceType: { select: { category: true } } } } },
      }),
      this.prisma.climateData.findMany({
        where: { building: { farmId }, timestamp: { gte: subHours(new Date(), 24) } },
        orderBy: { timestamp: 'asc' },
      }),
      this.prisma.feedSilo.findMany({ where: { farmId } }),
      this.prisma.aIPrediction.findMany({
        where: { farmId, createdAt: { gte: subDays(new Date(), 1) } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);
    return {
      summary: {
        totalDevices: devices, onlineDevices, offlineDevices: devices - onlineDevices,
        activeAlarms, onlinePercentage: devices > 0 ? Math.round((onlineDevices / devices) * 100) : 0,
      },
      recentAlarms,
      climateOverview: this.aggregateClimateData(climateToday),
      feedStatus: feedSilos.map(s => ({
        id: s.id, name: s.name, currentLevel: s.currentLevel, capacity: s.capacity,
        percentage: Math.round((s.currentLevel / s.capacity) * 100),
        status: s.currentLevel < s.alertLevel ? 'CRITICAL' : s.currentLevel < s.alertLevel * 1.5 ? 'WARNING' : 'OK',
      })),
      aiInsights: predictions,
    };
  }

  async getDeviceMap(farmId: string) {
    const buildings = await this.prisma.building.findMany({
      where: { farmId, isActive: true },
      include: {
        zones: {
          include: {
            devices: {
              include: { deviceType: { select: { category: true, name: true, icon: true } } },
              where: { isActive: true },
            },
          },
        },
        devices: {
          include: { deviceType: { select: { category: true, name: true, icon: true } } },
          where: { isActive: true, zoneId: null },
        },
      },
    });
    return buildings.map(b => ({
      id: b.id, name: b.name, type: b.type, layout: b.layout,
      position: { x: b.layout?.positionX, y: b.layout?.positionY },
      zones: b.zones.map(z => ({
        id: z.id, name: z.name,
        position: { x: z.positionX, y: z.positionY, z: z.positionZ },
        devices: z.devices.map(d => this.mapDeviceToDto(d)),
      })),
      unzonedDevices: b.devices.map(d => this.mapDeviceToDto(d)),
    }));
  }

  async getTimeSeriesData(farmId: string, metric: string, range: '24h' | '7d' | '30d', buildingId?: string) {
    const now = new Date();
    let from: Date; let interval: string;
    switch (range) {
      case '24h': from = subHours(now, 24); interval = '5 minutes'; break;
      case '7d': from = subDays(now, 7); interval = '1 hour'; break;
      case '30d': from = subDays(now, 30); interval = '1 day'; break;
    }
    const result = await this.prisma.$queryRawUnsafe(`
      SELECT time_bucket('${interval}', timestamp) as bucket, device_id,
        AVG((raw_value->>'value')::float) as avg_value,
        MIN((raw_value->>'value')::float) as min_value,
        MAX((raw_value->>'value')::float) as max_value,
        COUNT(*) as count
      FROM telemetry
      WHERE device_id IN (SELECT id FROM devices WHERE farm_id = '${farmId}' ${buildingId ? `AND building_id = '${buildingId}'` : ''} AND is_active = true)
      AND timestamp >= '${from.toISOString()}' AND raw_value->>'value' IS NOT NULL
      GROUP BY bucket, device_id ORDER BY bucket ASC
    `);
    return result;
  }

  async getDeviceStatusHistory(farmId: string, hours = 24) {
    const from = subHours(new Date(), hours);
    const devices = await this.prisma.device.findMany({
      where: { farmId },
      select: {
        id: true, name: true, status: true, lastSeenAt: true,
        deviceType: { select: { category: true } },
        building: { select: { name: true } },
        _count: {
          select: {
            telemetry: { where: { timestamp: { gte: from } } },
            alarms: { where: { createdAt: { gte: from } } },
          },
        },
      },
    });
    return devices.map(d => ({
      id: d.id, name: d.name, category: d.deviceType.category, building: d.building?.name,
      status: d.status, lastSeen: d.lastSeenAt,
      telemetryPoints: d._count.telemetry, alarmCount: d._count.alarms,
      healthScore: this.calculateHealthScore(d.status, d._count.alarms, d.lastSeenAt),
    }));
  }

  private mapDeviceToDto(device: any) {
    return {
      id: device.id, name: device.name, category: device.deviceType.category,
      typeName: device.deviceType.name, status: device.status,
      position: { x: device.positionX, y: device.positionY, z: device.positionZ },
      lastSeen: device.lastSeenAt,
    };
  }

  private aggregateClimateData(data: any[]) {
    if (data.length === 0) return null;
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    return {
      avgTemperature: avg(data.map(d => d.avgTemp).filter(Boolean)),
      avgHumidity: avg(data.map(d => d.avgHumidity).filter(Boolean)),
      avgCO2: avg(data.map(d => d.avgCO2).filter(Boolean)),
      avgNH3: avg(data.map(d => d.avgNH3).filter(Boolean)),
      avgH2S: avg(data.map(d => d.avgH2S).filter(Boolean)),
      avgAirflow: avg(data.map(d => d.avgAirflow).filter(Boolean)),
      minTemperature: Math.min(...data.map(d => d.minTemp).filter(Boolean)),
      maxTemperature: Math.max(...data.map(d => d.maxTemp).filter(Boolean)),
      readingsCount: data.length,
    };
  }

  private calculateHealthScore(status: string, alarmCount: number, lastSeen: Date | null): number {
    let score = 100;
    if (status === 'OFFLINE') score -= 40;
    if (status === 'ERROR') score -= 50;
    if (status === 'WARNING') score -= 20;
    score -= alarmCount * 5;
    if (lastSeen && new Date().getTime() - lastSeen.getTime() > 3600000) score -= 10;
    return Math.max(0, score);
  }
}
