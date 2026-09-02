import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DashboardPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  BATCH = 'BATCH',
}

export class DashboardQueryDto {
  @ApiProperty({ description: 'Farm ID' })
  @IsString()
  farmId: string;

  @ApiProperty({ enum: DashboardPeriod })
  @IsEnum(DashboardPeriod)
  period: DashboardPeriod;

  @ApiProperty({ description: 'Period value (date, week, month)', required: false })
  @IsOptional()
  @IsString()
  periodValue?: string;

  @ApiProperty({ description: 'Batch ID filter', required: false })
  @IsOptional()
  @IsString()
  batchId?: string;
}

export class FinancialDashboardDto {
  @ApiProperty()
  farmId: string;

  @ApiProperty()
  period: DashboardPeriod;

  @ApiProperty()
  periodValue: string;

  @ApiProperty()
  totalCosts: number;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  totalMargin: number;

  @ApiProperty()
  ebitda: number;

  @ApiProperty()
  feedCost: number;

  @ApiProperty()
  energyCost: number;

  @ApiProperty()
  medicationCost: number;

  @ApiProperty()
  laborCost: number;

  @ApiProperty()
  activeBatches: number;

  @ApiProperty()
  birdsSold: number;

  @ApiProperty()
  totalWeightSold: number;

  @ApiProperty()
  avgPricePerKg: number;

  @ApiProperty({ type: [CostBreakdownDto] })
  costBreakdown: CostBreakdownDto[];

  @ApiProperty({ type: [RevenueTrendDto] })
  revenueTrend: RevenueTrendDto[];
}

export class CostBreakdownDto {
  @ApiProperty()
  category: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  percentage: number;

  @ApiProperty()
  trend: number;
}

export class RevenueTrendDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  cost: number;

  @ApiProperty()
  margin: number;
}
