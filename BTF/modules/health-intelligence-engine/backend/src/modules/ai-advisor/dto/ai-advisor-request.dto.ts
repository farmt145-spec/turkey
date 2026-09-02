import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, Min, Max } from 'class-validator';

export class AIAdvisorRequestDto {
  @ApiProperty()
  @IsString()
  flockId: string;

  @ApiProperty({ type: [String], description: 'Observed symptoms' })
  @IsArray()
  @IsString({ each: true })
  symptoms: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  temperature?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  co2?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  nh3?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  mortalityRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fcr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  feedIntake?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  waterIntake?: number;
}
