import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsDate, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDailyLogDto {
  @ApiProperty()
  @IsString()
  batchId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  dayNumber: number;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  logDate: Date;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(0)
  mortalityCount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mortalityReason?: string;

  @ApiProperty({ example: 1250.5 })
  @IsOptional()
  @IsNumber()
  avgWeightGrams?: number;

  @ApiProperty({ example: 50 })
  @IsOptional()
  @IsNumber()
  sampleSize?: number;

  @ApiProperty({ example: 2850.0 })
  @IsOptional()
  @IsNumber()
  feedConsumedKg?: number;

  @ApiProperty({ example: 5200.0 })
  @IsOptional()
  @IsNumber()
  waterConsumedL?: number;

  @ApiProperty({ example: 'Grower Premium' })
  @IsOptional()
  @IsString()
  feedType?: string;

  @ApiProperty({ example: 21.5 })
  @IsOptional()
  @IsNumber()
  temperatureMin?: number;

  @ApiProperty({ example: 23.8 })
  @IsOptional()
  @IsNumber()
  temperatureMax?: number;

  @ApiProperty({ example: 22.6 })
  @IsOptional()
  @IsNumber()
  temperatureAvg?: number;

  @ApiProperty({ example: 65 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidityPercent?: number;

  @ApiProperty({ example: 1800 })
  @IsOptional()
  @IsNumber()
  co2Ppm?: number;

  @ApiProperty({ example: 12 })
  @IsOptional()
  @IsNumber()
  nh3Ppm?: number;

  @ApiProperty({ example: 16 })
  @IsOptional()
  @IsNumber()
  lightingHours?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DailyLogWithAIResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  dayNumber: number;

  @ApiProperty()
  logDate: Date;

  @ApiProperty()
  mortalityCount: number;

  @ApiProperty()
  avgWeightGrams: number;

  @ApiProperty()
  feedConsumedKg: number;

  @ApiProperty()
  waterConsumedL: number;

  @ApiProperty()
  temperatureAvg: number;

  @ApiProperty()
  humidityPercent: number;

  @ApiProperty()
  co2Ppm: number;

  @ApiProperty()
  nh3Ppm: number;

  @ApiProperty()
  fcr: number;

  @ApiProperty()
  adgGrams: number;

  @ApiProperty()
  epef: number;

  @ApiProperty()
  aiAnalysis: {
    dayScore: number;
    riskLevel: string;
    detectedIssues: string[];
    recommendations: string[];
    forecast7Days: Array<{
      day: number;
      predictedWeight: number;
      predictedMortality: number;
    }>;
  };

  @ApiProperty()
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string;
  }>;
}
