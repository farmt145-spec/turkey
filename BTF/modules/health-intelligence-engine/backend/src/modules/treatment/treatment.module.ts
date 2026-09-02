import { Module } from '@nestjs/common';
import { TreatmentController } from './treatment.controller';
import { TreatmentService } from './treatment.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [TreatmentController],
  providers: [TreatmentService],
  exports: [TreatmentService],
})
export class TreatmentModule {}
