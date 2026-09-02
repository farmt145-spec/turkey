export interface Company {
  id: string;
  name: string;
  taxId: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface Farm {
  id: string;
  name: string;
  location?: string;
  companyId: string;
  company: Company;
}

export interface Nursery {
  id: string;
  name: string;
  farmId: string;
  capacity: number;
}

export interface House {
  id: string;
  name: string;
  nurseryId?: string;
  nursery?: Nursery;
  farmId: string;
  farm: Farm;
  capacity: number;
  areaSqm?: number;
  coordinates?: { x: number; y: number; width: number; height: number };
  status: HouseStatus;
}

export type HouseStatus = 'EMPTY' | 'OCCUPIED' | 'CLEANING' | 'QUARANTINE' | 'MAINTENANCE';

export interface Sector {
  id: string;
  name: string;
  houseId: string;
  house: House;
  capacity: number;
}

export interface Batch {
  id: string;
  batchNumber: string;
  sectorId: string;
  sector: Sector;
  receiptDate: string;
  supplier: string;
  hatchery: string;
  hatcheryBatchNo: string;
  genetics: string;
  sex: 'MALE' | 'FEMALE' | 'MIXED';
  initialCount: number;
  avgWeightGrams: number;
  pricePerUnit: number;
  transportTime?: number;
  transportTemp?: number;
  transportNotes?: string;
  currentCount: number;
  currentAgeDays: number;
  currentAvgWeight?: number;
  status: BatchStatus;
  documents?: Document[];
  photos?: Photo[];
}

export type BatchStatus = 'ACTIVE' | 'TRANSFERRED' | 'PARTIAL_TRANSFER' | 'SOLD' | 'CLOSED';

export interface DailyLog {
  id: string;
  batchId: string;
  dayNumber: number;
  logDate: string;
  mortalityCount: number;
  mortalityReason?: string;
  avgWeightGrams?: number;
  sampleSize?: number;
  feedConsumedKg?: number;
  waterConsumedL?: number;
  feedType?: string;
  temperatureMin?: number;
  temperatureMax?: number;
  temperatureAvg?: number;
  humidityPercent?: number;
  co2Ppm?: number;
  nh3Ppm?: number;
  lightingHours?: number;
  notes?: string;
  fcr?: number;
  adgGrams?: number;
  epef?: number;
}

export interface AIAnalysis {
  id: string;
  batchId: string;
  dayNumber: number;
  fcr?: number;
  adgGrams?: number;
  epef?: number;
  mortalityRate?: number;
  tempScore?: number;
  waterScore?: number;
  feedScore?: number;
  humidityScore?: number;
  co2Score?: number;
  nh3Score?: number;
  dayScore: number;
  riskLevel: RiskLevel;
  detectedIssues: Array<{ type: string; severity: string; description: string }>;
  possibleCauses: string[];
  recommendations: string[];
  forecast7Days: Array<{
    day: number;
    predictedWeight: number;
    predictedMortality: number;
    predictedFCR: number;
  }>;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Alert {
  id: string;
  batchId: string;
  type: string;
  severity: RiskLevel;
  title: string;
  description: string;
  justification: string;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

export interface AIForecast {
  id: string;
  batchId: string;
  predictedFinalWeight: number;
  predictedFCR: number;
  predictedEPEF: number;
  totalFeedConsumptionKg: number;
  totalCost: number;
  predictedRevenue: number;
  predictedProfit: number;
  predictedMargin: number;
  accuracyPercent: number;
  generatedAt: string;
}

export interface ProductionEvent {
  id: string;
  batchId: string;
  eventType: string;
  dayNumber: number;
  description: string;
  metadata?: any;
  createdAt: string;
}

export interface Transfer {
  id: string;
  batchId: string;
  sourceFarmId: string;
  sourceFarm: Farm;
  sourceHouseId?: string;
  sourceSectorId?: string;
  targetFarmId?: string;
  targetFarm?: Farm;
  targetHouseId?: string;
  targetSectorId?: string;
  transferDate: string;
  birdCount: number;
  avgWeightGrams?: number;
  mortalityDuringTransport: number;
  performedBy: string;
  reason: string;
  documentUrl?: string;
}

export interface Document {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedBy: string;
  createdAt: string;
}

export interface Photo {
  id: string;
  url: string;
  caption?: string;
  uploadedBy: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string;
  isActive: boolean;
}

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'COMPANY_ADMIN' 
  | 'FARM_MANAGER' 
  | 'HOUSE_SUPERVISOR' 
  | 'VETERINARIAN' 
  | 'OPERATOR' 
  | 'VIEWER';

export interface DashboardKPIs {
  totalBirds: number;
  activeBatches: number;
  avgAge: number;
  avgFCR: number;
  avgADG: number;
  avgEPEF: number;
  totalMortality: number;
  mortalityRate: number;
  totalFeedConsumed: number;
  totalWaterConsumed: number;
  activeAlerts: number;
  criticalAlerts: number;
  predictedRevenue: number;
  predictedProfit: number;
  aiScore: number;
  riskScore: number;
}
