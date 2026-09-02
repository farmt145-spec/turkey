import { IsString, IsDate, IsNumber, IsOptional, IsDecimal } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateDailyCostDto {
  @ApiProperty({ description: 'Batch ID' })
  @IsString()
  batchId: string;

  @ApiProperty({ description: 'Date of cost entry' })
  @IsDate()
  @Transform(({ value }) => new Date(value))
  date: Date;

  @ApiProperty({ description: 'Chicks cost', required: false })
  @IsOptional()
  @IsNumber()
  chicksCost?: number;

  @ApiProperty({ description: 'Feed cost', required: false })
  @IsOptional()
  @IsNumber()
  feedCost?: number;

  @ApiProperty({ description: 'Energy cost', required: false })
  @IsOptional()
  @IsNumber()
  energyCost?: number;

  @ApiProperty({ description: 'Gas cost', required: false })
  @IsOptional()
  @IsNumber()
  gasCost?: number;

  @ApiProperty({ description: 'Heating cost', required: false })
  @IsOptional()
  @IsNumber()
  heatingCost?: number;

  @ApiProperty({ description: 'Bedding cost', required: false })
  @IsOptional()
  @IsNumber()
  beddingCost?: number;

  @ApiProperty({ description: 'Labor cost', required: false })
  @IsOptional()
  @IsNumber()
  laborCost?: number;

  @ApiProperty({ description: 'Medication cost', required: false })
  @IsOptional()
  @IsNumber()
  medicationCost?: number;

  @ApiProperty({ description: 'Vaccination cost', required: false })
  @IsOptional()
  @IsNumber()
  vaccinationCost?: number;

  @ApiProperty({ description: 'Vitamin cost', required: false })
  @IsOptional()
  @IsNumber()
  vitaminCost?: number;

  @ApiProperty({ description: 'Transport cost', required: false })
  @IsOptional()
  @IsNumber()
  transportCost?: number;

  @ApiProperty({ description: 'Depreciation cost', required: false })
  @IsOptional()
  @IsNumber()
  depreciationCost?: number;

  @ApiProperty({ description: 'Other costs', required: false })
  @IsOptional()
  @IsNumber()
  otherCost?: number;
}
