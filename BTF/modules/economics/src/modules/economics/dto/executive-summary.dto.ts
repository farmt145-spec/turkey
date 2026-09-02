import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SummaryPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  BATCH = 'BATCH',
}

export class GenerateExecutiveSummaryDto {
  @ApiProperty({ description: 'Batch ID' })
  @IsString()
  batchId: string;

  @ApiProperty({ enum: SummaryPeriod })
  @IsEnum(SummaryPeriod)
  period: SummaryPeriod;
}

export class ExecutiveSummaryDto {
  @ApiProperty()
  batchId: string;

  @ApiProperty()
  generatedAt: Date;

  @ApiProperty()
  period: SummaryPeriod;

  @ApiProperty({ type: [String] })
  strengths: string[];

  @ApiProperty({ type: [String] })
  threats: string[];

  @ApiProperty({ type: [TopCostDto] })
  topCosts: TopCostDto[];

  @ApiProperty({ type: [String] })
  profitOpportunities: string[];

  @ApiProperty()
  endForecast: EndForecastDto;

  @ApiProperty({ type: [RecommendationDto] })
  recommendations: RecommendationDto[];

  @ApiProperty()
  metricsSnapshot: MetricsSnapshotDto;
}

export class TopCostDto {
  @ApiProperty()
  category: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  percent: number;
}

export class EndForecastDto {
  @ApiProperty()
  predictedDate: Date;

  @ApiProperty()
  predictedWeight: number;

  @ApiProperty()
  predictedMargin: number;
}

export class RecommendationDto {
  @ApiProperty()
  action: string;

  @ApiProperty()
  impact: string;

  @ApiProperty()
  priority: string;
}

export class MetricsSnapshotDto {
  @ApiProperty()
  currentFcr: number;

  @ApiProperty()
  currentAdg: number;

  @ApiProperty()
  currentEpef: number;

  @ApiProperty()
  currentCostPerKg: number;

  @ApiProperty()
  currentMortality: number;

  @ApiProperty()
  daysInProduction: number;

  @ApiProperty()
  currentWeight: number;
}
