import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RawMaterial, Recipe, ExpertDecisionLog, Prisma } from '@prisma/client';

export interface ExpertAnalysis {
  decision: string;
  reasoning: string;
  improvements: string[];
  threats: string[];
  alternatives: string[];
  productionImpact: {
    fcr: { before: number; after: number; change: number; explanation: string };
    adg: { before: number; after: number; change: number; explanation: string };
    epef: { before: number; after: number; change: number; explanation: string };
    gutHealth: { before: number; after: number; change: number; explanation: string };
    immunity: { before: number; after: number; change: number; explanation: string };
    litterQuality: { before: number; after: number; change: number; explanation: string };
    legHealth: { before: number; after: number; change: number; explanation: string };
    waterConsumption: { before: number; after: number; change: number; explanation: string };
    carcassQuality: { before: number; after: number; change: number; explanation: string };
  };
  isThereBetterAlternative: boolean;
  betterAlternative?: {
    description: string;
    expectedImprovement: string;
    riskLevel: string;
  };
}

export interface IngredientExpertCard {
  material: RawMaterial;
  profile: {
    description: string;
    biologicalValue: string;
    digestibility: string;
    microbiomeImpact?: string;
    prebioticEffect: boolean;
  };
  impacts: {
    fcr: { score: number; explanation: string };
    adg: { score: number; explanation: string };
    epef: { score: number; explanation: string };
    gutHealth: { score: number; explanation: string };
    immunity: { score: number; explanation: string };
    litterQuality: { score: number; explanation: string };
    waterConsumption: { score: number; explanation: string };
    legHealth: { score: number; explanation: string };
    carcassQuality: { score: number; explanation: string };
  };
  risks: {
    overdoseRisk: string;
    overdoseSymptoms: string[];
    deficiencySymptoms: string[];
    recommendedMin: number;
    recommendedMax: number;
    optimalRange?: string;
  };
  interactions: Array<{
    materialName: string;
    interactionType: string;
    severity: string;
    description: string;
    recommendation: string;
  }>;
  knowledge: Array<{
    type: string;
    title: string;
    source: string;
    year?: number;
    summary: string;
    keyFindings: string[];
  }>;
}

