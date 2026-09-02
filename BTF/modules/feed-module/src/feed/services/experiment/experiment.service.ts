import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Recipe, RawMaterial, Prisma } from '@prisma/client';

export interface ExperimentResult {
  scenarioId: string;
  name: string;
  description: string;
  changes: Array<{
    materialName: string;
    action: string;
    oldValue?: number;
    newValue?: number;
  }>;
  nutritionComparison: Array<{
    parameter: string;
    baseValue: number;
    simulatedValue: number;
    unit: string;
    change: number;
    isWithinStandard: boolean;
  }>;
  productionImpact: {
    fcr: { base: number; simulated: number; change: number; risk: string };
    adg: { base: number; simulated: number; change: number; risk: string };
    cost: { base: number; simulated: number; change: number; unit: string };
    health: { base: number; simulated: number; change: number; score: number };
    feedIntake: { base: number; simulated: number; change: number; explanation: string };
    waterConsumption: { base: number; simulated: number; change: number; explanation: string };
  };
  riskAssessment: {
    level: string;
    factors: string[];
    recommendations: string[];
  };
}

@Injectable()
export class ExperimentService {
  constructor(private readonly prisma: PrismaService) {}

  async createExperiment(
    userId: string,
    recipeId: string,
    name: string,
    changes: Array<{ materialId: string; action: 'REMOVE' | 'ADD' | 'ADJUST'; value?: number }>,
  ): Promise<ExperimentResult> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: { include: { rawMaterial: true } },
        standard: true,
      },
    });
    if (!recipe) throw new NotFoundException('Receptura nie istnieje');

    // Aplikuj zmiany
    const simulatedIngredients = this.applyChanges(recipe.ingredients, changes);

    // Oblicz nowe wartości
    const baseNutrition = this.calculateNutrition(recipe.ingredients);
    const simulatedNutrition = this.calculateNutrition(simulatedIngredients);

    const baseCost = this.calculateCost(recipe.ingredients);
    const simulatedCost = this.calculateCost(simulatedIngredients);

    // Szacowanie wpływów produkcyjnych
    const productionImpact = this.estimateProductionImpact(
      baseNutrition,
      simulatedNutrition,
      recipe.standard as any,
      changes,
    );

    // Ocena ryzyka
    const riskAssessment = this.assessRisk(simulatedNutrition, recipe.standard as any, changes, recipe.ingredients);

    // Zapisz scenariusz
    const scenario = await this.prisma.experimentScenario.create({
      data: {
        name,
        description: `Eksperyment: ${changes.map(c => c.action).join(', ')}`,
        baseRecipeId: recipeId,
        changes: changes as any,
        simulatedResults: {
          baseNutrition,
          simulatedNutrition,
          baseCost,
          simulatedCost,
        } as any,
        fcrChange: new Prisma.Decimal(productionImpact.fcr.change),
        adgChange: new Prisma.Decimal(productionImpact.adg.change),
        costChange: new Prisma.Decimal(simulatedCost - baseCost),
        healthChange: new Prisma.Decimal(productionImpact.health.change),
        waterChange: new Prisma.Decimal(productionImpact.waterConsumption.change),
        feedIntakeChange: new Prisma.Decimal(productionImpact.feedIntake.change),
        riskLevel: riskAssessment.level,
        status: 'SIMULATED',
        createdBy: userId,
      },
    });

    return {
      scenarioId: scenario.id,
      name: scenario.name,
      description: scenario.description,
      changes: changes.map(c => {
        const mat = recipe.ingredients.find(i => i.rawMaterialId === c.materialId)?.rawMaterial;
        const oldIng = recipe.ingredients.find(i => i.rawMaterialId === c.materialId);
        return {
          materialName: mat?.name || 'Nieznany',
          action: c.action,
          oldValue: oldIng ? Number(oldIng.percentage) : undefined,
          newValue: c.value,
        };
      }),
      nutritionComparison: this.compareNutrition(baseNutrition, simulatedNutrition, recipe.standard as any),
      productionImpact,
      riskAssessment,
    };
  }

  async getExperiment(experimentId: string): Promise<ExperimentResult> {
    const scenario = await this.prisma.experimentScenario.findUnique({
      where: { id: experimentId },
      include: { baseRecipe: { include: { ingredients: { include: { rawMaterial: true } }, standard: true } } },
    });
    if (!scenario) throw new NotFoundException('Eksperyment nie istnieje');

    const results = scenario.simulatedResults as any;

    return {
      scenarioId: scenario.id,
      name: scenario.name,
      description: scenario.description,
      changes: (scenario.changes as any[]).map((c: any) => ({
        materialName: c.materialId,
        action: c.action,
        newValue: c.value,
      })),
      nutritionComparison: this.compareNutrition(results.baseNutrition, results.simulatedNutrition, scenario.baseRecipe.standard as any),
      productionImpact: {
        fcr: { base: 1.65, simulated: 1.65 + Number(scenario.fcrChange), change: Number(scenario.fcrChange), risk: 'MEDIUM' },
        adg: { base: 55, simulated: 55 + Number(scenario.adgChange), change: Number(scenario.adgChange), risk: 'LOW' },
        cost: { base: results.baseCost, simulated: results.simulatedCost, change: Number(scenario.costChange), unit: 'PLN/tona' },
        health: { base: 7, simulated: 7 + Number(scenario.healthChange), change: Number(scenario.healthChange), score: 7 + Number(scenario.healthChange) },
        feedIntake: { base: 100, simulated: 100 + Number(scenario.feedIntakeChange), change: Number(scenario.feedIntakeChange), explanation: 'Zmiana energii i włókna' },
        waterConsumption: { base: 100, simulated: 100 + Number(scenario.waterChange), change: Number(scenario.waterChange), explanation: 'Zmiana sodu i elektrolitów' },
      },
      riskAssessment: {
        level: scenario.riskLevel,
        factors: ['Symulacja wymaga weryfikacji'],
        recommendations: ['Przeprowadź test na małej grupie'],
      },
    };
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private applyChanges(
    ingredients: Array<any>,
    changes: Array<{ materialId: string; action: string; value?: number }>,
  ): Array<any> {
    const result = [...ingredients];

    for (const change of changes) {
      const idx = result.findIndex(i => i.rawMaterialId === change.materialId);

      if (change.action === 'REMOVE' && idx >= 0) {
        result.splice(idx, 1);
      } else if (change.action === 'ADD' && idx < 0) {
        // Wymagałoby pobrania surowca z bazy — uproszczenie
      } else if (change.action === 'ADJUST' && idx >= 0 && change.value !== undefined) {
        result[idx] = { ...result[idx], percentage: new Prisma.Decimal(change.value) };
      }
    }

    // Normalizuj do 100%
    const total = result.reduce((sum, i) => sum + Number(i.percentage), 0);
    if (total > 0) {
      for (const ing of result) {
        ing.percentage = new Prisma.Decimal((Number(ing.percentage) / total) * 100);
      }
    }

    return result;
  }

  private calculateNutrition(ingredients: Array<any>): Record<string, number> {
    const result: Record<string, number> = {};
    const fields = ['meTurkey', 'crudeProtein', 'crudeFat', 'crudeFiber', 'lysine', 'methionine', 'calcium', 'sodium'];

    for (const field of fields) {
      result[field] = 0;
      for (const ing of ingredients) {
        const val = Number(ing.rawMaterial?.[field] || 0) * (Number(ing.percentage) / 100);
        result[field] += val;
      }
      result[field] = Number(result[field].toFixed(4));
    }

    return result;
  }

  private calculateCost(ingredients: Array<any>): number {
    return ingredients.reduce((sum, i) => {
      return sum + (Number(i.rawMaterial?.costPerTon) || 0) * (Number(i.percentage) / 100);
    }, 0);
  }

  private compareNutrition(
    base: Record<string, number>,
    simulated: Record<string, number>,
    standard: any,
  ): Array<any> {
    const params = [
      { key: 'meTurkey', unit: 'kcal/kg', min: standard?.meMin, max: standard?.meMax },
      { key: 'crudeProtein', unit: '%', min: standard?.crudeProteinMin, max: standard?.crudeProteinMax },
      { key: 'lysine', unit: '%', min: standard?.lysineMin },
      { key: 'methionine', unit: '%', min: standard?.methionineMin },
      { key: 'calcium', unit: '%', min: standard?.calciumMin, max: standard?.calciumMax },
      { key: 'sodium', unit: '%', min: standard?.sodiumMin, max: standard?.sodiumMax },
    ];

    return params.map(p => {
      const baseVal = base[p.key] || 0;
      const simVal = simulated[p.key] || 0;
      const change = simVal - baseVal;
      let isWithin = true;

      if (p.min !== undefined && simVal < Number(p.min)) isWithin = false;
      if (p.max !== undefined && simVal > Number(p.max)) isWithin = false;

      return {
        parameter: p.key,
        baseValue: baseVal,
        simulatedValue: simVal,
        unit: p.unit,
        change: Number(change.toFixed(4)),
        isWithinStandard: isWithin,
      };
    });
  }

  private estimateProductionImpact(
    base: Record<string, number>,
    simulated: Record<string, number>,
    standard: any,
    changes: any[],
  ): ExperimentResult['productionImpact'] {
    const meDiff = (simulated.meTurkey || 0) - (base.meTurkey || 0);
    const proteinDiff = (simulated.crudeProtein || 0) - (base.crudeProtein || 0);
    const fiberDiff = (simulated.crudeFiber || 0) - (base.crudeFiber || 0);
    const sodiumDiff = (simulated.sodium || 0) - (base.sodium || 0);

    // FCR: wyższa energia = lepszy FCR, wyższe włókno = gorszy FCR
    const fcrChange = -(meDiff * 0.00005) + (fiberDiff * 0.005);

    // ADG: wyższe białko/aminokwasy = lepszy ADG
    const adgChange = proteinDiff * 0.8 + (simulated.lysine - base.lysine) * 10;

    // Zdrowie: sod, włókno
    const healthChange = -(sodiumDiff * 5) - (fiberDiff * 0.1);

    // Pobór paszy: energia odwrotnie proporcjonalna
    const feedIntakeChange = -meDiff * 0.01;

    // Woda: sód
    const waterChange = sodiumDiff * 50;

    return {
      fcr: { base: 1.65, simulated: 1.65 + fcrChange, change: Number(fcrChange.toFixed(3)), risk: Math.abs(fcrChange) > 0.05 ? 'HIGH' : 'LOW' },
      adg: { base: 55, simulated: 55 + adgChange, change: Number(adgChange.toFixed(1)), risk: Math.abs(adgChange) > 3 ? 'MEDIUM' : 'LOW' },
      cost: { base: 0, simulated: 0, change: 0, unit: 'PLN/tona' },
      health: { base: 7, simulated: 7 + healthChange, change: Number(healthChange.toFixed(2)), score: Number((7 + healthChange).toFixed(1)) },
      feedIntake: { base: 100, simulated: 100 + feedIntakeChange, change: Number(feedIntakeChange.toFixed(2)), explanation: `Zmiana energii o ${meDiff.toFixed(0)} kcal/kg` },
      waterConsumption: { base: 100, simulated: 100 + waterChange, change: Number(waterChange.toFixed(2)), explanation: `Zmiana sodu o ${sodiumDiff.toFixed(3)}%` },
    };
  }

  private assessRisk(
    simulated: Record<string, number>,
    standard: any,
    changes: any[],
    ingredients: any[],
  ): { level: string; factors: string[]; recommendations: string[] } {
    const factors: string[] = [];
    const recommendations: string[] = [];

    if (standard) {
      if (simulated.meTurkey < Number(standard.meMin)) {
        factors.push('Energia poniżej minimum — ryzyko spadku ADG');
        recommendations.push('Zwiększ udział surowców wysokoenergetycznych');
      }
      if (simulated.meTurkey > Number(standard.meMax)) {
        factors.push('Energia powyżej maksimum — ryzyko otłuszczenia');
        recommendations.push('Zmniejsz tłuszcz lub oleje w recepturze');
      }
      if (simulated.crudeProtein < Number(standard.crudeProteinMin)) {
        factors.push('Białko poniżej minimum — niedobór aminokwasów');
        recommendations.push('Dodaj koncentrat białkowy lub aminokwasy syntetyczne');
      }
      if (simulated.sodium > Number(standard.sodiumMax)) {
        factors.push('Sód przekracza limit — problemy z wodą i ściółką');
        recommendations.push('Zastąp surowce wysokosodowe alternatywami');
      }
    }

    // Sprawdź czy usunięto kluczowy składnik
    for (const change of changes) {
      if (change.action === 'REMOVE') {
        const mat = ingredients.find(i => i.rawMaterialId === change.materialId)?.rawMaterial;
        if (mat && Number(mat.crudeProtein) > 30) {
          factors.push(`Usunięto główne źródło białka (${mat.name})`);
          recommendations.push('Zastąp usunięty składnik innym źródłem białka');
        }
      }
    }

    let level = 'LOW';
    if (factors.length >= 3) level = 'CRITICAL';
    else if (factors.length >= 2) level = 'HIGH';
    else if (factors.length >= 1) level = 'MEDIUM';

    return { level, factors, recommendations };
  }
}
