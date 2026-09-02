import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { WarehouseModule } from '../src/modules/warehouse/warehouse.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { AuditModule } from '../src/modules/common/audit/audit.module';

describe('WarehouseController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WarehouseModule, PrismaModule, AuditModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => await app.close());

  it('/warehouse/products (POST) - create product', () => {
    return request(app.getHttpServer())
      .post('/warehouse/products')
      .set('Authorization', 'Bearer test-token')
      .send({ organizationId: 'test-org', sku: 'TEST-001', name: 'Test Product', category: 'FEED_RAW' })
      .expect(201);
  });

  it('/warehouse/lots (POST) - create lot', () => {
    return request(app.getHttpServer())
      .post('/warehouse/lots')
      .set('Authorization', 'Bearer test-token')
      .send({ productId: 'test-prod', lotNumber: 'LOT-001', purchaseCost: 2.5, initialQuantity: 1000 })
      .expect(201);
  });

  it('/warehouse/movements (POST) - stock movement', () => {
    return request(app.getHttpServer())
      .post('/warehouse/movements')
      .set('Authorization', 'Bearer test-token')
      .send({ productId: 'test-prod', type: 'RECEIPT', subtype: 'PZ', quantity: 500, unitCost: 2.5, toWarehouseId: 'w1' })
      .expect(201);
  });

  it('/warehouse/transfers (POST) - create transfer', () => {
    return request(app.getHttpServer())
      .post('/warehouse/transfers')
      .set('Authorization', 'Bearer test-token')
      .send({ type: 'WAREHOUSE_TO_WAREHOUSE', fromWarehouseId: 'w1', toWarehouseId: 'w2', items: [{ productId: 'p1', quantity: 100 }] })
      .expect(201);
  });

  it('/warehouse/inventory (GET) - get inventory', () => {
    return request(app.getHttpServer())
      .get('/warehouse/inventory')
      .set('Authorization', 'Bearer test-token')
      .expect(200)
      .expect((res) => expect(Array.isArray(res.body)).toBe(true));
  });

  it('/warehouse/alerts/scan/:orgId (POST) - run alert scan', () => {
    return request(app.getHttpServer())
      .post('/warehouse/alerts/scan/test-org')
      .set('Authorization', 'Bearer test-token')
      .expect(201)
      .expect((res) => expect(res.body).toHaveProperty('generated'));
  });

  it('/warehouse/dashboard/:orgId (GET) - dashboard', () => {
    return request(app.getHttpServer())
      .get('/warehouse/dashboard/test-org')
      .set('Authorization', 'Bearer test-token')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('totalProducts');
        expect(res.body).toHaveProperty('totalInventoryValue');
      });
  });
});
