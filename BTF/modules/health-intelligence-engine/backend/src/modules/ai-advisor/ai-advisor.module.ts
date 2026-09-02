import { Module } from '@nestjs/common';
import { AIAdvisorService } from './ai-advisor.service';
import { AIAdvisorController } from './ai-advisor.controller';

@Module({
  controllers: [AIAdvisorController],
  providers: [AIAdvisorService],
  exports: [AIAdvisorService],
})
export class AIAdvisorModule {}
