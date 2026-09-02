import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AIAdvisorModule } from './modules/ai-advisor/ai-advisor.module';
import { AIDetectionModule } from './modules/ai-detection/ai-detection.module';
import { VaccinationModule } from './modules/vaccination/vaccination.module';
import { TreatmentModule } from './modules/treatment/treatment.module';
import { WithdrawalModule } from './modules/withdrawal/withdrawal.module';
import { DiseaseLibraryModule } from './modules/disease-library/disease-library.module';
import { RiskScoreModule } from './modules/risk-score/risk-score.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    HealthModule,
    AIAdvisorModule,
    AIDetectionModule,
    VaccinationModule,
    TreatmentModule,
    WithdrawalModule,
    DiseaseLibraryModule,
    RiskScoreModule,
    DashboardModule,
    AuditModule,
  ],
})
export class AppModule {}
