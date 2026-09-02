import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsArray, IsDecimal, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RawMaterialCategory, MaterialStatus } from '@prisma/client';

export class CreateRawMaterialDto {
  @ApiProperty({ example: 'KUK-001' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Kukurydza żółta' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameLatin?: string;

  @ApiProperty({ enum: RawMaterialCategory })
  @IsEnum(RawMaterialCategory)
  category: RawMaterialCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subcategory?: string;

  // Makro
  @ApiProperty({ example: 87.0 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  dryMatter: number;

  @ApiProperty({ example: 13.0 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  moisture: number;

  @ApiProperty({ example: 8.5 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  crudeProtein: number;

  @ApiProperty({ example: 3.8 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  crudeFat: number;

  @ApiProperty({ example: 2.5 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  crudeFiber: number;

  @ApiProperty({ example: 1.2 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  crudeAsh: number;

  @ApiProperty({ example: 65.0 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  nitrogenFreeExtract: number;

  @ApiProperty({ example: 60.0 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  starch: number;

  @ApiProperty({ example: 2.0 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  sugars: number;

  // Energia
  @ApiProperty({ example: 3350 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  mePoultry: number;

  @ApiProperty({ example: 3300 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  meTurkey: number;

  // Aminokwasy
  @ApiProperty({ example: 0.25 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  lysine: number;

  @ApiProperty({ example: 0.18 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  methionine: number;

  @ApiProperty({ example: 0.15 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  cystine: number;

  @ApiProperty({ example: 0.33 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  metCys: number;

  @ApiProperty({ example: 0.30 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  threonine: number;

  @ApiProperty({ example: 0.07 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  tryptophan: number;

  @ApiProperty({ example: 0.40 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  arginine: number;

  @ApiProperty({ example: 0.45 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  valine: number;

  @ApiProperty({ example: 0.30 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  isoleucine: number;

  @ApiProperty({ example: 1.00 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  leucine: number;

  @ApiProperty({ example: 0.25 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  histidine: number;

  @ApiProperty({ example: 0.45 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  phenylalanine: number;

  @ApiProperty({ example: 0.35 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  glycine: number;

  @ApiProperty({ example: 0.40 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  serine: number;

  @ApiProperty({ example: 0.35 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  tyrosine: number;

  @ApiProperty({ example: 0.50 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  proline: number;

  @ApiProperty({ example: 0.60 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  alanine: number;

  @ApiProperty({ example: 0.55 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  asparticAcid: number;

  @ApiProperty({ example: 1.50 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  glutamicAcid: number;

  // Minerały makro
  @ApiProperty({ example: 0.02 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  calcium: number;

  @ApiProperty({ example: 0.28 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  totalPhosphorus: number;

  @ApiProperty({ example: 0.08 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  digestiblePhosphorus: number;

  @ApiProperty({ example: 0.12 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  phytatePhosphorus: number;

  @ApiProperty({ example: 0.01 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  sodium: number;

  @ApiProperty({ example: 0.05 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  chloride: number;

  @ApiProperty({ example: 0.35 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  potassium: number;

  @ApiProperty({ example: 0.12 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  magnesium: number;

  @ApiProperty({ example: 0.12 })
  @IsDecimal({ decimal_digits: '4' })
  @Type(() => Number)
  sulfur: number;

  // Minerały śladowe
  @ApiProperty({ example: 40 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  iron: number;

  @ApiProperty({ example: 3 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  copper: number;

  @ApiProperty({ example: 6 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  manganese: number;

  @ApiProperty({ example: 20 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  zinc: number;

  @ApiProperty({ example: 0.1 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  selenium: number;

  @ApiProperty({ example: 0.05 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  cobalt: number;

  @ApiProperty({ example: 0.1 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  iodine: number;

  @ApiProperty({ example: 0.5 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  molybdenum: number;

  @ApiProperty({ example: 1.0 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  fluorine: number;

  @ApiProperty({ example: 0.1 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  chromium: number;

  // Witaminy
  @ApiProperty({ example: 500 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  vitaminA: number;

  @ApiProperty({ example: 100 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  vitaminD3: number;

  @ApiProperty({ example: 20 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  vitaminE: number;

  @ApiProperty({ example: 1 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  vitaminK3: number;

  @ApiProperty({ example: 3 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  vitaminB1: number;

  @ApiProperty({ example: 1.5 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  vitaminB2: number;

  @ApiProperty({ example: 20 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  vitaminB3: number;

  @ApiProperty({ example: 8 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  vitaminB5: number;

  @ApiProperty({ example: 4 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  vitaminB6: number;

  @ApiProperty({ example: 0.1 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  vitaminB7: number;

  @ApiProperty({ example: 0.5 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  vitaminB9: number;

  @ApiProperty({ example: 0.01 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  vitaminB12: number;

  @ApiProperty({ example: 500 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  choline: number;

  @ApiProperty({ example: 0 })
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  vitaminC: number;

  // Mykotoksyny
  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  aflatoxinB1?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  aflatoxinTotal?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  deoxynivalenol?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  zearalenone?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  ochratoxinA?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  t2Toxin?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '3' })
  @Type(() => Number)
  fumonisin?: number;

  // Ograniczenia
  @ApiProperty({ example: 60.0 })
  @IsDecimal({ decimal_digits: '2' })
  @Type(() => Number)
  @Min(0)
  @Max(100)
  maxInclusion: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  @Type(() => Number)
  minInclusion?: number;

  // Ekonomika
  @ApiProperty({ example: 1200.00 })
  @IsDecimal({ decimal_digits: '2' })
  @Type(() => Number)
  costPerTon: number;

  @ApiPropertyOptional({ example: 'PLN' })
  @IsOptional()
  @IsString()
  currency?: string;

  // Dostawca
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  // Pochodzenie
  @ApiPropertyOptional({ example: 'Polska' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isGMO?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isOrganic?: boolean;

  @ApiPropertyOptional({ example: ['GMP+', 'FAMI-QS'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional({ enum: MaterialStatus, default: MaterialStatus.ACTIVE })
  @IsOptional()
  @IsEnum(MaterialStatus)
  status?: MaterialStatus;
}

export class UpdateRawMaterialDto extends CreateRawMaterialDto {}

export class RawMaterialResponseDto {
  id: string;
  code: string;
  name: string;
  category: RawMaterialCategory;
  meTurkey: number;
  crudeProtein: number;
  costPerTon: number;
  status: MaterialStatus;
  supplier?: { id: string; name: string };
  createdAt: Date;
  updatedAt: Date;
}

export class RawMaterialFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: RawMaterialCategory })
  @IsOptional()
  @IsEnum(RawMaterialCategory)
  category?: RawMaterialCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ enum: MaterialStatus })
  @IsOptional()
  @IsEnum(MaterialStatus)
  status?: MaterialStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  inStock?: boolean;
}
