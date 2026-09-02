import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBatchDto, UpdateBatchDto, BatchResponseDto } from './dto/batch.dto';
import { BatchStatus } from '@prisma/client';

@Injectable()
export class BatchService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBatchDto): Promise<BatchResponseDto> {
    const sector = await this.prisma.sector.findUnique({
      where: { id: dto.sectorId },
      include: { house: { include: { nursery: true, farm: true } } }
    });

    if (!sector) throw new NotFoundException('Sector not found');
    if (sector.house.status !== 'EMPTY') {
      throw new BadRequestException('House is not empty');
    }

    const batch = await this.prisma.batch.create({
      data: {
        ...dto,
        currentCount: dto.initialCount,
        currentAgeDays: 0,
        status: BatchStatus.ACTIVE,
        receiptDate: new Date(dto.receiptDate)
      },
      include: {
        sector: {
          include: {
            house: {
              include: {
                nursery: true,
                farm: true
              }
            }
          }
        },
        dailyLogs: { orderBy: { dayNumber: 'desc' }, take: 1 },
        aiForecasts: { orderBy: { generatedAt: 'desc' }, take: 1 },
        _count: { select: { alerts: { where: { isResolved: false } } } }
      }
    });

    // Update house status
    await this.prisma.house.update({
      where: { id: sector.houseId },
      data: { status: 'OCCUPIED' }
    });

    // Create production event
    await this.prisma.productionEvent.create({
      data: {
        batchId: batch.id,
        eventType: 'CHICK_RECEIPT',
        dayNumber: 0,
        description: `Przyjęcie ${dto.initialCount} szt. piskląt ${dto.genetics} z ${dto.hatchery}`,
        metadata: {
          supplier: dto.supplier,
          avgWeight: dto.avgWeightGrams,
          transportTemp: dto.transportTemp,
          transportTime: dto.transportTime
        }
      }
    });

