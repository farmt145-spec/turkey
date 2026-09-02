import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IDashboardData, IProductionTrend, IAIInsight } from '../interfaces/feed.interfaces';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData(farmId?: string, houseId?: string): Promise<IDashboardData> {
    const where = {};
    if (farmId) (where as any).farmId = farmId;
    if (houseId) (where as any).houseId = houseId;

    // Statystyki receptur
    const totalRecipes = await this.prisma.recipe.count();
    const activeRecipes = await this.prisma.recipe.count({ where: { isActive: true } });

    // Średni koszt
    const avgCostResult = await this.prisma.recipe.aggregate({
      where: { isActive: true },
      _avg: { costPerTon: true },
    });
    const avgFeedCost = Number(avgCostResult._avg.costPerTon) || 0;

    // Zużycie paszy
    const feedConsumed = await this.prisma.productionResult.aggregate({
      _sum: { feedConsumedKg: true },
    });
    const totalFeedConsumed = Number(feedConsumed._sum.feedConsumedKg) || 0;

    // Alarmy
    const alerts = await this.prisma.feedAlert.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Magazyn
    const inventory = await this.prisma.feedInventory.findMany({
      include: { rawMaterial: { select: { id: true, name: true } } },
      take: 10,
    });

    // Trendy produkcyjne (ostatnie 30 dni)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const results = await this.prisma.productionResult.findMany({
      where: { reportDate: { gte: thirtyDaysAgo } },
      orderBy: { reportDate: 'asc' },
    });

    const trends: IProductionTrend[] = results.map(r => ({
      date: r.reportDate.toISOString().split('T')[0],
      fcr: Number(r.fcr) || 0,
      adg: Number(r.adg) || 0,
      cost: 0, // Wymagałoby powiązania z recepturą
      mortality: Number(r.mortalityCumulative) || 0,
    }));

    // AI Insights
    const insights = await this.generateAIInsights();

    return {
      totalRecipes,
      activeRecipes,
      avgFeedCost,
      totalFeedConsumed,
      alerts: alerts.map(a => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        title: a.title,
        message: a.message,
        parameter: a.parameter || undefined,
        createdAt: a.createdAt,
      })),
      inventory: inventory.map(i => ({
        materialId: i.rawMaterialId,
        materialName: i.rawMaterial.name,
        quantityKg: Number(i.quantityKg),
        minLevel: Number(i.minStockLevel) || 0,
        status: this.getInventoryStatus(Number(i.quantityKg), Number(i.minStockLevel) || 0),
      })),
      productionTrends: trends,
      aiInsights: insights,
    };
  }

  private getInventoryStatus(quantity: number, minLevel: number): 'ok' | 'low' | 'critical' {
    if (minLevel === 0) return 'ok';
    if (quantity < minLevel * 0.5) return 'critical';
    if (quantity < minLevel) return 'low';
    return 'ok';
  }

  private async generateAIInsights(): Promise<IAIInsight[]> {
    const insights: IAIInsight[] = [];

    // Sprawdź receptury z ostrzeżeniami
    const recipesWithWarnings = await this.prisma.recipe.count({
      where: { validationStatus: 'WARNING' },
    });

    if (recipesWithWarnings > 0) {
      insights.push({
        id: 'warn-001',
        type: 'VALIDATION',
        title: 'Receptury wymagają uwagi',
        description: `${recipesWithWarnings} receptur ma aktywne ostrzeżenia eksperckie.`,
        confidence: 0.95,
        actionable: true,
        recommendedAction: 'Przejrzyj receptury z ostrzeżeniami i dostosuj składniki.',
      });
    }

    // Sprawdź niski stan magazynowy
    const lowInventory = await this.prisma.feedInventory.count({
      where: {
        quantityKg: { lt: this.prisma.feedInventory.fields.minStockLevel },
      },
    });

    if (lowInventory > 0) {
      insights.push({
        id: 'inv-001',
        type: 'INVENTORY',
        title: 'Niski stan magazynowy',
        description: `${lowInventory} surowców poniżej minimalnego poziomu magazynowego.`,
        confidence: 1.0,
        actionable: true,
        recommendedAction: 'Złóż zamówienia na surowce z niskim stanem.',
      });
    }

    // Sprawdź wyniki produkcyjne
    const poorFcr = await this.prisma.productionResult.count({
      where: { fcr: { gt: 2.0 } },
    });

    if (poorFcr > 0) {
      insights.push({
        id: 'fcr-001',
        type: 'PERFORMANCE',
        title: 'Wysoki FCR w ostatnich rzutach',
        description: `${poorFcr} raportów wskazuje FCR powyżej 2.0.`,
        confidence: 0.88,
        actionable: true,
        recommendedAction: 'Przeanalizuj receptury i warunki środowiskowe w tych rzutach.',
      });
    }

    return insights;
  }
}
