import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AnomalyAlert {
  flockId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  message: string;
  recommendedAction: string;
}

@Injectable()
export class AIDetectionService {
  private readonly logger = new Logger(AIDetectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async analyzeFlock(flockId: string): Promise<AnomalyAlert[]> {
    const metrics = await this.prisma.dailyMetric.findMany({
      where: { flockId },
      orderBy: { date: 'desc' },
      take: 14
    });

    if (metrics.length < 3) return [];

    const alerts: AnomalyAlert[] = [];
    const recent = metrics.slice(0, 7);
    const previous = metrics.slice(7, 14);

    const avgMortality = this.average(previous.map(m => m.mortalityRate || 0));
    const currentMortality = recent[0].mortalityRate || 0;
    if (currentMortality > avgMortality * 1.5 && currentMortality > 0.3) {
      alerts.push({
        flockId,
        severity: currentMortality > 1.0 ? 'CRITICAL' : 'HIGH',
        metric: 'mortality',
        expectedValue: avgMortality,
        actualValue: currentMortality,
        deviation: ((currentMortality - avgMortality) / avgMortality) * 100,
        message: `Wzrost śmiertelności o ${((currentMortality - avgMortality) / avgMortality * 100).toFixed(1)}%`,
        recommendedAction: 'Natychmiastowa inspekcja kurnika, rozważ sekcję padłych ptaków'
      });
    }

    const avgFCR = this.average(previous.map(m => m.fcr || 0));
    const currentFCR = recent[0].fcr || 0;
    if (currentFCR > avgFCR * 1.1 && currentFCR > 1.8) {
      alerts.push({
        flockId,
        severity: 'MEDIUM',
        metric: 'fcr',
        expectedValue: avgFCR,
        actualValue: currentFCR,
        deviation: ((currentFCR - avgFCR) / avgFCR) * 100,
        message: `Pogorszenie FCR o ${((currentFCR - avgFCR) / avgFCR * 100).toFixed(1)}%`,
        recommendedAction: 'Analiza paszy, kontrola stanu zdrowia jelit'
      });
    }

    const avgWater = this.average(previous.map(m => m.waterIntake || 0));
    const currentWater = recent[0].waterIntake || 0;
    if (currentWater < avgWater * 0.85) {
      alerts.push({
        flockId,
        severity: 'HIGH',
        metric: 'water_intake',
        expectedValue: avgWater,
        actualValue: currentWater,
        deviation: ((avgWater - currentWater) / avgWater) * 100,
        message: `Spadek poboru wody o ${((avgWater - currentWater) / avgWater * 100).toFixed(1)}%`,
        recommendedAction: 'Sprawdzenie systemu poideł, temperatury, potencjalna choroba'
      });
    }

    const latestEnv = await this.prisma.environmentData.findFirst({
      where: { house: { flocks: { some: { id: flockId } } } },
      orderBy: { timestamp: 'desc' }
    });

    if (latestEnv) {
      if (latestEnv.nh3 && latestEnv.nh3 > 25) {
        alerts.push({
          flockId,
          severity: 'HIGH',
          metric: 'nh3',
          expectedValue: 15,
          actualValue: latestEnv.nh3,
          deviation: ((latestEnv.nh3 - 15) / 15) * 100,
          message: `Stężenie NH₃ przekracza normę: ${latestEnv.nh3} ppm`,
          recommendedAction: 'Zwiększenie wentylacji, sprawdzenie ściółki'
        });
      }
    }

    const anomalyScore = Math.min(alerts.reduce((sum, a) => sum + a.deviation, 0) / 10, 100);
    await this.prisma.dailyMetric.update({
      where: { id: recent[0].id },
      data: { 
        anomalyScore,
        anomalyFlags: alerts.map(a => a.metric.toUpperCase())
      }
    });

    return alerts;
  }

  private average(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  async analyzeAllActiveFlocks(): Promise<AnomalyAlert[]> {
    const activeFlocks = await this.prisma.flock.findMany({
      where: { status: 'ACTIVE' }
    });

    const allAlerts: AnomalyAlert[] = [];
    for (const flock of activeFlocks) {
      try {
        const alerts = await this.analyzeFlock(flock.id);
        allAlerts.push(...alerts);
      } catch (error) {
        this.logger.error(`Failed to analyze flock ${flock.id}`, error.stack);
      }
    }
    return allAlerts;
  }
}
