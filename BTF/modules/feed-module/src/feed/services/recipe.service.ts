import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  Recipe, RecipeIngredient, NutritionalStandard, RawMaterial, 
  Prisma, ValidationStatus, AlertType, AlertSeverity 
} from '@prisma/client';
import { CreateRecipeDto, UpdateRecipeDto, GenerateRecipeDto, RecipeResponseDto } from '../dto/recipe.dto';
import { IRecipeNutrition, IOptimizationConstraints, IAIExplanation } from '../interfaces/feed.interfaces';
import { AlertService } from './alert.service';
import { OptimizationService } from './optimization.service';
import { AIService } from './ai.service';

@Injectable()
export class RecipeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertService: AlertService,
    private readonly optimizationService: OptimizationService,
    private readonly aiService: AIService,
  ) {}

  // ============================================================
  // CRUD
  // ============================================================

  async create(userId: string, dto: CreateRecipeDto): Promise<RecipeResponseDto> {
    const standard = await this.prisma.nutritionalStandard.findUnique({
      where: { id: dto.standardId },
    });
    if (!standard) throw new NotFoundException('Norma żywieniowa nie istnieje');

    // Walidacja sumy procentów
    const totalPercentage = dto.ingredients.reduce((sum, ing) => sum + Number(ing.percentage), 0);
    if (Math.abs(totalPercentage - 100) > 0.1) {
      throw new BadRequestException(`Suma procentów musi wynosić 100%. Aktualnie: ${totalPercentage}%`);
    }

    // Pobierz surowce
    const materialIds = dto.ingredients.map(i => i.rawMaterialId);
    const materials = await this.prisma.rawMaterial.findMany({
      where: { id: { in: materialIds } },
    });
    const materialMap = new Map(materials.map(m => [m.id, m]));

    // Oblicz wartości odżywcze
    const calculatedNutrition = this.calculateRecipeNutrition(dto.ingredients, materialMap);
    const costPerTon = this.calculateRecipeCost(dto.ingredients, materialMap);

    // Walidacja przeciwko normie
    const validation = this.validateAgainstStandard(calculatedNutrition, standard);

    // Generuj ostrzeżenia
    const warnings = await this.generateWarnings(calculatedNutrition, standard, dto.ingredients, materialMap);

    const recipe = await this.prisma.recipe.create({
      data: {
        name: dto.name,
        code: dto.code,
        standardId: dto.standardId,
        targetAgeDays: dto.targetAgeDays,
        targetGender: dto.targetGender,
        targetProductionType: dto.targetProductionType,
        costPerTon: new Prisma.Decimal(costPerTon),
        costPerKg: new Prisma.Decimal(costPerTon / 1000),
        calculatedNutrition: calculatedNutrition as any,
        validationStatus: validation.isValid ? ValidationStatus.VALID : ValidationStatus.INVALID,
        validationErrors: validation.errors as any,
        warnings: warnings as any,
        optimizationTarget: dto.optimizationTarget || 'BALANCED',
        createdBy: userId,
        updatedBy: userId,
        ingredients: {
          create: dto.ingredients.map(ing => {
            const mat = materialMap.get(ing.rawMaterialId);
            return {
              rawMaterialId: ing.rawMaterialId,
              percentage: new Prisma.Decimal(ing.percentage),
              quantityKg: new Prisma.Decimal(ing.percentage * 10), // kg na tonę
              costPerTon: new Prisma.Decimal((Number(mat?.costPerTon) || 0) * (ing.percentage / 100) * 10),
              mixingOrder: ing.mixingOrder || 0,
            };
          }),
        },
      },
      include: {
        standard: { select: { id: true, name: true, phase: true } },
        ingredients: {
          include: {
            rawMaterial: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    // Zapisz historię
    await this.saveHistory(recipe.id, 'CREATE', 'Utworzenie receptury', userId, null, recipe);

    return this.mapToResponseDto(recipe);
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.RecipeWhereInput;
    orderBy?: Prisma.RecipeOrderByWithRelationInput;
  }): Promise<RecipeResponseDto[]> {
    const { skip, take, where, orderBy } = params;
    const recipes = await this.prisma.recipe.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        standard: { select: { id: true, name: true, phase: true } },
        ingredients: {
          include: {
            rawMaterial: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });
    return recipes.map(r => this.mapToResponseDto(r));
  }

  async findOne(id: string): Promise<RecipeResponseDto> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: {
        standard: { select: { id: true, name: true, phase: true } },
        ingredients: {
          include: {
            rawMaterial: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });
    if (!recipe) throw new NotFoundException('Receptura nie istnieje');
    return this.mapToResponseDto(recipe);
  }

  async update(id: string, userId: string, dto: UpdateRecipeDto): Promise<RecipeResponseDto> {
    const existing = await this.prisma.recipe.findUnique({
      where: { id },
      include: { ingredients: true, standard: true },
    });
    if (!existing) throw new NotFoundException('Receptura nie istnieje');

    if (dto.ingredients) {
      const totalPercentage = dto.ingredients.reduce((sum, ing) => sum + Number(ing.percentage), 0);
      if (Math.abs(totalPercentage - 100) > 0.1) {
        throw new BadRequestException(`Suma procentów musi wynosić 100%. Aktualnie: ${totalPercentage}%`);
      }
    }

    // Aktualizacja z wersjonowaniem
    const newVersion = existing.version + 1;

    const updated = await this.prisma.recipe.update({
      where: { id },
      data: {
        name: dto.name,
        version: newVersion,
        updatedBy: userId,
        ...(dto.ingredients && {
          ingredients: {
            deleteMany: {},
            create: dto.ingredients.map(ing => ({
              rawMaterialId: ing.rawMaterialId,
              percentage: new Prisma.Decimal(ing.percentage),
              quantityKg: new Prisma.Decimal(ing.percentage * 10),
              mixingOrder: ing.mixingOrder || 0,
            })),
          },
        }),
      },
      include: {
        standard: { select: { id: true, name: true, phase: true } },
        ingredients: {
          include: {
            rawMaterial: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    // Przelicz wartości odżywcze
    if (dto.ingredients) {
      await this.recalculateRecipe(id);
    }

    await this.saveHistory(id, 'UPDATE', `Aktualizacja receptury do wersji ${newVersion}`, userId, existing, updated);

    return this.findOne(id);
  }

  async delete(id: string, userId: string): Promise<void> {
    const recipe = await this.prisma.recipe.findUnique({ where: { id } });
    if (!recipe) throw new NotFoundException('Receptura nie istnieje');

    await this.saveHistory(id, 'DELETE', 'Usunięcie receptury', userId, recipe, null);
    await this.prisma.recipe.delete({ where: { id } });
  }

  // ============================================================
  // GENERATOR AI
  // ============================================================

  async generateRecipe(userId: string, dto: GenerateRecipeDto): Promise<RecipeResponseDto> {
    // Znajdź normę
    const standard = await this.prisma.nutritionalStandard.findFirst({
      where: {
        gender: dto.gender,
        productionType: dto.productionType,
        phase: dto.phase,
        isActive: true,
        ageFromDays: { lte: dto.ageDays },
        ageToDays: { gte: dto.ageDays },
      },
    });
    if (!standard) throw new NotFoundException('Brak aktywnej normy żywieniowej dla podanych parametrów');

    // Pobierz dostępne surowce
    const where: Prisma.RawMaterialWhereInput = { status: 'ACTIVE' };
    if (dto.availableMaterials?.length) {
      where.id = { in: dto.availableMaterials };
    }
    if (dto.excludedMaterials?.length) {
      where.id = { ...((where.id as any) || {}), notIn: dto.excludedMaterials };
    }

    const materials = await this.prisma.rawMaterial.findMany({ where });
    if (materials.length < 3) {
      throw new BadRequestException('Za mało dostępnych surowców do wygenerowania receptury (minimum 3)');
    }

    // Optymalizacja
    const constraints: IOptimizationConstraints = {
      maxCostPerTon: dto.maxCostPerTon,
      availableMaterials: dto.availableMaterials,
      excludedMaterials: dto.excludedMaterials,
      priority: dto.priority || 'balanced',
    };

    const optimizedIngredients = await this.optimizationService.optimizeRecipe(
      materials,
      standard,
      constraints,
    );

    // Utwórz recepturę
    const createDto: CreateRecipeDto = {
      name: `AI ${standard.name} - ${new Date().toISOString().split('T')[0]}`,
      code: `AI-${Date.now()}`,
      standardId: standard.id,
      targetAgeDays: dto.ageDays,
      targetGender: dto.gender,
      targetProductionType: dto.productionType,
      ingredients: optimizedIngredients,
      optimizationTarget: dto.priority || 'BALANCED',
    };

    const recipe = await this.create(userId, createDto);

    // Generuj wyjaśnienia AI
    const explanations = await this.aiService.explainRecipe(recipe, materials, standard);
    await this.updateAIExplanations(recipe.id, explanations);

    return this.findOne(recipe.id);
  }

  // ============================================================
  // SYMULATOR
  // ============================================================

  async simulateChange(recipeId: string, ingredientId: string, percentageChange: number) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: { include: { rawMaterial: true } },
        standard: true,
      },
    });
    if (!recipe) throw new NotFoundException('Receptura nie istnieje');

    const ingredient = recipe.ingredients.find(i => i.id === ingredientId);
    if (!ingredient) throw new NotFoundException('Składnik nie istnieje w recepturze');

    // Symulacja zmiany
    const currentPercentage = Number(ingredient.percentage);
    const newPercentage = Math.max(0, Math.min(100, currentPercentage + percentageChange));
    const delta = newPercentage - currentPercentage;

    // Przeskaluj inne składniki proporcjonalnie
    const otherIngredients = recipe.ingredients.filter(i => i.id !== ingredientId);
    const otherTotal = otherIngredients.reduce((sum, i) => sum + Number(i.percentage), 0);
    const scaleFactor = otherTotal > 0 ? (100 - newPercentage) / otherTotal : 0;

    const simulatedIngredients = otherIngredients.map(i => ({
      rawMaterialId: i.rawMaterialId,
      percentage: Number(i.percentage) * scaleFactor,
    }));
    simulatedIngredients.push({
      rawMaterialId: ingredient.rawMaterialId,
      percentage: newPercentage,
    });

    // Oblicz nowe wartości
    const materialMap = new Map(recipe.ingredients.map(i => [i.rawMaterialId, i.rawMaterial]));
    const currentNutrition = this.calculateRecipeNutrition(
      recipe.ingredients.map(i => ({ rawMaterialId: i.rawMaterialId, percentage: Number(i.percentage) })),
      materialMap,
    );
    const newNutrition = this.calculateRecipeNutrition(simulatedIngredients, materialMap);

    // Oblicz koszty
    const currentCost = this.calculateRecipeCost(
      recipe.ingredients.map(i => ({ rawMaterialId: i.rawMaterialId, percentage: Number(i.percentage) })),
      materialMap,
    );
    const newCost = this.calculateRecipeCost(simulatedIngredients, materialMap);

    // Generuj analizę wpływu
    const impacts = this.aiService.simulateImpact(
      ingredient.rawMaterial,
      delta,
      currentNutrition,
      newNutrition,
      recipe.standard as NutritionalStandard,
    );

    return {
      ingredient: {
        name: ingredient.rawMaterial.name,
        currentPercentage,
        newPercentage,
        change: delta,
      },
      nutritionChanges: this.compareNutrition(currentNutrition, newNutrition),
      costChange: {
        current: currentCost,
        new: newCost,
        difference: newCost - currentCost,
        percentageChange: ((newCost - currentCost) / currentCost) * 100,
      },
      impacts,
      warnings: this.generateSimulationWarnings(newNutrition, recipe.standard as NutritionalStandard, ingredient.rawMaterial, delta),
    };
  }

  // ============================================================
  // OBLICZENIA I WALIDACJA
  // ============================================================

  private calculateRecipeNutrition(
    ingredients: Array<{ rawMaterialId: string; percentage: number }>,
    materialMap: Map<string, RawMaterial>,
  ): IRecipeNutrition {
    const result: Partial<IRecipeNutrition> = {};
    const fields: (keyof RawMaterial)[] = [
      'meTurkey', 'crudeProtein', 'crudeFat', 'crudeFiber', 'crudeAsh',
      'starch', 'sugars', 'calcium', 'totalPhosphorus', 'digestiblePhosphorus',
      'sodium', 'chloride', 'potassium', 'magnesium', 'lysine', 'methionine',
      'cystine', 'metCys', 'threonine', 'tryptophan', 'arginine', 'valine',
      'isoleucine', 'leucine', 'histidine', 'phenylalanine', 'glycine', 'serine',
    ];

    for (const field of fields) {
      let value = 0;
      for (const ing of ingredients) {
        const mat = materialMap.get(ing.rawMaterialId);
        if (mat && mat[field] !== null) {
          value += Number(mat[field]) * (ing.percentage / 100);
        }
      }
      result[field as keyof IRecipeNutrition] = Number(value.toFixed(4));
    }

    // Oblicz stosunki
    const ca = result.calcium || 0;
    const totalP = result.totalPhosphorus || 0;
    const digestP = result.digestiblePhosphorus || 0;
    result.caToTotalP = totalP > 0 ? Number((ca / totalP).toFixed(2)) : 0;
    result.caToDigestibleP = digestP > 0 ? Number((ca / digestP).toFixed(2)) : 0;

    // Elektrolity (mEq/kg) - uproszczone obliczenia
    const na = result.sodium || 0;
    const k = result.potassium || 0;
    const cl = result.chloride || 0;
    result.sodiumMeq = Number((na * 435).toFixed(2)); // Na: 1% = 435 mEq/kg
    result.potassiumMeq = Number((k * 255).toFixed(2)); // K: 1% = 255 mEq/kg
    result.chlorideMeq = Number((cl * 282).toFixed(2)); // Cl: 1% = 282 mEq/kg

    return result as IRecipeNutrition;
  }

  private calculateRecipeCost(
    ingredients: Array<{ rawMaterialId: string; percentage: number }>,
    materialMap: Map<string, RawMaterial>,
  ): number {
    let cost = 0;
    for (const ing of ingredients) {
      const mat = materialMap.get(ing.rawMaterialId);
      if (mat) {
        cost += Number(mat.costPerTon) * (ing.percentage / 100);
      }
    }
    return Number(cost.toFixed(2));
  }

  private validateAgainstStandard(
    nutrition: IRecipeNutrition,
    standard: NutritionalStandard,
  ): { isValid: boolean; errors: Array<{ parameter: string; message: string; actual: number; expected: string }> } {
    const errors = [];

    const checks = [
      { param: 'me', actual: nutrition.meTurkey, min: Number(standard.meMin), max: Number(standard.meMax), unit: 'kcal/kg' },
      { param: 'crudeProtein', actual: nutrition.crudeProtein, min: Number(standard.crudeProteinMin), max: Number(standard.crudeProteinMax), unit: '%' },
      { param: 'lysine', actual: nutrition.lysine, min: Number(standard.lysineMin), max: standard.lysineMax ? Number(standard.lysineMax) : Infinity, unit: '%' },
      { param: 'methionine', actual: nutrition.methionine, min: Number(standard.methionineMin), unit: '%' },
      { param: 'metCys', actual: nutrition.metCys, min: Number(standard.metCysMin), unit: '%' },
      { param: 'threonine', actual: nutrition.threonine, min: Number(standard.threonineMin), unit: '%' },
      { param: 'tryptophan', actual: nutrition.tryptophan, min: Number(standard.tryptophanMin), unit: '%' },
      { param: 'calcium', actual: nutrition.calcium, min: Number(standard.calciumMin), max: Number(standard.calciumMax), unit: '%' },
      { param: 'totalPhosphorus', actual: nutrition.totalPhosphorus, min: Number(standard.totalPhosphorusMin), max: Number(standard.totalPhosphorusMax), unit: '%' },
      { param: 'digestiblePhosphorus', actual: nutrition.digestiblePhosphorus, min: Number(standard.digestiblePhosphorusMin), unit: '%' },
      { param: 'sodium', actual: nutrition.sodium, min: Number(standard.sodiumMin), max: Number(standard.sodiumMax), unit: '%' },
    ];

    for (const check of checks) {
      if (check.actual < check.min) {
        errors.push({
          parameter: check.param,
          message: `${check.param} poniżej minimum`,
          actual: check.actual,
          expected: `>= ${check.min} ${check.unit}`,
        });
      }
      if (check.max !== undefined && check.actual > check.max) {
        errors.push({
          parameter: check.param,
          message: `${check.param} powyżej maksimum`,
          actual: check.actual,
          expected: `<= ${check.max} ${check.unit}`,
        });
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  private async generateWarnings(
    nutrition: IRecipeNutrition,
    standard: NutritionalStandard,
    ingredients: Array<{ rawMaterialId: string; percentage: number }>,
    materialMap: Map<string, RawMaterial>,
  ): Promise<Array<{ parameter: string; message: string; severity: string; consequences: string[] }>> {
    const warnings = [];

    // Ostrzeżenie o sodzie
    if (nutrition.sodium > Number(standard.sodiumMax) * 0.9) {
      warnings.push({
        parameter: 'sodium',
        message: `Zawartość sodu (${nutrition.sodium}%) zbliża się do górnego limitu (${standard.sodiumMax}%).`,
        severity: 'warning',
        consequences: [
          'Może wzrosnąć pobór wody',
          'Może pogorszyć się jakość ściółki',
          'Może zwiększyć się poziom amoniaku w hali',
          'Ryzyko biegunki i problemów z jelitami',
        ],
      });
    }

    // Ostrzeżenie o włóknie
    if (nutrition.crudeFiber > Number(standard.crudeFiberMax) * 0.85) {
      warnings.push({
        parameter: 'crudeFiber',
        message: `Wysoka zawartość włókna (${nutrition.crudeFiber}%) może obniżyć wartość energetyczną paszy.`,
        severity: 'warning',
        consequences: [
          'Spadek wartości energetycznej (ME)',
          'Możliwy wzrost FCR',
          'Spadek ADG',
        ],
      });
    }

    // Ostrzeżenie o stosunku Ca:P
    if (standard.caToTotalPMin && nutrition.caToTotalP < Number(standard.caToTotalPMin)) {
      warnings.push({
        parameter: 'caToTotalP',
        message: `Stosunek Ca:P (${nutrition.caToTotalP}) poniżej minimum (${standard.caToTotalPMin}).`,
        severity: 'critical',
        consequences: [
          'Ryzyko niedoboru wapnia',
          'Słabsza mineralizacja kości',
          'Problemy z nogami',
        ],
      });
    }

    // Sprawdź mykotoksyny
    let totalAflatoxin = 0;
    for (const ing of ingredients) {
      const mat = materialMap.get(ing.rawMaterialId);
      if (mat?.aflatoxinB1) {
        totalAflatoxin += Number(mat.aflatoxinB1) * (ing.percentage / 100);
      }
    }
    if (standard.aflatoxinB1Max && totalAflatoxin > Number(standard.aflatoxinB1Max)) {
      warnings.push({
        parameter: 'aflatoxinB1',
        message: `Poziom aflatoksyny B1 (${totalAflatoxin.toFixed(2)} ppb) przekracza limit (${standard.aflatoxinB1Max} ppb).`,
        severity: 'emergency',
        consequences: [
          'Wysokie ryzyko hepatotoksyczności',
          'Spadek odporności',
          'Możliwy wzrost śmiertelności',
          'Konieczność dodania adsorbenta mykotoksyn',
        ],
      });
    }

    return warnings;
  }

  private compareNutrition(current: IRecipeNutrition, new_: IRecipeNutrition) {
    const changes = [];
    const keys = Object.keys(current) as (keyof IRecipeNutrition)[];
    for (const key of keys) {
      const diff = (new_[key] || 0) - (current[key] || 0);
      if (Math.abs(diff) > 0.001) {
        changes.push({
          parameter: key,
          current: current[key],
          new: new_[key],
          difference: Number(diff.toFixed(4)),
          unit: this.getUnitForParameter(key),
        });
      }
    }
    return changes;
  }

  private getUnitForParameter(param: string): string {
    const units: Record<string, string> = {
      meTurkey: 'kcal/kg', crudeProtein: '%', crudeFat: '%', crudeFiber: '%',
      calcium: '%', totalPhosphorus: '%', digestiblePhosphorus: '%',
      sodium: '%', lysine: '%', methionine: '%', metCys: '%',
    };
    return units[param] || '%';
  }

  private generateSimulationWarnings(
    nutrition: IRecipeNutrition,
    standard: NutritionalStandard,
    changedMaterial: RawMaterial,
    delta: number,
  ) {
    const warnings = [];

    if (changedMaterial.category === 'OILS_FATS' && delta > 0) {
      warnings.push({
        type: 'fat_increase',
        message: `Wzrost tłuszczu o ${delta}% zwiększa ryzyko otłuszczenia tuszy.`,
        recommendation: 'Monitoruj jakość tuszy i wskaźnik EPEF.',
      });
    }

    if (nutrition.sodium > Number(standard.sodiumMax)) {
      warnings.push({
        type: 'sodium_excess',
        message: 'Przekroczono maksymalny poziom sodu.',
        recommendation: 'Zmniejsz udział surowców wysokosodowych lub dodaj więcej wody pitnej.',
      });
    }

    return warnings;
  }

  // ============================================================
  // AI & EXPLANATIONS
  // ============================================================

  private async updateAIExplanations(recipeId: string, explanations: IAIExplanation[]) {
    for (const exp of explanations) {
      await this.prisma.recipeIngredient.updateMany({
        where: { recipeId, rawMaterialId: exp.ingredientId },
        data: {
          aiExplanation: exp.reasoning,
          aiImpactFcr: new Prisma.Decimal(exp.impact.fcr),
          aiImpactAdg: new Prisma.Decimal(exp.impact.adg),
          aiImpactMortality: new Prisma.Decimal(exp.impact.mortality),
          aiImpactGutHealth: new Prisma.Decimal(exp.impact.gutHealth),
          aiImpactImmunity: new Prisma.Decimal(exp.impact.immunity),
          aiImpactLitter: new Prisma.Decimal(exp.impact.litterQuality),
          aiImpactLegs: new Prisma.Decimal(exp.impact.legQuality),
          aiImpactWater: new Prisma.Decimal(exp.impact.waterConsumption),
          aiImpactCost: new Prisma.Decimal(exp.impact.costImpact),
          alternatives: exp.alternatives as any,
        },
      });
    }

    await this.prisma.recipe.update({
      where: { id: recipeId },
      data: {
        aiReasoning: explanations.map(e => e.reasoning).join('\n\n'),
      },
    });
  }

  // ============================================================
  // HISTORIA
  // ============================================================

  private async saveHistory(
    recipeId: string,
    changeType: 'CREATE' | 'UPDATE' | 'OPTIMIZE' | 'DELETE',
    summary: string,
    userId: string,
    previous: any,
    current: any,
  ) {
    await this.prisma.recipeHistory.create({
      data: {
        recipeId,
        version: current?.version || previous?.version || 1,
        changeType,
        changesSummary: summary,
        diff: this.calculateDiff(previous, current),
        previousValues: previous,
        newValues: current,
        changedBy: userId,
      },
    });
  }

  private calculateDiff(prev: any, curr: any): any {
    if (!prev || !curr) return {};
    const diff: any = {};
    const keys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
    for (const key of keys) {
      if (JSON.stringify(prev[key]) !== JSON.stringify(curr[key])) {
        diff[key] = { from: prev[key], to: curr[key] };
      }
    }
    return diff;
  }

  private async recalculateRecipe(recipeId: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { ingredients: { include: { rawMaterial: true } }, standard: true },
    });
    if (!recipe) return;

    const materialMap = new Map(recipe.ingredients.map(i => [i.rawMaterialId, i.rawMaterial]));
    const ingredients = recipe.ingredients.map(i => ({
      rawMaterialId: i.rawMaterialId,
      percentage: Number(i.percentage),
    }));

    const nutrition = this.calculateRecipeNutrition(ingredients, materialMap);
    const cost = this.calculateRecipeCost(ingredients, materialMap);
    const validation = this.validateAgainstStandard(nutrition, recipe.standard as NutritionalStandard);
    const warnings = await this.generateWarnings(nutrition, recipe.standard as NutritionalStandard, ingredients, materialMap);

    await this.prisma.recipe.update({
      where: { id: recipeId },
      data: {
        calculatedNutrition: nutrition as any,
        costPerTon: new Prisma.Decimal(cost),
        costPerKg: new Prisma.Decimal(cost / 1000),
        validationStatus: validation.isValid ? ValidationStatus.VALID : ValidationStatus.INVALID,
        validationErrors: validation.errors as any,
        warnings: warnings as any,
      },
    });
  }

  // ============================================================
  // MAPPER
  // ============================================================

  private mapToResponseDto(recipe: any): RecipeResponseDto {
    return {
      id: recipe.id,
      name: recipe.name,
      code: recipe.code,
      version: recipe.version,
      standard: recipe.standard,
      targetAgeDays: recipe.targetAgeDays,
      targetGender: recipe.targetGender,
      ingredients: recipe.ingredients.map((ing: any) => ({
        id: ing.id,
        rawMaterial: ing.rawMaterial,
        percentage: Number(ing.percentage),
        quantityKg: Number(ing.quantityKg),
        costPerTon: Number(ing.costPerTon),
        aiExplanation: ing.aiExplanation,
        aiImpact: ing.aiImpactFcr ? {
          fcr: Number(ing.aiImpactFcr),
          adg: Number(ing.aiImpactAdg),
          gutHealth: Number(ing.aiImpactGutHealth),
          immunity: Number(ing.aiImpactImmunity),
          litterQuality: Number(ing.aiImpactLitter),
          legQuality: Number(ing.aiImpactLegs),
          waterConsumption: Number(ing.aiImpactWater),
          costImpact: Number(ing.aiImpactCost),
        } : undefined,
      })),
      calculatedNutrition: recipe.calculatedNutrition as Record<string, number>,
      costPerTon: Number(recipe.costPerTon),
      costPerKg: Number(recipe.costPerKg),
      aiConfidence: recipe.aiConfidence ? Number(recipe.aiConfidence) : undefined,
      aiReasoning: recipe.aiReasoning || undefined,
      validationStatus: recipe.validationStatus,
      warnings: recipe.warnings as any,
      isProductionReady: recipe.isProductionReady,
      createdBy: recipe.createdBy,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
    };
  }
}
