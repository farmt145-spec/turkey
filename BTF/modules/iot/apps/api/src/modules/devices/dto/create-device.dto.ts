import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsInt, IsEnum, IsBoolean, IsIP } from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty() @IsUUID() farmId: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() buildingId?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() zoneId?: string;
  @ApiProperty() @IsUUID() deviceTypeId: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() integrationId?: string;
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() serialNumber?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() macAddress?: string;
  @ApiPropertyOptional() @IsIP() @IsOptional() ipAddress?: string;
  @ApiPropertyOptional() @IsInt() @IsOptional() modbusAddress?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() mqttTopic?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() opcUaNodeId?: string;
  @ApiPropertyOptional() @IsOptional() positionX?: number;
  @ApiPropertyOptional() @IsOptional() positionY?: number;
  @ApiPropertyOptional() @IsOptional() positionZ?: number;
  @ApiPropertyOptional({ type: 'object' }) @IsOptional() config?: Record<string, any>;
  @ApiPropertyOptional({ type: 'object' }) @IsOptional() calibration?: Record<string, any>;
}
