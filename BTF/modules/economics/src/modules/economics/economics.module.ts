import { Module } from '@nestjs/common';
import { EconomicsService } from './economics.service';
import { EconomicsController } from './economics.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [EconomicsController],
  providers: [EconomicsService],
  exports: [EconomicsService],
})
export class EconomicsModule {}
