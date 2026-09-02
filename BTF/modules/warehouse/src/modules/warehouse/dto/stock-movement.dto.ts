import { IsString, IsOptional, IsNumber, IsEnum, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MovementType, MovementSubtype } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateStockMovementDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lotId?: string;

  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({ enum: MovementType })
  @IsEnum(MovementType)
  type: MovementType;

  @ApiProperty({ enum: MovementSubtype })
  @IsEnum(MovementSubtype)
  subtype: MovementSubtype;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  unitCost: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fromWarehouseId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  toWarehouseId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fromSiloId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  toSiloId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fromHouseId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  toHouseId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  recipeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  moistureAtMove?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  temperatureAtMove?: number;
}
