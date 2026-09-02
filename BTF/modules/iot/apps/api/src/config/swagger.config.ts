import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Bloody Turkey IoT API')
  .setDescription('Enterprise IoT & Automation Module for Turkey Farms')
  .setVersion('1.0.0')
  .addBearerAuth()
  .addTag('Devices', 'Device management & telemetry')
  .addTag('Telemetry', 'Real-time & historical data')
  .addTag('Alarms', 'Alarm management & history')
  .addTag('AI Engine', 'Predictions & anomaly detection')
  .addTag('Digital Twin', '3D farm visualization')
  .addTag('Integrations', 'Third-party system connectors')
  .addTag('Dashboard', 'Aggregated farm data')
  .build();
