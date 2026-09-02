import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EconomicsModule } from '../src/modules/economics/economics.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { AuditModule } from '../src/modules/common/audit/audit.module';

describe('EconomicsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [EconomicsModule, PrismaModule, AuditModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/economics/costs (POST)', () => {
    it('should create a daily cost entry', () => {
      return request(app.getHttpServer())
        .post('/economics/costs')
        .set('Authorization', 'Bearer test-token')
        .send({
          batchId: 'test-batch-id',
          date: new Date().toISOString(),
          feedCost: 5000,
          energyCost: 800,
        })
        .expect(201);
    });
  });

  describe('/economics/predict (POST)', () => {
    it('should return profit prediction', () => {
      return request(app.getHttpServer())
        .post('/economics/predict')
        .set('Authorization', 'Bearer test-token')
        .send({
          batchId: 'test-batch-id',
          expectedPricePerKg: 13.5,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('predictedProfit');
          expect(res.body).toHaveProperty('decisionImpacts');
        });
    });
  });

  describe('/economics/scenarios (POST)', () => {
    it('should create a scenario', () => {
      return request(app.getHttpServer())
        .post('/economics/scenarios')
        .set('Authorization', 'Bearer test-token')
        .send({
          batchId: 'test-batch-id',
          name: 'Test Scenario',
          paramFeedPriceChange: 15,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('impactOnProfit');
        });
    });
  });

  describe('/economics/dashboard (GET)', () => {
    it('should return dashboard data', () => {
      return request(app.getHttpServer())
        .get('/economics/dashboard?farmId=test-farm&period=DAILY')
        .set('Authorization', 'Bearer test-token')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalCosts');
          expect(res.body).toHaveProperty('costBreakdown');
          expect(res.body).toHaveProperty('revenueTrend');
        });
    });
  });

  describe('/economics/executive-summary (POST)', () => {
    it('should generate executive summary', () => {
      return request(app.getHttpServer())
        .post('/economics/executive-summary')
        .set('Authorization', 'Bearer test-token')
        .send({
          batchId: 'test-batch-id',
          period: 'WEEKLY',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('strengths');
          expect(res.body).toHaveProperty('threats');
          expect(res.body).toHaveProperty('recommendations');
        });
    });
  });
});
