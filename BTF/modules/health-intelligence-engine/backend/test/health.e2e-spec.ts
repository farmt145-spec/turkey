import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('HealthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'vet@test.com',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'Vet',
        role: 'VETERINARIAN'
      });

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'vet@test.com', password: 'Test123!' });

    authToken = login.body.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('/health (POST)', () => {
    it('should create health record with valid data', async () => {
      const createDto = {
        type: 'TREATMENT',
        flockId: 'test-flock-id',
        date: new Date().toISOString(),
        description: 'Test treatment record',
        performedBy: 'Dr. Test',
        cost: 150.00
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/health')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('TREATMENT');
      expect(response.body.description).toBe('Test treatment record');
    });

    it('should reject unauthorized access', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/health')
        .send({})
        .expect(401);
    });
  });

  describe('/health (GET)', () => {
    it('should return paginated health records', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
