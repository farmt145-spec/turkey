import { Injectable } from '@nestjs/common';
import { RawMaterial, NutritionalStandard } from '@prisma/client';
import { IOptimizationConstraints } from '../interfaces/feed.interfaces';

interface OptimizedIngredient {
  rawMaterialId: string;
  percentage: number;
}

@Injectable()
export class OptimizationService {

  async optimizeRecipe(
    materials: RawMaterial[],
    standard: NutritionalStandard,
    constraints: IOptimizationConstraints,
  ): Promise<OptimizedIngredient[]> {
    // Filtrowanie surowców
    let available = materials.filter(m => 
      m.status === 'ACTIVE' &&
      !constraints.excludedMaterials?.includes(m.id)
    );

    if (constraints.availableMaterials?.length) {
      available = available.filter(m => constraints.availableMaterials?.includes(m.id));
    }

    // Priorytet optymalizacji
    switch (constraints.priority) {
      case 'cost':
        return this.optimizeForCost(available, standard, constraints);
      case 'fcr':
        return this.optimizeForFcr(available, standard, constraints);
      case 'adg':
        return this.optimizeForAdg(available, standard, constraints);
      case 'health':
        return this.optimizeForHealth(available, standard, constraints);
      case 'balanced':
      default:
        return this.optimizeBalanced(available, standard, constraints);
    }
  }

  private optimizeForCost(
    materials: RawMaterial[],
    standard: NutritionalStandard,
    constraints: IOptimizationConstraints,
  ): OptimizedIngredient[] {
    // Sortuj po cenie rosnąco
    const sorted = [...materials].sort((a, b) => Number(a.costPerTon) - Number(b.costPerTon));

    const ingredients: OptimizedIngredient[] = [];
    let remaining = 100;

    // Zapewnij minimum dla każdego surowca (jeśli zdefiniowane)
    for (const mat of sorted) {
      const min = Number(mat.minInclusion) || 0;
      if (min > 0 && remaining >= min) {
        ingredients.push({ rawMaterialId: mat.id, percentage: min });
        remaining -= min;
      }
    }

    // Dodawaj od najtańszego
    for (const mat of sorted) {
      if (remaining <= 0) break;
      const existing = ingredients.find(i => i.rawMaterialId === mat.id);
      const current = existing ? existing.percentage : 0;
      const max = Math.min(Number(mat.maxInclusion), remaining + current);
      const add = max - current;

      if (add > 0) {
        if (existing) {
          existing.percentage += add;
        } else {
          ingredients.push({ rawMaterialId: mat.id, percentage: add });
        }
        remaining -= add;
      }
    }

    // Normalizacja do 100%
    const total = ingredients.reduce((sum, i) => sum + i.percentage, 0);
    if (total > 0) {
      for (const ing of ingredients) {
        ing.percentage = Number(((ing.percentage / total) * 100).toFixed(3));
      }
    }

    return ingredients;
  }

  private optimizeForFcr(
    materials: RawMaterial[],
    standard: NutritionalStandard,
    constraints: IOptimizationConstraints,
  ): OptimizedIngredient[] {
    // Sortuj po ME malejąco, a następnie po włóknie rosnąco
    const sorted = [...materials].sort((a, b) => {
      const meDiff = Number(b.meTurkey) - Number(a.meTurkey);
      if (Math.abs(meDiff) > 50) return meDiff;
      return Number(a.crudeFiber) - Number(b.crudeFiber);
    });

    return this.buildRecipeFromPriority(sorted, standard, constraints);
  }

  private optimizeForAdg(
    materials: RawMaterial[],
    standard: NutritionalStandard,
    constraints: IOptimizationConstraints,
  ): OptimizedIngredient[] {
    // Sortuj po białku i lizynie malejąco
    const sorted = [...materials].sort((a, b) => {
      const proteinDiff = Number(b.crudeProtein) - Number(a.crudeProtein);
      if (Math.abs(proteinDiff) > 2) return proteinDiff;
      return Number(b.lysine) - Number(a.lysine);
    });

    return this.buildRecipeFromPriority(sorted, standard, constraints);
  }

  private optimizeForHealth(
    materials: RawMaterial[],
    standard: NutritionalStandard,
    constraints: IOptimizationConstraints,
  ): OptimizedIngredient[] {
    // Priorytet: niskie mykotoksyny, odpowiednie włókno, dobre witaminy
    const scored = materials.map(m => {
      let score = 100;
      if (m.aflatoxinB1) score -= Number(m.aflatoxinB1) * 0.1;
      if (m.deoxynivalenol) score -= Number(m.deoxynivalenol) * 0.01;
      score += Number(m.vitaminE) * 0.5;
      score += Number(m.zinc) * 0.1;
      return { material: m, score };
    });

    const sorted = scored.sort((a, b) => b.score - a.score).map(s => s.material);
    return this.buildRecipeFromPriority(sorted, standard, constraints);
  }

  private optimizeBalanced(
    materials: RawMaterial[],
    standard: NutritionalStandard,
    constraints: IOptimizationConstraints,
  ): OptimizedIngredient[] {
    // Algorytm hybrydowy: ważony scoring
    const scored = materials.map(m => {
      let score = 0;

      // Energia (25%)
      score += (Number(m.meTurkey) / 3500) * 25;

      // Białko (20%)
      score += (Number(m.crudeProtein) / 50) * 20;

      // Aminokwasy (20%)
      score += (Number(m.lysine) / 3) * 10;
      score += (Number(m.metCys) / 2) * 10;

      // Koszt (15%) - niższy = lepszy
      const avgCost = 1500;
      score += Math.max(0, (avgCost - Number(m.costPerTon)) / avgCost) * 15;

      // Zdrowie (10%)
      score += (Number(m.vitaminE) / 50) * 5;
      score += (Number(m.zinc) / 100) * 5;

      // Strawność (10%)
      score += (1 - Number(m.crudeFiber) / 15) * 10;

      return { material: m, score };
    });

    const sorted = scored.sort((a, b) => b.score - a.score).map(s => s.material);
    return this.buildRecipeFromPriority(sorted, standard, constraints);
  }

  private buildRecipeFromPriority(
    sortedMaterials: RawMaterial[],
    standard: NutritionalStandard,
    constraints: IOptimizationConstraints,
  ): OptimizedIngredient[] {
    const ingredients: OptimizedIngredient[] = [];
    let remaining = 100;

    // Zapewnij minimum
    for (const mat of sortedMaterials) {
      const min = Number(mat.minInclusion) || 0;
      if (min > 0 && remaining >= min) {
        ingredients.push({ rawMaterialId: mat.id, percentage: min });
        remaining -= min;
      }
    }

    // Dodawaj według priorytetu
    for (const mat of sortedMaterials) {
      if (remaining <= 0.1) break;

      const existing = ingredients.find(i => i.rawMaterialId === mat.id);
      const current = existing ? existing.percentage : 0;
      const maxAllowed = Math.min(Number(mat.maxInclusion), 100);
      const canAdd = maxAllowed - current;
      const add = Math.min(canAdd, remaining);

      if (add > 0.1) {
        if (existing) {
          existing.percentage += add;
        } else {
          ingredients.push({ rawMaterialId: mat.id, percentage: add });
        }
        remaining -= add;
      }
    }

    // Normalizacja
    const total = ingredients.reduce((sum, i) => sum + i.percentage, 0);
    if (total > 0 && Math.abs(total - 100) > 0.1) {
      for (const ing of ingredients) {
        ing.percentage = Number(((ing.percentage / total) * 100).toFixed(3));
      }
    }

    return ingredients;
  }
}
