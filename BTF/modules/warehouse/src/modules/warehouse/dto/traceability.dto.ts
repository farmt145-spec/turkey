import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TraceabilityQueryDto {
  @ApiProperty()
  @IsString()
  lotId: string;
}

export class TraceabilityResultDto {
  @ApiProperty()
  lotId: string;

  @ApiProperty()
  lotNumber: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  supplierName: string;

  @ApiProperty()
  productionDate: Date;

  @ApiProperty()
  receivedDate: Date;

  @ApiProperty()
  expiryDate: Date;

  @ApiProperty()
  initialQuantity: number;

  @ApiProperty()
  remainingQuantity: number;

  @ApiProperty()
  movements: Array<{
    id: string;
    type: string;
    subtype: string;
    quantity: number;
    date: Date;
    batchId?: string;
    houseName?: string;
    documentNumber?: string;
  }>;

  @ApiProperty()
  batchesFed: Array<{
    batchId: string;
    batchNumber: string;
    totalConsumed: number;
    houseName: string;
  }>;

  @ApiProperty()
  finalDestination: string;
}
