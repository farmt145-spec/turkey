import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FarmsModule } from './modules/farms/farms.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { DevicesModule } from './modules/devices/devices.module';
import { DeviceTypesModule } from './modules/device-types/device-types.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { AlarmsModule } from './modules/alarms/alarms.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiEngineModule } from './modules/ai-engine/ai-engine.module';
import { DigitalTwinModule } from './modules/digital-twin/digital-twin.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({ wildcard: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule, AuthModule, UsersModule, FarmsModule, BuildingsModule,
    DevicesModule, DeviceTypesModule, TelemetryModule, AlarmsModule,
    NotificationsModule, AiEngineModule, DigitalTwinModule,
    IntegrationsModule, DashboardModule, ReportsModule,
  ],
})
export class AppModule {}