    return this.mapToResponse(batch);
  }

  async findAll(filters: any): Promise<BatchResponseDto[]> {
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.genetics) where.genetics = { contains: filters.genetics, mode: 'insensitive' };

    if (filters.farmId || filters.houseId) {
      where.sector = {
        house: {
          ...(filters.houseId && { id: filters.houseId }),
          ...(filters.farmId && { farmId: filters.farmId })
        }
      };
    }

    const batches = await this.prisma.batch.findMany({
      where,
      include: {
        sector: {
          include: {
            house: {
              include: {
                nursery: true,
                farm: true
              }
            }
          }
        },
        dailyLogs: { orderBy: { dayNumber: 'desc' }, take: 1 },
        aiForecasts: { orderBy: { generatedAt: 'desc' }, take: 1 },
        _count: { select: { alerts: { where: { isResolved: false } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return batches.map(b => this.mapToResponse(b));
  }

  async findOne(id: string): Promise<BatchResponseDto> {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: {
        sector: {
          include: {
            house: {
              include: {
                nursery: true,
                farm: true
              }
            }
          }
        },
        dailyLogs: { orderBy: { dayNumber: 'desc' }, take: 1 },
        aiForecasts: { orderBy: { generatedAt: 'desc' }, take: 1 },
        _count: { select: { alerts: { where: { isResolved: false } } } }
      }
    });

    if (!batch) throw new NotFoundException('Batch not found');
    return this.mapToResponse(batch);
  }

  async update(id: string, dto: UpdateBatchDto): Promise<BatchResponseDto> {
    const batch = await this.prisma.batch.update({
      where: { id },
      data: dto,
      include: {
        sector: {
          include: {
            house: {
              include: {
                nursery: true,
                farm: true
              }
            }
          }
        },
        dailyLogs: { orderBy: { dayNumber: 'desc' }, take: 1 },
        aiForecasts: { orderBy: { generatedAt: 'desc' }, take: 1 },
        _count: { select: { alerts: { where: { isResolved: false } } } }
      }
    });

    return this.mapToResponse(batch);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.batch.delete({ where: { id } });
  }

  async getTimeline(id: string) {
    const [events, logs, transfers, vaccinations, treatments, weighings, alerts] = await Promise.all([
      this.prisma.productionEvent.findMany({ where: { batchId: id }, orderBy: { dayNumber: 'asc' } }),
      this.prisma.dailyLog.findMany({ where: { batchId: id }, orderBy: { dayNumber: 'asc' } }),
      this.prisma.transfer.findMany({ where: { batchId: id }, orderBy: { transferDate: 'asc' } }),
      this.prisma.vaccination.findMany({ where: { batchId: id }, orderBy: { dayNumber: 'asc' } }),
      this.prisma.treatment.findMany({ where: { batchId: id }, orderBy: { dayNumber: 'asc' } }),
      this.prisma.weighing.findMany({ where: { batchId: id }, orderBy: { dayNumber: 'asc' } }),
      this.prisma.alert.findMany({ where: { batchId: id }, orderBy: { createdAt: 'asc' } })
    ]);

    const timeline = [
      ...events.map(e => ({ ...e, category: 'EVENT', date: e.createdAt })),
      ...logs.map(l => ({ ...l, category: 'DAILY_LOG', date: l.logDate })),
      ...transfers.map(t => ({ ...t, category: 'TRANSFER', date: t.transferDate })),
      ...vaccinations.map(v => ({ ...v, category: 'VACCINATION', date: v.createdAt })),
      ...treatments.map(t => ({ ...t, category: 'TREATMENT', date: t.createdAt })),
      ...weighings.map(w => ({ ...w, category: 'WEIGHING', date: w.createdAt })),
      ...alerts.map(a => ({ ...a, category: 'ALERT', date: a.createdAt }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return timeline;
  }

  async getTraceability(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: {
        sector: { include: { house: { include: { nursery: true, farm: { include: { company: true } } } } } },
        dailyLogs: { orderBy: { dayNumber: 'asc' } },
        transfers: { orderBy: { transferDate: 'asc' } },
        vaccinations: { orderBy: { dayNumber: 'asc' } },
        treatments: { orderBy: { dayNumber: 'asc' } },
        feedRecipes: { orderBy: { dayFrom: 'asc' } },
        weighings: { orderBy: { dayNumber: 'asc' } },
        documents: true,
        photos: true
      }
    });

    if (!batch) throw new NotFoundException('Batch not found');

    return {
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      trace: [
        { stage: 'HATCHERY', date: batch.receiptDate, details: `${batch.hatchery} | Partia: ${batch.hatcheryBatchNo} | Genetyka: ${batch.genetics}` },
        { stage: 'TRANSPORT', date: batch.receiptDate, details: `Dostawca: ${batch.supplier} | Temp: ${batch.transportTemp}°C | Czas: ${batch.transportTime}min` },
        { stage: 'RECEIPT', date: batch.receiptDate, details: `Przyjęto ${batch.initialCount} szt. | Masa: ${batch.avgWeightGrams}g` },
        { stage: 'NURSERY', date: batch.receiptDate, details: `${batch.sector.house.nursery?.name || 'Bez odchowalni'} | ${batch.sector.house.farm.name}` },
        { stage: 'HOUSE', date: batch.receiptDate, details: `${batch.sector.house.name} | Sektor: ${batch.sector.name}` },
        ...batch.transfers.map(t => ({ stage: 'TRANSFER', date: t.transferDate, details: `Transfer ${t.birdCount} szt. | Powód: ${t.reason}` })),
        ...batch.vaccinations.map(v => ({ stage: 'VACCINATION', date: v.createdAt, details: `${v.name} | Dzień: ${v.dayNumber} | Metoda: ${v.method}` })),
        ...batch.treatments.map(t => ({ stage: 'TREATMENT', date: t.createdAt, details: `${t.diagnosis} | Dzień: ${t.dayNumber}` })),
        ...batch.feedRecipes.map(f => ({ stage: 'FEED', date: batch.receiptDate, details: `${f.name} | Faza: ${f.phase} | Dni: ${f.dayFrom}-${f.dayTo}` })),
        ...batch.weighings.map(w => ({ stage: 'WEIGHING', date: w.createdAt, details: `Masa: ${w.avgWeight}g | Jednorodność: ${w.uniformityPercent}%` })),
        ...batch.dailyLogs.map(l => ({ stage: 'DAILY', date: l.logDate, details: `Dzień ${l.dayNumber} | Padnięcia: ${l.mortalityCount} | Pasza: ${l.feedConsumedKg}kg` }))
      ]
    };
  }

  async splitBatch(id: string, splits: Array<{ sectorId: string; count: number; avgWeight: number }>) {
    const original = await this.prisma.batch.findUnique({ where: { id } });
    if (!original) throw new NotFoundException('Batch not found');

    const totalSplitCount = splits.reduce((sum, s) => sum + s.count, 0);
    if (totalSplitCount > original.currentCount) {
      throw new BadRequestException('Split count exceeds current batch count');
    }

    const newBatches = [];
    for (const split of splits) {
      const newBatch = await this.prisma.batch.create({
        data: {
          batchNumber: `${original.batchNumber}-S${newBatches.length + 1}`,
          sectorId: split.sectorId,
          receiptDate: original.receiptDate,
          supplier: original.supplier,
          hatchery: original.hatchery,
          hatcheryBatchNo: original.hatcheryBatchNo,
          genetics: original.genetics,
          sex: original.sex,
          initialCount: split.count,
          avgWeightGrams: split.avgWeight,
          pricePerUnit: original.pricePerUnit,
          currentCount: split.count,
          currentAgeDays: original.currentAgeDays,
          currentAvgWeight: split.avgWeight,
          status: BatchStatus.ACTIVE
        }
      });

      await this.prisma.productionEvent.create({
        data: {
          batchId: newBatch.id,
          eventType: 'TRANSFER',
          dayNumber: original.currentAgeDays,
          description: `Podział z rzutu ${original.batchNumber}: ${split.count} szt.`,
          metadata: { sourceBatchId: original.id, avgWeight: split.avgWeight }
        }
      });

      newBatches.push(newBatch);
    }

    // Update original batch
    await this.prisma.batch.update({
      where: { id },
      data: {
        currentCount: original.currentCount - totalSplitCount,
        status: original.currentCount === totalSplitCount ? BatchStatus.TRANSFERRED : BatchStatus.PARTIAL_TRANSFER
      }
    });

    return newBatches;
  }

  async mergeBatches(sourceBatchIds: string[], targetSectorId: string) {
    const sources = await this.prisma.batch.findMany({
      where: { id: { in: sourceBatchIds } },
      include: { dailyLogs: true }
    });

    if (sources.length !== sourceBatchIds.length) {
      throw new BadRequestException('Some source batches not found');
    }

    const totalCount = sources.reduce((sum, b) => sum + b.currentCount, 0);
    const avgWeight = sources.reduce((sum, b) => sum + (b.currentAvgWeight || b.avgWeightGrams) * b.currentCount, 0) / totalCount;
    const oldestReceipt = sources.reduce((min, b) => b.receiptDate < min ? b.receiptDate : min, sources[0].receiptDate);

    const merged = await this.prisma.batch.create({
      data: {
        batchNumber: `MERGED-${Date.now()}`,
        sectorId: targetSectorId,
        receiptDate: oldestReceipt,
        supplier: sources.map(s => s.supplier).join(', '),
        hatchery: sources.map(s => s.hatchery).join(', '),
        hatcheryBatchNo: sources.map(s => s.hatcheryBatchNo).join(', '),
        genetics: sources[0].genetics,
        sex: sources[0].sex,
        initialCount: totalCount,
        avgWeightGrams: avgWeight,
        pricePerUnit: sources.reduce((sum, s) => sum + s.pricePerUnit, 0) / sources.length,
        currentCount: totalCount,
        currentAgeDays: Math.max(...sources.map(s => s.currentAgeDays)),
        currentAvgWeight: avgWeight,
        status: BatchStatus.ACTIVE
      }
    });

    // Mark sources as transferred
    await this.prisma.batch.updateMany({
      where: { id: { in: sourceBatchIds } },
      data: { status: BatchStatus.TRANSFERRED }
    });

    // Create merge events
    for (const source of sources) {
      await this.prisma.productionEvent.create({
        data: {
          batchId: merged.id,
          eventType: 'TRANSFER',
          dayNumber: source.currentAgeDays,
          description: `Połączenie z rzutu ${source.batchNumber}: ${source.currentCount} szt.`,
          metadata: { sourceBatchId: source.id }
        }
      });
    }

    return merged;
  }

  private mapToResponse(batch: any): BatchResponseDto {
    const latestLog = batch.dailyLogs[0];
    const latestForecast = batch.aiForecasts[0];

    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      receiptDate: batch.receiptDate,
      supplier: batch.supplier,
      hatchery: batch.hatchery,
      genetics: batch.genetics,
      sex: batch.sex,
      initialCount: batch.initialCount,
      currentCount: batch.currentCount,
      currentAgeDays: batch.currentAgeDays,
      currentAvgWeight: batch.currentAvgWeight || batch.avgWeightGrams,
      status: batch.status,
      sector: {
        id: batch.sector.id,
        name: batch.sector.name,
        house: {
          id: batch.sector.house.id,
          name: batch.sector.house.name,
          nursery: batch.sector.house.nursery,
          farm: batch.sector.house.farm
        }
      },
      latestDailyLog: latestLog ? {
        dayNumber: latestLog.dayNumber,
        mortalityCount: latestLog.mortalityCount,
        feedConsumedKg: latestLog.feedConsumedKg,
        waterConsumedL: latestLog.waterConsumedL,
        fcr: latestLog.fcr,
        adgGrams: latestLog.adgGrams
      } : null,
      aiForecast: latestForecast ? {
        predictedFinalWeight: latestForecast.predictedFinalWeight,
        predictedFCR: latestForecast.predictedFCR,
        predictedProfit: latestForecast.predictedProfit,
        predictedMargin: latestForecast.predictedMargin
      } : null,
      activeAlertsCount: batch._count.alerts,
      createdAt: batch.createdAt
    };
  }
}
