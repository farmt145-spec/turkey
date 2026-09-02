import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DigitalTwinService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentState(farmId: string, buildingId?: string) {
    const buildings = await this.prisma.building.findMany({
      where: { farmId, isActive: true, ...(buildingId && { id: buildingId }) },
      include: {
        zones: { include: { devices: { where: { isActive: true }, include: { deviceType: { select: { category: true, name: true, icon: true } }, telemetry: { orderBy: { timestamp: 'desc' }, take: 1 } } } } },
        devices: { where: { isActive: true, zoneId: null }, include: { deviceType: { select: { category: true, name: true, icon: true } }, telemetry: { orderBy: { timestamp: 'desc' }, take: 1 } } },
        climateData: { orderBy: { timestamp: 'desc' }, take: 1 },
      },
    });
    const state = { timestamp: new Date().toISOString(), farmId, buildings: buildings.map(b => ({
      id: b.id, name: b.name, type: b.type, layout: b.layout, climate: b.climateData[0] || null,
      zones: b.zones.map(z => ({ id: z.id, name: z.name, position: { x: z.positionX, y: z.positionY, z: z.positionZ }, devices: z.devices.map(d => this.enrichDeviceState(d)) })),
      unzonedDevices: b.devices.map(d => this.enrichDeviceState(d)),
    })) };
    await this.prisma.digitalTwinState.create({ data: { farmId, buildingId: buildingId || null, state: state as any } });
    return state;
  }

  private enrichDeviceState(device: any) {
    const lastTelemetry = device.telemetry[0];
    let currentValue = null;
    if (lastTelemetry) { const raw = lastTelemetry.rawValue as any; currentValue = raw.value ?? raw.temperature ?? raw.humidity ?? raw.level ?? raw.reading ?? raw; }
    return { id: device.id, name: device.name, category: device.deviceType.category, typeName: device.deviceType.name, status: device.status, position: { x: device.positionX, y: device.positionY, z: device.positionZ }, lastTelemetry: lastTelemetry ? { timestamp: lastTelemetry.timestamp, value: currentValue, unit: lastTelemetry.unit, quality: lastTelemetry.quality } : null, isStale: lastTelemetry ? new Date().getTime() - new Date(lastTelemetry.timestamp).getTime() > 300000 : true };
  }
}
