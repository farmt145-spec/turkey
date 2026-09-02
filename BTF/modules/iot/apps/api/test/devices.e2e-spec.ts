import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('DevicesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.$executeRaw`TRUNCATE TABLE "devices", "farms", "device_types", "users" CASCADE`;
    const farm = await prisma.farm.create({ data: { name: 'Test Farm', location: 'Test Location' } });
    const deviceType = await prisma.deviceType.create({ data: { code: 'TEMP_SENSOR', name: 'Temperature Sensor', category: 'TEMPERATURE_SENSOR' } });
    await prisma.device.create({ data: { farmId: farm.id, deviceTypeId: deviceType.id, name: 'Test Device', status: 'ONLINE' } });
    const user = await prisma.user.create({ data: { email: 'test@bloodyturkey.com', password: '$2b$10$hashedpassword', firstName: 'Test', lastName: 'User', role: 'ADMIN' } });
    await prisma.userFarm.create({ data: { userId: user.id, farmId: farm.id, role: 'ADMIN' } });
    const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'test@bloodyturkey.com', password: 'password123' });
    authToken = loginRes.body.access_token;
  });

  afterAll(async () => { await app.close(); });

  it('GET /api/v1/devices should return devices', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/devices').set('Authorization', `Bearer ${authToken}`).expect(200);
    expect(response.body).toBeInstanceOf(Array);
  });
});
