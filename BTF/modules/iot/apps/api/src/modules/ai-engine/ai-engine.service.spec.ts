import { Test, TestingModule } from '@nestjs/testing';
import { AiEngineService } from './ai-engine.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('AiEngineService', () => {
  let service: AiEngineService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiEngineService,
        { provide: PrismaService, useValue: { device: { findUnique: jest.fn(), update: jest.fn() }, aIPrediction: { create: jest.fn(), findMany: jest.fn() }, feedSilo: { findMany: jest.fn() }, telemetry: { findMany: jest.fn() }, fCRRecord: { findMany: jest.fn() }, mortalityRecord: { findMany: jest.fn() }, climateData: { findMany: jest.fn() } } },
        { provide: NotificationsService, useValue: { sendAlarm: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = module.get<AiEngineService>(AiEngineService);
    prisma = module.get(PrismaService);
  });

  describe('getRecommendations', () => {
    it('should return formatted recommendations', async () => {
      const mockPredictions = [{ id: 'pred-1', type: 'DEVICE_FAILURE', confidence: 0.85, deviceId: 'dev-1', buildingId: 'bld-1', createdAt: new Date() }];
      prisma.aIPrediction.findMany.mockResolvedValue(mockPredictions);
      const result = await service.getRecommendations('farm-1');
      expect(result[0].recommendation).toContain('Schedule preventive maintenance');
    });
  });
});
