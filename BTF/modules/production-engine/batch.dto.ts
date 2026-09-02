import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDate, IsEnum, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Sex, BatchStatus } from '@prisma/client';

export class CreateBatchDto {
  @ApiProperty({ example: 'BATCH-2026-001' })
  @IsString()
  batchNumber: string;

  @ApiProperty()
  @IsUUID()
  sectorId: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  receiptDate: Date;

  @ApiProperty({ example: 'Dostawca Polska Sp. z o.o.' })
  @IsString()
  supplier: string;

  @ApiProperty({ example: 'Wylęgarnia Kraków' })
  @IsString()
  hatchery: string;

  @ApiProperty({ example: 'WH-2026-0451' })
  @IsString()
  hatcheryBatchNo: string;

  @ApiProperty({ example: 'BUT Big 6' })
  @IsString()
  genetics: string;

  @ApiProperty({ enum: Sex })
  @IsEnum(Sex)
  sex: Sex;

  @ApiProperty({ example: 12500 })
  @IsNumber()
  @Min(1)
  initialCount: number;

  @ApiProperty({ example: 58.5 })
  @IsNumber()
  avgWeightGrams: number;

  @ApiProperty({ example: 2.45 })
  @IsNumber()
  pricePerUnit: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  transportTime?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  transportTemp?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transportNotes?: string;
}

export class UpdateBatchDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  currentCount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  currentAgeDays?: number;

  @ApiProperty({ enum: BatchStatus, required: false })
  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus;
}

export class BatchResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  batchNumber: string;

  @ApiProperty()
  receiptDate: Date;

  @ApiProperty()
  supplier: string;

  @ApiProperty()
  hatchery: string;

  @ApiProperty()
  genetics: string;

  @ApiProperty({ enum: Sex })
  sex: Sex;

  @ApiProperty()
  initialCount: number;

  @ApiProperty()
  currentCount: number;

  @ApiProperty()
  currentAgeDays: number;

  @ApiProperty()
  currentAvgWeight: number;

  @ApiProperty({ enum: BatchStatus })
  status: BatchStatus;

  @ApiProperty()
  sector: {
    id: string;
    name: string;
    house: {
      id: string;
      name: string;
      nursery: { id: string; name: string } | null;
      farm: { id: string; name: string };
    };
  };

  @ApiProperty()
  latestDailyLog: {
    dayNumber: number;
    mortalityCount: number;
    feedConsumedKg: number;
    waterConsumedL: number;
    fcr: number;
    adgGrams: number;
  } | null;

  @ApiProperty()
  aiForecast: {
    predictedFinalWeight: number;
    predictedFCR: number;
    predictedProfit: number;
    predictedMargin: number;
  } | null;

  @ApiProperty()
  activeAlertsCount: number;

  @ApiProperty()
  createdAt: Date;
}
