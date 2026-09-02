import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskLevel, AlertType } from '@prisma/client';

export interface DailyMetrics {
  dayNumber: number;
  mortalityCount: number;
  avgWeightGrams: number;
  feedConsumedKg: number;
  waterConsumedL: number;
  temperatureAvg: number;
  humidityPercent: number;
  co2Ppm: number;
  nh3Ppm: number;
  initialCount: number;
  currentCount: number;
}

export interface AIAnalysisResult {
  fcr: number;
  adgGrams: number;
  epef: number;
  mortalityRate: number;
  dayScore: number;
  riskLevel: RiskLevel;
  tempScore: number;
  waterScore: number;
  feedScore: number;
  humidityScore: number;
  co2Score: number;
  nh3Score: number;
  detectedIssues: Array<{ type: string; severity: string; description: string }>;
  possibleCauses: string[];
  recommendations: string[];
  forecast7Days: Array<{
    day: number;
    predictedWeight: number;
    predictedMortality: number;
    predictedFCR: number;
  }>;
}

export interface AIForecastResult {
  predictedFinalWeight: number;
  predictedFCR: number;
  predictedEPEF: number;
  totalFeedConsumptionKg: number;
  totalCost: number;
  predictedRevenue: number;
  predictedProfit: number;
  predictedMargin: number;
  accuracyPercent: number;
}

@Injectable()
export class AIEngineService {
  private readonly logger = new Logger(AIEngineService.name);

