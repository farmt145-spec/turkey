import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateForecastDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiProperty({ required: false, default: 30 })
  @IsOptional()
  @IsNumber()
  daysAhead?: number;
}

export class ForecastResultDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  currentStock: number;

  @ApiProperty()
  avgDailyConsumption: number;

  @ApiProperty()
  daysOfSupply: number;

  @ApiProperty()
  predictedStockoutDate: Date;

  @ApiProperty()
  recommendedOrderQty: number;

  @ApiProperty()
  recommendedOrderDate: Date;

  @ApiProperty({ required: false })
  bestSupplierId?: string;

  @ApiProperty({ required: false })
  bestSupplierName?: string;

  @ApiProperty()
  stockoutRisk: number;

  @ApiProperty()
  expiryRisk: number;
}
