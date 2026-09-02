import { Module } from '@nestjs/common';
import { AIDetectionService } from './ai-detection.service';
import { AIDetectionController } from './ai-detection.controller';

@Module({
  controllers: [AIDetectionController],
  providers: [AIDetectionService],
  exports: [AIDetectionService],
})
export class AIDetectionModule {}