  // Turkey breed-specific standards (BUT Big 6)
  private readonly breedStandards = {
    targetWeights: {
      1: 60, 7: 180, 14: 450, 21: 900, 28: 1600, 35: 2500,
      42: 3500, 49: 4600, 56: 5700, 63: 6800, 70: 7800,
      77: 8700, 84: 9500, 91: 10200, 98: 10800, 105: 11300,
      112: 11700, 119: 12000, 126: 12250, 133: 12400, 140: 12500
    },
    targetFCR: {
      1: 0.0, 7: 0.85, 14: 1.05, 21: 1.25, 28: 1.45, 35: 1.65,
      42: 1.85, 49: 2.05, 56: 2.25, 63: 2.45, 70: 2.65,
      77: 2.85, 84: 3.05, 91: 3.25, 98: 3.45, 105: 3.65,
      112: 3.85, 119: 4.05, 126: 4.25, 133: 4.45, 140: 4.65
    },
    optimalTemp: {
      1: 35, 7: 33, 14: 30, 21: 27, 28: 24, 35: 22,
      42: 21, 49: 20, 56: 19, 63: 18, 70: 18, 77: 18,
      84: 18, 91: 18, 98: 18, 105: 18, 112: 18, 119: 18,
      126: 18, 133: 18, 140: 18
    },
    optimalHumidity: { min: 50, max: 70 },
    co2Limit: 3000,
    nh3Limit: 25,
    maxMortalityRate: 0.05 // 5% cumulative
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Main analysis pipeline triggered after daily log save
   */
  async analyzeDay(batchId: string, dayNumber: number): Promise<AIAnalysisResult> {
    this.logger.log(`Analyzing batch ${batchId}, day ${dayNumber}`);

    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        dailyLogs: { orderBy: { dayNumber: 'asc' } },
        _count: { select: { alerts: { where: { isResolved: false } } } }
      }
    });

    if (!batch) throw new Error('Batch not found');

    const currentLog = batch.dailyLogs.find(l => l.dayNumber === dayNumber);
    if (!currentLog) throw new Error('Daily log not found');

    const metrics = this.extractMetrics(batch, currentLog);
    const previousLogs = batch.dailyLogs.filter(l => l.dayNumber < dayNumber);

    // Core calculations
    const fcr = this.calculateFCR(batch, currentLog, previousLogs);
    const adg = this.calculateADG(batch, currentLog, previousLogs);
    const epef = this.calculateEPEF(batch, currentLog, fcr, adg);
    const mortalityRate = (batch.initialCount - metrics.currentCount) / batch.initialCount;

    // Environmental scores
    const tempScore = this.scoreTemperature(metrics.temperatureAvg, dayNumber);
    const humidityScore = this.scoreHumidity(metrics.humidityPercent);
    const co2Score = this.scoreCO2(metrics.co2Ppm);
    const nh3Score = this.scoreNH3(metrics.nh3Ppm);
    const waterScore = this.scoreWater(metrics.waterConsumedL, metrics.feedConsumedKg, dayNumber);
    const feedScore = this.scoreFeed(metrics.feedConsumedKg, metrics.currentCount, dayNumber);

    // Issue detection
    const issues = this.detectIssues(metrics, fcr, adg, mortalityRate, dayNumber, previousLogs);
    const causes = this.inferCauses(issues, metrics);
    const recommendations = this.generateRecommendations(issues, metrics, dayNumber);

    // Risk assessment
    const dayScore = this.calculateDayScore(tempScore, humidityScore, co2Score, nh3Score, 
                                             waterScore, feedScore, fcr, mortalityRate, dayNumber);
    const riskLevel = this.determineRiskLevel(dayScore, issues);

    // 7-day forecast
    const forecast = this.forecast7Days(batch, currentLog, fcr, adg, dayNumber);

    // Persist results
    await this.persistAnalysis(batchId, dayNumber, {
      fcr, adgGrams: adg, epef, mortalityRate, tempScore, waterScore, 
      feedScore, humidityScore, co2Score, nh3Score, dayScore, riskLevel,
      detectedIssues: issues, possibleCauses: causes, recommendations, forecast7Days: forecast
    });

    // Generate alerts if needed
    await this.generateAlerts(batchId, dayNumber, issues, riskLevel);

    return {
      fcr, adgGrams: adg, epef, mortalityRate, dayScore, riskLevel,
      tempScore, waterScore, feedScore, humidityScore, co2Score, nh3Score,
      detectedIssues: issues, possibleCauses: causes, recommendations, forecast7Days: forecast
    };
  }

  private extractMetrics(batch: any, log: any): DailyMetrics {
    return {
      dayNumber: log.dayNumber,
      mortalityCount: log.mortalityCount,
      avgWeightGrams: log.avgWeightGrams || 0,
      feedConsumedKg: log.feedConsumedKg || 0,
      waterConsumedL: log.waterConsumedL || 0,
      temperatureAvg: log.temperatureAvg || 0,
      humidityPercent: log.humidityPercent || 0,
      co2Ppm: log.co2Ppm || 0,
      nh3Ppm: log.nh3Ppm || 0,
      initialCount: batch.initialCount,
      currentCount: batch.currentCount
    };
  }

  private calculateFCR(batch: any, currentLog: any, previousLogs: any[]): number {
    const totalFeed = previousLogs.reduce((sum, l) => sum + (l.feedConsumedKg || 0), 0) + 
                      (currentLog.feedConsumedKg || 0);
    const totalWeightGain = ((currentLog.avgWeightGrams || 0) - batch.avgWeightGrams) * 
                            (batch.currentCount / 1000); // kg
    return totalWeightGain > 0 ? parseFloat((totalFeed / totalWeightGain).toFixed(3)) : 0;
  }

  private calculateADG(batch: any, currentLog: any, previousLogs: any[]): number {
    if (previousLogs.length === 0) return 0;
    const prevLog = previousLogs[previousLogs.length - 1];
    const weightDiff = (currentLog.avgWeightGrams || 0) - (prevLog.avgWeightGrams || batch.avgWeightGrams);
    return parseFloat((weightDiff / (currentLog.dayNumber - prevLog.dayNumber)).toFixed(2));
  }

  private calculateEPEF(batch: any, currentLog: any, fcr: number, adg: number): number {
    if (fcr <= 0 || currentLog.dayNumber <= 0) return 0;
    const viability = (batch.currentCount / batch.initialCount) * 100;
    const avgWeightKg = (currentLog.avgWeightGrams || 0) / 1000;
    return parseFloat(((viability * avgWeightKg) / (currentLog.dayNumber * fcr)).toFixed(2));
  }

  private scoreTemperature(actual: number, day: number): number {
    const target = this.breedStandards.optimalTemp[day] || 18;
    const diff = Math.abs(actual - target);
    if (diff <= 1) return 100;
    if (diff <= 2) return 90;
    if (diff <= 3) return 75;
    if (diff <= 4) return 60;
    if (diff <= 5) return 40;
    return 20;
  }

  private scoreHumidity(actual: number): number {
    if (actual >= this.breedStandards.optimalHumidity.min && 
        actual <= this.breedStandards.optimalHumidity.max) return 100;
    const dist = Math.min(
      Math.abs(actual - this.breedStandards.optimalHumidity.min),
      Math.abs(actual - this.breedStandards.optimalHumidity.max)
    );
    return Math.max(0, 100 - dist * 5);
  }

  private scoreCO2(actual: number): number {
    return actual <= this.breedStandards.co2Limit ? 
      Math.max(0, 100 - (actual / this.breedStandards.co2Limit) * 20) : 
      Math.max(0, 80 - ((actual - this.breedStandards.co2Limit) / 100) * 10);
  }

  private scoreNH3(actual: number): number {
    return actual <= this.breedStandards.nh3Limit ? 
      Math.max(0, 100 - (actual / this.breedStandards.nh3Limit) * 20) : 
      Math.max(0, 80 - ((actual - this.breedStandards.nh3Limit) * 3));
  }

  private scoreWater(waterL: number, feedKg: number, day: number): number {
    if (feedKg <= 0) return 50;
    const ratio = waterL / feedKg;
    const targetRatio = day < 14 ? 2.0 : day < 42 ? 1.8 : 1.6;
    const diff = Math.abs(ratio - targetRatio);
    if (diff <= 0.1) return 100;
    if (diff <= 0.2) return 85;
    if (diff <= 0.3) return 70;
    if (diff <= 0.5) return 50;
    return 30;
  }

  private scoreFeed(feedKg: number, birdCount: number, day: number): number {
    if (birdCount <= 0) return 50;
    const feedPerBird = (feedKg / birdCount) * 1000; // grams
    const targetFeed = day < 7 ? 25 : day < 14 ? 55 : day < 21 ? 100 : 
                       day < 28 ? 150 : day < 35 ? 200 : day < 42 ? 250 :
                       day < 49 ? 300 : day < 56 ? 340 : day < 63 ? 375 :
                       day < 70 ? 400 : day < 77 ? 420 : day < 84 ? 435 :
                       day < 91 ? 445 : day < 98 ? 450 : 455;
    const diff = Math.abs(feedPerBird - targetFeed);
    const pctDiff = diff / targetFeed;
    if (pctDiff <= 0.05) return 100;
    if (pctDiff <= 0.1) return 85;
    if (pctDiff <= 0.15) return 70;
    if (pctDiff <= 0.2) return 55;
    return 35;
  }

  private detectIssues(metrics: DailyMetrics, fcr: number, adg: number, 
                       mortalityRate: number, day: number, previousLogs: any[]): Array<any> {
    const issues = [];
    const targetWeight = this.breedStandards.targetWeights[day] || 12500;
    const targetFCR = this.breedStandards.targetFCR[day] || 4.65;

    // Weight deviation
    if (metrics.avgWeightGrams < targetWeight * 0.9) {
      issues.push({
        type: 'WEIGHT_UNDERPERFORMANCE',
        severity: metrics.avgWeightGrams < targetWeight * 0.8 ? 'HIGH' : 'MEDIUM',
        description: `Masa ptaków (${metrics.avgWeightGrams}g) poniżej normy o ${((1 - metrics.avgWeightGrams/targetWeight)*100).toFixed(1)}%`
      });
    }

    // FCR deterioration
    if (fcr > targetFCR * 1.1) {
      issues.push({
        type: 'FCR_DETERIORATION',
        severity: fcr > targetFCR * 1.2 ? 'HIGH' : 'MEDIUM',
        description: `FCR (${fcr}) przekracza normę (${targetFCR})`
      });
    }

    // Mortality spike
    const dailyMortalityRate = metrics.mortalityCount / metrics.currentCount;
    if (dailyMortalityRate > 0.001) { // > 0.1% daily
      issues.push({
        type: 'MORTALITY_RISE',
        severity: dailyMortalityRate > 0.003 ? 'CRITICAL' : dailyMortalityRate > 0.002 ? 'HIGH' : 'MEDIUM',
        description: `Dzienna śmiertelność ${(dailyMortalityRate*100).toFixed(2)}%`
      });
    }
    if (mortalityRate > this.breedStandards.maxMortalityRate) {
      issues.push({
        type: 'CUMULATIVE_MORTALITY_HIGH',
        severity: 'CRITICAL',
        description: `Skumulowana śmiertelność ${(mortalityRate*100).toFixed(2)}% przekracza limit 5%`
      });
    }

    // Temperature
    const tempTarget = this.breedStandards.optimalTemp[day] || 18;
    if (Math.abs(metrics.temperatureAvg - tempTarget) > 3) {
      issues.push({
        type: 'TEMPERATURE_ANOMALY',
        severity: Math.abs(metrics.temperatureAvg - tempTarget) > 5 ? 'HIGH' : 'MEDIUM',
        description: `Temperatura ${metrics.temperatureAvg}°C, norma ${tempTarget}°C`
      });
    }

    // Humidity
    if (metrics.humidityPercent < 40 || metrics.humidityPercent > 80) {
      issues.push({
        type: 'HUMIDITY_ANOMALY',
        severity: metrics.humidityPercent < 30 || metrics.humidityPercent > 85 ? 'HIGH' : 'MEDIUM',
        description: `Wilgotność ${metrics.humidityPercent}%, norma 50-70%`
      });
    }

    // CO2
    if (metrics.co2Ppm > this.breedStandards.co2Limit) {
      issues.push({
        type: 'CO2_HIGH',
        severity: metrics.co2Ppm > 4000 ? 'HIGH' : 'MEDIUM',
        description: `CO₂ ${metrics.co2Ppm} ppm, limit ${this.breedStandards.co2Limit} ppm`
      });
    }

    // NH3
    if (metrics.nh3Ppm > this.breedStandards.nh3Limit) {
      issues.push({
        type: 'NH3_HIGH',
        severity: metrics.nh3Ppm > 35 ? 'HIGH' : 'MEDIUM',
        description: `NH₃ ${metrics.nh3Ppm} ppm, limit ${this.breedStandards.nh3Limit} ppm`
      });
    }

    // Feed drop detection (compare with previous days)
    if (previousLogs.length >= 3) {
      const recentFeed = previousLogs.slice(-3).map(l => l.feedConsumedKg || 0);
      const avgRecentFeed = recentFeed.reduce((a, b) => a + b, 0) / recentFeed.length;
      if (metrics.feedConsumedKg < avgRecentFeed * 0.85 && metrics.feedConsumedKg > 0) {
        issues.push({
          type: 'FEED_DROP',
          severity: metrics.feedConsumedKg < avgRecentFeed * 0.7 ? 'HIGH' : 'MEDIUM',
          description: `Spadek poboru paszy o ${((1 - metrics.feedConsumedKg/avgRecentFeed)*100).toFixed(1)}%`
        });
      }
    }

    // Water spike
    if (metrics.feedConsumedKg > 0) {
      const waterFeedRatio = metrics.waterConsumedL / metrics.feedConsumedKg;
      if (waterFeedRatio > 2.5) {
        issues.push({
          type: 'WATER_SPIKE',
          severity: waterFeedRatio > 3.0 ? 'HIGH' : 'MEDIUM',
          description: `Wysoki pobór wody (stosunek ${waterFeedRatio.toFixed(2)}:1)`
        });
      }
    }

    return issues;
  }

  private inferCauses(issues: any[], metrics: DailyMetrics): string[] {
    const causes = new Set<string>();

    issues.forEach(issue => {
      switch (issue.type) {
        case 'WEIGHT_UNDERPERFORMANCE':
          causes.add('Niewystarczająca dawka paszy lub niska jakość');
          causes.add('Możliwa infekcja podkliniczna');
          causes.add('Stres termiczny lub środowiskowy');
          break;
        case 'FCR_DETERIORATION':
          causes.add('Przekarmianie lub nierównomierny dostęp do karmideł');
          causes.add('Infekcja jelitowa (coccidiosis, clostridia)');
          causes.add('Niska jakość surowców paszowych');
          break;
        case 'MORTALITY_RISE':
        case 'CUMULATIVE_MORTALITY_HIGH':
          causes.add('Infekcja bakteryjna lub wirusowa');
          causes.add('Zatrucie (mycotoksyny, amoniak)');
          causes.add('Błędy w szczepieniach lub biosekuritecie');
          break;
        case 'TEMPERATURE_ANOMALY':
          causes.add('Awaria systemu HVAC');
          causes.add('Niewystarczająca izolacja kurnika');
          causes.add('Przeludnienie lub niedostateczna wentylacja');
          break;
        case 'CO2_HIGH':
        case 'NH3_HIGH':
          causes.add('Niewystarczająca wentylacja');
          causes.add('Zbyt wysoka wilgotność ściółki');
          causes.add('Przeludnienie kurnika');
          break;
        case 'FEED_DROP':
          causes.add('Problemy zdrowotne (choroba, ból)');
          causes.add('Wysoka temperatura w kurniku');
          causes.add('Awaria systemu karmienia');
          break;
        case 'WATER_SPIKE':
          causes.add('Wysoka temperatura - ptaki piją więcej');
          causes.add('Infekcja jelitowa (biegunka)');
          causes.add('Zbyt wysokie stężenie soli w paszy');
          break;
      }
    });

    return Array.from(causes);
  }

  private generateRecommendations(issues: any[], metrics: DailyMetrics, day: number): string[] {
    const recs = new Set<string>();

    issues.forEach(issue => {
      switch (issue.type) {
        case 'WEIGHT_UNDERPERFORMANCE':
          recs.add('Sprawdź kaloryczność paszy i dostępność karmideł');
          recs.add('Rozważ zwiększenie dawki o 5-10% przez 3 dni');
          recs.add('Wykonaj badanie kału na obecność pasożytów');
          break;
        case 'FCR_DETERIORATION':
          recs.add('Przeanalizuj skład paszy - sprawdź mykotoksyny');
          recs.add('Dodaj probiotyki lub kwasy organiczne do wody');
          recs.add('Sprawdź szczelność karmideł - eliminuj straty');
          break;
        case 'MORTALITY_RISE':
          recs.add('NATYCHMIAST: Izoluj padłe ptaki, pobierz materiał do badań');
          recs.add('Skontaktuj się z weterynarzem - rozważ antybiotykoterapię');
          recs.add('Wzmocnij biosekuritet - dezynfekcja, ograniczenie ruchu');
          break;
        case 'TEMPERATURE_ANOMALY':
          recs.add('Sprawdź termostaty i wentylatory');
          recs.add('Dostosuj program wentylacji do wieku stada');
          recs.add('Sprawdź izolację dachu i ścian');
          break;
        case 'CO2_HIGH':
        case 'NH3_HIGH':
          recs.add('Zwiększ wymianę powietrza - sprawdź wentylatory');
          recs.add('Sprawdź wilgotność ściółki - wymień jeśli > 30%');
          recs.add('Zmniejsz obsadę jeśli przekracza normę');
          break;
        case 'FEED_DROP':
          recs.add('Sprawdź zdrowie ptaków - objawy kliniczne');
          recs.add('Zmierz temperaturę w różnych strefach kurnika');
          recs.add('Sprawdź mechanizm podawania paszy');
          break;
        case 'WATER_SPIKE':
          recs.add('Sprawdź jakość wody (pH, bakteriologia)');
          recs.add('Monitoruj objawy biegunki w stadzie');
          recs.add('Sprawdź skład elektrolitów w wodzie');
          break;
        case 'HUMIDITY_ANOMALY':
          recs.add(day < 14 ? 'Zwiększ wentylację lub użyj nawilżaczy' : 'Sprawdź system wentylacji i ogrzewania');
          recs.add('Monitoruj wilgotność ściółki');
          break;
      }
    });

    // General recommendations based on age
    if (day < 7) {
      recs.add('Krytyczny okres - monitoruj temperaturę co 2h');
    } else if (day > 100) {
      recs.add('Okres finalny - kontroluj FCR i masę przed ubojem');
    }

    return Array.from(recs);
  }

  private calculateDayScore(temp: number, humidity: number, co2: number, nh3: number,
                           water: number, feed: number, fcr: number, mortalityRate: number, day: number): number {
    const envScore = (temp + humidity + co2 + nh3) / 4;
    const consumptionScore = (water + feed) / 2;

    let performanceScore = 100;
    const targetFCR = this.breedStandards.targetFCR[day] || 4.65;
    if (fcr > 0) {
      performanceScore = Math.max(0, 100 - ((fcr - targetFCR) / targetFCR) * 100);
    }

    let mortalityScore = 100;
    if (mortalityRate > 0) {
      mortalityScore = Math.max(0, 100 - (mortalityRate / this.breedStandards.maxMortalityRate) * 100);
    }

    const weighted = (envScore * 0.25) + (consumptionScore * 0.25) + 
                     (performanceScore * 0.3) + (mortalityScore * 0.2);
    return Math.round(weighted);
  }

  private determineRiskLevel(score: number, issues: any[]): RiskLevel {
    const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
    const highCount = issues.filter(i => i.severity === 'HIGH').length;

    if (criticalCount > 0 || score < 30) return RiskLevel.CRITICAL;
    if (highCount >= 2 || score < 50) return RiskLevel.HIGH;
    if (highCount === 1 || score < 70) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private forecast7Days(batch: any, currentLog: any, currentFCR: number, currentADG: number, day: number): any[] {
    const forecast = [];
    let projectedWeight = currentLog.avgWeightGrams || batch.avgWeightGrams;
    let projectedCount = batch.currentCount;

    for (let i = 1; i <= 7; i++) {
      const forecastDay = day + i;
      const targetWeight = this.breedStandards.targetWeights[forecastDay] || 
                          projectedWeight + (currentADG > 0 ? currentADG : 30);

      // Weight projection with decay if issues exist
      const weightGain = currentADG > 0 ? currentADG : (targetWeight - projectedWeight) / 7;
      projectedWeight += weightGain * 0.95; // Slight conservative factor

      // Mortality projection (slight daily increase)
      const dailyMortality = Math.max(1, Math.round(projectedCount * 0.0003));
      projectedCount -= dailyMortality;

      // FCR projection
      const targetFCR = this.breedStandards.targetFCR[forecastDay] || currentFCR * 1.02;

      forecast.push({
        day: forecastDay,
        predictedWeight: Math.round(projectedWeight),
        predictedMortality: dailyMortality,
        predictedFCR: parseFloat(targetFCR.toFixed(3))
      });
    }

    return forecast;
  }

  private async persistAnalysis(batchId: string, dayNumber: number, data: any): Promise<void> {
    await this.prisma.aIAnalysis.upsert({
      where: { 
        // Using a composite unique would be better, but Prisma doesn't support composite unique in upsert directly
        // We'll use a workaround with id or create a unique constraint
        id: `${batchId}_${dayNumber}` 
      },
      update: {
        fcr: data.fcr,
        adgGrams: data.adgGrams,
        epef: data.epef,
        mortalityRate: data.mortalityRate,
        tempScore: data.tempScore,
        waterScore: data.waterScore,
        feedScore: data.feedScore,
        humidityScore: data.humidityScore,
        co2Score: data.co2Score,
        nh3Score: data.nh3Score,
        dayScore: data.dayScore,
        riskLevel: data.riskLevel,
        detectedIssues: data.detectedIssues,
        possibleCauses: data.possibleCauses,
        recommendations: data.recommendations,
        forecast7Days: data.forecast7Days
      },
      create: {
        id: `${batchId}_${dayNumber}`,
        batchId,
        dayNumber,
        fcr: data.fcr,
        adgGrams: data.adgGrams,
        epef: data.epef,
        mortalityRate: data.mortalityRate,
        tempScore: data.tempScore,
        waterScore: data.waterScore,
        feedScore: data.feedScore,
        humidityScore: data.humidityScore,
        co2Score: data.co2Score,
        nh3Score: data.nh3Score,
        dayScore: data.dayScore,
        riskLevel: data.riskLevel,
        detectedIssues: data.detectedIssues,
        possibleCauses: data.possibleCauses,
        recommendations: data.recommendations,
        forecast7Days: data.forecast7Days
      }
    });
  }

  private async generateAlerts(batchId: string, dayNumber: number, issues: any[], riskLevel: RiskLevel): Promise<void> {
    const alertTypeMap: Record<string, AlertType> = {
      'FCR_DETERIORATION': AlertType.FCR_DETERIORATION,
      'FEED_DROP': AlertType.FEED_DROP,
      'WATER_SPIKE': AlertType.WATER_SPIKE,
      'MORTALITY_RISE': AlertType.MORTALITY_RISE,
      'CUMULATIVE_MORTALITY_HIGH': AlertType.MORTALITY_RISE,
      'TEMPERATURE_ANOMALY': AlertType.TEMPERATURE_ANOMALY,
      'HUMIDITY_ANOMALY': AlertType.HUMIDITY_ANOMALY,
      'CO2_HIGH': AlertType.CO2_HIGH,
      'NH3_HIGH': AlertType.NH3_HIGH
    };

    for (const issue of issues) {
      if (issue.severity === 'HIGH' || issue.severity === 'CRITICAL') {
        const alertType = alertTypeMap[issue.type] || AlertType.HEALTH;

        await this.prisma.alert.create({
          data: {
            batchId,
            type: alertType,
            severity: issue.severity === 'CRITICAL' ? RiskLevel.CRITICAL : RiskLevel.HIGH,
            title: issue.type.replace(/_/g, ' '),
            description: issue.description,
            justification: `Wykryte na dniu ${dayNumber}. AI zanalizowało parametry produkcyjne i stwierdziło odchylenie od normy dla rasy BUT Big 6.`,
            isResolved: false
          }
        });
      }
    }
  }

  /**
   * End-of-batch forecast
   */
  async forecastBatchEnd(batchId: string): Promise<AIForecastResult> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: { dailyLogs: { orderBy: { dayNumber: 'asc' } } }
    });

    if (!batch) throw new Error('Batch not found');

    const latestLog = batch.dailyLogs[batch.dailyLogs.length - 1];
    if (!latestLog) {
      return this.generateDefaultForecast(batch);
    }

    const daysRemaining = Math.max(0, 140 - latestLog.dayNumber);
    const currentWeight = latestLog.avgWeightGrams || batch.avgWeightGrams;

    // Calculate trend from last 14 days
    const recentLogs = batch.dailyLogs.slice(-14);
    const weightTrend = recentLogs.length > 1 ? 
      (recentLogs[recentLogs.length - 1].avgWeightGrams - recentLogs[0].avgWeightGrams) / recentLogs.length : 50;

    const projectedFinalWeight = Math.min(12500, currentWeight + (weightTrend * daysRemaining * 0.9));

    // FCR projection
    const currentFCR = latestLog.fcr || 2.5;
    const projectedFCR = Math.min(5.0, currentFCR + (daysRemaining * 0.015));

    // EPEF
    const viability = (batch.currentCount / batch.initialCount) * 100;
    const epef = (viability * (projectedFinalWeight / 1000)) / (140 * projectedFCR);

    // Economics
    const totalFeed = batch.dailyLogs.reduce((sum, l) => sum + (l.feedConsumedKg || 0), 0);
    const projectedDailyFeed = recentLogs.length > 0 ? 
      recentLogs.reduce((sum, l) => sum + (l.feedConsumedKg || 0), 0) / recentLogs.length : 200;
    const totalFeedProjected = totalFeed + (projectedDailyFeed * daysRemaining);

    const feedCost = totalFeedProjected * 1.8; // PLN per kg
    const chickCost = batch.initialCount * batch.pricePerUnit;
    const otherCosts = batch.currentCount * daysRemaining * 0.15; // labor, energy, etc.
    const totalCost = feedCost + chickCost + otherCosts;

    const revenue = batch.currentCount * (projectedFinalWeight / 1000) * 6.5; // PLN per kg live weight
    const profit = revenue - totalCost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Accuracy based on data quality
    const dataCompleteness = batch.dailyLogs.length / latestLog.dayNumber;
    const accuracy = Math.round(60 + (dataCompleteness * 30));

    const result = {
      predictedFinalWeight: Math.round(projectedFinalWeight),
      predictedFCR: parseFloat(projectedFCR.toFixed(3)),
      predictedEPEF: parseFloat(epef.toFixed(2)),
      totalFeedConsumptionKg: Math.round(totalFeedProjected),
      totalCost: Math.round(totalCost),
      predictedRevenue: Math.round(revenue),
      predictedProfit: Math.round(profit),
      predictedMargin: parseFloat(margin.toFixed(2)),
      accuracyPercent: Math.min(95, accuracy)
    };

    // Persist forecast
    await this.prisma.aIForecast.create({
      data: { ...result, batchId }
    });

    return result;
  }

  private generateDefaultForecast(batch: any): AIForecastResult {
    return {
      predictedFinalWeight: 12000,
      predictedFCR: 4.5,
      predictedEPEF: 280,
      totalFeedConsumptionKg: batch.initialCount * 4.5 * 12,
      totalCost: batch.initialCount * batch.pricePerUnit + batch.initialCount * 4.5 * 12 * 1.8,
      predictedRevenue: batch.initialCount * 12 * 6.5,
      predictedProfit: 0,
      predictedMargin: 0,
      accuracyPercent: 40
    };
  }
}
