import { Test, TestingModule } from '@nestjs/testing';
import { EconomicsService } from '../src/modules/economics/economics.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/modules/common/audit/audit.service';
import { NotFoundException } from '@nestjs/common';

describe('EconomicsService', () => {
  let service: EconomicsService;
  let prisma: PrismaService;

  const mockPrisma = {
    batch: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    dailyCost: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    scenarioResult: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    aIAdvisor: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    benchmarkEntry: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    saleRecord: {
      create: jest.fn(),
    },
    financialDashboard: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    executiveSummary: {
      create: jest.fn(),
    },
    feedRecipe: {
      findUnique: jest.fn(),
    },
  };

  const mockAudit = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EconomicsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<EconomicsService>(EconomicsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('createDailyCost', () => {
    it('should create daily cost and recalculate batch', async () => {
      const dto = {
        batchId: 'batch-1',
        date: new Date(),
        feedCost: 5000,
        energyCost: 800,
      };

      mockPrisma.batch.findUnique.mockResolvedValue({
        id: 'batch-1',
        currentCount: 10000,
        avgWeight: 8.5,
        totalCost: 0,
      });

      mockPrisma.dailyCost.create.mockResolvedValue({
        id: 'cost-1',
        ...dto,
        totalCost: 5800,
        costPerBird: 0.58,
        costPerKg: 0.068,
      });

      mockPrisma.dailyCost.findMany.mockResolvedValue([
        { totalCost: 5800, feedCost: 5000, energyCost: 800, gasCost: 0, heatingCost: 0, medicationCost: 0, vaccinationCost: 0, vitaminCost: 0, laborCost: 0 },
      ]);

      const result = await service.createDailyCost(dto, 'user-1');

      expect(result.totalCost).toBe(5800);
      expect(mockPrisma.dailyCost.create).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid batch', async () => {
      mockPrisma.batch.findUnique.mockResolvedValue(null);

      await expect(
        service.createDailyCost({ batchId: 'invalid', date: new Date() }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('predictProfit', () => {
    it('should calculate profit prediction', async () => {
      mockPrisma.batch.findUnique.mockResolvedValue({
        id: 'batch-1',
        currentCount: 9500,
        avgWeight: 10.5,
        fcr: 2.4,
        mortalityTotal: 500,
        chicksReceived: 10000,
        totalCost: 450000,
        startDate: new Date(Date.now() - 90 * 86400000),
        dailyCosts: [{ totalCost: 5000, feedCost: 3500 }],
        feedRecords: [],
        saleRecords: [],
      });

      const result = await service.predictProfit({
        batchId: 'batch-1',
        expectedPricePerKg: 13.0,
        expectedFinalWeight: 12.0,
      });

      expect(result.batchId).toBe('batch-1');
      expect(result.predictedProfit).toBeDefined();
      expect(result.breakEvenPrice).toBeDefined();
      expect(result.decisionImpacts).toHaveLength(4);
    });
  });

  describe('createScenario', () => {
    it('should create what-if scenario', async () => {
      mockPrisma.batch.findUnique.mockResolvedValue({
        id: 'batch-1',
        currentCount: 9500,
        avgWeight: 10.5,
        totalCost: 450000,
        predictedMargin: 15,
        predictedProfit: 75000,
        dailyCosts: [{ feedCost: 3500, gasCost: 200, heatingCost: 300 }],
        feedRecords: [],
      });

      mockPrisma.scenarioResult.create.mockResolvedValue({
        id: 'scenario-1',
        batchId: 'batch-1',
        name: 'Pasza +15%',
        predictedCost: 480000,
        predictedMargin: 12,
        predictedProfit: 60000,
        predictedCostPerKg: 4.8,
        impactOnProfit: -15000,
        createdAt: new Date(),
      });

      const result = await service.createScenario(
        {
          batchId: 'batch-1',
          name: 'Pasza +15%',
          paramFeedPriceChange: 15,
        },
        'user-1',
      );

      expect(result.name).toBe('Pasza +15%');
      expect(result.impactOnProfit).toBeLessThan(0);
    });
  });

  describe('generateAIRecommendations', () => {
    it('should generate recommendations based on batch data', async () => {
      mockPrisma.batch.findUnique.mockResolvedValue({
        id: 'batch-1',
        currentCount: 9500,
        avgWeight: 10.5,
        fcr: 2.7,
        adg: 52,
        epef: 280,
        mortalityTotal: 500,
        chicksReceived: 10000,
        totalCost: 450000,
        startDate: new Date(Date.now() - 95 * 86400000),
        dailyCosts: [
          { feedCost: 3500, energyCost: 500, gasCost: 300, heatingCost: 200, medicationCost: 100, vaccinationCost: 50, vitaminCost: 30, laborCost: 400 },
        ],
        feedRecords: [],
        healthRecords: [],
      });

      mockPrisma.aIAdvisor.create.mockResolvedValue({});

      const result = await service.generateAIRecommendations('batch-1');

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((r) => r.category === 'FEED')).toBe(true);
    });
  });

  describe('getDashboard', () => {
    it('should return financial dashboard', async () => {
      mockPrisma.financialDashboard.findUnique.mockResolvedValue(null);

      mockPrisma.batch.findMany.mockResolvedValue([
        {
          id: 'batch-1',
          status: 'ACTIVE',
          totalCost: 450000,
          currentCount: 9500,
          avgWeight: 10.5,
          dailyCosts: [
            { totalCost: 5000, feedCost: 3500, energyCost: 500, gasCost: 300, heatingCost: 200, medicationCost: 100, vaccinationCost: 50, vitaminCost: 30, laborCost: 400, date: new Date() },
          ],
          saleRecords: [],
        },
      ]);

      mockPrisma.financialDashboard.upsert.mockResolvedValue({});

      const result = await service.getDashboard({
        farmId: 'farm-1',
        period: 'DAILY' as any,
      });

      expect(result.farmId).toBe('farm-1');
      expect(result.totalCosts).toBeGreaterThan(0);
      expect(result.costBreakdown).toBeDefined();
      expect(result.revenueTrend).toBeDefined();
    });
  });
});
