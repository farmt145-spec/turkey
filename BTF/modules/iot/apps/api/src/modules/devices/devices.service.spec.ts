import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DevicesService } from './devices.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('DevicesService', () => {
  let service: DevicesService;
  let prisma: any;
  let eventEmitter: any;

  const mockDevice = { id: 'test-device-id', name: 'Test Sensor', farmId: 'farm-1', deviceTypeId: 'type-1', status: 'ONLINE', lastSeenAt: new Date(), isActive: true, createdAt: new Date(), updatedAt: new Date() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: PrismaService, useValue: { device: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() }, telemetry: { createMany: jest.fn(), findMany: jest.fn() } } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = module.get<DevicesService>(DevicesService);
    prisma = module.get(PrismaService);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('create', () => {
    it('should create a device and emit event', async () => {
      prisma.device.create.mockResolvedValue(mockDevice);
      const result = await service.create({ farmId: 'farm-1', deviceTypeId: 'type-1', name: 'New Sensor' } as any);
      expect(prisma.device.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('device.created', mockDevice);
      expect(result).toEqual(mockDevice);
    });
  });

  describe('findOne', () => {
    it('should return device', async () => {
      prisma.device.findUnique.mockResolvedValue(mockDevice);
      const result = await service.findOne('test-device-id');
      expect(result).toEqual(mockDevice);
    });
    it('should throw NotFoundException', async () => {
      prisma.device.findUnique.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('ingestTelemetry', () => {
    it('should ingest telemetry', async () => {
      prisma.device.findUnique.mockResolvedValue(mockDevice);
      prisma.telemetry.createMany.mockResolvedValue({ count: 2 });
      prisma.device.update.mockResolvedValue({ ...mockDevice, status: 'ONLINE' });
      const result = await service.ingestTelemetry('test-device-id', { points: [{ timestamp: new Date().toISOString(), value: { temperature: 24.5 } }] } as any);
      expect(result).toEqual({ ingested: 1 });
    });
  });
});
