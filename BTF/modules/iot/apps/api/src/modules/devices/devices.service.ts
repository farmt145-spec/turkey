import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceFilterDto } from './dto/device-filter.dto';
import { TelemetryBatchDto } from './dto/telemetry-batch.dto';
import { Device, Prisma } from '@prisma/client';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService, private readonly eventEmitter: EventEmitter2) {}

  async create(dto: CreateDeviceDto): Promise<Device> {
    const device = await this.prisma.device.create({
      data: { ...dto, status: 'OFFLINE' },
      include: { deviceType: true, farm: true, building: true, zone: true },
    });
    this.eventEmitter.emit('device.created', device);
    return device;
  }

  async findAll(filters: DeviceFilterDto): Promise<Device[]> {
    const where: Prisma.DeviceWhereInput = {};
    if (filters.farmId) where.farmId = filters.farmId;
    if (filters.buildingId) where.buildingId = filters.buildingId;
    if (filters.status) where.status = filters.status;
    if (filters.category) where.deviceType = { category: filters.category };
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { serialNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.device.findMany({
      where,
      include: {
        deviceType: true,
        farm: { select: { id: true, name: true } },
        building: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
        integration: { select: { id: true, name: true, type: true, status: true } },
        _count: { select: { telemetry: true, alarms: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Device> {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: {
        deviceType: true, farm: true, building: true, zone: true, integration: true,
        telemetry: { orderBy: { timestamp: 'desc' }, take: 100 },
        alarms: { orderBy: { createdAt: 'desc' }, take: 20 },
        predictions: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!device) throw new NotFoundException(`Device ${id} not found`);
    return device;
  }

  async update(id: string, dto: UpdateDeviceDto): Promise<Device> {
    await this.findOne(id);
    const device = await this.prisma.device.update({ where: { id }, data: dto, include: { deviceType: true } });
    this.eventEmitter.emit('device.updated', device);
    return device;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.device.delete({ where: { id } });
    this.eventEmitter.emit('device.deleted', { id });
  }

  async getTelemetry(deviceId: string, from: Date, to: Date, limit = 1000) {
    return this.prisma.telemetry.findMany({
      where: { deviceId, timestamp: { gte: from, lte: to } },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async ingestTelemetry(deviceId: string, dto: TelemetryBatchDto) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) throw new NotFoundException(`Device ${deviceId} not found`);
    const data = dto.points.map((p) => ({
      deviceId,
      timestamp: new Date(p.timestamp),
      rawValue: p.value as Prisma.InputJsonValue,
      unit: p.unit,
    }));
    await this.prisma.telemetry.createMany({ data });
    await this.prisma.device.update({ where: { id: deviceId }, data: { lastSeenAt: new Date(), status: 'ONLINE' } });
    this.eventEmitter.emit('telemetry.ingested', { deviceId, points: dto.points });
    return { ingested: data.length };
  }

  async calibrate(id: string, calibrationData: Record<string, any>) {
    return this.prisma.device.update({
      where: { id },
      data: { calibration: calibrationData as Prisma.InputJsonValue, status: 'CALIBRATING' },
    });
  }

  async sendCommand(id: string, command: { type: string; params: Record<string, any> }) {
    const device = await this.findOne(id);
    this.eventEmitter.emit('device.command', { device, command });
    return { status: 'COMMAND_QUEUED', deviceId: id, commandType: command.type };
  }
}
