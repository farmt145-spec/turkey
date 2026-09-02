export interface RawMaterial {
  id: string;
  code: string;
  name: string;
  category: string;
  meTurkey: number;
  crudeProtein: number;
  costPerTon: number;
  status: string;
}

export interface RecipeIngredient {
  id: string;
  rawMaterial: RawMaterial;
  percentage: number;
  quantityKg: number;
  costPerTon: number;
  aiExplanation?: string;
  aiImpact?: {
    fcr: number;
    adg: number;
    gutHealth: number;
    immunity: number;
    litterQuality: number;
    legQuality: number;
    waterConsumption: number;
    costImpact: number;
  };
}

export interface Recipe {
  id: string;
  name: string;
  code: string;
  version: number;
  standard: {
    id: string;
    name: string;
    phase: string;
  };
  targetAgeDays: number;
  targetGender: string;
  ingredients: RecipeIngredient[];
  calculatedNutrition: Record<string, number>;
  costPerTon: number;
  costPerKg: number;
  aiConfidence?: number;
  aiReasoning?: string;
  validationStatus: string;
  warnings?: Array<{
    parameter: string;
    message: string;
    severity: string;
    consequences: string[];
  }>;
  isProductionReady: boolean;
  createdAt: string;
}

export interface NutritionalStandard {
  id: string;
  name: string;
  code: string;
  gender: string;
  productionType: string;
  phase: string;
  ageFromDays: number;
  ageToDays: number;
  meMin: number;
  meMax: number;
  crudeProteinMin: number;
  crudeProteinMax: number;
  targetFcr?: number;
  targetAdg?: number;
}

export interface AlertItem {
  id: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  title: string;
  message: string;
  parameter?: string;
  actualValue?: number;
  thresholdValue?: number;
  unit?: string;
  consequences: string[];
  recommendations: string[];
  status: string;
  createdAt: string;
}

export interface DashboardData {
  totalRecipes: number;
  activeRecipes: number;
  avgFeedCost: number;
  totalFeedConsumed: number;
  alerts: AlertItem[];
  inventory: Array<{
    materialId: string;
    materialName: string;
    quantityKg: number;
    minLevel: number;
    status: 'ok' | 'low' | 'critical';
  }>;
  productionTrends: Array<{
    date: string;
    fcr: number;
    adg: number;
    cost: number;
    mortality: number;
  }>;
  aiInsights: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    confidence: number;
    actionable: boolean;
    recommendedAction?: string;
  }>;
}

export interface SimulationResult {
  ingredient: {
    name: string;
    currentPercentage: number;
    newPercentage: number;
    change: number;
  };
  nutritionChanges: Array<{
    parameter: string;
    current: number;
    new: number;
    difference: number;
    unit: string;
  }>;
  costChange: {
    current: number;
    new: number;
    difference: number;
    percentageChange: number;
  };
  impacts: Array<{
    parameter: string;
    currentValue: number;
    newValue: number;
    unit: string;
    impact: string;
    severity: 'info' | 'warning' | 'critical';
  }>;
  warnings: Array<{
    type: string;
    message: string;
    recommendation: string;
  }>;
}

export interface GenerateRecipeRequest {
  gender: string;
  productionType: string;
  ageDays: number;
  phase: string;
  priority?: string;
  maxCostPerTon?: number;
  availableMaterials?: string[];
  excludedMaterials?: string[];
}
