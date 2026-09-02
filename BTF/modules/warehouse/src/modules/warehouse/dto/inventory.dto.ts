import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InventoryQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lotId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  lowStockOnly?: boolean;
}

export class InventoryItemDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  productSku: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  warehouseId: string;

  @ApiProperty()
  warehouseName: string;

  @ApiProperty({ required: false })
  zoneId?: string;

  @ApiProperty({ required: false })
  locationId?: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  reserved: number;

  @ApiProperty()
  available: number;

  @ApiProperty()
  unitCost: number;

  @ApiProperty()
  totalValue: number;

  @ApiProperty()
  reorderPoint: number;

  @ApiProperty()
  isLowStock: boolean;
}
