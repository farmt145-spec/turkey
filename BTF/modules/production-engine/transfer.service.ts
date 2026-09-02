import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto } from './dto/transfer.dto';
import { BatchStatus } from '@prisma/client';

@Injectable()
export class TransferService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTransferDto) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
      include: { sector: { include: { house: true } } }
    });

    if (!batch) throw new NotFoundException('Batch not found');
    if (batch.currentCount < dto.birdCount) {
      throw new BadRequestException('Transfer count exceeds current batch count');
    }

    // Create transfer record
    const transfer = await this.prisma.transfer.create({
      data: {
        ...dto,
        transferDate: new Date(dto.transferDate)
      }
    });

    // Update batch count
    const newCount = batch.currentCount - dto.birdCount;
    await this.prisma.batch.update({
      where: { id: dto.batchId },
      data: {
        currentCount: newCount,
        status: newCount === 0 ? BatchStatus.TRANSFERRED : BatchStatus.PARTIAL_TRANSFER
      }
    });

    // Create production event
    await this.prisma.productionEvent.create({
      data: {
        batchId: dto.batchId,
        eventType: 'TRANSFER',
        dayNumber: batch.currentAgeDays,
        description: `Transfer ${dto.birdCount} szt. do ${dto.targetFarmId ? 'innej fermy' : 'kurnika'}`,
        metadata: {
          transferId: transfer.id,
          targetFarmId: dto.targetFarmId,
          targetHouseId: dto.targetHouseId,
          mortalityDuringTransport: dto.mortalityDuringTransport
        }
      }
    });

    // If target is specified, create/update target batch
    if (dto.targetSectorId) {
      const targetSector = await this.prisma.sector.findUnique({
        where: { id: dto.targetSectorId },
        include: { house: true }
      });

      if (targetSector) {
        await this.prisma.batch.create({
          data: {
            batchNumber: `${batch.batchNumber}-T${Date.now()}`,
            sectorId: dto.targetSectorId,
            receiptDate: new Date(dto.transferDate),
            supplier: batch.supplier,
            hatchery: batch.hatchery,
            hatcheryBatchNo: batch.hatcheryBatchNo,
            genetics: batch.genetics,
            sex: batch.sex,
            initialCount: dto.birdCount,
            avgWeightGrams: dto.avgWeightGrams || batch.currentAvgWeight || batch.avgWeightGrams,
            pricePerUnit: batch.pricePerUnit,
            currentCount: dto.birdCount - dto.mortalityDuringTransport,
            currentAgeDays: batch.currentAgeDays,
            currentAvgWeight: dto.avgWeightGrams || batch.currentAvgWeight,
            status: BatchStatus.ACTIVE
          }
        });

        await this.prisma.house.update({
          where: { id: targetSector.houseId },
          data: { status: 'OCCUPIED' }
        });
      }
    }

    return transfer;
  }

  async findByBatch(batchId: string) {
    return this.prisma.transfer.findMany({
      where: { batchId },
      include: {
        sourceFarm: true,
        targetFarm: true
      },
      orderBy: { transferDate: 'desc' }
    });
  }

  async findByFarm(farmId: string) {
    return this.prisma.transfer.findMany({
      where: { OR: [{ sourceFarmId: farmId }, { targetFarmId: farmId }] },
      include: {
        batch: { select: { batchNumber: true, genetics: true } },
        sourceFarm: true,
        targetFarm: true
      },
      orderBy: { transferDate: 'desc' }
    });
  }
}
