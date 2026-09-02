export interface IRecipeNutrition {
  me: number;
  crudeProtein: number;
  crudeFat: number;
  crudeFiber: number;
  crudeAsh: number;
  starch: number;
  sugars: number;
  calcium: number;
  totalPhosphorus: number;
  digestiblePhosphorus: number;
  sodium: number;
  chloride: number;
  potassium: number;
  magnesium: number;
  lysine: number;
  methionine: number;
  cystine: number;
  metCys: number;
  threonine: number;
  tryptophan: number;
  arginine: number;
  valine: number;
  isoleucine: number;
  leucine: number;
  histidine: number;
  phenylalanine: number;
  glycine: number;
  serine: number;
  caToTotalP: number;
  caToDigestibleP: number;
  sodiumMeq: number;
  potassiumMeq: number;
  chlorideMeq: number;
  [key: string]: number;
}

export interface IIngredientImpact {
  fcr: number;
  adg: number;
  mortality: number;
  gutHealth: number;
  immunity: number;
  litterQuality: number;
  legQuality: number;
  waterConsumption: number;
  costImpact: number;
}

export interface IAIExplanation {
  ingredientId: string;
  ingredientName: string;
  decision: string;
  reasoning: string;
  impact: IIngredientImpact;
  alternatives: IAlternativeMaterial[];
}

export interface IAlternativeMaterial {
  materialId: string;
  materialName: string;
  priceDifference: number;
  nutritionalDifferences: Record<string, number>;
  fcrImpact: number;
  adgImpact: number;
  reasoning: string;
}

export interface ISimulationResult {
  parameter: string;
  currentValue: number;
  newValue: number;
  unit: string;
  impact: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface IOptimizationConstraints {
  maxCostPerTon?: number;
  availableMaterials?: string[];
  excludedMaterials?: string[];
  minInclusion?: Record<string, number>;
  maxInclusion?: Record<string, number>;
  targetFcr?: number;
  targetAdg?: number;
  priority: 'cost' | 'fcr' | 'adg' | 'epef' | 'health' | 'balanced';
}

export interface IProductionMetrics {
  fcr: number;
  adg: number;
  epef: number;
  mortality: number;
  feedConsumption: number;
  waterConsumption: number;
  treatments: number;
  gutHealthScore: number;
  litterQualityScore: number;
  legProblems: number;
  ammoniaLevel: number;
}

export interface IDashboardData {
  totalRecipes: number;
  activeRecipes: number;
  avgFeedCost: number;
  totalFeedConsumed: number;
  alerts: IAlertSummary[];
  inventory: IInventorySummary[];
  productionTrends: IProductionTrend[];
  aiInsights: IAIInsight[];
}

export interface IAlertSummary {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  parameter?: string;
  createdAt: Date;
}

export interface IInventorySummary {
  materialId: string;
  materialName: string;
  quantityKg: number;
  minLevel: number;
  status: 'ok' | 'low' | 'critical';
}

export interface IProductionTrend {
  date: string;
  fcr: number;
  adg: number;
  cost: number;
  mortality: number;
}

export interface IAIInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  recommendedAction?: string;
}
