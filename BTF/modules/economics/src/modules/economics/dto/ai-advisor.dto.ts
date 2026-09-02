import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AdvisorCategory {
  FEED = 'FEED',
  ENERGY = 'ENERGY',
  HEALTH = 'HEALTH',
  LABOR = 'LABOR',
  TRANSPORT = 'TRANSPORT',
  TIMING = 'TIMING',
  RECIPE = 'RECIPE',
  GENERAL = 'GENERAL',
}

export enum Priority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export class AIAdvisorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  batchId: string;

  @ApiProperty()
  date: Date;

  @ApiProperty({ enum: AdvisorCategory })
  category: AdvisorCategory;

  @ApiProperty({ enum: Priority })
  priority: Priority;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  justification: string;

  @ApiProperty({ required: false })
  estimatedSavings?: number;

  @ApiProperty({ required: false })
  estimatedGain?: number;

  @ApiProperty()
  actionTaken: boolean;
}

export class GenerateAdvisorDto {
  @ApiProperty({ description: 'Batch ID' })
  @IsString()
  batchId: string;
}
