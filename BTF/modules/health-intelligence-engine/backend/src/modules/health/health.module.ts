import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { HealthRepository } from './health.repository';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [HealthController],
  providers: [HealthService, HealthRepository],
  exports: [HealthService],
})
export class HealthModule {}
