import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface RiskScoreResult {
  healthScore: number;
  productionScore: number;
  riskScore: number;
  welfareScore: number;
  factors: {
    mortalityFactor: number;
    fcrFactor: number;
    environmentFactor: number;
    treatmentFactor: number;
    ageFactor: number;
  };
}

@Injectable()
export class RiskScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateRiskScore(flockId: string): Promise<RiskScoreResult> {
    const flock = await this.prisma.flock.findUnique({
      where: { id: flockId },
      include: {
        dailyMetrics: { orderBy: { date: 'desc' }, take: 7 },
        treatments: { where: { endDate: null } },
        healthRecords: { where: { type: { in: ['TREATMENT', 'NECROPSY'] } }, take: 5 }
      }
    });

    if (!flock) throw new Error('Flock not found');

    const latestMetric = flock.dailyMetrics[0];

    let healthScore = 100;
    if (latestMetric?.mortalityRate) healthScore -= latestMetric.mortalityRate * 20;
    if (flock.treatments.length > 0) healthScore -= flock.treatments.length * 5;
    if (flock.healthRecords.length > 2) healthScore -= 10;
    healthScore = Math.max(0, Math.min(100, healthScore));

    let productionScore = 100;
    if (latestMetric?.fcr && latestMetric.fcr > 2.0) productionScore -= (latestMetric.fcr - 2.0) * 20;
    if (latestMetric?.adg && latestMetric.adg < 50) productionScore -= 15;
    productionScore = Math.max(0, Math.min(100, productionScore));

    let welfareScore = 100;
    const envData = await this.prisma.environmentData.findFirst({
      where: { house: { flocks: { some: { id: flockId } } } },
      orderBy: { timestamp: 'desc' }
    });
    if (envData) {
      if (envData.nh3 && envData.nh3 > 20) welfareScore -= (envData.nh3 - 20) * 2;
      if (envData.co2 && envData.co2 > 2500) welfareScore -= (envData.co2 - 2500) / 100;
      if (envData.temperature && (envData.temperature > 27 || envData.temperature < 18)) {
        welfareScore -= Math.abs(envData.temperature - 22) * 2;
      }
    }
    welfareScore = Math.max(0, Math.min(100, welfareScore));

    const riskScore = Math.round((100 - healthScore) * 0.4 + (100 - productionScore) * 0.3 + (100 - welfareScore) * 0.3);

    const result: RiskScoreResult = {
      healthScore: Math.round(healthScore),
      productionScore: Math.round(productionScore),
      riskScore,
      welfareScore: Math.round(welfareScore),
      factors: {
        mortalityFactor: latestMetric?.mortalityRate || 0,
        fcrFactor: latestMetric?.fcr || 0,
        environmentFactor: envData ? (envData.nh3 || 0) + (envData.co2 || 0) / 100 : 0,
        treatmentFactor: flock.treatments.length,
        ageFactor: flock.ageDays
      }
    };

    await this.prisma.riskScore.create({
      data: {
        flockId,
        ...result,
        factors: result.factors as any
      }
    });

    return result;
  }
}
