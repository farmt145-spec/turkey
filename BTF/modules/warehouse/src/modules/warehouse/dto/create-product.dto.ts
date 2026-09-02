import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductCategory } from '@prisma/client';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  organizationId: string;

  @ApiProperty()
  @IsString()
  sku: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ProductCategory })
  @IsEnum(ProductCategory)
  category: ProductCategory;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiProperty({ required: false, default: 'kg' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  minStock?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxStock?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  reorderPoint?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  safetyStock?: number;

  @ApiProperty({ required: false, default: 7 })
  @IsOptional()
  @IsNumber()
  leadTimeDays?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  shelfLifeDays?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  fcrImpact?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  adgImpact?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  healthImpact?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  interactions?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bestPractices?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  commonMistakes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dosageInfo?: string;
}
