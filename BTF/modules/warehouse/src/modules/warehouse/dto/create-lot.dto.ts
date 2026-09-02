import { IsString, IsOptional, IsNumber, IsDate, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateLotDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsString()
  lotNumber: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  productionDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  expiryDate?: Date;

  @ApiProperty()
  @IsNumber()
  purchaseCost: number;

  @ApiProperty()
  @IsNumber()
  initialQuantity: number;

  @ApiProperty({ required: false, default: 'kg' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  qrCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  certificateUrl?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  photos?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  moisture?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  protein?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  energy?: number;
}
