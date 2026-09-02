import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BenchmarkDimension {
  FARM = 'FARM',
  HOUSE = 'HOUSE',
  BATCH = 'BATCH',
  RECIPE = 'RECIPE',
}

export enum BenchmarkMetric {
  FCR = 'fcr',
  ADG = 'adg',
  EPEF = 'epef',
  COST_PER_KG = 'costPerKg',
  FEED_COST = 'feedCostPerKg',
  MORTALITY = 'mortalityRate',
  MARGIN = 'margin',
  PROFIT = 'profit',
}

export class BenchmarkQueryDto {
  @ApiProperty({ enum: BenchmarkDimension })
  @IsEnum(BenchmarkDimension)
  dimension: BenchmarkDimension;

  @ApiProperty({ enum: BenchmarkMetric })
  @IsEnum(BenchmarkMetric)
  metric: BenchmarkMetric;

  @ApiProperty({ description: 'Farm ID filter', required: false })
  @IsOptional()
  @IsString()
  farmId?: string;

  @ApiProperty({ description: 'Period (e.g., 2024-W01)', required: false })
  @IsOptional()
  @IsString()
  period?: string;
}

export class BenchmarkResultDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  value: number;

  @ApiProperty()
  rank: number;

  @ApiProperty()
  percentile: number;

  @ApiProperty()
  trend: 'up' | 'down' | 'stable';
}
