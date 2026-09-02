import { Test, TestingModule } from '@nestjs/testing';
import { AIAdvisorService } from './ai-advisor.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AIAdvisorService', () => {
  let service: AIAdvisorService;
  let prisma: PrismaService;

  const mockPrisma = {
    flock: {
      findUnique: jest.fn(),
    },
    disease: {
      findMany: jest.fn(),
    },
    aIAdvisorLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIAdvisorService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AIAdvisorService>(AIAdvisorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyze', () => {
    it('should return disease predictions sorted by probability', async () => {
      const mockFlock = {
        id: 'flock-1',
        ageDays: 21,
        dailyMetrics: [],
        treatments: [],
        healthRecords: [],
      };

      const mockDiseases = [
        {
          id: 'dis-1',
          name: 'Coccidiosis',
          symptoms: ['diarrhea', 'blood in feces', 'lethargy'],
          fcrImpact: 10,
          adgImpact: 15,
        },
        {
          id: 'dis-2',
          name: 'Newcastle Disease',
          symptoms: ['respiratory distress', 'nervous signs'],
          fcrImpact: 20,
          adgImpact: 25,
        },
      ];

      mockPrisma.flock.findUnique.mockResolvedValue(mockFlock);
      mockPrisma.disease.findMany.mockResolvedValue(mockDiseases);

      const result = await service.analyze({
        flockId: 'flock-1',
        symptoms: ['diarrhea', 'blood in feces'],
        temperature: 24,
        humidity: 65,
      }, 'vet-1');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].diseaseName).toBe('Coccidiosis');
      expect(result[0].probability).toBeGreaterThan(result[1]?.probability || 0);
      expect(result[0].disclaimer).toContain('Nie zastępuje oceny lekarza weterynarii');

      expect(mockPrisma.aIAdvisorLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            disclaimerShown: true,
            flockId: 'flock-1',
          }),
        })
      );
    });

    it('should throw error when flock not found', async () => {
      mockPrisma.flock.findUnique.mockResolvedValue(null);

      await expect(
        service.analyze({ flockId: 'non-existent', symptoms: ['cough'] }, 'vet-1')
      ).rejects.toThrow('Flock not found');
    });
  });
});
