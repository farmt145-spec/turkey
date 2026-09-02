import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDate, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransferDto {
  @ApiProperty()
  @IsUUID()
  batchId: string;

  @ApiProperty()
  @IsUUID()
  sourceFarmId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  sourceHouseId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  sourceSectorId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  targetFarmId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  targetHouseId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  targetSectorId?: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  transferDate: Date;

  @ApiProperty({ example: 3200 })
  @IsNumber()
  @Min(1)
  birdCount: number;

  @ApiProperty({ example: 850.0 })
  @IsOptional()
  @IsNumber()
  avgWeightGrams?: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  mortalityDuringTransport: number;

  @ApiProperty()
  @IsString()
  performedBy: string;

  @ApiProperty({ example: 'Przeniesienie do kurnika odchowowego' })
  @IsString()
  reason: string;
}
