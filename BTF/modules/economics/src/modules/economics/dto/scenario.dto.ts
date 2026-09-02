import { IsString, IsOptional, IsNumber, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScenarioDto {
  @ApiProperty({ description: 'Batch ID' })
  @IsString()
  batchId: string;

  @ApiProperty({ description: 'Scenario name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Scenario description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Feed price change %', required: false })
  @IsOptional()
  @IsNumber()
  paramFeedPriceChange?: number;

  @ApiProperty({ description: 'Soy price change %', required: false })
  @IsOptional()
  @IsNumber()
  paramSoyPriceChange?: number;

  @ApiProperty({ description: 'FCR change', required: false })
  @IsOptional()
  @IsNumber()
  paramFcrChange?: number;

  @ApiProperty({ description: 'Mortality change %', required: false })
  @IsOptional()
  @IsNumber()
  paramMortalityChange?: number;

  @ApiProperty({ description: 'Sale delay in days', required: false })
  @IsOptional()
  @IsInt()
  paramSaleDelayDays?: number;

  @ApiProperty({ description: 'Gas price change %', required: false })
  @IsOptional()
  @IsNumber()
  paramGasPriceChange?: number;

  @ApiProperty({ description: 'Recipe ID to switch to', required: false })
  @IsOptional()
  @IsString()
  paramRecipeId?: string;
}

export class ScenarioResultDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  batchId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  predictedCost: number;

  @ApiProperty()
  predictedMargin: number;

  @ApiProperty()
  predictedProfit: number;

  @ApiProperty()
  predictedCostPerKg: number;

  @ApiProperty()
  impactOnProfit: number;

  @ApiProperty()
  impactOnMargin: number;

  @ApiProperty()
  createdAt: Date;
}
