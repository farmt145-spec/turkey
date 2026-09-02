import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AlertType, AlertSeverity } from '@prisma/client';

export class CreateAlertDto {
  @ApiProperty({ enum: AlertType })
  @IsEnum(AlertType)
  type: AlertType;

  @ApiProperty({ enum: AlertSeverity })
  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lotId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  siloId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  details?: Record<string, any>;
}

export class ResolveAlertDto {
  @ApiProperty()
  @IsString()
  alertId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  resolution?: string;
}
