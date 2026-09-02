export interface FlockHealthStatus {
  id: string
  name: string
  houseId: string
  houseName: string
  breed: string
  ageDays: number
  currentCount: number
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL'
  riskScore: number
  healthScore: number
  mortalityRate: number
  fcr: number
  anomalyScore: number
}

export interface RiskScore {
  healthScore: number
  productionScore: number
  riskScore: number
  welfareScore: number
}
