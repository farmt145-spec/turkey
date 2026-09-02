export interface Device {
  id: string; name: string; category: DeviceCategory; typeName: string;
  status: DeviceStatus; farmId: string; buildingId?: string; zoneId?: string;
  position?: { x?: number; y?: number; z?: number };
  lastSeen?: string; ipAddress?: string; serialNumber?: string;
  config?: Record<string, any>; telemetry?: TelemetryPoint[]; alarms?: Alarm[];
}

export type DeviceCategory =
  | 'CLIMATE_CONTROLLER' | 'TEMPERATURE_SENSOR' | 'HUMIDITY_SENSOR' | 'CO2_SENSOR'
  | 'NH3_SENSOR' | 'H2S_SENSOR' | 'AIRFLOW_SENSOR' | 'ENERGY_METER' | 'GAS_METER'
  | 'WATER_METER' | 'FEED_SCALE' | 'FEED_SILO_LEVEL' | 'FEED_AUTO' | 'DRINKER'
  | 'AI_CAMERA' | 'BIRD_SCALE' | 'MORTALITY_COUNTER' | 'DOOR_SENSOR' | 'GENERATOR'
  | 'UPS' | 'FIRE_ALARM' | 'DISINFECTION_SYSTEM';

export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'WARNING' | 'ERROR' | 'MAINTENANCE' | 'CALIBRATING';

export interface TelemetryPoint {
  id: string; timestamp: string; rawValue: Record<string, any>;
  processedValue?: number; unit?: string;
  quality: 'GOOD' | 'BAD' | 'UNCERTAIN' | 'SENSOR_ERROR' | 'CALIBRATION_ERROR';
}

export interface Alarm {
  id: string; type: string; severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  message: string; device?: { name: string; category: DeviceCategory };
  isAcknowledged: boolean; createdAt: string; resolvedAt?: string;
}

export interface FarmOverview {
  summary: { totalDevices: number; onlineDevices: number; offlineDevices: number; activeAlarms: number; onlinePercentage: number; };
  recentAlarms: Alarm[]; climateOverview: ClimateOverview | null;
  feedStatus: FeedSiloStatus[]; aiInsights: AIPrediction[];
}

export interface ClimateOverview {
  avgTemperature: number; avgHumidity: number; avgCO2: number; avgNH3: number;
  avgH2S: number; avgAirflow: number; minTemperature: number; maxTemperature: number; readingsCount: number;
}

export interface FeedSiloStatus { id: string; name: string; currentLevel: number; capacity: number; percentage: number; status: 'OK' | 'WARNING' | 'CRITICAL'; }

export interface AIPrediction { id: string; type: string; confidence: number; prediction: Record<string, any>; createdAt: string; }

export interface BuildingMap { id: string; name: string; type: string; layout?: any; position?: { x?: number; y?: number }; zones: ZoneMap[]; unzonedDevices: Device[]; }

export interface ZoneMap { id: string; name: string; position?: { x?: number; y?: number; z?: number }; devices: Device[]; }

export interface TimeSeriesData { bucket: string; device_id: string; avg_value: number; min_value: number; max_value: number; count: number; }

export interface DigitalTwinState { timestamp: string; farmId: string; buildings: BuildingTwinState[]; }

export interface BuildingTwinState { id: string; name: string; type: string; climate?: ClimateOverview; zones: ZoneTwinState[]; unzonedDevices: DeviceTwinState[]; }

export interface ZoneTwinState { id: string; name: string; position?: { x?: number; y?: number; z?: number }; devices: DeviceTwinState[]; }

export interface DeviceTwinState { id: string; name: string; category: DeviceCategory; typeName: string; status: DeviceStatus; position?: { x?: number; y?: number; z?: number }; lastTelemetry?: { timestamp: string; value: any; unit?: string; quality: string; }; isStale: boolean; }
