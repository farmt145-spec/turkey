import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { HealthRecordType } from '@prisma/client';

export class HealthQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  flockId?: string;

  @ApiPropertyOptional({ enum: HealthRecordType })
  @IsOptional()
  @IsEnum(HealthRecordType)
  type?: HealthRecordType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}
