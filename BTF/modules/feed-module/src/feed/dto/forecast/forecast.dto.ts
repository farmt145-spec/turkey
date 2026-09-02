import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateForecastDto {
  @ApiProperty()
  @IsUUID()
  batchId: string;

  @ApiProperty()
  @IsUUID()
  recipeId: string;
}

export class ForecastResponseDto {
  forecastId: string;
  batchId: string;
  weeklyForecasts: Array<{
    week: number;
    ageDays: number;
    predictedWeight: number;
    predictedFeedConsumption: number;
    predictedFcr: number;
    predictedMortality: number;
  }>;
  summary: {
    predictedFcr: number;
    predictedAdg: number;
    predictedEpef: number;
    predictedMortality: number;
    predictedFeedConsumption: number;
    predictedWaterConsumption: number;
    predictedFeedCost: number;
    predictedTotalCost: number;
    predictedMargin: number;
  };
  assumptions: string[];
  confidenceIntervals: Record<string, { low: number; high: number }>;
}

export class ForecastAccuracyResponseDto {
  forecastId: string;
  accuracy: {
    fcrError: number;
    adgError: number;
    epefError: number;
    mortalityError: number;
    costError: number;
  };
  analysis: string;
  lessonsLearned: string[];
  modelAdjustments: Array<{
    parameter: string;
    oldWeight: number;
    newWeight: number;
    reason: string;
  }>;
}
