import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsDateString, IsNumber, IsArray } from 'class-validator';
import { HealthRecordType } from '@prisma/client';

export class CreateHealthRecordDto {
  @ApiProperty({ enum: HealthRecordType })
  @IsEnum(HealthRecordType)
  type: HealthRecordType;

  @ApiProperty()
  @IsString()
  flockId: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  performedBy: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  imageUrls?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  documentUrls?: string[];
}
