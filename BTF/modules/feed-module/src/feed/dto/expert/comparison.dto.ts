import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompareRecipesDto {
  @ApiProperty()
  @IsUUID()
  recipeAId: string;

  @ApiProperty()
  @IsUUID()
  recipeBId: string;
}

export class ComparisonResponseDto {
  comparisonId: string;
  verdict: string;
  winner: {
    id: string;
    name: string;
    isRecipeA: boolean;
  };
  differences: {
    cost: { recipeA: number; recipeB: number; difference: number; winner: string };
    fcr: { recipeA: number; recipeB: number; difference: number; winner: string };
    adg: { recipeA: number; recipeB: number; difference: number; winner: string };
    epef: { recipeA: number; recipeB: number; difference: number; winner: string };
    health: { recipeA: number; recipeB: number; difference: number; winner: string };
    gutHealth: { recipeA: number; recipeB: number; difference: number; winner: string };
  };
  detailedAnalysis: {
    nutritionComparison: Array<{
      parameter: string;
      recipeA: number;
      recipeB: number;
      difference: number;
      unit: string;
      advantage: string;
    }>;
    ingredientComparison: Array<{
      materialName: string;
      inRecipeA: boolean;
      inRecipeB: boolean;
      percentageA?: number;
      percentageB?: number;
      aiComment: string;
    }>;
  };
  recommendations: string[];
}
