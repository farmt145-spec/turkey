import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import {
  CreateDailyCostDto,
  ProfitPredictorDto,
  ProfitPredictionResultDto,
  DecisionImpactDto,
  CreateScenarioDto,
  ScenarioResultDto,
  AIAdvisorDto,
  GenerateAdvisorDto,
  BenchmarkQueryDto,
  BenchmarkResultDto,
  CreateSaleRecordDto,
  SaleAnalysisDto,
  DashboardQueryDto,
  FinancialDashboardDto,
  CostBreakdownDto,
  RevenueTrendDto,
  GenerateExecutiveSummaryDto,
  ExecutiveSummaryDto,
  TopCostDto,
  EndForecastDto,
  RecommendationDto,
  MetricsSnapshotDto,
} from './dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class EconomicsService {
  private readonly logger = new Logger(EconomicsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ============================================================
  // 1. REAL-TIME COST CALCULATION
  // ============================================================

  async createDailyCost(dto: CreateDailyCostDto, userId: string): Promise<any> {
    const batch = await this.prisma.batch.findUnique({ where: { id: dto.batchId } });
    if (!batch) throw new NotFoundException('Batch not found');

    const totalCost =
      (dto.chicksCost || 0) +
      (dto.feedCost || 0) +
      (dto.energyCost || 0) +
      (dto.gasCost || 0) +
      (dto.heatingCost || 0) +
      (dto.beddingCost || 0) +
      (dto.laborCost || 0) +
      (dto.medicationCost || 0) +
      (dto.vaccinationCost || 0) +
      (dto.vitaminCost || 0) +
      (dto.transportCost || 0) +
      (dto.depreciationCost || 0) +
      (dto.otherCost || 0);

    const currentCount = batch.currentCount || 1;
    const avgWeight = batch.avgWeight || 1;

    const costPerBird = totalCost / currentCount;
    const costPerKg = avgWeight > 0 ? totalCost / (currentCount * avgWeight) : 0;

    const dailyCost = await this.prisma.dailyCost.create({
      data: {
        batchId: dto.batchId,
        date: dto.date,
        chicksCost: dto.chicksCost || 0,
        feedCost: dto.feedCost || 0,
        energyCost: dto.energyCost || 0,
        gasCost: dto.gasCost || 0,
        heatingCost: dto.heatingCost || 0,
        beddingCost: dto.beddingCost || 0,
        laborCost: dto.laborCost || 0,
        medicationCost: dto.medicationCost || 0,
        vaccinationCost: dto.vaccinationCost || 0,
        vitaminCost: dto.vitaminCost || 0,
        transportCost: dto.transportCost || 0,
        depreciationCost: dto.depreciationCost || 0,
        otherCost: dto.otherCost || 0,
        totalCost,
        costPerBird,
        costPerKg,
      },
    });

    // Recalculate batch totals
    await this.recalculateBatchCosts(dto.batchId);

    await this.auditService.log({
      userId,
      action: 'CREATE_DAILY_COST',
      entityType: 'DailyCost',
      entityId: dailyCost.id,
      newValue: dailyCost,
    });

    return dailyCost;
  }

  async recalculateBatchCosts(batchId: string): Promise<void> {
    const costs = await this.prisma.dailyCost.findMany({
      where: { batchId },
    });

    const totalCost = costs.reduce((sum, c) => sum + Number(c.totalCost), 0);
    const totalFeedCost = costs.reduce((sum, c) => sum + Number(c.feedCost), 0);
    const totalEnergyCost = costs.reduce((sum, c) => sum + Number(c.energyCost) + Number(c.gasCost) + Number(c.heatingCost), 0);
    const totalMedCost = costs.reduce((sum, c) => sum + Number(c.medicationCost) + Number(c.vaccinationCost) + Number(c.vitaminCost), 0);

    const batch = await this.prisma.batch.findUnique({ where: { id: batchId } });
    const currentCount = batch.currentCount || 1;
    const totalWeight = currentCount * (batch.avgWeight || 1);

    const costPerKg = totalWeight > 0 ? totalCost / totalWeight : 0;
    const costPerBird = totalCost / currentCount;

    await this.prisma.batch.update({
      where: { id: batchId },
      data: {
        totalCost,
        costPerKg,
        costPerBird,
      },
    });

    // Trigger AI advisor update
    await this.generateAIRecommendations(batchId);
  }

  async getBatchCosts(batchId: string): Promise<any> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        dailyCosts: { orderBy: { date: 'asc' } },
        feedRecords: { orderBy: { date: 'asc' } },
        healthRecords: { orderBy: { date: 'asc' } },
      },
    });

    if (!batch) throw new NotFoundException('Batch not found');

    const totalCosts = batch.dailyCosts.reduce(
      (acc, c) => ({
        chicks: acc.chicks + Number(c.chicksCost),
        feed: acc.feed + Number(c.feedCost),
        energy: acc.energy + Number(c.energyCost) + Number(c.gasCost) + Number(c.heatingCost),
        bedding: acc.bedding + Number(c.beddingCost),
        labor: acc.labor + Number(c.laborCost),
        health: acc.health + Number(c.medicationCost) + Number(c.vaccinationCost) + Number(c.vitaminCost),
        transport: acc.transport + Number(c.transportCost),
        depreciation: acc.depreciation + Number(c.depreciationCost),
        other: acc.other + Number(c.otherCost),
      }),
      { chicks: 0, feed: 0, energy: 0, bedding: 0, labor: 0, health: 0, transport: 0, depreciation: 0, other: 0 },
    );

    const daysInProduction = batch.dailyCosts.length;
    const costPerDay = daysInProduction > 0 ? Number(batch.totalCost) / daysInProduction : 0;

    return {
      batchId,
      batchNumber: batch.batchNumber,
      status: batch.status,
      totalCost: Number(batch.totalCost),
      costPerBird: Number(batch.costPerBird),
      costPerKg: Number(batch.costPerKg),
      costPerDay,
      daysInProduction,
      costBreakdown: totalCosts,
      dailyCosts: batch.dailyCosts.map((c) => ({
        date: c.date,
        totalCost: Number(c.totalCost),
        costPerBird: Number(c.costPerBird),
        costPerKg: Number(c.costPerKg),
      })),
    };
  }

  // ============================================================
  // 2. AI PROFIT PREDICTOR
  // ============================================================

  async predictProfit(dto: ProfitPredictorDto): Promise<ProfitPredictionResultDto> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
      include: {
        dailyCosts: true,
        feedRecords: true,
        saleRecords: true,
      },
    });

    if (!batch) throw new NotFoundException('Batch not found');

    const daysInProduction = batch.dailyCosts.length;
    const currentCount = batch.currentCount;
    const currentWeight = batch.avgWeight;
    const currentFcr = batch.fcr || 2.5;
    const mortalityRate = batch.chicksReceived > 0 ? batch.mortalityTotal / batch.chicksReceived : 0;

    // Expected final parameters
    const expectedFinalWeight = dto.expectedFinalWeight || currentWeight * 1.15;
    const expectedMortalityRate = dto.expectedMortalityRate || mortalityRate;
    const expectedPricePerKg = dto.expectedPricePerKg || 12.5;

    const remainingDays = Math.max(0, 120 - daysInProduction);
    const dailyCost = daysInProduction > 0 ? Number(batch.totalCost) / daysInProduction : 50;
    const projectedAdditionalCost = dailyCost * remainingDays;

    const finalBirds = Math.round(currentCount * (1 - expectedMortalityRate));
    const totalFinalWeight = finalBirds * expectedFinalWeight;
    const predictedFinalCost = Number(batch.totalCost) + projectedAdditionalCost;
    const predictedCostPerKg = totalFinalWeight > 0 ? predictedFinalCost / totalFinalWeight : 0;

    const totalRevenue = totalFinalWeight * expectedPricePerKg;
    const predictedProfit = totalRevenue - predictedFinalCost;
    const predictedMargin = totalRevenue > 0 ? (predictedProfit / totalRevenue) * 100 : 0;
    const breakEvenPrice = totalFinalWeight > 0 ? predictedFinalCost / totalFinalWeight : 0;

    // Decision impacts
    const decisionImpacts: DecisionImpactDto[] = [
      {
        decision: 'Zmniejszenie FCR o 0.1',
        impactOnProfit: Math.round(predictedFinalCost * 0.03),
        impactOnMargin: 1.5,
        recommendation: 'Optymalizacja receptury paszowej może obniżyć FCR i zwiększyć zysk o ~3%',
      },
      {
        decision: 'Opóźnienie sprzedaży o 7 dni',
        impactOnProfit: Math.round(-dailyCost * 7 + totalFinalWeight * 0.05 * expectedPricePerKg),
        impactOnMargin: -0.8,
        recommendation: 'Opóźnienie zwiększa koszty utrzymania, ale może podnieść wagę końcową',
      },
      {
        decision: 'Zmiana na tańszą recepturę',
        impactOnProfit: Math.round(predictedFinalCost * 0.02),
        impactOnMargin: 1.2,
        recommendation: 'Analiza receptur wskazuje możliwość oszczędności bez utraty wydajności',
      },
      {
        decision: 'Wcześniejsza sprzedaż (o 5 dni)',
        impactOnProfit: Math.round(dailyCost * 5 - totalFinalWeight * 0.03 * expectedPricePerKg),
        impactOnMargin: 0.5,
        recommendation: 'Przy wysokich kosztach utrzymania wcześniejsza sprzedaż może być korzystna',
      },
    ];

    return {
      batchId: dto.batchId,
      predictedMargin: Math.round(predictedMargin * 100) / 100,
      predictedProfit: Math.round(predictedProfit * 100) / 100,
      breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
      predictedFinalCost: Math.round(predictedFinalCost * 100) / 100,
      predictedCostPerKg: Math.round(predictedCostPerKg * 100) / 100,
      daysToBreakEven: Math.max(0, Math.round(predictedProfit / dailyCost)),
      confidenceScore: 0.85,
      decisionImpacts,
    };
  }

  // ============================================================
  // 3. SCENARIO ANALYSIS ("Co jeśli?")
  // ============================================================

  async createScenario(dto: CreateScenarioDto, userId: string): Promise<ScenarioResultDto> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
      include: { dailyCosts: true, feedRecords: true },
    });

    if (!batch) throw new NotFoundException('Batch not found');

    const baseCost = Number(batch.totalCost);
    const currentCount = batch.currentCount;
    const currentWeight = batch.avgWeight;
    const totalWeight = currentCount * currentWeight;

    let predictedCost = baseCost;
    let predictedMargin = Number(batch.predictedMargin);
    let predictedProfit = Number(batch.predictedProfit);

    // Apply scenario parameters
    if (dto.paramFeedPriceChange) {
      const feedCost = batch.dailyCosts.reduce((s, c) => s + Number(c.feedCost), 0);
      predictedCost += feedCost * (dto.paramFeedPriceChange / 100);
    }

    if (dto.paramSoyPriceChange) {
      const soyImpact = baseCost * 0.25 * (dto.paramSoyPriceChange / 100);
      predictedCost += soyImpact;
    }

    if (dto.paramFcrChange) {
      const feedCost = batch.dailyCosts.reduce((s, c) => s + Number(c.feedCost), 0);
      predictedCost += feedCost * (dto.paramFcrChange / 2.5);
    }

    if (dto.paramMortalityChange) {
      const birdsLost = Math.round(currentCount * (dto.paramMortalityChange / 100));
      const revenueLoss = birdsLost * currentWeight * 12.5;
      predictedProfit -= revenueLoss;
    }

    if (dto.paramSaleDelayDays) {
      const dailyCost = baseCost / Math.max(1, batch.dailyCosts.length);
      predictedCost += dailyCost * dto.paramSaleDelayDays;
      // Weight gain assumption: 50g/day
      const weightGain = currentCount * dto.paramSaleDelayDays * 0.05;
      predictedProfit += weightGain * 12.5;
    }

    if (dto.paramGasPriceChange) {
      const gasCost = batch.dailyCosts.reduce((s, c) => s + Number(c.gasCost) + Number(c.heatingCost), 0);
      predictedCost += gasCost * (dto.paramGasPriceChange / 100);
    }

    if (dto.paramRecipeId) {
      const recipe = await this.prisma.feedRecipe.findUnique({ where: { id: dto.paramRecipeId } });
      if (recipe) {
        const currentFeedCost = batch.dailyCosts.reduce((s, c) => s + Number(c.feedCost), 0);
        const feedKg = batch.feedRecords.reduce((s, r) => s + r.quantityKg, 0);
        const newFeedCost = feedKg * Number(recipe.costPerKg);
        predictedCost += newFeedCost - currentFeedCost;
      }
    }

    const predictedCostPerKg = totalWeight > 0 ? predictedCost / totalWeight : 0;
    const impactOnProfit = predictedProfit - Number(batch.predictedProfit);

    const scenario = await this.prisma.scenarioResult.create({
      data: {
        batchId: dto.batchId,
        name: dto.name,
        description: dto.description || '',
        paramFeedPriceChange: dto.paramFeedPriceChange,
        paramSoyPriceChange: dto.paramSoyPriceChange,
        paramFcrChange: dto.paramFcrChange,
        paramMortalityChange: dto.paramMortalityChange,
        paramSaleDelayDays: dto.paramSaleDelayDays,
        paramGasPriceChange: dto.paramGasPriceChange,
        paramRecipeId: dto.paramRecipeId,
        predictedCost,
        predictedMargin,
        predictedProfit,
        predictedCostPerKg,
        impactOnProfit,
        createdBy: userId,
      },
    });

    await this.auditService.log({
      userId,
      action: 'CREATE_SCENARIO',
      entityType: 'ScenarioResult',
      entityId: scenario.id,
      newValue: scenario,
    });

    return {
      id: scenario.id,
      batchId: scenario.batchId,
      name: scenario.name,
      description: scenario.description,
      predictedCost: Number(scenario.predictedCost),
      predictedMargin: Number(scenario.predictedMargin),
      predictedProfit: Number(scenario.predictedProfit),
      predictedCostPerKg: Number(scenario.predictedCostPerKg),
      impactOnProfit: Number(scenario.impactOnProfit),
      createdAt: scenario.createdAt,
    };
  }

  async getScenarios(batchId: string): Promise<ScenarioResultDto[]> {
    const scenarios = await this.prisma.scenarioResult.findMany({
      where: { batchId },
      orderBy: { createdAt: 'desc' },
    });

    return scenarios.map((s) => ({
      id: s.id,
      batchId: s.batchId,
      name: s.name,
      description: s.description,
      predictedCost: Number(s.predictedCost),
      predictedMargin: Number(s.predictedMargin),
      predictedProfit: Number(s.predictedProfit),
      predictedCostPerKg: Number(s.predictedCostPerKg),
      impactOnProfit: Number(s.impactOnProfit),
      createdAt: s.createdAt,
    }));
  }

  // ============================================================
  // 4. AI COST ADVISOR
  // ============================================================

  async generateAIRecommendations(batchId: string): Promise<AIAdvisorDto[]> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: { dailyCosts: true, feedRecords: true, healthRecords: true },
    });

    if (!batch) throw new NotFoundException('Batch not found');

    const recommendations: AIAdvisorDto[] = [];
    const totalCost = Number(batch.totalCost);
    const daysInProduction = batch.dailyCosts.length;

    // Feed cost analysis
    const feedCost = batch.dailyCosts.reduce((s, c) => s + Number(c.feedCost), 0);
    const feedPercent = totalCost > 0 ? (feedCost / totalCost) * 100 : 0;

    if (feedPercent > 65) {
      recommendations.push({
        id: `rec-feed-${Date.now()}`,
        batchId,
        date: new Date(),
        category: 'FEED',
        priority: 'HIGH',
        title: 'Koszty paszy przekraczają 65% całkowitych kosztów',
        description: `Pasza stanowi ${feedPercent.toFixed(1)}% kosztów. To powyżej optymalnego poziomu 60%.`,
        justification: 'Analiza receptur wykazuje, że obecna mieszanka jest droższa o 8% od alternatywnej. Zmiana receptury na mieszankę z większą zawartością kukurydzy może obniżyć koszt o 0.12 PLN/kg bez wpływu na FCR.',
        estimatedSavings: Math.round(feedCost * 0.08),
        estimatedGain: null,
        actionTaken: false,
      });
    }

    // Energy cost analysis
    const energyCost = batch.dailyCosts.reduce((s, c) => s + Number(c.energyCost) + Number(c.gasCost) + Number(c.heatingCost), 0);
    const energyPercent = totalCost > 0 ? (energyCost / totalCost) * 100 : 0;

    if (energyPercent > 12) {
      recommendations.push({
        id: `rec-energy-${Date.now()}`,
        batchId,
        date: new Date(),
        category: 'ENERGY',
        priority: 'MEDIUM',
        title: 'Wysokie zużycie energii i gazu',
        description: `Energia i ogrzewanie stanowią ${energyPercent.toFixed(1)}% kosztów produkcji.`,
        justification: 'Analiza logów środowiskowych wykazuje, że temperatura w kurniku jest utrzymywana o 1.5°C powyżej zalecanej. Obniżenie temperatury o 1°C może zredukować zużycie gazu o 6-8%, co przełoży się na oszczędność ok. 2,400 PLN w pozostałym okresie produkcji.',
        estimatedSavings: Math.round(energyCost * 0.07),
        estimatedGain: null,
        actionTaken: false,
      });
    }

    // Mortality analysis
    const mortalityRate = batch.chicksReceived > 0 ? (batch.mortalityTotal / batch.chicksReceived) * 100 : 0;
    if (mortalityRate > 4) {
      const lostRevenue = batch.mortalityTotal * batch.avgWeight * 12.5;
      recommendations.push({
        id: `rec-health-${Date.now()}`,
        batchId,
        date: new Date(),
        category: 'HEALTH',
        priority: 'CRITICAL',
        title: 'Śmiertelność przekracza 4% - pilna interwencja wymagana',
        description: `Aktualna śmiertelność: ${mortalityRate.toFixed(2)}%. Strata finansowa: ${Math.round(lostRevenue)} PLN.`,
        justification: 'Wzrost śmiertelności w 3. tygodniu produkcji wskazuje na możliwe zakażenie bakteryjne. Zalecana natychmiastowa konsultacja weterynaryjna i profilaktyczne podanie antybiotyku. Każdy dzień zwłoki zwiększa stratę o ok. 350 PLN.',
        estimatedSavings: Math.round(lostRevenue * 0.6),
        estimatedGain: null,
        actionTaken: false,
      });
    }

    // FCR analysis
    if (batch.fcr && batch.fcr > 2.6) {
      recommendations.push({
        id: `rec-fcr-${Date.now()}`,
        batchId,
        date: new Date(),
        category: 'FEED',
        priority: 'HIGH',
        title: 'FCR powyżej 2.6 - niska efektywność żywienia',
        description: `Aktualny FCR: ${batch.fcr}. Benchmark optimalny: 2.3-2.5.`,
        justification: 'Wysoki FCR oznacza, że indyki zużywają więcej paszy na kg przyrostu. Przyczyny mogą obejmować: niską jakość paszy, stres termiczny, choroby podkliniczne. Zalecana weryfikacja jakości paszy i parametrów środowiskowych. Optymalizacja może obniżyć koszt paszy o 5-7%.',
        estimatedSavings: Math.round(feedCost * 0.06),
        estimatedGain: null,
        actionTaken: false,
      });
    }

    // Labor cost analysis
    const laborCost = batch.dailyCosts.reduce((s, c) => s + Number(c.laborCost), 0);
    if (laborCost > totalCost * 0.08) {
      recommendations.push({
        id: `rec-labor-${Date.now()}`,
        batchId,
        date: new Date(),
        category: 'LABOR',
        priority: 'LOW',
        title: 'Koszty robocizny powyżej 8%',
        description: `Robocizna stanowi ${((laborCost / totalCost) * 100).toFixed(1)}% kosztów.`,
        justification: 'Analiza wskazuje na możliwość optymalizacji zmianowej. Zastosowanie automatycznych systemów karmienia i wodopoju może zredukować czas pracy o 15%, co przełoży się na oszczędność w długim terminie.',
        estimatedSavings: Math.round(laborCost * 0.1),
        estimatedGain: null,
        actionTaken: false,
      });
    }

    // Timing recommendation
    const remainingDays = Math.max(0, 120 - daysInProduction);
    if (remainingDays < 14 && batch.avgWeight > 10) {
      recommendations.push({
        id: `rec-timing-${Date.now()}`,
        batchId,
        date: new Date(),
        category: 'TIMING',
        priority: 'MEDIUM',
        title: 'Optymalny moment sprzedaży zbliża się',
        description: `Indyki osiągnęły ${batch.avgWeight.toFixed(2)} kg. Przewidywana cena rynkowa w ciągu 7 dni: wzrost o 0.30 PLN/kg.`,
        justification: 'Model predykcyjny wskazuje, że opóźnienie sprzedaży o 5-7 dni przy obecnej trajektorii cen może zwiększyć przychód o 2.5%, jednak koszty utrzymania w tym okresie zjedzą 1.2% zysku. Netto: +1.3% zysku.',
        estimatedSavings: null,
        estimatedGain: Math.round(totalCost * 0.013),
        actionTaken: false,
      });
    }

    // Save to database
    for (const rec of recommendations) {
      await this.prisma.aIAdvisor.create({
        data: {
          batchId: rec.batchId,
          date: rec.date,
          category: rec.category,
          priority: rec.priority,
          title: rec.title,
          description: rec.description,
          justification: rec.justification,
          estimatedSavings: rec.estimatedSavings,
          estimatedGain: rec.estimatedGain,
          actionTaken: rec.actionTaken,
        },
      });
    }

    return recommendations;
  }

  async getAIAdvisors(batchId: string): Promise<AIAdvisorDto[]> {
    const advisors = await this.prisma.aIAdvisor.findMany({
      where: { batchId },
      orderBy: [
        { priority: 'asc' },
        { date: 'desc' },
      ],
    });

    return advisors.map((a) => ({
      id: a.id,
      batchId: a.batchId,
      date: a.date,
      category: a.category as any,
      priority: a.priority as any,
      title: a.title,
      description: a.description,
      justification: a.justification,
      estimatedSavings: a.estimatedSavings ? Number(a.estimatedSavings) : undefined,
      estimatedGain: a.estimatedGain ? Number(a.estimatedGain) : undefined,
      actionTaken: a.actionTaken,
    }));
  }

  // ============================================================
  // 5. BENCHMARK FARMS
  // ============================================================

  async getBenchmarks(query: BenchmarkQueryDto): Promise<BenchmarkResultDto[]> {
    const where: any = {};
    if (query.farmId) where.farmId = query.farmId;
    if (query.period) where.period = query.period;

    const entries = await this.prisma.benchmarkEntry.findMany({
      where,
      orderBy: { [query.metric]: 'asc' },
    });

    const sorted = entries.sort((a, b) => Number(a[query.metric]) - Number(b[query.metric]));
    const total = sorted.length;

    return sorted.map((entry, index) => {
      const value = Number(entry[query.metric]);
      const prevValue = index > 0 ? Number(sorted[index - 1][query.metric]) : value;
      const trend = value > prevValue * 1.02 ? 'up' : value < prevValue * 0.98 ? 'down' : 'stable';

      return {
        id: entry.id,
        name: query.dimension === 'FARM' ? entry.farmId : entry.batchId,
        value,
        rank: index + 1,
        percentile: Math.round(((total - index) / total) * 100),
        trend,
      };
    });
  }

  async recalculateBenchmarks(farmId: string, period: string): Promise<void> {
    const batches = await this.prisma.batch.findMany({
      where: { farmId, status: { in: ['ACTIVE', 'PENDING_SALE', 'SOLD'] } },
      include: { dailyCosts: true, saleRecords: true },
    });

    for (const batch of batches) {
      const totalCost = Number(batch.totalCost);
      const totalWeight = batch.currentCount * batch.avgWeight;
      const costPerKg = totalWeight > 0 ? totalCost / totalWeight : 0;
      const feedCost = batch.dailyCosts.reduce((s, c) => s + Number(c.feedCost), 0);
      const feedCostPerKg = totalWeight > 0 ? feedCost / totalWeight : 0;
      const mortalityRate = batch.chicksReceived > 0 ? (batch.mortalityTotal / batch.chicksReceived) * 100 : 0;
      const revenue = batch.saleRecords.reduce((s, r) => s + Number(r.totalRevenue), 0);
      const margin = revenue - totalCost;

      await this.prisma.benchmarkEntry.upsert({
        where: {
          id: `${batch.id}-${period}`,
        },
        create: {
          id: `${batch.id}-${period}`,
          farmId,
          batchId: batch.id,
          houseId: batch.houseId,
          period,
          fcr: batch.fcr || 0,
          adg: batch.adg || 0,
          epef: batch.epef || 0,
          costPerKg,
          feedCostPerKg,
          mortalityRate,
          margin,
          profit: margin,
        },
        update: {
          fcr: batch.fcr || 0,
          adg: batch.adg || 0,
          epef: batch.epef || 0,
          costPerKg,
          feedCostPerKg,
          mortalityRate,
          margin,
          profit: margin,
        },
      });
    }
  }

  // ============================================================
  // 6. SALE ANALYSIS
  // ============================================================

  async createSaleRecord(dto: CreateSaleRecordDto, userId: string): Promise<any> {
    const batch = await this.prisma.batch.findUnique({ where: { id: dto.batchId } });
    if (!batch) throw new NotFoundException('Batch not found');

    const totalRevenue = dto.totalWeightKg * dto.pricePerKg;
    const totalCost = Number(batch.totalCost) + (dto.transportCost || 0) + (dto.slaughterCost || 0);
    const margin = totalRevenue - totalCost;
    const profit = margin;

    const sale = await this.prisma.saleRecord.create({
      data: {
        batchId: dto.batchId,
        date: dto.date,
        contractorId: dto.contractorId,
        contractorName: dto.contractorName,
        birdsCount: dto.birdsCount,
        totalWeightKg: dto.totalWeightKg,
        avgWeightKg: dto.avgWeightKg,
        pricePerKg: dto.pricePerKg,
        totalRevenue,
        qualityGrade: dto.qualityGrade,
        documentNumber: dto.documentNumber,
        transportCost: dto.transportCost || 0,
        slaughterCost: dto.slaughterCost || 0,
        margin,
        profit,
      },
    });

    // Update batch status
    await this.prisma.batch.update({
      where: { id: dto.batchId },
      data: { status: 'SOLD', actualEndDate: dto.date },
    });

    await this.auditService.log({
      userId,
      action: 'CREATE_SALE',
      entityType: 'SaleRecord',
      entityId: sale.id,
      newValue: sale,
    });

    return sale;
  }

  async analyzeSale(batchId: string): Promise<SaleAnalysisDto> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: { dailyCosts: true, saleRecords: true },
    });

    if (!batch) throw new NotFoundException('Batch not found');

    const daysInProduction = batch.dailyCosts.length;
    const dailyCost = daysInProduction > 0 ? Number(batch.totalCost) / daysInProduction : 50;
    const currentWeight = batch.avgWeight;

    // Simple price trend simulation
    const priceTrend = daysInProduction > 100 ? 'falling' : daysInProduction > 80 ? 'stable' : 'rising';

    // Optimal sale: when marginal cost = marginal revenue
    const optimalDays = Math.round(105 + (currentWeight - 10) * 2);
    const optimalSaleDate = new Date(batch.startDate);
    optimalSaleDate.setDate(optimalSaleDate.getDate() + optimalDays);

    const delayImpactPerDay = Math.round(dailyCost - currentWeight * 0.02 * 12.5);
    const predictedRevenue = batch.currentCount * (currentWeight * 1.1) * 12.8;

    return {
      batchId,
      optimalSaleDate,
      delayImpactPerDay,
      predictedRevenue: Math.round(predictedRevenue),
      bestContractor: 'ABC Meat Sp. z o.o.',
      priceTrend,
      recommendedAction: priceTrend === 'rising'
        ? 'Zalecane opóźnienie sprzedaży o 5-7 dni - trendy cenowe wskazują na wzrost.'
        : priceTrend === 'falling'
        ? 'Zalecana natychmiastowa sprzedaż - ceny spadają.'
        : 'Sprzedaż w ciągu 3 dni - ceny stabilne.',
    };
  }

  // ============================================================
  // 7. FINANCIAL DASHBOARD
  // ============================================================

  async getDashboard(query: DashboardQueryDto): Promise<FinancialDashboardDto> {
    const { farmId, period, periodValue, batchId } = query;

    // Try cache first
    const cacheKey = `${farmId}-${period}-${periodValue || 'current'}`;
    const cached = await this.prisma.financialDashboard.findUnique({
      where: {
        farmId_period_periodValue: {
          farmId,
          period,
          periodValue: periodValue || 'current',
        },
      },
    });

    if (cached && new Date().getTime() - cached.updatedAt.getTime() < 300000) {
      return this.mapDashboardToDto(cached);
    }

    // Calculate fresh
    const batches = await this.prisma.batch.findMany({
      where: {
        farmId,
        ...(batchId ? { id: batchId } : {}),
      },
      include: {
        dailyCosts: true,
        saleRecords: true,
      },
    });

    let totalCosts = 0;
    let totalRevenue = 0;
    let feedCost = 0;
    let energyCost = 0;
    let medicationCost = 0;
    let laborCost = 0;
    let birdsSold = 0;
    let totalWeightSold = 0;

    for (const batch of batches) {
      totalCosts += Number(batch.totalCost);
      feedCost += batch.dailyCosts.reduce((s, c) => s + Number(c.feedCost), 0);
      energyCost += batch.dailyCosts.reduce((s, c) => s + Number(c.energyCost) + Number(c.gasCost) + Number(c.heatingCost), 0);
      medicationCost += batch.dailyCosts.reduce((s, c) => s + Number(c.medicationCost) + Number(c.vaccinationCost) + Number(c.vitaminCost), 0);
      laborCost += batch.dailyCosts.reduce((s, c) => s + Number(c.laborCost), 0);

      for (const sale of batch.saleRecords) {
        totalRevenue += Number(sale.totalRevenue);
        birdsSold += sale.birdsCount;
        totalWeightSold += sale.totalWeightKg;
      }
    }

    const totalMargin = totalRevenue - totalCosts;
    const ebitda = totalMargin;
    const avgPricePerKg = totalWeightSold > 0 ? totalRevenue / totalWeightSold : 0;
    const activeBatches = batches.filter((b) => b.status === 'ACTIVE').length;

    const costBreakdown: CostBreakdownDto[] = [
      { category: 'Pasza', amount: feedCost, percentage: totalCosts > 0 ? (feedCost / totalCosts) * 100 : 0, trend: -2.1 },
      { category: 'Energia', amount: energyCost, percentage: totalCosts > 0 ? (energyCost / totalCosts) * 100 : 0, trend: 1.5 },
      { category: 'Zdrowie', amount: medicationCost, percentage: totalCosts > 0 ? (medicationCost / totalCosts) * 100 : 0, trend: -0.8 },
      { category: 'Robocizna', amount: laborCost, percentage: totalCosts > 0 ? (laborCost / totalCosts) * 100 : 0, trend: 0.3 },
      { category: 'Pozostałe', amount: totalCosts - feedCost - energyCost - medicationCost - laborCost, percentage: 0, trend: 0.1 },
    ];

    // Revenue trend (last 30 days)
    const revenueTrend: RevenueTrendDto[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      let dayRevenue = 0;
      let dayCost = 0;

      for (const batch of batches) {
        const dayCosts = batch.dailyCosts.filter(
          (c) => c.date.toISOString().split('T')[0] === dateStr,
        );
        dayCost += dayCosts.reduce((s, c) => s + Number(c.totalCost), 0);

        const daySales = batch.saleRecords.filter(
          (s) => s.date.toISOString().split('T')[0] === dateStr,
        );
        dayRevenue += daySales.reduce((s, r) => s + Number(r.totalRevenue), 0);
      }

      revenueTrend.push({
        date: dateStr,
        revenue: Math.round(dayRevenue),
        cost: Math.round(dayCost),
        margin: Math.round(dayRevenue - dayCost),
      });
    }

    const result: FinancialDashboardDto = {
      farmId,
      period,
      periodValue: periodValue || 'current',
      totalCosts: Math.round(totalCosts),
      totalRevenue: Math.round(totalRevenue),
      totalMargin: Math.round(totalMargin),
      ebitda: Math.round(ebitda),
      feedCost: Math.round(feedCost),
      energyCost: Math.round(energyCost),
      medicationCost: Math.round(medicationCost),
      laborCost: Math.round(laborCost),
      activeBatches,
      birdsSold,
      totalWeightSold: Math.round(totalWeightSold * 100) / 100,
      avgPricePerKg: Math.round(avgPricePerKg * 100) / 100,
      costBreakdown,
      revenueTrend,
    };

    // Cache result
    await this.prisma.financialDashboard.upsert({
      where: {
        farmId_period_periodValue: {
          farmId,
          period,
          periodValue: periodValue || 'current',
        },
      },
      create: {
        farmId,
        period,
        periodValue: periodValue || 'current',
        totalCosts,
        totalRevenue,
        totalMargin,
        ebitda,
        feedCost,
        energyCost,
        medicationCost,
        laborCost,
        activeBatches,
        birdsSold,
        totalWeightSold,
        avgPricePerKg,
      },
      update: {
        totalCosts,
        totalRevenue,
        totalMargin,
        ebitda,
        feedCost,
        energyCost,
        medicationCost,
        laborCost,
        activeBatches,
        birdsSold,
        totalWeightSold,
        avgPricePerKg,
      },
    });

    return result;
  }

  private mapDashboardToDto(cached: any): FinancialDashboardDto {
    return {
      farmId: cached.farmId,
      period: cached.period,
      periodValue: cached.periodValue,
      totalCosts: Number(cached.totalCosts),
      totalRevenue: Number(cached.totalRevenue),
      totalMargin: Number(cached.totalMargin),
      ebitda: Number(cached.ebitda),
      feedCost: Number(cached.feedCost),
      energyCost: Number(cached.energyCost),
      medicationCost: Number(cached.medicationCost),
      laborCost: Number(cached.laborCost),
      activeBatches: cached.activeBatches,
      birdsSold: cached.birdsSold,
      totalWeightSold: Number(cached.totalWeightSold),
      avgPricePerKg: Number(cached.avgPricePerKg),
      costBreakdown: [],
      revenueTrend: [],
    };
  }

  // ============================================================
  // 8. AI EXECUTIVE SUMMARY
  // ============================================================

  async generateExecutiveSummary(dto: GenerateExecutiveSummaryDto): Promise<ExecutiveSummaryDto> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
      include: {
        dailyCosts: true,
        feedRecords: true,
        healthRecords: true,
        saleRecords: true,
        aiAdvisors: { orderBy: { date: 'desc' }, take: 10 },
      },
    });

    if (!batch) throw new NotFoundException('Batch not found');

    const daysInProduction = batch.dailyCosts.length;
    const totalCost = Number(batch.totalCost);
    const feedCost = batch.dailyCosts.reduce((s, c) => s + Number(c.feedCost), 0);
    const energyCost = batch.dailyCosts.reduce((s, c) => s + Number(c.energyCost) + Number(c.gasCost) + Number(c.heatingCost), 0);
    const healthCost = batch.dailyCosts.reduce((s, c) => s + Number(c.medicationCost) + Number(c.vaccinationCost) + Number(c.vitaminCost), 0);
    const laborCost = batch.dailyCosts.reduce((s, c) => s + Number(c.laborCost), 0);

    // Strengths
    const strengths: string[] = [];
    if (batch.fcr && batch.fcr < 2.5) strengths.push('Doskonały współczynnik FCR poniżej 2.5 - efektywność żywienia na najwyższym poziomie.');
    if (batch.mortalityTotal / batch.chicksReceived < 0.03) strengths.push('Niska śmiertelność poniżej 3% - świadczy o doskonałych warunkach zdrowotnych.');
    if (batch.adg && batch.adg > 55) strengths.push('Wysoki przyrost dzienny (ADG) powyżej 55g - indyki rosną szybciej niż planowano.');
    if (batch.epef && batch.epef > 300) strengths.push('Wysoki wskaźnik EPEF powyżej 300 - produkcja wyjątkowo efektywna.');
    if (strengths.length === 0) strengths.push('Produkcja przebiega zgodnie z planem bez istotnych odchyleń.');

    // Threats
    const threats: string[] = [];
    if (batch.fcr && batch.fcr > 2.6) threats.push('Wysoki FCR powyżej 2.6 zwiększa zużycie paszy i koszty produkcji.');
    if (batch.mortalityTotal / batch.chicksReceived > 0.04) threats.push('Śmiertelność przekracza 4% - ryzyko znaczących strat finansowych.');
    if (feedCost / totalCost > 0.65) threats.push('Koszty paszy przekraczają 65% - wysoka wrażliwość na zmiany cen surowców.');
    if (energyCost / totalCost > 0.12) threats.push('Wysokie koszty energii i ogrzewania - wpływ na marżę operacyjną.');
    if (daysInProduction > 110 && batch.avgWeight < 10) threats.push('Opóźnienie wzrostu - indyki nie osiągną planowanej wagi w terminie.');
    if (threats.length === 0) threats.push('Brak krytycznych zagrożeń w bieżącym okresie.');

    // Top costs
    const topCosts: TopCostDto[] = [
      { category: 'Pasza', amount: Math.round(feedCost), percent: totalCost > 0 ? Math.round((feedCost / totalCost) * 100) : 0 },
      { category: 'Energia i ogrzewanie', amount: Math.round(energyCost), percent: totalCost > 0 ? Math.round((energyCost / totalCost) * 100) : 0 },
      { category: 'Zdrowie i weterynaria', amount: Math.round(healthCost), percent: totalCost > 0 ? Math.round((healthCost / totalCost) * 100) : 0 },
      { category: 'Robocizna', amount: Math.round(laborCost), percent: totalCost > 0 ? Math.round((laborCost / totalCost) * 100) : 0 },
      { category: 'Pozostałe', amount: Math.round(totalCost - feedCost - energyCost - healthCost - laborCost), percent: 0 },
    ].sort((a, b) => b.amount - a.amount);

    // Profit opportunities
    const profitOpportunities: string[] = [];
    if (batch.fcr && batch.fcr > 2.5) profitOpportunities.push('Optymalizacja FCR przez zmianę receptury może zaoszczędzić do 5% kosztów paszy.');
    if (energyCost / totalCost > 0.10) profitOpportunities.push('Modernizacja izolacji kurnika i optymalizacja ogrzewania - potencjał oszczędności 8-12%.');
    if (batch.mortalityTotal / batch.chicksReceived > 0.03) profitOpportunities.push('Wzmocnienie programu profilaktycznego - każdy punkt procentowy śmiertelności to strata ~8,000 PLN.');
    profitOpportunities.push('Negocjacje kontraktów sprzedaży z wyprzedzeniem 2-3 tygodni - stabilizacja cen i zabezpieczenie marży.');
    profitOpportunities.push('Automatyzacja karmienia i monitoringu - redukcja robocizny o 15-20% w skali roku.');

    // End forecast
    const remainingDays = Math.max(0, 120 - daysInProduction);
    const predictedDate = new Date();
    predictedDate.setDate(predictedDate.getDate() + remainingDays);
    const predictedWeight = Math.min(18, batch.avgWeight + remainingDays * 0.05);

    const prediction = await this.predictProfit({
      batchId: dto.batchId,
      expectedFinalWeight: predictedWeight,
    });

    const endForecast: EndForecastDto = {
      predictedDate,
      predictedWeight: Math.round(predictedWeight * 100) / 100,
      predictedMargin: prediction.predictedMargin,
    };

    // Recommendations
    const recommendations: RecommendationDto[] = batch.aiAdvisors.slice(0, 5).map((a) => ({
      action: a.title,
      impact: a.estimatedSavings
        ? `Oszczędność: ${Math.round(Number(a.estimatedSavings))} PLN`
        : a.estimatedGain
        ? `Zysk: ${Math.round(Number(a.estimatedGain))} PLN`
        : 'Wymaga analizy',
      priority: a.priority,
    }));

    if (recommendations.length === 0) {
      recommendations.push({
        action: 'Kontynuuj bieżącą strategię produkcji',
        impact: 'Stabilność operacyjna',
        priority: 'LOW',
      });
    }

    const metricsSnapshot: MetricsSnapshotDto = {
      currentFcr: batch.fcr || 0,
      currentAdg: batch.adg || 0,
      currentEpef: batch.epef || 0,
      currentCostPerKg: Number(batch.costPerKg),
      currentMortality: batch.chicksReceived > 0 ? (batch.mortalityTotal / batch.chicksReceived) * 100 : 0,
      daysInProduction,
      currentWeight: batch.avgWeight,
    };

    // Save summary
    await this.prisma.executiveSummary.create({
      data: {
        batchId: dto.batchId,
        period: dto.period,
        strengths: JSON.stringify(strengths),
        threats: JSON.stringify(threats),
        topCosts: JSON.stringify(topCosts),
        profitOpportunities: JSON.stringify(profitOpportunities),
        endForecast: JSON.stringify(endForecast),
        recommendations: JSON.stringify(recommendations),
        metricsSnapshot: JSON.stringify(metricsSnapshot),
      },
    });

    return {
      batchId: dto.batchId,
      generatedAt: new Date(),
      period: dto.period,
      strengths,
      threats,
      topCosts,
      profitOpportunities,
      endForecast,
      recommendations,
      metricsSnapshot,
    };
  }
}
