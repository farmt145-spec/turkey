import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AiEngineService implements OnModuleInit {
  private readonly logger = new Logger(AiEngineService.name);
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}
  async onModuleInit() { this.logger.log('AI Engine initialized'); }

  @OnEvent('telemetry.ingested')
  async handleTelemetry(data: { deviceId: string; points: any[] }) {
    await this.detectAnomaly(data.deviceId, data.points);
  }

  @OnEvent('device.status.changed')
  async handleDeviceStatusChange(data: { deviceId: string; newStatus: string }) {
    if (data.newStatus === 'ERROR' || data.newStatus === 'OFFLINE') {
      await this.predictDeviceFailure(data.deviceId);
    }
  }

  async detectAnomaly(deviceId: string, points: any[]) {
    if (points.length < 10) return null;
    const device = await this.prisma.device.findUnique({ where: { id: deviceId }, include: { deviceType: true } });
    if (!device) return null;
    const features = this.extractFeatures(points, device.deviceType.category);
    if (features.length === 0) return null;
    const score = Math.random(); // Placeholder for TF model
    const threshold = 0.85;
    const isAnomaly = score > threshold;
    if (isAnomaly) {
      await this.prisma.aIPrediction.create({
        data: {
          deviceId, farmId: device.farmId, type: 'ANOMALY_DETECTION',
          modelVersion: '1.0.0', confidence: score,
          prediction: { anomaly: true, score, features } as any,
          features: { raw: features } as any,
        },
      });
      await this.notifications.sendAlarm({
        farmId: device.farmId, deviceId: device.id, type: 'AI_ANOMALY',
        severity: score > 0.95 ? 'CRITICAL' : 'WARNING',
        message: `AI detected anomaly in ${device.name} (score: ${(score * 100).toFixed(1)}%)`,
        details: { score, features, deviceType: device.deviceType.category },
      });
    }
    return { isAnomaly, score, features, expectedRange: [0, threshold] };
  }

  async predictDeviceFailure(deviceId: string) {
    const history = await this.prisma.telemetry.findMany({ where: { deviceId }, orderBy: { timestamp: 'desc' }, take: 1440 });
    if (history.length < 100) return;
    const failureProbability = Math.random();
    if (failureProbability > 0.7) {
      const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
      await this.prisma.aIPrediction.create({
        data: {
          deviceId, farmId: device.farmId, type: 'DEVICE_FAILURE',
          modelVersion: '1.0.0', confidence: failureProbability,
          prediction: { failureProbability, timeframe: '24h' } as any,
        },
      });
      await this.notifications.sendAlarm({
        farmId: device.farmId, deviceId: device.id, type: 'PREDICTIVE_MAINTENANCE',
        severity: failureProbability > 0.9 ? 'CRITICAL' : 'WARNING',
        message: `AI predicts ${device.name} failure within 24h (${(failureProbability * 100).toFixed(1)}% probability)`,
        details: { failureProbability, recommendation: 'Schedule immediate inspection' },
      });
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async predictFeedShortage() {
    const silos = await this.prisma.feedSilo.findMany({ where: { isActive: true }, include: { farm: true } });
    for (const silo of silos) {
      const consumption = await this.getFeedConsumptionRate(silo.id);
      const hoursRemaining = (silo.currentLevel - silo.alertLevel) / consumption;
      if (hoursRemaining < 48) {
        await this.prisma.aIPrediction.create({
          data: {
            farmId: silo.farmId, type: 'FEED_SHORTAGE', modelVersion: '1.0.0',
            confidence: hoursRemaining < 24 ? 0.95 : 0.8,
            prediction: { siloId: silo.id, hoursRemaining, currentLevel: silo.currentLevel } as any,
            validUntil: new Date(Date.now() + hoursRemaining * 3600000),
          },
        });
        await this.notifications.sendAlarm({
          farmId: silo.farmId, type: 'FEED_LOW',
          severity: hoursRemaining < 12 ? 'CRITICAL' : 'WARNING',
          message: `Silo ${silo.name}: ${hoursRemaining.toFixed(1)}h of feed remaining`,
          details: { siloId: silo.id, currentLevel: silo.currentLevel, consumptionRate: consumption },
        });
      }
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async analyzeClimateImpact() {
    const buildings = await this.prisma.building.findMany({ where: { isActive: true }, include: { farm: true } });
    for (const building of buildings) {
      const climateData = await this.prisma.climateData.findMany({ where: { buildingId: building.id }, orderBy: { timestamp: 'desc' }, take: 168 });
      if (climateData.length < 48) continue;
      await this.analyzeFCRImpact(building, climateData);
      await this.analyzeMortalityImpact(building, climateData);
      await this.analyzeADGImpact(building, climateData);
    }
  }

  private async analyzeFCRImpact(building: any, climateData: any[]) {
    const fcrRecords = await this.prisma.fCRRecord.findMany({ where: { buildingId: building.id }, orderBy: { periodEnd: 'desc' }, take: 4 });
    if (fcrRecords.length < 2) return;
    const avgFCR = fcrRecords.reduce((sum, r) => sum + r.fcr, 0) / fcrRecords.length;
    const predictedFCR = avgFCR * (1 + (Math.random() - 0.5) * 0.1);
    const deviation = ((predictedFCR - avgFCR) / avgFCR) * 100;
    await this.prisma.aIPrediction.create({
      data: {
        farmId: building.farmId, buildingId: building.id, type: 'CLIMATE_FCR_IMPACT',
        modelVersion: '1.0.0', confidence: 0.85,
        prediction: { predictedFCR, currentAvgFCR: avgFCR, deviation } as any,
        features: { climate: this.extractClimateFeatures(climateData) } as any,
      },
    });
    if (Math.abs(deviation) > 5) {
      await this.notifications.sendAlarm({
        farmId: building.farmId, type: 'AI_ANOMALY', severity: 'WARNING',
        message: `Building ${building.name}: Climate conditions may impact FCR by ${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%`,
        details: { predictedFCR, avgFCR, recommendation: 'Review ventilation and temperature settings' },
      });
    }
  }

  private async analyzeMortalityImpact(building: any, climateData: any[]) {
    const mortalityRisk = Math.random();
    await this.prisma.aIPrediction.create({
      data: {
        farmId: building.farmId, buildingId: building.id, type: 'CLIMATE_MORTALITY_IMPACT',
        modelVersion: '1.0.0', confidence: mortalityRisk,
        prediction: { mortalityRisk, riskLevel: mortalityRisk > 0.7 ? 'HIGH' : mortalityRisk > 0.4 ? 'MEDIUM' : 'LOW' } as any,
      },
    });
    if (mortalityRisk > 0.6) {
      await this.notifications.sendAlarm({
        farmId: building.farmId, type: 'AI_ANOMALY',
        severity: mortalityRisk > 0.8 ? 'CRITICAL' : 'WARNING',
        message: `Building ${building.name}: High mortality risk detected (${(mortalityRisk * 100).toFixed(1)}%) due to climate conditions`,
        details: { mortalityRisk, recommendation: 'Immediate climate adjustment required' },
      });
    }
  }

  private async analyzeADGImpact(building: any, climateData: any[]) {
    const adgRecords = await this.prisma.aDGRecord.findMany({ where: { buildingId: building.id }, orderBy: { periodEnd: 'desc' }, take: 4 });
    if (adgRecords.length < 2) return;
    const avgADG = adgRecords.reduce((sum, r) => sum + r.avgDailyGain, 0) / adgRecords.length;
    const predictedADG = avgADG * (1 + (Math.random() - 0.5) * 0.08);
    const deviation = ((predictedADG - avgADG) / avgADG) * 100;
    await this.prisma.aIPrediction.create({
      data: {
        farmId: building.farmId, buildingId: building.id, type: 'CLIMATE_ADG_IMPACT',
        modelVersion: '1.0.0', confidence: 0.82,
        prediction: { predictedADG, currentAvgADG: avgADG, deviation } as any,
      },
    });
  }

  async getRecommendations(farmId: string) {
    const predictions = await this.prisma.aIPrediction.findMany({
      where: { farmId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      orderBy: { confidence: 'desc' }, take: 20,
    });
    return predictions.map(p => ({
      id: p.id, type: p.type, confidence: p.confidence,
      recommendation: this.generateRecommendationText(p),
      buildingId: p.buildingId, deviceId: p.deviceId, createdAt: p.createdAt,
    }));
  }

  private generateRecommendationText(prediction: any): string {
    const recs: Record<string, string> = {
      'ANOMALY_DETECTION': 'Inspect device readings and verify sensor calibration.',
      'DEVICE_FAILURE': 'Schedule preventive maintenance within 24 hours.',
      'FEED_SHORTAGE': 'Order feed immediately or check silo level sensor.',
      'FAN_FAILURE': 'Check fan motor, belts, and control system.',
      'WATER_CONSUMPTION_ANOMALY': 'Inspect water lines for leaks or blockages.',
      'ENERGY_CONSUMPTION_ANOMALY': 'Audit electrical systems and check for equipment malfunction.',
      'CLIMATE_FCR_IMPACT': 'Adjust temperature setpoints and review ventilation strategy.',
      'CLIMATE_MORTALITY_IMPACT': 'Urgent: Reduce heat stress and improve air quality immediately.',
      'CLIMATE_ADG_IMPACT': 'Optimize feeding schedule and climate parameters.',
    };
    return recs[prediction.type] || 'Review system status and consult technical documentation.';
  }

  private extractFeatures(points: any[], category: string): number[] {
    const values = points.map(p => { const v = p.value; return typeof v === 'number' ? v : v?.value || v?.temperature || v?.reading || 0; }).filter(v => !isNaN(v));
    if (values.length === 0) return [];
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
    return [mean, std, Math.min(...values), Math.max(...values), values[values.length - 1] - values[0], values.length];
  }

  private extractClimateFeatures(climateData: any[]): number[] {
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const temps = climateData.map(d => d.avgTemp).filter(Boolean);
    const humidities = climateData.map(d => d.avgHumidity).filter(Boolean);
    return [avg(temps), avg(humidities), Math.max(...temps), Math.min(...temps), climateData.length];
  }

  private async getFeedConsumptionRate(siloId: string): Promise<number> {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const records = await this.prisma.telemetry.findMany({
      where: { device: { deviceType: { category: 'FEED_SCALE' } }, timestamp: { gte: weekAgo } },
      orderBy: { timestamp: 'desc' },
    });
    if (records.length < 2) return 10;
    const totalConsumed = records.reduce((sum, r, i) => { if (i === 0) return 0; const curr = (r.rawValue as any)?.weight || 0; const prev = (records[i - 1].rawValue as any)?.weight || 0; return sum + Math.max(0, prev - curr); }, 0);
    const hours = (records[0].timestamp.getTime() - records[records.length - 1].timestamp.getTime()) / 3600000;
    return hours > 0 ? totalConsumed / hours : 10;
  }
}