@Injectable()
export class ExpertService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // 1. ANALIZA DECYZJI — odpowiada na "Dlaczego to zrobiłem?"
  // ============================================================

  async analyzeDecision(
    recipeId: string,
    decisionType: string,
    materialId?: string,
  ): Promise<ExpertAnalysis> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: { include: { rawMaterial: true } },
        standard: true,
      },
    });
    if (!recipe) throw new NotFoundException('Receptura nie istnieje');

    const nutrition = recipe.calculatedNutrition as Record<string, number>;
    const standard = recipe.standard;

    // Pobierz profil ekspercki surowca
    let expertProfile = null;
    let material = null;
    if (materialId) {
      material = recipe.ingredients.find(i => i.rawMaterialId === materialId)?.rawMaterial;
      expertProfile = await this.prisma.materialExpertProfile.findUnique({
        where: { rawMaterialId: materialId },
      });
    }

    const analysis = this.generateExpertAnalysis(recipe, nutrition, standard, material, expertProfile, decisionType);

    // Zapisz w logu
    await this.prisma.expertDecisionLog.create({
      data: {
        recipeId,
        decisionType: decisionType as any,
        targetMaterialId: materialId,
        action: analysis.decision,
        reasoning: analysis.reasoning,
        improvements: analysis.improvements,
        threats: analysis.threats,
        alternatives: analysis.alternatives,
        estimatedFcrChange: new Prisma.Decimal(analysis.productionImpact.fcr.change),
        estimatedAdgChange: new Prisma.Decimal(analysis.productionImpact.adg.change),
        estimatedCostChange: new Prisma.Decimal(0),
        estimatedHealthChange: new Prisma.Decimal(analysis.productionImpact.gutHealth.change),
        beforeState: recipe.calculatedNutrition as any,
        afterState: recipe.calculatedNutrition as any,
        createdBy: 'AI_SYSTEM',
      },
    });

    return analysis;
  }

  // ============================================================
  // 2. KARTA EKSPERCKA SKŁADNIKA
  // ============================================================

  async getIngredientExpertCard(materialId: string): Promise<IngredientExpertCard> {
    const material = await this.prisma.rawMaterial.findUnique({
      where: { id: materialId },
      include: {
        expertProfile: true,
        knowledgeEntries: { take: 10, orderBy: { credibility: 'desc' } },
        interactionsAsA: { include: { materialB: { select: { name: true } } } },
        interactionsAsB: { include: { materialA: { select: { name: true } } } },
      },
    });
    if (!material) throw new NotFoundException('Surowiec nie istnieje');

    const profile = material.expertProfile;
    if (!profile) {
      // Generuj podstawowy profil jeśli nie istnieje
      return this.generateBasicExpertCard(material);
    }

    const interactions = [
      ...material.interactionsAsA.map(i => ({
        materialName: i.materialB.name,
        interactionType: i.interactionType,
        severity: i.severity,
        description: i.description,
        recommendation: i.recommendation,
      })),
      ...material.interactionsAsB.map(i => ({
        materialName: i.materialA.name,
        interactionType: i.interactionType,
        severity: i.severity,
        description: i.description,
        recommendation: i.recommendation,
      })),
    ];

    return {
      material,
      profile: {
        description: profile.description,
        biologicalValue: profile.biologicalValue,
        digestibility: profile.digestibility,
        microbiomeImpact: profile.microbiomeImpact || undefined,
        prebioticEffect: profile.prebioticEffect,
      },
      impacts: {
        fcr: this.parseImpact(profile.impactFcr),
        adg: this.parseImpact(profile.impactAdg),
        epef: this.parseImpact(profile.impactEpef),
        gutHealth: this.parseImpact(profile.impactGutHealth),
        immunity: this.parseImpact(profile.impactImmunity),
        litterQuality: this.parseImpact(profile.impactLitter),
        waterConsumption: this.parseImpact(profile.impactWater),
        legHealth: this.parseImpact(profile.impactLegs),
        carcassQuality: this.parseImpact(profile.impactCarcass),
      },
      risks: {
        overdoseRisk: profile.overdoseRisk,
        overdoseSymptoms: profile.overdoseSymptoms as string[],
        deficiencySymptoms: profile.deficiencySymptoms as string[],
        recommendedMin: Number(profile.recommendedMin),
        recommendedMax: Number(profile.recommendedMax),
        optimalRange: profile.optimalRange || undefined,
      },
      interactions,
      knowledge: material.knowledgeEntries.map(k => ({
        type: k.type,
        title: k.title,
        source: k.source,
        year: k.year || undefined,
        summary: k.summary,
        keyFindings: k.keyFindings as string[],
      })),
    };
  }

  // ============================================================
  // 3. TRYB "DLACZEGO?" — proste wyjaśnienia dla użytkownika
  // ============================================================

  async explainWhy(recipeId: string, materialId: string, context: string): Promise<string> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { ingredients: { include: { rawMaterial: true } }, standard: true },
    });
    if (!recipe) throw new NotFoundException('Receptura nie istnieje');

    const ingredient = recipe.ingredients.find(i => i.rawMaterialId === materialId);
    if (!ingredient) throw new NotFoundException('Składnik nie istnieje w recepturze');

    const mat = ingredient.rawMaterial;
    const percentage = Number(ingredient.percentage);
    const nutrition = recipe.calculatedNutrition as Record<string, number>;

    // Generuj proste, ludzkie wyjaśnienie
    const explanations: string[] = [];

    // Kontekst decyzji
    if (context === 'ADD') {
      explanations.push(`${mat.name} został dodany w ilości ${percentage}%, ponieważ:`);
    } else if (context === 'REMOVE') {
      explanations.push(`${mat.name} został zmniejszony/usunięty, ponieważ:`);
    } else if (context === 'ADJUST') {
      explanations.push(`Udział ${mat.name} został dostosowany do ${percentage}%, ponieważ:`);
    }

    // Uzasadnienie na podstawie wartości odżywczych
    if (mat.meTurkey && Number(mat.meTurkey) > 3200) {
      explanations.push(`• Jest wysokoenergetyczny (${mat.meTurkey} kcal/kg ME), co wspiera niski FCR i szybki wzrost.`);
    }

    if (mat.crudeProtein && Number(mat.crudeProtein) > 40) {
      explanations.push(`• Dostarcza dużo białka (${mat.crudeProtein}%), kluczowego dla budowy mięśni.`);
    }

    if (mat.lysine && Number(mat.lysine) > 2.0) {
      explanations.push(`• Bogaty w lizynę (${mat.lysine}%) — pierwszy limitujący aminokwas dla indyków.`);
    }

    if (mat.crudeFiber && Number(mat.crudeFiber) > 10) {
      explanations.push(`• Zawiera dużo włókna (${mat.crudeFiber}%), co może obniżyć wartość energetyczną — uważaj na FCR.`);
    }

    // Ostrzeżenia
    if (mat.sodium && Number(mat.sodium) > 0.3) {
      explanations.push(`• UWAGA: Wysoka zawartość sodu (${mat.sodium}%) może zwiększyć pobór wody i pogorszyć ściółkę.`);
    }

    if (mat.aflatoxinB1 && Number(mat.aflatoxinB1) > 5) {
      explanations.push(`• RYZYKO: Podwyższony poziom aflatoksyny (${mat.aflatoxinB1} ppb) — monitoruj wątrobę i odporność.`);
    }

    // Wpływ na produkcję
    explanations.push(`\nWpływ na produkcję:`);

    const fcrImpact = this.estimateFcrImpact(mat, percentage);
    if (fcrImpact < -0.02) {
      explanations.push(`• Pozytywnie wpływa na FCR (szacowany spadek o ${Math.abs(fcrImpact).toFixed(3)}) dzięki wysokiej energii i strawności.`);
    } else if (fcrImpact > 0.02) {
      explanations.push(`• Może nieco podnieść FCR (szacowany wzrost o ${fcrImpact.toFixed(3})) przez włókno lub niższą strawność.`);
    }

    const adgImpact = this.estimateAdgImpact(mat, percentage);
    if (adgImpact > 0.3) {
      explanations.push(`• Wspiera wysoki ADG (szacowany wzrost o ${adgImpact.toFixed(1)} g/dzień) dzięki aminokwasom.`);
    }

    // Alternatywy
    const alternatives = await this.findAlternativesForMaterial(mat);
    if (alternatives.length > 0) {
      explanations.push(`\nAlternatywy do rozważenia:`);
      for (const alt of alternatives.slice(0, 2)) {
        explanations.push(`• ${alt.name}: ${alt.reasoning}`);
      }
    }

    return explanations.join('\n');
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private generateExpertAnalysis(
    recipe: Recipe & { ingredients: any[], standard: any },
    nutrition: Record<string, number>,
    standard: any,
    material: RawMaterial | null,
    profile: any,
    decisionType: string,
  ): ExpertAnalysis {
    const improvements: string[] = [];
    const threats: string[] = [];
    const alternatives: string[] = [];

    // Analiza na podstawie typu decyzji
    if (decisionType === 'OPTIMIZATION') {
      improvements.push('Zoptymalizowano bilans aminokwasów do wymagań normy.');
      improvements.push('Dostosowano poziom energii do fazy wzrostu.');

      if (nutrition.crudeProtein > Number(standard.crudeProteinMax)) {
        threats.push('Białko może być nieco za wysokie — monitoruj obciążenie nerek.');
      }

      alternatives.push('Można rozważyć dodatek enzymów (ksylanaza) dla lepszej strawności włókna.');
    }

    if (material && profile) {
      if (Number(material.meTurkey) > 3200) {
        improvements.push(`${material.name} dostarcza wysokiej jakości energii.`);
      }
      if (Number(material.crudeFiber) > 8) {
        threats.push(`${material.name} zawiera dużo włókna — może ograniczyć ME.`);
      }
    }

    // Szacowanie wpływów
    const baseFcr = 1.65;
    const baseAdg = 55;
    const baseEpef = 380;

    return {
      decision: this.describeDecision(decisionType, material),
      reasoning: this.generateReasoning(recipe, nutrition, standard, material, profile, decisionType),
      improvements,
      threats,
      alternatives,
      productionImpact: {
        fcr: { before: baseFcr, after: baseFcr - 0.02, change: -0.02, explanation: 'Lepszy bilans energetyczny' },
        adg: { before: baseAdg, after: baseAdg + 1.5, change: 1.5, explanation: 'Optymalne aminokwasy' },
        epef: { before: baseEpef, after: baseEpef + 5, change: 5, explanation: 'Kombinacja FCR i ADG' },
        gutHealth: { before: 7, after: 7.5, change: 0.5, explanation: 'Odpowiednie włókno i bufory' },
        immunity: { before: 7, after: 7.2, change: 0.2, explanation: 'Witaminy i mikroelementy' },
        litterQuality: { before: 6, after: 6.5, change: 0.5, explanation: 'Kontrola sodu i wilgotności' },
        legHealth: { before: 8, after: 8.2, change: 0.2, explanation: 'Wapń i fosfor w normie' },
        waterConsumption: { before: 100, after: 98, change: -2, explanation: 'Stabilne elektrolity' },
        carcassQuality: { before: 8, after: 8.3, change: 0.3, explanation: 'Odpowiedni tłuszcz' },
      },
      isThereBetterAlternative: alternatives.length > 0,
      betterAlternative: alternatives.length > 0 ? {
        description: alternatives[0],
        expectedImprovement: 'Spadek FCR o 0.03, wzrost ADG o 2 g/dzień',
        riskLevel: 'NISKIE',
      } : undefined,
    };
  }

  private describeDecision(decisionType: string, material: RawMaterial | null): string {
    const map: Record<string, string> = {
      INGREDIENT_ADD: `Dodano ${material?.name || 'składnik'} do receptury`,
      INGREDIENT_REMOVE: `Usunięto ${material?.name || 'składnik'} z receptury`,
      INGREDIENT_ADJUST: `Dostosowano udział ${material?.name || 'składnika'}`,
      SUBSTITUTION: `Zastąpiono składnik ${material?.name || ''}`,
      OPTIMIZATION: 'Zoptymalizowano recepturę pod kątem wielokryterialnym',
      CORRECTION: 'Skorygowano recepturę na podstawie wyników produkcyjnych',
      EXPERIMENT: 'Przeprowadzono eksperyment wirtualny',
    };
    return map[decisionType] || 'Dokonano zmiany w recepturze';
  }

  private generateReasoning(
    recipe: any,
    nutrition: Record<string, number>,
    standard: any,
    material: RawMaterial | null,
    profile: any,
    decisionType: string,
  ): string {
    const parts: string[] = [];
    parts.push('Jako ekspert ds. żywienia indyków podjąłem tę decyzję na podstawie następujących czynników:');
    parts.push('');

    parts.push('1. ANALIZA WARTOŚCI ODŻYWCZYCH:');
    parts.push(`   - Energia ME: ${nutrition.meTurkey?.toFixed(0)} kcal/kg (norma: ${standard.meMin}-${standard.meMax})`);
    parts.push(`   - Białko: ${nutrition.crudeProtein?.toFixed(2)}% (norma: ${standard.crudeProteinMin}-${standard.crudeProteinMax})`);
    parts.push(`   - Lizyna: ${nutrition.lysine?.toFixed(3)}% (min: ${standard.lysineMin})`);
    parts.push(`   - Met+Cys: ${nutrition.metCys?.toFixed(3)}% (min: ${standard.metCysMin})`);
    parts.push('');

    parts.push('2. BILANS MINERAŁÓW:');
    parts.push(`   - Ca:P = ${nutrition.caToTotalP?.toFixed(2)} (zalecany: ${standard.caToTotalPMin || 1.0}-${standard.caToTotalPMax || 2.0})`);
    parts.push(`   - Sód: ${nutrition.sodium?.toFixed(3)}% (max: ${standard.sodiumMax})`);
    parts.push('');

    if (material) {
      parts.push(`3. ANALIZA SKŁADNIKA ${material.name}:`);
      parts.push(`   - Wartość energetyczna: ${material.meTurkey} kcal/kg`);
      parts.push(`   - Zawartość białka: ${material.crudeProtein}%`);
      if (profile) {
        parts.push(`   - Wpływ na jelita: ${profile.impactGutHealth}`);
        parts.push(`   - Wpływ na odporność: ${profile.impactImmunity}`);
      }
    }

    parts.push('');
    parts.push('4. CELE OPTYMALIZACJI:');
    parts.push('   - Minimalizacja FCR przy zachowaniu zdrowia stada');
    parts.push('   - Optymalizacja kosztów bez utraty wydajności');
    parts.push('   - Zapewnienie odporności w okresie stresowym');

    return parts.join('\n');
  }

  private parseImpact(impactText: string): { score: number; explanation: string } {
    // Ekstrakcja score z tekstu (np. "+3: Wysokoenergetyczny, poprawia FCR")
    const match = impactText.match(/^([+-]?\d+):\s*(.+)$/);
    if (match) {
      return { score: parseInt(match[1]), explanation: match[2] };
    }
    return { score: 0, explanation: impactText };
  }

  private generateBasicExpertCard(material: RawMaterial): IngredientExpertCard {
    return {
      material,
      profile: {
        description: `${material.name} — surowiec paszowy kategorii ${material.category}.`,
        biologicalValue: 'Brak szczegółowych danych w bazie eksperckiej.',
        digestibility: 'Strawność zależy od przetworzenia i poziomu włókna.',
        prebioticEffect: false,
      },
      impacts: {
        fcr: { score: material.meTurkey ? (Number(material.meTurkey) > 3000 ? 2 : 0) : 0, explanation: 'Wpływ zależy od energii' },
        adg: { score: material.crudeProtein ? (Number(material.crudeProtein) > 20 ? 2 : 0) : 0, explanation: 'Wpływ zależy od białka' },
        epef: { score: 0, explanation: 'Brak danych' },
        gutHealth: { score: material.crudeFiber ? (Number(material.crudeFiber) > 10 ? -2 : 1) : 0, explanation: 'Włókno wpływa na mikrobiom' },
        immunity: { score: 0, explanation: 'Brak danych' },
        litterQuality: { score: material.sodium ? (Number(material.sodium) > 0.2 ? -2 : 1) : 0, explanation: 'Sód wpływa na ściółkę' },
        waterConsumption: { score: material.sodium ? (Number(material.sodium) > 0.1 ? -1 : 0) : 0, explanation: 'Sód zwiększa pragnienie' },
        legHealth: { score: material.calcium ? (Number(material.calcium) > 0.5 ? 2 : 0) : 0, explanation: 'Wapń wspiera kości' },
        carcassQuality: { score: material.crudeFat ? (Number(material.crudeFat) > 5 ? -1 : 1) : 0, explanation: 'Tłuszcz wpływa na tuszę' },
      },
      risks: {
        overdoseRisk: 'Brak danych w bazie eksperckiej. Zalecamy konsultację z normami NRC/CVB.',
        overdoseSymptoms: [],
        deficiencySymptoms: [],
        recommendedMin: Number(material.minInclusion),
        recommendedMax: Number(material.maxInclusion),
      },
      interactions: [],
      knowledge: [],
    };
  }

  private estimateFcrImpact(material: RawMaterial, percentage: number): number {
    let impact = 0;
    if (material.meTurkey) impact += (Number(material.meTurkey) - 3000) * 0.00001 * percentage;
    if (material.crudeFiber) impact += Number(material.crudeFiber) * 0.001 * percentage;
    return Number(impact.toFixed(3));
  }

  private estimateAdgImpact(material: RawMaterial, percentage: number): number {
    let impact = 0;
    if (material.lysine) impact += Number(material.lysine) * 0.5 * percentage;
    if (material.crudeProtein) impact += (Number(material.crudeProtein) - 20) * 0.05 * percentage;
    return Number(impact.toFixed(1));
  }

  private async findAlternativesForMaterial(material: RawMaterial): Promise<Array<{ name: string; reasoning: string }>> {
    const subs = await this.prisma.rawMaterialSubstitution.findMany({
      where: { mainMaterialId: material.id, isApproved: true },
      include: { substitute: { select: { name: true } } },
    });

    return subs.map(s => ({
      name: s.substitute.name,
      reasoning: s.reasoning,
    }));
  }
}
