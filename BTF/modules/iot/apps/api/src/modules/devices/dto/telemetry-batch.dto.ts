import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

class TelemetryPointDto {
  @ApiProperty() @IsDateString() timestamp: string;
  @ApiProperty({ type: 'object' }) value: Record<string, any>;
  @ApiPropertyOptional() unit?: string;
}

export class TelemetryBatchDto {
  @ApiProperty({ type: [TelemetryPointDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => TelemetryPointDto)
  points: TelemetryPointDto[];
}
