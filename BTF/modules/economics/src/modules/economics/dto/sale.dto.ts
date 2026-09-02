import { IsString, IsDate, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateSaleRecordDto {
  @ApiProperty({ description: 'Batch ID' })
  @IsString()
  batchId: string;

  @ApiProperty({ description: 'Sale date' })
  @IsDate()
  @Transform(({ value }) => new Date(value))
  date: Date;

  @ApiProperty({ description: 'Contractor ID' })
  @IsString()
  contractorId: string;

  @ApiProperty({ description: 'Contractor name' })
  @IsString()
  contractorName: string;

  @ApiProperty({ description: 'Number of birds sold' })
  @IsNumber()
  birdsCount: number;

  @ApiProperty({ description: 'Total weight in kg' })
  @IsNumber()
  totalWeightKg: number;

  @ApiProperty({ description: 'Average weight per bird in kg' })
  @IsNumber()
  avgWeightKg: number;

  @ApiProperty({ description: 'Price per kg' })
  @IsNumber()
  pricePerKg: number;

  @ApiProperty({ description: 'Quality grade', required: false })
  @IsOptional()
  @IsString()
  qualityGrade?: string;

  @ApiProperty({ description: 'Document number', required: false })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiProperty({ description: 'Transport cost', required: false })
  @IsOptional()
  @IsNumber()
  transportCost?: number;

  @ApiProperty({ description: 'Slaughter cost', required: false })
  @IsOptional()
  @IsNumber()
  slaughterCost?: number;
}

export class SaleAnalysisDto {
  @ApiProperty()
  batchId: string;

  @ApiProperty()
  optimalSaleDate: Date;

  @ApiProperty()
  delayImpactPerDay: number;

  @ApiProperty()
  predictedRevenue: number;

  @ApiProperty()
  bestContractor: string;

  @ApiProperty()
  priceTrend: 'rising' | 'falling' | 'stable';

  @ApiProperty()
  recommendedAction: string;
}
