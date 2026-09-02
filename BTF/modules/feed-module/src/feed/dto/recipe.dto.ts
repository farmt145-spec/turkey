import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsArray, IsDecimal, Min, Max, IsUUID, ValidateNested, IsJSON } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TurkeyGender, ProductionType, GrowthPhase, OptimizationTarget, ValidationStatus } from '@prisma/client';

export class RecipeIngredientDto {
  @ApiProperty()
  @IsUUID()
  rawMaterialId: string;

  @ApiProperty({ example: 45.5 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  mixingOrder?: number;
}

export class CreateRecipeDto {
  @ApiProperty({ example: 'Indyk brojler - starter' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'REC-2026-001' })
  @IsString()
  code: string;

  @ApiProperty()
  @IsUUID()
  standardId: string;

  @ApiProperty({ example: 7 })
  @IsNumber()
  targetAgeDays: number;

  @ApiProperty({ enum: TurkeyGender })
  @IsEnum(TurkeyGender)
  targetGender: TurkeyGender;

  @ApiProperty({ enum: ProductionType })
  @IsEnum(ProductionType)
  targetProductionType: ProductionType;

  @ApiProperty({ type: [RecipeIngredientDto] })
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients: RecipeIngredientDto[];

  @ApiPropertyOptional({ enum: OptimizationTarget, default: OptimizationTarget.BALANCED })
  @IsOptional()
  @IsEnum(OptimizationTarget)
  optimizationTarget?: OptimizationTarget;
}

export class UpdateRecipeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: [RecipeIngredientDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients?: RecipeIngredientDto[];
}

export class GenerateRecipeDto {
  @ApiProperty({ enum: TurkeyGender })
  @IsEnum(TurkeyGender)
  gender: TurkeyGender;

  @ApiProperty({ enum: ProductionType })
  @IsEnum(ProductionType)
  productionType: ProductionType;

  @ApiProperty({ example: 7 })
  @IsNumber()
  ageDays: number;

  @ApiProperty({ enum: GrowthPhase })
  @IsEnum(GrowthPhase)
  phase: GrowthPhase;

  @ApiPropertyOptional({ enum: OptimizationTarget, default: OptimizationTarget.BALANCED })
  @IsOptional()
  @IsEnum(OptimizationTarget)
  priority?: OptimizationTarget;

  @ApiPropertyOptional({ example: 1800 })
  @IsOptional()
  @IsNumber()
  maxCostPerTon?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  availableMaterials?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  excludedMaterials?: string[];
}

export class SimulateChangeDto {
  @ApiProperty()
  @IsUUID()
  recipeId: string;

  @ApiProperty()
  @IsUUID()
  ingredientId: string;

  @ApiProperty({ example: 3.0, description: 'Zmiana w procentach (może być ujemna)' })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  percentageChange: number;
}

export class RecipeResponseDto {
  id: string;
  name: string;
  code: string;
  version: number;
  standard: {
    id: string;
    name: string;
    phase: GrowthPhase;
  };
  targetAgeDays: number;
  targetGender: TurkeyGender;
  ingredients: Array<{
    id: string;
    rawMaterial: {
      id: string;
      name: string;
      code: string;
    };
    percentage: number;
    quantityKg: number;
    costPerTon: number;
    aiExplanation?: string;
    aiImpact?: {
      fcr: number;
      adg: number;
      gutHealth: number;
      immunity: number;
      litterQuality: number;
      legQuality: number;
      waterConsumption: number;
      costImpact: number;
    };
  }>;
  calculatedNutrition: Record<string, number>;
  costPerTon: number;
  costPerKg: number;
  aiConfidence?: number;
  aiReasoning?: string;
  validationStatus: ValidationStatus;
  warnings?: Array<{
    parameter: string;
    message: string;
    severity: string;
    consequences: string[];
  }>;
  isProductionReady: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class NutritionalStandardDto {
  @ApiProperty({ example: 'Indyk brojler - starter 0-14 dni' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'STD-BROILER-STARTER-001' })
  @IsString()
  code: string;

  @ApiProperty({ enum: TurkeyGender })
  @IsEnum(TurkeyGender)
  gender: TurkeyGender;

  @ApiProperty({ enum: ProductionType })
  @IsEnum(ProductionType)
  productionType: ProductionType;

  @ApiProperty({ enum: GrowthPhase })
  @IsEnum(GrowthPhase)
  phase: GrowthPhase;

  @ApiProperty({ example: 0 })
  @IsNumber()
  ageFromDays: number;

  @ApiProperty({ example: 14 })
  @IsNumber()
  ageToDays: number;

  @ApiProperty({ example: 2800 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  meMin: number;

  @ApiProperty({ example: 2950 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  meMax: number;

  @ApiProperty({ example: 28.0 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  crudeProteinMin: number;

  @ApiProperty({ example: 30.0 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  crudeProteinMax: number;

  @ApiPropertyOptional({ example: 1.0 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  @Type(() => Number)
  caToTotalPMin?: number;

  @ApiPropertyOptional({ example: 2.0 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  @Type(() => Number)
  caToTotalPMax?: number;

  @ApiPropertyOptional({ example: 0.15 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  sodiumMin?: number;

  @ApiPropertyOptional({ example: 0.20 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  sodiumMax?: number;

  @ApiPropertyOptional({ example: 1.65 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  targetFcr?: number;

  @ApiPropertyOptional({ example: 45.0 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  targetAdg?: number;

  @ApiPropertyOptional({ example: 380 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  targetEpef?: number;
}
