import { IsString, IsOptional, IsEnum, IsArray, IsDecimal, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertType, AlertSeverity, AlertStatus } from '@prisma/client';

export class CreateAlertDto {
  @ApiProperty({ enum: AlertType })
  @IsEnum(AlertType)
  type: AlertType;

  @ApiProperty({ enum: AlertSeverity })
  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @ApiProperty()
  @IsString()
  sourceType: string;

  @ApiProperty()
  @IsUUID()
  sourceId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parameter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  actualValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  thresholdValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  consequences?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendations?: string[];
}

export class AlertResponseDto {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  parameter?: string;
  actualValue?: number;
  thresholdValue?: number;
  unit?: string;
  consequences: string[];
  recommendations: string[];
  status: AlertStatus;
  createdAt: Date;
}

export class DashboardFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  farmId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  houseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  dateFrom?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  dateTo?: Date;
}
