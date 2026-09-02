import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData() {
    const flocks = await this.prisma.flock.findMany({
      where: { status: 'ACTIVE' },
      include: {
        house: true,
        dailyMetrics: { orderBy: { date: 'desc' }, take: 1 },
        riskScores: { orderBy: { calculatedAt: 'desc' }, take: 1 }
      }
    });

    return flocks.map(flock => {
      const latestMetric = flock.dailyMetrics[0];
      const latestRisk = flock.riskScores[0];

      let status = 'HEALTHY';
      if (latestRisk?.riskScore > 60) status = 'CRITICAL';
      else if (latestRisk?.riskScore > 30) status = 'WARNING';
      else if (latestMetric?.anomalyScore && latestMetric.anomalyScore > 20) status = 'WARNING';

      return {
        id: flock.id,
        name: `${flock.house.name} — Rzut`,
        houseId: flock.house.id,
        houseName: flock.house.name,
        breed: flock.breed,
        ageDays: flock.ageDays,
        currentCount: flock.currentCount,
        status,
        riskScore: latestRisk?.riskScore || 0,
        healthScore: latestRisk?.healthScore || 100,
        mortalityRate: latestMetric?.mortalityRate || 0,
        fcr: latestMetric?.fcr || 0,
        anomalyScore: latestMetric?.anomalyScore || 0
      };
    });
  }
}
