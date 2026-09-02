import { IsString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransferType } from '@prisma/client';
import { Type } from 'class-transformer';

export class TransferItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lotId?: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty({ required: false, default: 'kg' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTransferDto {
  @ApiProperty({ enum: TransferType })
  @IsEnum(TransferType)
  type: TransferType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  farmId?: string;

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
  fromFarmId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  toFarmId?: string;

  @ApiProperty({ type: [TransferItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  documentNumber?: string;
}

export class ExecuteTransferDto {
  @ApiProperty()
  @IsString()
  transferId: string;
}
