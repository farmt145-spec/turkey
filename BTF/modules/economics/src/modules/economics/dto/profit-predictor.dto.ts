import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProfitPredictorDto {
  @ApiProperty({ description: 'Batch ID' })
  @IsString()
  batchId: string;

  @ApiProperty({ description: 'Expected sale price per kg', required: false })
  @IsOptional()
  @IsNumber()
  expectedPricePerKg?: number;

  @ApiProperty({ description: 'Expected final weight per bird', required: false })
  @IsOptional()
  @IsNumber()
  expectedFinalWeight?: number;

  @ApiProperty({ description: 'Expected mortality rate (0-1)', required: false })
  @IsOptional()
  @IsNumber()
  expectedMortalityRate?: number;
}

export class ProfitPredictionResultDto {
  @ApiProperty()
  batchId: string;

  @ApiProperty()
  predictedMargin: number;

  @ApiProperty()
  predictedProfit: number;

  @ApiProperty()
  breakEvenPrice: number;

  @ApiProperty()
  predictedFinalCost: number;

  @ApiProperty()
  predictedCostPerKg: number;

  @ApiProperty()
  daysToBreakEven: number;

  @ApiProperty()
  confidenceScore: number;

  @ApiProperty({ type: [DecisionImpactDto] })
  decisionImpacts: DecisionImpactDto[];
}

export class DecisionImpactDto {
  @ApiProperty()
  decision: string;

  @ApiProperty()
  impactOnProfit: number;

  @ApiProperty()
  impactOnMargin: number;

  @ApiProperty()
  recommendation: string;
}
