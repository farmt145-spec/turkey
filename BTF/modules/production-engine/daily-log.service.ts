import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyLogDto, DailyLogWithAIResponseDto } from './dto/daily-log.dto';
import { AIEngineService } from '../ai-engine/ai-engine.service';

@Injectable()
export class DailyLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AIEngineService
  ) {}

  async create(dto: CreateDailyLogDto): Promise<DailyLogWithAIResponseDto> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId }
    });
    if (!batch) throw new NotFoundException('Batch not found');

    // Calculate derived metrics
    const previousLogs = await this.prisma.dailyLog.findMany({
      where: { batchId: dto.batchId, dayNumber: { lt: dto.dayNumber } },
      orderBy: { dayNumber: 'asc' }
    });

    const totalFeed = previousLogs.reduce((sum, l) => sum + (l.feedConsumedKg || 0), 0) + (dto.feedConsumedKg || 0);
    const totalWeightGain = ((dto.avgWeightGrams || batch.avgWeightGrams) - batch.avgWeightGrams) * 
                            (batch.currentCount / 1000);
    const fcr = totalWeightGain > 0 ? parseFloat((totalFeed / totalWeightGain).toFixed(3)) : 0;

    const prevLog = previousLogs[previousLogs.length - 1];
    const adg = prevLog && dto.avgWeightGrams ? 
      parseFloat(((dto.avgWeightGrams - (prevLog.avgWeightGrams || batch.avgWeightGrams)) / 
                 (dto.dayNumber - prevLog.dayNumber)).toFixed(2)) : 0;

    const viability = ((batch.currentCount - dto.mortalityCount) / batch.initialCount) * 100;
    const avgWeightKg = (dto.avgWeightGrams || batch.avgWeightGrams) / 1000;
    const epef = fcr > 0 && dto.dayNumber > 0 ? 
      parseFloat(((viability * avgWeightKg) / (dto.dayNumber * fcr)).toFixed(2)) : 0;

    // Create log
    const log = await this.prisma.dailyLog.create({
      data: {
        ...dto,
        logDate: new Date(dto.logDate),
        fcr,
        adgGrams: adg,
        epef,
        createdBy: 'system' // Should come from auth context
      }
    });

    // Update batch current stats
    await this.prisma.batch.update({
      where: { id: dto.batchId },
      data: {
        currentCount: batch.currentCount - dto.mortalityCount,
        currentAgeDays: dto.dayNumber,
        currentAvgWeight: dto.avgWeightGrams || batch.currentAvgWeight
      }
    });

    // Create production event
    await this.prisma.productionEvent.create({
      data: {
        batchId: dto.batchId,
        eventType: 'DAILY_LOG',
        dayNumber: dto.dayNumber,
        description: `Dzień ${dto.dayNumber}: ${dto.mortalityCount} padnięć, masa ${dto.avgWeightGrams}g`,
        metadata: { fcr, adg, epef }
      }
    });

    // Trigger AI analysis
    const aiResult = await this.aiEngine.analyzeDay(dto.batchId, dto.dayNumber);

    // Fetch alerts
    const alerts = await this.prisma.alert.findMany({
      where: { batchId: dto.batchId, isResolved: false },
      orderBy: { createdAt: 'desc' }
    });

    return {
      id: log.id,
      dayNumber: log.dayNumber,
      logDate: log.logDate,
      mortalityCount: log.mortalityCount,
      avgWeightGrams: log.avgWeightGrams || 0,
      feedConsumedKg: log.feedConsumedKg || 0,
      waterConsumedL: log.waterConsumedL || 0,
      temperatureAvg: log.temperatureAvg || 0,
      humidityPercent: log.humidityPercent || 0,
      co2Ppm: log.co2Ppm || 0,
      nh3Ppm: log.nh3Ppm || 0,
      fcr: log.fcr || 0,
      adgGrams: log.adgGrams || 0,
      epef: log.epef || 0,
      aiAnalysis: {
        dayScore: aiResult.dayScore,
        riskLevel: aiResult.riskLevel,
        detectedIssues: aiResult.detectedIssues.map(i => i.description),
        recommendations: aiResult.recommendations,
        forecast7Days: aiResult.forecast7Days
      },
      alerts: alerts.map(a => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        title: a.title,
        description: a.description
      }))
    };
  }

  async findByBatch(batchId: string) {
    return this.prisma.dailyLog.findMany({
      where: { batchId },
      orderBy: { dayNumber: 'asc' }
    });
  }

  async findByDay(batchId: string, dayNumber: number): Promise<DailyLogWithAIResponseDto> {
    const log = await this.prisma.dailyLog.findUnique({
      where: { batchId_dayNumber: { batchId, dayNumber } }
    });
    if (!log) throw new NotFoundException('Daily log not found');

    const aiAnalysis = await this.prisma.aIAnalysis.findUnique({
      where: { id: `${batchId}_${dayNumber}` }
    });

    const alerts = await this.prisma.alert.findMany({
      where: { batchId, isResolved: false }
    });

    return {
      id: log.id,
      dayNumber: log.dayNumber,
      logDate: log.logDate,
      mortalityCount: log.mortalityCount,
      avgWeightGrams: log.avgWeightGrams || 0,
      feedConsumedKg: log.feedConsumedKg || 0,
      waterConsumedL: log.waterConsumedL || 0,
      temperatureAvg: log.temperatureAvg || 0,
      humidityPercent: log.humidityPercent || 0,
      co2Ppm: log.co2Ppm || 0,
      nh3Ppm: log.nh3Ppm || 0,
      fcr: log.fcr || 0,
      adgGrams: log.adgGrams || 0,
      epef: log.epef || 0,
      aiAnalysis: {
        dayScore: aiAnalysis?.dayScore || 0,
        riskLevel: aiAnalysis?.riskLevel || 'LOW',
        detectedIssues: (aiAnalysis?.detectedIssues as any[])?.map(i => i.description) || [],
        recommendations: (aiAnalysis?.recommendations as string[]) || [],
        forecast7Days: (aiAnalysis?.forecast7Days as any[]) || []
      },
      alerts: alerts.map(a => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        title: a.title,
        description: a.description
      }))
    };
  }
}
