import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface BatchForecastResult {
  forecastId: string;
  batchId: string;
  weeklyForecasts: Array<{
    week: number;
    ageDays: number;
    predictedWeight: number;
    predictedFeedConsumption: number;
    predictedFcr: number;
    predictedMortality: number;
  }>;
  summary: {
    predictedFcr: number;
    predictedAdg: number;
    predictedEpef: number;
    predictedMortality: number;
    predictedFeedConsumption: number;
    predictedWaterConsumption: number;
    predictedFeedCost: number;
    predictedTotalCost: number;
    predictedMargin: number;
  };
  assumptions: string[];
  confidenceIntervals: Record<string, { low: number; high: number }>;
}

export interface ForecastAccuracyReport {
  forecastId: string;
  accuracy: {
    fcrError: number;
    adgError: number;
    epefError: number;
    mortalityError: number;
    costError: number;
  };
  analysis: string;
  lessonsLearned: string[];
  modelAdjustments: Array<{
    parameter: string;
    oldWeight: number;
    newWeight: number;
    reason: string;
  }>;
}

@Injectable()
export class ForecastService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // 1. GENEROWANIE PROGNOZY RZUTU
  // ============================================================

  async generateForecast(batchId: string, recipeId: string): Promise<BatchForecastResult> {
    const batch = await this.prisma.productionBatch.findUnique({
      where: { id: batchId },
      include: { recipes: true },
    });
    if (!batch) throw new NotFoundException('Rzut nie istnieje');

    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { ingredients: { include: { rawMaterial: true } }, standard: true },
    });
    if (!recipe) throw new NotFoundException('Receptura nie istnieje');

    const nutrition = recipe.calculatedNutrition as Record<string, number>;
    const initialCount = batch.initialCount;

    // Generuj tygodniowe prognozy
    const weeklyForecasts = this.calculateWeeklyForecasts(
      nutrition,
      recipe.standard as any,
      initialCount,
      batch.gender,
    );

    // Podsumowanie końcowe
    const lastWeek = weeklyForecasts[weeklyForecasts.length - 1];
    const totalFeed = weeklyForecasts.reduce((sum, w) => sum + w.predictedFeedConsumption, 0);
    const avgAdg = lastWeek.predictedWeight / (lastWeek.ageDays / 7) / 7 * 1000; // g/dzień
    const fcr = totalFeed / (lastWeek.predictedWeight * initialCount);
    const epef = (lastWeek.predictedWeight * 1000 * (100 - lastWeek.predictedMortality) / 100) / (fcr * lastWeek.ageDays) * 100;
    const feedCost = totalFeed * (Number(recipe.costPerTon) / 1000);

    const forecast = await this.prisma.batchForecast.create({
      data: {
        batchId,
        weeklyForecasts: weeklyForecasts as any,
        predictedFcr: new Prisma.Decimal(fcr),
        predictedAdg: new Prisma.Decimal(avgAdg),
        predictedEpef: new Prisma.Decimal(epef),
        predictedMortality: new Prisma.Decimal(lastWeek.predictedMortality),
        predictedFeedConsumption: new Prisma.Decimal(totalFeed),
        predictedWaterConsumption: new Prisma.Decimal(totalFeed * 2.2), // typowy stosunek woda:pasza
        predictedFeedCost: new Prisma.Decimal(feedCost),
        predictedTotalCost: new Prisma.Decimal(feedCost * 1.15), // +15% inne koszty
        predictedMargin: new Prisma.Decimal(0), // Wymagałoby ceny tuszy
        assumptions: [
          `Receptura: ${recipe.name} (ME: ${nutrition.meTurkey?.toFixed(0)} kcal/kg)`,
          `Liczba indyków: ${initialCount}`,
          `Płeć: ${batch.gender}`,
          `Warunki środowiskowe optymalne (20-24°C)`,
          `Brak chorób i stresów`,
          `Woda i pasza dostępne ad libitum`,
        ],
        confidenceIntervals: {
          fcr: { low: fcr * 0.95, high: fcr * 1.08 },
          adg: { low: avgAdg * 0.92, high: avgAdg * 1.05 },
          epef: { low: epef * 0.90, high: epef * 1.10 },
          mortality: { low: 0, high: lastWeek.predictedMortality * 1.5 },
        } as any,
        recipeVersion: recipe.version,
      },
    });

    return {
      forecastId: forecast.id,
      batchId,
      weeklyForecasts,
      summary: {
        predictedFcr: Number(forecast.predictedFcr),
        predictedAdg: Number(forecast.predictedAdg),
        predictedEpef: Number(forecast.predictedEpef),
        predictedMortality: Number(forecast.predictedMortality),
        predictedFeedConsumption: Number(forecast.predictedFeedConsumption),
        predictedWaterConsumption: Number(forecast.predictedWaterConsumption),
        predictedFeedCost: Number(forecast.predictedFeedCost),
        predictedTotalCost: Number(forecast.predictedTotalCost),
        predictedMargin: Number(forecast.predictedMargin),
      },
      assumptions: forecast.assumptions as string[],
      confidenceIntervals: forecast.confidenceIntervals as any,
    };
  }

  // ============================================================
  // 2. ANALIZA DOKŁADNOŚCI — SAMOUCZENIE
  // ============================================================

  async analyzeForecastAccuracy(forecastId: string, userId: string): Promise<ForecastAccuracyReport> {
    const forecast = await this.prisma.batchForecast.findUnique({
      where: { id: forecastId },
      include: { batch: { include: { results: true } } },
    });
    if (!forecast) throw new NotFoundException('Prognoza nie istnieje');

    const results = forecast.batch.results;
    if (!results.length) {
      throw new NotFoundException('Brak wyników produkcyjnych do analizy');
    }

    // Agreguj rzeczywiste wyniki
    const actualFcr = this.weightedAverage(results, 'fcr');
    const actualAdg = this.weightedAverage(results, 'adg');
    const actualEpef = this.weightedAverage(results, 'epef');
    const actualMortality = Math.max(...results.map(r => Number(r.mortalityCumulative) || 0));
    const actualFeedCost = Number(forecast.predictedFeedCost); // Simplification

    // Oblicz błędy
    const fcrError = (Number(forecast.predictedFcr) - actualFcr) / actualFcr;
    const adgError = (Number(forecast.predictedAdg) - actualAdg) / actualAdg;
    const epefError = (Number(forecast.predictedEpef) - actualEpef) / actualEpef;
    const mortalityError = (Number(forecast.predictedMortality) - actualMortality) / Math.max(actualMortality, 1);
    const costError = 0;

    // Analiza błędów
    const analysis = this.generateErrorAnalysis(fcrError, adgError, epefError, mortalityError, forecast, results);
    const lessons = this.generateLessons(fcrError, adgError, epefError, mortalityError);
    const adjustments = this.generateModelAdjustments(fcrError, adgError, epefError);

    // Zapisz analizę
    await this.prisma.forecastAccuracy.create({
      data: {
        forecastId,
        actualFcr: new Prisma.Decimal(actualFcr),
        actualAdg: new Prisma.Decimal(actualAdg),
        actualEpef: new Prisma.Decimal(actualEpef),
        actualMortality: new Prisma.Decimal(actualMortality),
        actualFeedCost: new Prisma.Decimal(actualFeedCost),
        fcrError: new Prisma.Decimal(fcrError),
        adgError: new Prisma.Decimal(adgError),
        epefError: new Prisma.Decimal(epefError),
        mortalityError: new Prisma.Decimal(mortalityError),
        costError: new Prisma.Decimal(costError),
        errorAnalysis: analysis,
        lessonsLearned: lessons,
        modelAdjustments: adjustments as any,
        analyzedBy: userId,
      },
    });

    return {
      forecastId,
      accuracy: {
        fcrError: Number(fcrError.toFixed(4)),
        adgError: Number(adgError.toFixed(4)),
        epefError: Number(epefError.toFixed(4)),
        mortalityError: Number(mortalityError.toFixed(4)),
        costError: 0,
      },
      analysis,
      lessonsLearned: lessons,
      modelAdjustments: adjustments,
    };
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private calculateWeeklyForecasts(
    nutrition: Record<string, number>,
    standard: any,
    initialCount: number,
    gender: string,
  ): Array<any> {
    const weeks = [];
    const me = nutrition.meTurkey || 2800;
    const protein = nutrition.crudeProtein || 26;
    const lysine = nutrition.lysine || 1.4;
    const fiber = nutrition.crudeFiber || 3;
    const sodium = nutrition.sodium || 0.15;

    // Modyfikatory
    const meModifier = (me - 2800) / 2800; // Odchylenie od bazy
    const proteinModifier = (protein - 26) / 26;
    const lysineModifier = (lysine - 1.4) / 1.4;
    const fiberPenalty = Math.max(0, (fiber - 4) * 0.02);
    const sodiumPenalty = Math.max(0, (sodium - 0.18) * 0.5);

    // Baza wzrostu indyka brojlera (samiec)
    const baseGrowthCurve = [
      { week: 1, age: 7, weight: 0.180, feed: 0.150 },
      { week: 2, age: 14, weight: 0.450, feed: 0.400 },
      { week: 3, age: 21, weight: 0.900, feed: 0.850 },
      { week: 4, age: 28, weight: 1.500, feed: 1.500 },
      { week: 5, age: 35, weight: 2.300, feed: 2.200 },
      { week: 6, age: 42, weight: 3.200, feed: 3.000 },
      { week: 7, age: 49, weight: 4.200, feed: 3.800 },
      { week: 8, age: 56, weight: 5.300, feed: 4.500 },
      { week: 9, age: 63, weight: 6.400, feed: 5.200 },
      { week: 10, age: 70, weight: 7.500, feed: 5.800 },
      { week: 11, age: 77, weight: 8.600, feed: 6.300 },
      { week: 12, age: 84, weight: 9.600, feed: 6.700 },
      { week: 13, age: 91, weight: 10.500, feed: 7.000 },
      { week: 14, age: 98, weight: 11.300, feed: 7.200 },
      { week: 15, age: 105, weight: 12.000, feed: 7.300 },
      { week: 16, age: 112, weight: 12.600, feed: 7.400 },
      { week: 17, age: 119, weight: 13.100, feed: 7.400 },
      { week: 18, age: 126, weight: 13.500, feed: 7.300 },
      { week: 19, age: 133, weight: 13.800, feed: 7.200 },
      { week: 20, age: 140, weight: 14.000, feed: 7.000 },
    ];

    // Modyfikuj krzywą wzrostu
    for (const week of baseGrowthCurve) {
      // Wpływ energii na wzrost
      const weightMod = 1 + meModifier * 0.1 + proteinModifier * 0.05 + lysineModifier * 0.08;
      const feedMod = 1 + meModifier * (-0.05) + fiberPenalty + sodiumPenalty;

      // Śmiertelność kumulatywna (model uproszczony)
      const mortality = Math.min(5, week.week * 0.25 + sodiumPenalty * 2);

      weeks.push({
        week: week.week,
        ageDays: week.age,
        predictedWeight: Number((week.weight * weightMod).toFixed(3)),
        predictedFeedConsumption: Number((week.feed * feedMod * initialCount).toFixed(1)),
        predictedFcr: Number((week.feed / (week.weight * weightMod - (weeks[weeks.length - 1]?.predictedWeight || 0))).toFixed(3)),
        predictedMortality: Number(mortality.toFixed(2)),
      });
    }

    return weeks;
  }

  private weightedAverage(results: any[], field: string): number {
    const valid = results.filter(r => r[field] !== null && r[field] !== undefined);
    if (!valid.length) return 0;
    const sum = valid.reduce((acc, r) => acc + Number(r[field]), 0);
    return Number((sum / valid.length).toFixed(3));
  }

  private generateErrorAnalysis(
    fcrError: number,
    adgError: number,
    epefError: number,
    mortalityError: number,
    forecast: any,
    results: any[],
  ): string {
    const parts: string[] = [];
    parts.push('ANALIZA BŁĘDÓW PROGNOZY');
    parts.push('');

    if (Math.abs(fcrError) > 0.1) {
      parts.push(`Błąd FCR: ${(fcrError * 100).toFixed(1)}%`);
      if (fcrError > 0) {
        parts.push('Prognoza była zbyt optymistyczna. FCR okazał się wyższy niż przewidywano.');
        parts.push('Możliwe przyczyny: niższa strawność surowców, stres, choroby, nadmierna temperatura.');
      } else {
        parts.push('Prognoza była zbyt pesymistyczna. FCR okazał się lepszy.');
        parts.push('Możliwe przyczyny: lepsze warunki, niższa śmiertelność, optymalna temperatura.');
      }
    }

    if (Math.abs(adgError) > 0.1) {
      parts.push(`\nBłąd ADG: ${(adgError * 100).toFixed(1)}%`);
      if (adgError > 0) {
        parts.push('Przyrost był niższy niż prognozowano. Sprawdź poziom aminokwasów i zdrowie jelit.');
      }
    }

    if (Math.abs(mortalityError) > 0.5) {
      parts.push(`\nBłąd śmiertelności: ${(mortalityError * 100).toFixed(1)}%`);
      parts.push('Śmiertelność znacząco odbiegała od prognozy. Wymaga analizy weterynaryjnej.');
    }

    // Sprawdź środowisko
    const avgTemp = results.reduce((sum, r) => sum + (Number(r.avgTemperature) || 22), 0) / results.length;
    if (avgTemp > 26) {
      parts.push(`\nWysoka temperatura średnia (${avgTemp.toFixed(1)}°C) mogła obniżyć pobór paszy i zwiększyć FCR.`);
    }

    return parts.join('\n');
  }

  private generateLessons(fcrError: number, adgError: number, epefError: number, mortalityError: number): string[] {
    const lessons: string[] = [];

    if (Math.abs(fcrError) > 0.05) {
      lessons.push('W przyszłych prognozach zwiększ wagę czynnika temperaturowego latem.');
    }
    if (Math.abs(adgError) > 0.05) {
      lessons.push('Uwzględnij sezonowość w dostępności surowców (wilgotność kukurydzy).');
    }
    if (Math.abs(mortalityError) > 0.3) {
      lessons.push('Dodaj do modelu predykcji czynników zdrowotnych (szczepienia, historia chorób).');
    }

    lessons.push('Zwiększ częstotliwość aktualizacji prognoz w tygodniach 3-5 (okres krytyczny).');
    lessons.push('Dodaj korektę na podstawie wyników poprzednich rzutów z tej samej hali.');

    return lessons;
  }

  private generateModelAdjustments(fcrError: number, adgError: number, epefError: number): Array<any> {
    const adjustments = [];

    if (Math.abs(fcrError) > 0.05) {
      adjustments.push({
        parameter: 'temperatureFactor',
        oldWeight: 0.15,
        newWeight: 0.25,
        reason: 'Temperatura ma większy wpływ na FCR niż zakładano',
      });
    }
    if (Math.abs(adgError) > 0.05) {
      adjustments.push({
        parameter: 'lysineEfficiency',
        oldWeight: 1.0,
        newWeight: 1.1,
        reason: 'Lizyna ma silniejszy wpływ na ADG',
      });
    }

    return adjustments;
  }
}
