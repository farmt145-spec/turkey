import { Module } from '@nestjs/common';
import { FeedController } from './controllers/feed.controller';
import { RecipeService } from './services/recipe.service';
import { AIService } from './services/ai.service';
import { OptimizationService } from './services/optimization.service';
import { AlertService } from './services/alert.service';
import { DashboardService } from './services/dashboard.service';
import { ExpertService } from './services/expert/expert.service';
import { ExperimentService } from './services/experiment/experiment.service';
import { ForecastService } from './services/forecast/forecast.service';
import { ComparisonService } from './services/expert/comparison.service';
import { KnowledgeService } from './services/knowledge/knowledge.service';

@Module({
  controllers: [FeedController],
  providers: [
    RecipeService,
    AIService,
    OptimizationService,
    AlertService,
    DashboardService,
    ExpertService,
    ExperimentService,
    ForecastService,
    ComparisonService,
    KnowledgeService,
  ],
  exports: [RecipeService, AIService, AlertService, DashboardService, ExpertService, ForecastService],
})
export class FeedModule {}
