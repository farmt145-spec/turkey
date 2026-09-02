import { IsString, IsUUID, IsArray, ValidateNested, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ExperimentChangeDto {
  @ApiProperty()
  @IsUUID()
  materialId: string;

  @ApiProperty({ enum: ['REMOVE', 'ADD', 'ADJUST'] })
  @IsString()
  action: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  value?: number;
}

export class CreateExperimentDto {
  @ApiProperty()
  @IsUUID()
  recipeId: string;

  @ApiProperty({ example: 'Usunięcie śruty sojowej' })
  @IsString()
  name: string;

  @ApiProperty({ type: [ExperimentChangeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperimentChangeDto)
  changes: ExperimentChangeDto[];
}

export class ExperimentResponseDto {
  scenarioId: string;
  name: string;
  description: string;
  changes: Array<{
    materialName: string;
    action: string;
    oldValue?: number;
    newValue?: number;
  }>;
  nutritionComparison: Array<{
    parameter: string;
    baseValue: number;
    simulatedValue: number;
    unit: string;
    change: number;
    isWithinStandard: boolean;
  }>;
  productionImpact: {
    fcr: { base: number; simulated: number; change: number; risk: string };
    adg: { base: number; simulated: number; change: number; risk: string };
    cost: { base: number; simulated: number; change: number; unit: string };
    health: { base: number; simulated: number; change: number; score: number };
    feedIntake: { base: number; simulated: number; change: number; explanation: string };
    waterConsumption: { base: number; simulated: number; change: number; explanation: string };
  };
  riskAssessment: {
    level: string;
    factors: string[];
    recommendations: string[];
  };
}
