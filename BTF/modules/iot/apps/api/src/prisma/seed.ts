import { PrismaClient, BuildingType, AlarmSeverity, AlarmType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: { email: 'admin@bloodyturkey.com', password: hashedPassword, firstName: 'System', lastName: 'Administrator', role: 'SUPER_ADMIN', phone: '+48 600 000 000' },
  });
  const managerPass = await bcrypt.hash('manager123', 10);
  const manager = await prisma.user.create({
    data: { email: 'manager@bloodyturkey.com', password: managerPass, firstName: 'Jan', lastName: 'Kowalski', role: 'MANAGER', phone: '+48 600 111 111' },
  });
  const farm = await prisma.farm.create({
    data: { name: 'Ferma Główna - Wielkopolska', location: 'Poznań, Wielkopolskie', latitude: 52.4064, longitude: 16.9252 },
  });
  await prisma.userFarm.createMany({ data: [{ userId: admin.id, farmId: farm.id, role: 'ADMIN' }, { userId: manager.id, farmId: farm.id, role: 'MANAGER' }] });

  const brooder = await prisma.building.create({ data: { farmId: farm.id, name: 'Hala Wychowu - B1', type: BuildingType.BROODER, capacity: 20000, area: 2400, layout: { width: 80, height: 30, positionX: 100, positionY: 100 } } });
  const grower = await prisma.building.create({ data: { farmId: farm.id, name: 'Hala Tuczu - T2', type: BuildingType.GROWER, capacity: 15000, area: 3200, layout: { width: 100, height: 32, positionX: 450, positionY: 100 } } });
  const finisher = await prisma.building.create({ data: { farmId: farm.id, name: 'Hala Tuczu Finalnego - F3', type: BuildingType.FINISHER, capacity: 12000, area: 3600, layout: { width: 120, height: 30, positionX: 100, positionY: 350 } } });

  const zone1 = await prisma.zone.create({ data: { buildingId: brooder.id, name: 'Strefa A - Wschód', positionX: 10, positionY: 10, positionZ: 0 } });
  const zone2 = await prisma.zone.create({ data: { buildingId: brooder.id, name: 'Strefa B - Zachód', positionX: 10, positionY: 150, positionZ: 0 } });

  const deviceTypes = [
    { code: 'TEMP_SENSOR', name: 'Czujnik temperatury', category: 'TEMPERATURE_SENSOR', manufacturer: 'Siemens', model: 'QAM2120' },
    { code: 'HUMID_SENSOR', name: 'Czujnik wilgotności', category: 'HUMIDITY_SENSOR', manufacturer: 'Vaisala', model: 'HMP110' },
    { code: 'CO2_SENSOR', name: 'Czujnik CO₂', category: 'CO2_SENSOR', manufacturer: 'Vaisala', model: 'GMP252' },
    { code: 'NH3_SENSOR', name: 'Czujnik NH₃', category: 'NH3_SENSOR', manufacturer: 'Honeywell', model: 'EC4-NH3' },
    { code: 'H2S_SENSOR', name: 'Czujnik H₂S', category: 'H2S_SENSOR', manufacturer: 'Honeywell', model: 'EC4-H2S' },
    { code: 'AIRFLOW', name: 'Czujnik przepływu powietrza', category: 'AIRFLOW_SENSOR', manufacturer: 'Testo', model: '405i' },
    { code: 'ENERGY_M', name: 'Licznik energii', category: 'ENERGY_METER', manufacturer: 'Schneider', model: 'PowerLogic ION' },
    { code: 'WATER_M', name: 'Licznik wody', category: 'WATER_METER', manufacturer: 'Sensus', model: 'iPERL' },
    { code: 'FEED_SILO', name: 'Czujnik poziomu silosu', category: 'FEED_SILO_LEVEL', manufacturer: 'Roxell', model: 'SiloTrack Pro' },
    { code: 'FEED_AUTO', name: 'Automat paszowy', category: 'FEED_AUTO', manufacturer: 'Big Dutchman', model: 'Vogelsang' },
    { code: 'CLIMATE_CTRL', name: 'Sterownik klimatu', category: 'CLIMATE_CONTROLLER', manufacturer: 'Fancom', model: 'Lumina 36' },
    { code: 'AI_CAM', name: 'Kamera AI', category: 'AI_CAMERA', manufacturer: 'Hikvision', model: 'DS-2CD2T46G2' },
    { code: 'BIRD_SCALE', name: 'Waga ptaków', category: 'BIRD_SCALE', manufacturer: 'Hotraco', model: 'BirdWeigh' },
    { code: 'MORT_COUNT', name: 'Licznik padnięć', category: 'MORTALITY_COUNTER', manufacturer: 'Skov', model: 'DOL 53' },
    { code: 'DOOR_SENS', name: 'Czujnik drzwi', category: 'DOOR_SENSOR', manufacturer: 'Roxell', model: 'DoorSense' },
    { code: 'GENERATOR', name: 'Agregat prądotwórczy', category: 'GENERATOR', manufacturer: 'Cummins', model: 'C22D5' },
    { code: 'UPS_SYS', name: 'UPS', category: 'UPS', manufacturer: 'APC', model: 'Smart-UPS 3000' },
    { code: 'FIRE_AL', name: 'Alarm pożarowy', category: 'FIRE_ALARM', manufacturer: 'Siemens', model: 'Cerberus PRO' },
  ];
  for (const dt of deviceTypes) await prisma.deviceType.create({ data: dt });

  const fancomInt = await prisma.integration.create({ data: { farmId: farm.id, name: 'Fancom Lumina 36 - B1', type: 'FANCOM', config: { host: '192.168.1.10', port: 502, protocol: 'modbus' }, status: 'CONNECTED' } });
  const mqttInt = await prisma.integration.create({ data: { farmId: farm.id, name: 'Broker MQTT Główny', type: 'MQTT_BROKER', config: { host: 'mosquitto', port: 1883 }, status: 'CONNECTED' } });

  const allTypes = await prisma.deviceType.findMany();
  const getType = (code: string) => allTypes.find(t => t.code === code)!;

  await prisma.device.create({ data: { farmId: farm.id, buildingId: brooder.id, zoneId: zone1.id, deviceTypeId: getType('TEMP_SENSOR').id, integrationId: fancomInt.id, name: 'Temp B1-ZA-01', status: 'ONLINE', lastSeenAt: new Date(), ipAddress: '192.168.1.101', modbusAddress: 1, positionX: 20, positionY: 30 } });
  await prisma.device.create({ data: { farmId: farm.id, buildingId: brooder.id, zoneId: zone1.id, deviceTypeId: getType('TEMP_SENSOR').id, integrationId: fancomInt.id, name: 'Temp B1-ZA-02', status: 'ONLINE', lastSeenAt: new Date(), ipAddress: '192.168.1.102', modbusAddress: 2, positionX: 60, positionY: 30 } });
  await prisma.device.create({ data: { farmId: farm.id, buildingId: brooder.id, zoneId: zone1.id, deviceTypeId: getType('HUMID_SENSOR').id, integrationId: fancomInt.id, name: 'Wilg B1-ZA-01', status: 'ONLINE', lastSeenAt: new Date(), modbusAddress: 3, positionX: 40, positionY: 50 } });
  await prisma.device.create({ data: { farmId: farm.id, buildingId: brooder.id, zoneId: zone1.id, deviceTypeId: getType('CO2_SENSOR').id, integrationId: fancomInt.id, name: 'CO₂ B1-ZA-01', status: 'ONLINE', lastSeenAt: new Date(), modbusAddress: 4, positionX: 30, positionY: 40 } });
  await prisma.device.create({ data: { farmId: farm.id, buildingId: brooder.id, zoneId: zone1.id, deviceTypeId: getType('NH3_SENSOR').id, integrationId: fancomInt.id, name: 'NH₃ B1-ZA-01', status: 'ONLINE', lastSeenAt: new Date(), modbusAddress: 5, positionX: 50, positionY: 40 } });
  await prisma.device.create({ data: { farmId: farm.id, buildingId: brooder.id, deviceTypeId: getType('CLIMATE_CTRL').id, integrationId: fancomInt.id, name: 'Sterownik B1', status: 'ONLINE', lastSeenAt: new Date(), ipAddress: '192.168.1.100', modbusAddress: 0, positionX: 40, positionY: 10 } });
  await prisma.device.create({ data: { farmId: farm.id, buildingId: brooder.id, zoneId: zone2.id, deviceTypeId: getType('TEMP_SENSOR').id, integrationId: fancomInt.id, name: 'Temp B1-ZB-01', status: 'ONLINE', lastSeenAt: new Date(), modbusAddress: 10, positionX: 20, positionY: 180 } });
  await prisma.device.create({ data: { farmId: farm.id, buildingId: brooder.id, zoneId: zone1.id, deviceTypeId: getType('BIRD_SCALE').id, name: 'Waga B1', status: 'ONLINE', lastSeenAt: new Date(), positionX: 40, positionY: 80 } });
  await prisma.device.create({ data: { farmId: farm.id, buildingId: grower.id, deviceTypeId: getType('TEMP_SENSOR').id, integrationId: fancomInt.id, name: 'Temp T2-01', status: 'ONLINE', lastSeenAt: new Date(), modbusAddress: 20, positionX: 50, positionY: 50 } });
  await prisma.device.create({ data: { farmId: farm.id, buildingId: grower.id, deviceTypeId: getType('ENERGY_M').id, name: 'Energia T2', status: 'ONLINE', lastSeenAt: new Date(), ipAddress: '192.168.1.200', positionX: 280, positionY: 10 } });
  await prisma.device.create({ data: { farmId: farm.id, buildingId: finisher.id, deviceTypeId: getType('AI_CAM').id, integrationId: mqttInt.id, name: 'Kamera F3-AI', status: 'ONLINE', lastSeenAt: new Date(), mqttTopic: 'farm/f3/cam01', positionX: 150, positionY: 150 } });
  await prisma.device.create({ data: { farmId: farm.id, buildingId: finisher.id, deviceTypeId: getType('MORT_COUNT').id, integrationId: mqttInt.id, name: 'Licznik padnięć F3', status: 'ONLINE', lastSeenAt: new Date(), mqttTopic: 'farm/f3/mortality', positionX: 200, positionY: 100 } });

  await prisma.feedSilo.create({ data: { farmId: farm.id, name: 'Silos Pasza Startowa', capacity: 30000, currentLevel: 18500, alertLevel: 5000, lastFillAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), location: { x: 50, y: 50 } } });
  await prisma.feedSilo.create({ data: { farmId: farm.id, name: 'Silos Pasza Tuczowa', capacity: 50000, currentLevel: 42000, alertLevel: 8000, lastFillAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), location: { x: 100, y: 50 } } });

  await prisma.alarm.createMany({ data: [
    { farmId: farm.id, type: AlarmType.HIGH_TEMPERATURE, severity: AlarmSeverity.WARNING, message: 'Temperatura w Hala Wychowu - B1 przekroczyła 32°C', details: { value: 32.5, setpoint: 30, zone: 'Strefa A' } },
    { farmId: farm.id, type: AlarmType.DEVICE_OFFLINE, severity: AlarmSeverity.CRITICAL, message: 'Czujnik NH₃ B1-ZA-01 nie odpowiada', details: { lastSeen: new Date(Date.now() - 3600000).toISOString() } },
    { farmId: farm.id, type: AlarmType.FEED_LOW, severity: AlarmSeverity.WARNING, message: 'Silos Pasza Startowa: poziom poniżej 30%', details: { currentLevel: 18500, capacity: 30000, percentage: 61.7 } },
  ]});

  const tempDevice = await prisma.device.findFirst({ where: { name: 'Temp B1-ZA-01' } });
  if (tempDevice) {
    const telemetryData = [];
    for (let i = 0; i < 288; i++) {
      const timestamp = new Date(Date.now() - (288 - i) * 5 * 60000);
      const baseTemp = 28 + Math.sin(i / 30) * 3 + (Math.random() - 0.5);
      telemetryData.push({ deviceId: tempDevice.id, timestamp, rawValue: { value: Math.round(baseTemp * 10) / 10, unit: '°C' }, processedValue: Math.round(baseTemp * 10) / 10, unit: '°C', quality: 'GOOD' });
    }
    await prisma.telemetry.createMany({ data: telemetryData });
  }

  for (let i = 0; i < 24; i++) {
    await prisma.climateData.create({ data: { buildingId: brooder.id, timestamp: new Date(Date.now() - (24 - i) * 3600000), avgTemp: 29.5 + Math.random() * 2, minTemp: 28.0 + Math.random(), maxTemp: 31.0 + Math.random() * 2, avgHumidity: 65 + Math.random() * 5, avgCO2: 2500 + Math.random() * 500, avgNH3: 8 + Math.random() * 3, avgH2S: 0.5 + Math.random() * 0.2, avgAirflow: 12000 + Math.random() * 2000 } });
  }

  await prisma.aIPrediction.createMany({ data: [
    { farmId: farm.id, buildingId: brooder.id, type: 'CLIMATE_FCR_IMPACT', modelVersion: '1.0.0', confidence: 0.82, prediction: { predictedFCR: 1.65, currentAvgFCR: 1.58, deviation: 4.4 }, features: { avgTemp: 30.2, avgHumidity: 67 } as any },
    { farmId: farm.id, buildingId: finisher.id, type: 'DEVICE_FAILURE', modelVersion: '1.0.0', confidence: 0.91, prediction: { failureProbability: 0.91, deviceName: 'Temp F3-02', timeframe: '24h' } },
  ]});

  console.log('Seed completed successfully');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
