import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface RecipeComparisonResult {
  comparisonId: string;
  verdict: string;
  winner: {
    id: string;
    name: string;
    isRecipeA: boolean;
  };
  differences: {
    cost: { recipeA: number; recipeB: number; difference: number; winner: string };
    fcr: { recipeA: number; recipeB: number; difference: number; winner: string };
    adg: { recipeA: number; recipeB: number; difference: number; winner: string };
    epef: { recipeA: number; recipeB: number; difference: number; winner: string };
    health: { recipeA: number; recipeB: number; difference: number; winner: string };
    gutHealth: { recipeA: number; recipeB: number; difference: number; winner: string };
  };
  detailedAnalysis: {
    nutritionComparison: Array<{
      parameter: string;
      recipeA: number;
      recipeB: number;
      difference: number;
      unit: string;
      advantage: string; // "A", "B", "NONE"
    }>;
    ingredientComparison: Array<{
      materialName: string;
      inRecipeA: boolean;
      inRecipeB: boolean;
      percentageA?: number;
      percentageB?: number;
      aiComment: string;
    }>;
  };
  recommendations: string[];
}

@Injectable()
export class ComparisonService {
  constructor(private readonly prisma: PrismaService) {}

  async compareRecipes(recipeAId: string, recipeBId: string, userId: string): Promise<RecipeComparisonResult> {
    const recipeA = await this.prisma.recipe.findUnique({
      where: { id: recipeAId },
      include: { ingredients: { include: { rawMaterial: true } }, standard: true },
    });
    const recipeB = await this.prisma.recipe.findUnique({
      where: { id: recipeBId },
      include: { ingredients: { include: { rawMaterial: true } }, standard: true },
    });

    if (!recipeA || !recipeB) throw new NotFoundException('Jedna z receptur nie istnieje');

    const nutritionA = recipeA.calculatedNutrition as Record<string, number>;
    const nutritionB = recipeB.calculatedNutrition as Record<string, number>;

    // Oblicz różnice
    const costDiff = Number(recipeB.costPerTon) - Number(recipeA.costPerTon);

    // Szacowane FCR (uproszczone)
    const fcrA = this.estimateFcr(nutritionA);
    const fcrB = this.estimateFcr(nutritionB);
    const fcrDiff = fcrB - fcrA;

    // Szacowane ADG
    const adgA = this.estimateAdg(nutritionA);
    const adgB = this.estimateAdg(nutritionB);
    const adgDiff = adgB - adgA;

    // Szacowane EPEF
    const epefA = this.estimateEpef(nutritionA, fcrA, adgA);
    const epefB = this.estimateEpef(nutritionB, fcrB, adgB);
    const epefDiff = epefB - epefA;

    // Zdrowie
    const healthA = this.estimateHealth(nutritionA);
    const healthB = this.estimateHealth(nutritionB);
    const healthDiff = healthB - healthA;

    // Jelita
    const gutA = this.estimateGutHealth(nutritionA);
    const gutB = this.estimateGutHealth(nutritionB);
    const gutDiff = gutB - gutA;

    // Werdykt
    const winner = this.determineWinner(
      { cost: Number(recipeA.costPerTon), fcr: fcrA, adg: adgA, epef: epefA, health: healthA, gutHealth: gutA },
      { cost: Number(recipeB.costPerTon), fcr: fcrB, adg: adgB, epef: epefB, health: healthB, gutHealth: gutB },
    );

    const verdict = this.generateVerdict(recipeA, recipeB, winner, {
      cost: costDiff, fcr: fcrDiff, adg: adgDiff, epef: epefDiff, health: healthDiff, gutHealth: gutDiff,
    });

    const recommendations = this.generateRecommendations(winner, recipeA, recipeB, {
      cost: costDiff, fcr: fcrDiff, adg: adgDiff, epef: epefDiff,
    });

    // Zapisz porównanie
    const comparison = await this.prisma.recipeComparison.create({
      data: {
        recipeAId,
        recipeBId,
        winnerId: winner.id,
        verdict,
        costDifference: new Prisma.Decimal(costDiff),
        fcrDifference: new Prisma.Decimal(fcrDiff),
        adgDifference: new Prisma.Decimal(adgDiff),
        epefDifference: new Prisma.Decimal(epefDiff),
        healthDifference: new Prisma.Decimal(healthDiff),
        gutHealthDifference: new Prisma.Decimal(gutDiff),
        detailedReport: {
          nutritionA,
          nutritionB,
          ingredientsA: recipeA.ingredients.map(i => ({ name: i.rawMaterial.name, percentage: Number(i.percentage) })),
          ingredientsB: recipeB.ingredients.map(i => ({ name: i.rawMaterial.name, percentage: Number(i.percentage) })),
        } as any,
        recommendations,
        createdBy: userId,
      },
    });

    return {
      comparisonId: comparison.id,
      verdict,
      winner: {
        id: winner.id,
        name: winner.name,
        isRecipeA: winner.id === recipeAId,
      },
      differences: {
        cost: { recipeA: Number(recipeA.costPerTon), recipeB: Number(recipeB.costPerTon), difference: costDiff, winner: costDiff < 0 ? 'A' : 'B' },
        fcr: { recipeA: fcrA, recipeB: fcrB, difference: fcrDiff, winner: fcrDiff < 0 ? 'B' : 'A' },
        adg: { recipeA: adgA, recipeB: adgB, difference: adgDiff, winner: adgDiff > 0 ? 'B' : 'A' },
        epef: { recipeA: epefA, recipeB: epefB, difference: epefDiff, winner: epefDiff > 0 ? 'B' : 'A' },
        health: { recipeA: healthA, recipeB: healthB, difference: healthDiff, winner: healthDiff > 0 ? 'B' : 'A' },
        gutHealth: { recipeA: gutA, recipeB: gutB, difference: gutDiff, winner: gutDiff > 0 ? 'B' : 'A' },
      },
      detailedAnalysis: {
        nutritionComparison: this.compareNutrition(nutritionA, nutritionB),
        ingredientComparison: this.compareIngredients(recipeA.ingredients, recipeB.ingredients),
      },
      recommendations,
    };
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private estimateFcr(nutrition: Record<string, number>): number {
    let fcr = 1.75;
    const me = nutrition.meTurkey || 2800;
    const fiber = nutrition.crudeFiber || 3;
    const lysine = nutrition.lysine || 1.4;

    fcr -= (me - 2800) * 0.00002;
    fcr += fiber * 0.008;
    fcr -= (lysine - 1.4) * 0.02;

    return Number(Math.max(1.4, fcr).toFixed(3));
  }

  private estimateAdg(nutrition: Record<string, number>): number {
    let adg = 50;
    const protein = nutrition.crudeProtein || 26;
    const lysine = nutrition.lysine || 1.4;
    const metCys = nutrition.metCys || 1.0;

    adg += (protein - 26) * 0.5;
    adg += (lysine - 1.4) * 8;
    adg += (metCys - 1.0) * 5;

    return Number(Math.max(30, adg).toFixed(1));
  }

  private estimateEpef(nutrition: Record<string, number>, fcr: number, adg: number): number {
    // Uproszczony EPEF = (ADG * survival) / (FCR * age) * 100
    const survival = 95;
    const age = 120;
    return Number(((adg * survival / 100) / (fcr * age) * 100).toFixed(1));
  }

  private estimateHealth(nutrition: Record<string, number>): number {
    let score = 7;
    const sodium = nutrition.sodium || 0.15;
    const fiber = nutrition.crudeFiber || 3;
    const vitaminE = nutrition.vitaminE || 20;

    score -= Math.max(0, (sodium - 0.18) * 10);
    score += Math.max(0, (vitaminE - 20) * 0.05);
    score -= Math.max(0, (fiber - 5) * 0.2);

    return Number(Math.min(10, Math.max(1, score)).toFixed(1));
  }

  private estimateGutHealth(nutrition: Record<string, number>): number {
    let score = 7;
    const fiber = nutrition.crudeFiber || 3;
    const sodium = nutrition.sodium || 0.15;

    score += Math.max(0, (fiber - 2) * 0.3); // Umiarkowane włókno dobre dla jelit
    score -= Math.max(0, (sodium - 0.18) * 5);

    return Number(Math.min(10, Math.max(1, score)).toFixed(1));
  }

  private determineWinner(
    a: { cost: number; fcr: number; adg: number; epef: number; health: number; gutHealth: number },
    b: { cost: number; fcr: number; adg: number; epef: number; health: number; gutHealth: number },
  ): { id: string; name: string } {
    let scoreA = 0;
    let scoreB = 0;

    // Koszt (niższy lepszy)
    if (a.cost < b.cost) scoreA += 1; else scoreB += 1;
    // FCR (niższy lepszy)
    if (a.fcr < b.fcr) scoreA += 2; else scoreB += 2;
    // ADG (wyższy lepszy)
    if (a.adg > b.adg) scoreA += 2; else scoreB += 2;
    // EPEF (wyższy lepszy)
    if (a.epef > b.epef) scoreA += 2; else scoreB += 2;
    // Zdrowie (wyższy lepszy)
    if (a.health > b.health) scoreA += 1; else scoreB += 1;
    // Jelita (wyższy lepszy)
    if (a.gutHealth > b.gutHealth) scoreA += 1; else scoreB += 1;

    // W prawdziwej implementacji zwrócilibyśmy ID zwycięzcy
    return scoreA >= scoreB ? { id: 'A', name: 'Receptura A' } : { id: 'B', name: 'Receptura B' };
  }

  private generateVerdict(
    recipeA: any,
    recipeB: any,
    winner: any,
    diffs: any,
  ): string {
    const parts: string[] = [];
    parts.push(`WERDYKT EKSPERTA AI`);
    parts.push(`==================`);
    parts.push('');
    parts.push(`Zwycięska receptura: ${winner.name}`);
    parts.push('');
    parts.push('UZASADNIENIE:');
    parts.push('');

    if (Math.abs(diffs.cost) > 50) {
      parts.push(`• RÓŻNICA KOSZTOWA: ${Math.abs(diffs.cost).toFixed(2)} PLN/tona`);
      if (diffs.cost > 0) {
        parts.push(`  Receptura B jest droższa. Jeśli różnica w FCR nie rekompensuje kosztu, A jest lepsza ekonomicznie.`);
      } else {
        parts.push(`  Receptura A jest droższa. Musi oferować znacząco lepsze parametry produkcyjne.`);
      }
    }

    if (Math.abs(diffs.fcr) > 0.03) {
      parts.push(`• FCR: Różnica ${Math.abs(diffs.fcr).toFixed(3)}`);
      if (diffs.fcr < 0) {
        parts.push(`  Receptura A ma lepszy FCR. Przy rzucie 10 000 indyków i 15 kg przyrostu = oszczędność ${Math.abs(diffs.fcr * 150000).toFixed(0)} kg paszy.`);
      }
    }

    if (Math.abs(diffs.adg) > 2) {
      parts.push(`• ADG: Różnica ${Math.abs(diffs.adg).toFixed(1)} g/dzień`);
      parts.push(`  Przy 120 dniach tuczu = różnica ${Math.abs(diffs.adg * 120 / 1000).toFixed(2)} kg wagi końcowej.`);
    }

    if (Math.abs(diffs.epef) > 20) {
      parts.push(`• EPEF: Różnica ${Math.abs(diffs.epef).toFixed(1)}`);
      parts.push(`  Wyższy EPEF oznacza lepszą efektywność produkcji (szybszy wzrost + lepszy FCR).`);
    }

    parts.push('');
    parts.push('REKOMENDACJA:');
    if (winner.id === 'A') {
      parts.push(`Zastosuj recepturę ${recipeA.name} jako główną. Recepturę ${recipeB.name} zachowaj jako alternatywę przy zmianie dostępności surowców.`);
    } else {
      parts.push(`Zastosuj recepturę ${recipeB.name} jako główną. Wyższy koskt jest rekompensowany lepszymi wskaźnikami produkcyjnymi.`);
    }

    return parts.join('\n');
  }

  private generateRecommendations(
    winner: any,
    recipeA: any,
    recipeB: any,
    diffs: any,
  ): string[] {
    const recs: string[] = [];

    if (winner.id === 'A') {
      recs.push(`Ustaw recepturę ${recipeA.name} jako domyślną dla tej fazy.`);
      recs.push(`Recepturę ${recipeB.name} wykorzystaj w przypadku braku dostępności kluczowych surowców.`);
    } else {
      recs.push(`Ustaw recepturę ${recipeB.name} jako domyślną dla tej fazy.`);
      recs.push(`Monitoruj FCR w pierwszych 2 tygodniach — jeśli będzie wyższy niż ${(diffs.fcr + 0.05).toFixed(3)}, wróć do receptury ${recipeA.name}.`);
    }

    if (Math.abs(diffs.cost) > 100) {
      recs.push(`Różnica kosztowa > 100 PLN/tona wymaga zgody kierownika produkcji.`);
    }

    recs.push('Przeprowadź test A/B na dwóch halach przed pełnym wdrożeniem.');

    return recs;
  }

  private compareNutrition(a: Record<string, number>, b: Record<string, number>): Array<any> {
    const keys = ['meTurkey', 'crudeProtein', 'crudeFat', 'crudeFiber', 'lysine', 'methionine', 'calcium', 'sodium'];
    const units: Record<string, string> = {
      meTurkey: 'kcal/kg', crudeProtein: '%', crudeFat: '%', crudeFiber: '%',
      lysine: '%', methionine: '%', calcium: '%', sodium: '%',
    };

    return keys.map(key => {
      const valA = a[key] || 0;
      const valB = b[key] || 0;
      const diff = valB - valA;
      let advantage = 'NONE';

      if (key === 'meTurkey' || key === 'crudeProtein' || key === 'lysine') {
        advantage = diff > 0.1 ? 'B' : diff < -0.1 ? 'A' : 'NONE';
      } else if (key === 'crudeFiber' || key === 'sodium') {
        advantage = diff < -0.05 ? 'B' : diff > 0.05 ? 'A' : 'NONE'; // Mniej = lepiej
      }

      return {
        parameter: key,
        recipeA: valA,
        recipeB: valB,
        difference: Number(diff.toFixed(4)),
        unit: units[key] || '%',
        advantage,
      };
    });
  }

  private compareIngredients(a: any[], b: any[]): Array<any> {
    const allMaterials = new Set([
      ...a.map(i => i.rawMaterial.name),
      ...b.map(i => i.rawMaterial.name),
    ]);

    return Array.from(allMaterials).map(name => {
      const inA = a.find(i => i.rawMaterial.name === name);
      const inB = b.find(i => i.rawMaterial.name === name);

      let aiComment = '';
      if (inA && !inB) {
        aiComment = `${name} występuje tylko w recepturze A (${inA.percentage}%). ${this.explainIngredientRole(inA.rawMaterial)}`;
      } else if (!inA && inB) {
        aiComment = `${name} występuje tylko w recepturze B (${inB.percentage}%). ${this.explainIngredientRole(inB.rawMaterial)}`;
      } else if (inA && inB) {
        const diff = Number(inB.percentage) - Number(inA.percentage);
        aiComment = `${name}: A=${inA.percentage}%, B=${inB.percentage}%. ${diff > 0 ? 'B zawiera więcej.' : 'A zawiera więcej.'}`;
      }

      return {
        materialName: name,
        inRecipeA: !!inA,
        inRecipeB: !!inB,
        percentageA: inA ? Number(inA.percentage) : undefined,
        percentageB: inB ? Number(inB.percentage) : undefined,
        aiComment,
      };
    });
  }

  private explainIngredientRole(material: any): string {
    if (material.meTurkey > 3200) return 'Główne źródło energii.';
    if (material.crudeProtein > 35) return 'Główne źródło białka.';
    if (material.category === 'MINERAL') return 'Źródło minerałów.';
    if (material.category === 'VITAMIN') return 'Dodatek witaminowy.';
    return 'Składnik uzupełniający.';
  }
}
