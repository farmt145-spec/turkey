import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RawMaterial, NutritionalStandard, Recipe, RecipeIngredient } from '@prisma/client';
import { IAIExplanation, IAlternativeMaterial, IIngredientImpact, IProductionMetrics, ISimulationResult } from '../interfaces/feed.interfaces';

@Injectable()
export class AIService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // WYJAŚNIENIA AI DLA RECEPTURY
  // ============================================================

  async explainRecipe(
    recipe: Recipe & { ingredients: Array<RecipeIngredient & { rawMaterial: RawMaterial }> },
    allMaterials: RawMaterial[],
    standard: NutritionalStandard,
  ): Promise<IAIExplanation[]> {
    const explanations: IAIExplanation[] = [];
    const nutrition = recipe.calculatedNutrition as Record<string, number>;

    for (const ingredient of recipe.ingredients) {
      const mat = ingredient.rawMaterial;
      const percentage = Number(ingredient.percentage);

      const impact = this.calculateIngredientImpact(mat, percentage, nutrition, standard);
      const alternatives = await this.findAlternatives(mat, allMaterials, percentage, standard);

      const reasoning = this.generateReasoning(mat, percentage, impact, standard, nutrition);

      explanations.push({
        ingredientId: mat.id,
        ingredientName: mat.name,
        decision: `Dodano ${mat.name} w ilości ${percentage}%`,
        reasoning,
        impact,
        alternatives,
      });
    }

    return explanations;
  }

  // ============================================================
  // SYMULACJA WPŁYWU ZMIANY SKŁADNIKA
  // ============================================================

  simulateImpact(
    material: RawMaterial,
    deltaPercentage: number,
    currentNutrition: Record<string, number>,
    newNutrition: Record<string, number>,
    standard: NutritionalStandard,
  ): ISimulationResult[] {
    const results: ISimulationResult[] = [];

    // Wpływ na energię
    if (material.meTurkey) {
      const meChange = Number(material.meTurkey) * (deltaPercentage / 100);
      results.push({
        parameter: 'Energia metaboliczna (ME)',
        currentValue: currentNutrition.meTurkey || 0,
        newValue: newNutrition.meTurkey || 0,
        unit: 'kcal/kg',
        impact: meChange > 0 
          ? `Wzrost energii o ${meChange.toFixed(0)} kcal/kg. Może poprawić FCR, ale zwiększa ryzyko otłuszczenia.`
          : `Spadek energii o ${Math.abs(meChange).toFixed(0)} kcal/kg. Może pogorszyć FCR i ADG.`,
        severity: Math.abs(meChange) > 50 ? 'warning' : 'info',
      });
    }

    // Wpływ na białko
    if (material.crudeProtein) {
      const proteinChange = Number(material.crudeProtein) * (deltaPercentage / 100);
      results.push({
        parameter: 'Białko surowe',
        currentValue: currentNutrition.crudeProtein || 0,
        newValue: newNutrition.crudeProtein || 0,
        unit: '%',
        impact: proteinChange > 0
          ? `Wzrost białka o ${proteinChange.toFixed(2)}%. Pozytywnie dla wzrostu, ale może zwiększyć koszt i obciążenie nerek.`
          : `Spadek białka o ${Math.abs(proteinChange).toFixed(2)}%. Ryzyko niedoboru aminokwasów.`,
        severity: Math.abs(proteinChange) > 1 ? 'warning' : 'info',
      });
    }

    // Wpływ na sod
    if (material.sodium) {
      const naChange = Number(material.sodium) * (deltaPercentage / 100);
      const newNa = newNutrition.sodium || 0;
      const maxNa = Number(standard.sodiumMax);

      if (newNa > maxNa) {
        results.push({
          parameter: 'Sód',
          currentValue: currentNutrition.sodium || 0,
          newValue: newNa,
          unit: '%',
          impact: `PRZEKROCZONO LIMIT! Sód wzrośnie do ${newNa.toFixed(3)}% (limit: ${maxNa}%). Może wzrosnąć pobór wody, pogorszyć się jakość ściółki i wzrosnąć amoniak.`,
          severity: 'critical',
        });
      } else if (newNa > maxNa * 0.9) {
        results.push({
          parameter: 'Sód',
          currentValue: currentNutrition.sodium || 0,
          newValue: newNa,
          unit: '%',
          impact: `Sód zbliża się do górnego limitu. Monitoruj pobór wody i jakość ściółki.`,
          severity: 'warning',
        });
      }
    }

    // Wpływ na włókno
    if (material.crudeFiber) {
      const fiberChange = Number(material.crudeFiber) * (deltaPercentage / 100);
      if (Math.abs(fiberChange) > 0.1) {
        results.push({
          parameter: 'Włókno surowe',
          currentValue: currentNutrition.crudeFiber || 0,
          newValue: newNutrition.crudeFiber || 0,
          unit: '%',
          impact: fiberChange > 0
            ? `Wzrost włókna o ${fiberChange.toFixed(2)}%. Może obniżyć ME i pogorszyć FCR.`
            : `Spadek włókna o ${Math.abs(fiberChange).toFixed(2)}%. Może poprawić strawność, ale zmniejszyć sytość jelitową.`,
          severity: Math.abs(fiberChange) > 0.5 ? 'warning' : 'info',
        });
      }
    }

    // Wpływ na tłuszcz
    if (material.crudeFat && deltaPercentage > 0) {
      const fatChange = Number(material.crudeFat) * (deltaPercentage / 100);
      results.push({
        parameter: 'Tłuszcz surowy / Otłuszczenie',
        currentValue: currentNutrition.crudeFat || 0,
        newValue: newNutrition.crudeFat || 0,
        unit: '%',
        impact: `Wzrost tłuszczu o ${fatChange.toFixed(2)}%. Zwiększa ryzyko otłuszczenia tuszy i spadku EPEF.`,
        severity: fatChange > 0.5 ? 'warning' : 'info',
      });
    }

    // Wpływ na stosunek Ca:P
    if (material.calcium || material.totalPhosphorus) {
      const newCaP = newNutrition.caToTotalP || 0;
      const minCaP = standard.caToTotalPMin ? Number(standard.caToTotalPMin) : 1.0;

      if (newCaP < minCaP) {
        results.push({
          parameter: 'Stosunek Ca:P',
          currentValue: currentNutrition.caToTotalP || 0,
          newValue: newCaP,
          unit: ':1',
          impact: `Stosunek Ca:P spadnie do ${newCaP.toFixed(2)} (min: ${minCaP}). Ryzyko problemów z nogami i mineralizacją kości.`,
          severity: 'critical',
        });
      }
    }

    return results;
  }

  // ============================================================
  // UCZENIE SIĘ NA PODSTAWIE WYNIKÓW
  // ============================================================

  async analyzeProductionResults(batchId: string): Promise<{
    analysis: string;
    recommendations: string[];
    suggestedRecipeChanges: Array<{ parameter: string; current: number; suggested: number; reasoning: string }>;
  }> {
    const results = await this.prisma.productionResult.findMany({
      where: { batchId },
      orderBy: { ageDays: 'asc' },
    });

    const batch = await this.prisma.productionBatch.findUnique({
      where: { id: batchId },
      include: { recipes: true },
    });

    if (!results.length || !batch) {
      return { analysis: 'Brak danych do analizy.', recommendations: [], suggestedRecipeChanges: [] };
    }

    const metrics = this.aggregateMetrics(results);
    const analysis = this.generateProductionAnalysis(metrics, batch);
    const recommendations = this.generateRecommendations(metrics, batch);
    const suggestedChanges = this.suggestRecipeChanges(metrics, batch);

    // Zapisz wyniki analizy
    await this.prisma.productionResult.updateMany({
      where: { batchId, aiAnalyzed: false },
      data: {
        aiAnalyzed: true,
        aiRecommendations: analysis,
        suggestedRecipeChanges: suggestedChanges as any,
      },
    });

    return { analysis, recommendations, suggestedRecipeChanges: suggestedChanges };
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private calculateIngredientImpact(
    material: RawMaterial,
    percentage: number,
    nutrition: Record<string, number>,
    standard: NutritionalStandard,
  ): IIngredientImpact {
    const impact: IIngredientImpact = {
      fcr: 0,
      adg: 0,
      mortality: 0,
      gutHealth: 0,
      immunity: 0,
      litterQuality: 0,
      legQuality: 0,
      waterConsumption: 0,
      costImpact: 0,
    };

    // Wpływ na FCR
    if (material.meTurkey) {
      const meDiff = Number(material.meTurkey) - (nutrition.meTurkey || 0);
      impact.fcr += meDiff > 0 ? -0.02 * percentage : 0.03 * percentage;
    }
    if (material.crudeFiber) {
      impact.fcr += Number(material.crudeFiber) * 0.005 * percentage;
    }

    // Wpływ na ADG
    if (material.crudeProtein) {
      const proteinDiff = Number(material.crudeProtein) - (nutrition.crudeProtein || 0);
      impact.adg += proteinDiff > 0 ? 0.5 * percentage : -0.3 * percentage;
    }
    if (material.lysine) {
      impact.adg += Number(material.lysine) * 2 * percentage;
    }

    // Wpływ na śmiertelność
    if (material.aflatoxinB1 && Number(material.aflatoxinB1) > 0) {
      impact.mortality += Number(material.aflatoxinB1) * 0.001 * percentage;
    }

    // Wpływ na jelita
    if (material.crudeFiber) {
      impact.gutHealth += Number(material.crudeFiber) * 0.02 * percentage;
    }
    if (material.sodium) {
      const na = Number(material.sodium);
      if (na > 0.2) impact.gutHealth -= 0.1 * percentage;
    }

    // Wpływ na odporność
    if (material.vitaminE) {
      impact.immunity += Number(material.vitaminE) * 0.001 * percentage;
    }
    if (material.zinc) {
      impact.immunity += Number(material.zinc) * 0.0001 * percentage;
    }

    // Wpływ na ściółkę
    if (material.sodium) {
      impact.litterQuality -= Number(material.sodium) * 0.5 * percentage;
    }
    if (material.moisture) {
      impact.litterQuality -= Number(material.moisture) * 0.02 * percentage;
    }

    // Wpływ na nogi
    if (material.calcium) {
      impact.legQuality += Number(material.calcium) * 0.1 * percentage;
    }
    if (material.phytatePhosphorus) {
      impact.legQuality -= Number(material.phytatePhosphorus) * 0.05 * percentage;
    }

    // Wpływ na wodę
    if (material.sodium) {
      impact.waterConsumption += Number(material.sodium) * 10 * percentage;
    }
    if (material.potassium) {
      impact.waterConsumption += Number(material.potassium) * 2 * percentage;
    }

    // Wpływ na koszt
    impact.costImpact = Number(material.costPerTon) * (percentage / 100);

    // Zaokrąglenia
    for (const key of Object.keys(impact) as (keyof IIngredientImpact)[]) {
      impact[key] = Number(impact[key].toFixed(3));
    }

    return impact;
  }

  private async findAlternatives(
    material: RawMaterial,
    allMaterials: RawMaterial[],
    currentPercentage: number,
    standard: NutritionalStandard,
  ): Promise<IAlternativeMaterial[]> {
    const alternatives: IAlternativeMaterial[] = [];

    // Znajdź surowce tej samej kategorii
    const candidates = allMaterials.filter(m => 
      m.id !== material.id && 
      m.category === material.category &&
      m.status === 'ACTIVE'
    );

    for (const candidate of candidates.slice(0, 3)) {
      const priceDiff = Number(candidate.costPerTon) - Number(material.costPerTon);
      const nutritionalDiffs: Record<string, number> = {};

      const fields = ['meTurkey', 'crudeProtein', 'crudeFat', 'lysine', 'methionine', 'calcium'];
      for (const field of fields) {
        const diff = (Number(candidate[field]) || 0) - (Number(material[field]) || 0);
        if (Math.abs(diff) > 0.01) {
          nutritionalDiffs[field] = Number(diff.toFixed(3));
        }
      }

      const fcrImpact = priceDiff < 0 ? -0.01 : 0.01;
      const adgImpact = (Number(candidate.crudeProtein) - Number(material.crudeProtein)) * 0.1;

      alternatives.push({
        materialId: candidate.id,
        materialName: candidate.name,
        priceDifference: Number(priceDiff.toFixed(2)),
        nutritionalDifferences: nutritionalDiffs,
        fcrImpact: Number(fcrImpact.toFixed(3)),
        adgImpact: Number(adgImpact.toFixed(3)),
        reasoning: this.generateAlternativeReasoning(material, candidate, priceDiff, nutritionalDiffs),
      });
    }

    return alternatives;
  }

  private generateReasoning(
    material: RawMaterial,
    percentage: number,
    impact: IIngredientImpact,
    standard: NutritionalStandard,
    nutrition: Record<string, number>,
  ): string {
    const parts: string[] = [];

    parts.push(`${material.name} (${percentage}%) został wybrany, ponieważ:`);

    if (material.meTurkey && Number(material.meTurkey) > 3000) {
      parts.push(`- Jest wysokoenergetyczny (${material.meTurkey} kcal/kg ME), co wspiera niski FCR.`);
    }

    if (material.crudeProtein && Number(material.crudeProtein) > 15) {
      parts.push(`- Dostarcza znaczącej ilości białka (${material.crudeProtein}%), wspierając ADG.`);
    }

    if (material.lysine && Number(material.lysine) > 0.5) {
      parts.push(`- Bogaty w lizynę (${material.lysine}%), kluczowy aminokwas dla wzrostu mięśni.`);
    }

    if (impact.fcr < -0.05) {
      parts.push(`- Pozytywnie wpływa na FCR (szacowany spadek o ${Math.abs(impact.fcr).toFixed(3)}).`);
    }

    if (impact.costImpact > 50) {
      parts.push(`- UWAGA: Wysoki koszt składnika (${impact.costImpact.toFixed(2)} PLN/tonę paszy).`);
    }

    if (material.aflatoxinB1 && Number(material.aflatoxinB1) > 0) {
      parts.push(`- Wymaga monitorowania poziomu aflatoksyny (${material.aflatoxinB1} ppb).`);
    }

    return parts.join('\n');
  }

  private generateAlternativeReasoning(
    original: RawMaterial,
    alternative: RawMaterial,
    priceDiff: number,
    diffs: Record<string, number>,
  ): string {
    const parts: string[] = [];
    parts.push(`${alternative.name} może zastąpić ${original.name}, ponieważ:`);

    if (priceDiff < 0) {
      parts.push(`- Jest tańszy o ${Math.abs(priceDiff).toFixed(2)} PLN/tonę.`);
    } else {
      parts.push(`- Jest droższy o ${priceDiff.toFixed(2)} PLN/tonę, ale może oferować lepsze parametry.`);
    }

    if (diffs.meTurkey) {
      parts.push(`- Różnica w energii: ${diffs.meTurkey > 0 ? '+' : ''}${diffs.meTurkey} kcal/kg ME.`);
    }

    if (diffs.crudeProtein) {
      parts.push(`- Różnica w białku: ${diffs.crudeProtein > 0 ? '+' : ''}${diffs.crudeProtein}%.`);
    }

    return parts.join('\n');
  }

  private aggregateMetrics(results: any[]): IProductionMetrics {
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      fcr: avg(results.map(r => Number(r.fcr) || 0)),
      adg: avg(results.map(r => Number(r.adg) || 0)),
      epef: avg(results.map(r => Number(r.epef) || 0)),
      mortality: avg(results.map(r => Number(r.mortalityCumulative) || 0)),
      feedConsumption: avg(results.map(r => Number(r.feedConsumedKg) || 0)),
      waterConsumption: avg(results.map(r => Number(r.waterConsumedLiters) || 0)),
      treatments: avg(results.map(r => Number(r.treatmentsCount) || 0)),
      gutHealthScore: avg(results.map(r => Number(r.gutHealthScore) || 5)),
      litterQualityScore: avg(results.map(r => Number(r.litterQualityScore) || 5)),
      legProblems: avg(results.map(r => Number(r.legProblemsCount) || 0)),
      ammoniaLevel: avg(results.map(r => Number(r.ammoniaLevel) || 0)),
    };
  }

  private generateProductionAnalysis(metrics: IProductionMetrics, batch: any): string {
    const parts: string[] = [];
    parts.push(`Analiza rzutu ${batch.name}:`);
    parts.push(`\nWskaźniki produkcyjne:`);
    parts.push(`- FCR: ${metrics.fcr.toFixed(3)} ${metrics.fcr > 1.8 ? '(POWYŻEJ NORMY)' : '(OK)'}`);
    parts.push(`- ADG: ${metrics.adg.toFixed(1)} g/dzień ${metrics.adg < 40 ? '(PONIŻEJ OCZEKIWAŃ)' : '(OK)'}`);
    parts.push(`- EPEF: ${metrics.epef.toFixed(1)} ${metrics.epef < 350 ? '(NISKI)' : '(DOBRY)'}`);
    parts.push(`- Śmiertelność: ${metrics.mortality.toFixed(2)}%`);

    parts.push(`\nZdrowie i dobrostan:`);
    parts.push(`- Jelita: ${metrics.gutHealthScore.toFixed(1)}/10 ${metrics.gutHealthScore < 6 ? '(WARUNEK POMIAROWY)' : ''}`);
    parts.push(`- Ściółka: ${metrics.litterQualityScore.toFixed(1)}/10`);
    parts.push(`- Nogi: ${metrics.legProblems.toFixed(1)} przypadków`);
    parts.push(`- Amoniak: ${metrics.ammoniaLevel.toFixed(1)} ppm ${metrics.ammoniaLevel > 25 ? '(PRZEKROCZONY LIMIT)' : ''}`);

    return parts.join('\n');
  }

  private generateRecommendations(metrics: IProductionMetrics, batch: any): string[] {
    const recs: string[] = [];

    if (metrics.fcr > 1.8) {
      recs.push('Rozważ zwiększenie energii w recepturze lub redukcję włókna.');
    }
    if (metrics.adg < 40) {
      recs.push('Sprawdź poziom białka i aminokwasów (szczególnie lizynę i metioninę).');
    }
    if (metrics.gutHealthScore < 6) {
      recs.push('Dodaj prebiotyki lub organiczne kwasy do receptury.');
      recs.push('Sprawdź poziom sodu i elektrolitów.');
    }
    if (metrics.ammoniaLevel > 25) {
      recs.push('Zredukuj poziom białka surowego i zwiększ strawność aminokwasów.');
      recs.push('Sprawdź stosunek Ca:P i poziom sodu.');
    }
    if (metrics.legProblems > 5) {
      recs.push('Zwiększ poziom wapnia i fosforu strawnego.');
      recs.push('Rozważ dodatek witaminy D3 i cynku.');
    }
    if (metrics.mortality > 3) {
      recs.push('Przeanalizuj poziom mykotoksyn w surowcach.');
      recs.push('Sprawdź odporność - poziom witaminy E i selenu.');
    }

    return recs;
  }

  private suggestRecipeChanges(metrics: IProductionMetrics, batch: any): Array<{ parameter: string; current: number; suggested: number; reasoning: string }> {
    const changes: Array<{ parameter: string; current: number; suggested: number; reasoning: string }> = [];

    if (metrics.fcr > 1.8) {
      changes.push({
        parameter: 'meTurkey',
        current: 0, // Wymagałoby pobrania aktualnej receptury
        suggested: 50,
        reasoning: 'Wzrost energii o 50 kcal/kg może poprawić FCR o ~0.05-0.08.',
      });
    }

    if (metrics.gutHealthScore < 6) {
      changes.push({
        parameter: 'sodium',
        current: 0,
        suggested: -0.02,
        reasoning: 'Redukcja sodu o 0.02% może poprawić jakość ściółki i zdrowie jelit.',
      });
    }

    if (metrics.legProblems > 5) {
      changes.push({
        parameter: 'digestiblePhosphorus',
        current: 0,
        suggested: 0.02,
        reasoning: 'Wzrost strawnego fosforu o 0.02% wspiera mineralizację kości.',
      });
    }

    return changes;
  }
}
