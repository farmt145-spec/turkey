import { Module } from '@nestjs/common';
import { AiEngineController } from './ai-engine.controller';
import { AiEngineService } from './ai-engine.service';
@Module({ controllers: [AiEngineController], providers: [AiEngineService], exports: [AiEngineService] })
export class AiEngineModule {}
