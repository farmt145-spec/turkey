import { IsString, IsOptional, IsEnum, IsUUID, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExpertAnalysisRequestDto {
  @ApiProperty()
  @IsUUID()
  recipeId: string;

  @ApiProperty({ enum: ['INGREDIENT_ADD', 'INGREDIENT_REMOVE', 'INGREDIENT_ADJUST', 'SUBSTITUTION', 'OPTIMIZATION', 'CORRECTION', 'EXPERIMENT'] })
  @IsString()
  decisionType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  materialId?: string;
}

export class ExplainWhyRequestDto {
  @ApiProperty()
  @IsUUID()
  recipeId: string;

  @ApiProperty()
  @IsUUID()
  materialId: string;

  @ApiProperty({ enum: ['ADD', 'REMOVE', 'ADJUST'] })
  @IsString()
  context: string;
}

export class CreateExpertProfileDto {
  @ApiProperty()
  @IsUUID()
  rawMaterialId: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  biologicalValue: string;

  @ApiProperty()
  @IsString()
  digestibility: string;

  @ApiProperty()
  @IsString()
  impactFcr: string;

  @ApiProperty()
  @IsString()
  impactAdg: string;

  @ApiProperty()
  @IsString()
  impactGutHealth: string;

  @ApiProperty()
  @IsString()
  impactImmunity: string;

  @ApiProperty()
  @IsString()
  impactLitter: string;

  @ApiProperty()
  @IsString()
  impactWater: string;

  @ApiProperty()
  @IsString()
  impactLegs: string;

  @ApiProperty()
  @IsString()
  impactCarcass: string;

  @ApiProperty()
  @IsString()
  overdoseRisk: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  overdoseSymptoms: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  deficiencySymptoms: string[];

  @ApiProperty()
  recommendedMin: number;

  @ApiProperty()
  recommendedMax: number;
}
