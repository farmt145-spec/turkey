import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { DeviceStatus, DeviceCategory } from '@prisma/client';

export class DeviceFilterDto {
  @ApiPropertyOptional() @IsUUID() @IsOptional() farmId?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() buildingId?: string;
  @ApiPropertyOptional({ enum: DeviceStatus }) @IsEnum(DeviceStatus) @IsOptional() status?: DeviceStatus;
  @ApiPropertyOptional({ enum: DeviceCategory }) @IsEnum(DeviceCategory) @IsOptional() category?: DeviceCategory;
  @ApiPropertyOptional() @IsOptional() search?: string;
}
