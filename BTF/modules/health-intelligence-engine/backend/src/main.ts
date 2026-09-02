import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Turkey Health Intelligence Engine API')
    .setDescription('Enterprise Veterinary Decision Support System for Turkey Production')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Health Records')
    .addTag('AI Advisor')
    .addTag('Vaccinations')
    .addTag('Treatments')
    .addTag('Withdrawal')
    .addTag('Risk Scores')
    .addTag('Disease Library')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
