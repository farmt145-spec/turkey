import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RecipeService } from '../services/recipe.service';
import { AlertService } from '../services/alert.service';
import { DashboardService } from '../services/dashboard.service';
import { AIService } from '../services/ai.service';
import { ExpertService } from '../services/expert/expert.service';
import { ExperimentService } from '../services/experiment/experiment.service';
import { ForecastService } from '../services/forecast/forecast.service';
import { ComparisonService } from '../services/expert/comparison.service';
import { KnowledgeService } from '../services/knowledge/knowledge.service';
import { 
  CreateRecipeDto, UpdateRecipeDto, GenerateRecipeDto, 
  SimulateChangeDto, RecipeResponseDto 
} from '../dto/recipe.dto';
import { ExpertAnalysisRequestDto, ExplainWhyRequestDto, CreateExpertProfileDto } from '../dto/expert/expert.dto';
import { CreateExperimentDto, ExperimentResponseDto } from '../dto/experiment/experiment.dto';
import { GenerateForecastDto, ForecastResponseDto, ForecastAccuracyResponseDto } from '../dto/forecast/forecast.dto';
import { CompareRecipesDto, ComparisonResponseDto } from '../dto/expert/comparison.dto';
import { SearchKnowledgeDto, CreateKnowledgeEntryDto } from '../dto/knowledge/knowledge.dto';

@ApiTags('Feed & Nutrition v2.0 — Turkey Nutrition Intelligence Engine')
@ApiBearerAuth()
@Controller('feed')
export class FeedController {
  constructor(
    private readonly recipeService: RecipeService,
    private readonly alertService: AlertService,
    private readonly dashboardService: DashboardService,
    private readonly aiService: AIService,
    private readonly expertService: ExpertService,
    private readonly experimentService: ExperimentService,
    private readonly forecastService: ForecastService,
    private readonly comparisonService: ComparisonService,
    private readonly knowledgeService: KnowledgeService,
  ) {}

  // ==================== RECEPTURY (v1.0) ====================
  @Post('recipes')
  @ApiOperation({ summary: 'Utwórz nową recepturę' })
  async createRecipe(@Body() dto: CreateRecipeDto) {
    return this.recipeService.create('system', dto);
  }

  @Get('recipes')
  @ApiOperation({ summary: 'Pobierz listę receptur' })
  async getRecipes(@Query('isActive') isActive?: string) {
    return this.recipeService.findAll({
      where: isActive !== undefined ? { isActive: isActive === 'true' } : undefined,
    });
  }

  @Get('recipes/:id')
  @ApiOperation({ summary: 'Pobierz szczegóły receptury' })
  async getRecipe(@Param('id', ParseUUIDPipe) id: string) {
    return this.recipeService.findOne(id);
  }

  @Put('recipes/:id')
  @ApiOperation({ summary: 'Aktualizuj recepturę' })
  async updateRecipe(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRecipeDto) {
    return this.recipeService.update(id, 'system', dto);
  }

  @Delete('recipes/:id')
  @ApiOperation({ summary: 'Usuń recepturę' })
  async deleteRecipe(@Param('id', ParseUUIDPipe) id: string) {
    return this.recipeService.delete(id, 'system');
  }

  // ==================== GENERATOR AI ====================
  @Post('recipes/generate')
  @ApiOperation({ summary: 'Wygeneruj recepturę AI', description: 'Automatycznie tworzy optymalną recepturę na podstawie parametrów produkcyjnych.' })
  async generateRecipe(@Body() dto: GenerateRecipeDto) {
    return this.recipeService.generateRecipe('system', dto);
  }

  // ==================== SYMULATOR (v1.0) ====================
  @Post('recipes/simulate')
  @ApiOperation({ summary: 'Symuluj zmianę składnika' })
  async simulateChange(@Body() dto: SimulateChangeDto) {
    return this.recipeService.simulateChange(dto.recipeId, dto.ingredientId, dto.percentageChange);
  }

  // ==================== EKSPERTYZA AI v2.0 ====================

  @Post('expert/analyze-decision')
  @ApiOperation({ 
    summary: 'Analiza decyzji eksperta AI',
    description: 'Odpowiada na: Dlaczego to zrobiłem? Co poprawiłem? Jakie są zagrożenia? Jak wpłynie to na produkcję? Czy istnieje lepsza alternatywa?'
  })
  @ApiResponse({ status: 200, description: 'Pełna analiza ekspercka decyzji' })
  async analyzeDecision(@Body() dto: ExpertAnalysisRequestDto) {
    return this.expertService.analyzeDecision(dto.recipeId, dto.decisionType, dto.materialId);
  }

  @Post('expert/explain-why')
  @ApiOperation({ 
    summary: 'Wyjaśnij "Dlaczego?" — prosty język',
    description: 'AI tłumaczy prostym językiem dlaczego dany składnik jest w recepturze.'
  })
  async explainWhy(@Body() dto: ExplainWhyRequestDto) {
    return this.expertService.explainWhy(dto.recipeId, dto.materialId, dto.context);
  }

  @Get('expert/ingredient-card/:materialId')
  @ApiOperation({ 
    summary: 'Karta ekspercka składnika',
    description: 'Pełna karta ekspercka: opis, strawność, wpływ na FCR/ADG/EPEF/jelita/odporność/ściółkę/wodę/nogi/tuszę, ryzyka, objawy, interakcje, bibliografia.'
  })
  async getIngredientExpertCard(@Param('materialId', ParseUUIDPipe) materialId: string) {
    return this.expertService.getIngredientExpertCard(materialId);
  }

  @Post('expert/profiles')
  @ApiOperation({ summary: 'Utwórz profil ekspercki surowca' })
  async createExpertProfile(@Body() dto: CreateExpertProfileDto) {
    return this.prisma.materialExpertProfile.create({
      data: { ...dto, updatedBy: 'system' } as any,
    });
  }

  // ==================== WIRTUALNY EKSPERYMENT v2.0 ====================

  @Post('experiments')
  @ApiOperation({ 
    summary: 'Utwórz eksperyment "Co będzie jeśli..."',
    description: 'Symuluj scenariusze: usunięcie składnika, zwiększenie DDGS, zmiana lizyny, itp. System pokazuje natychmiastowy wpływ na FCR, ADG, koszt, zdrowie, pobór paszy i wody.'
  })
  @ApiResponse({ status: 201, type: ExperimentResponseDto })
  async createExperiment(@Body() dto: CreateExperimentDto) {
    return this.experimentService.createExperiment('system', dto.recipeId, dto.name, dto.changes);
  }

  @Get('experiments/:id')
  @ApiOperation({ summary: 'Pobierz wyniki eksperymentu' })
  async getExperiment(@Param('id', ParseUUIDPipe) id: string) {
    return this.experimentService.getExperiment(id);
  }

  // ==================== PROGNOZY RZUTU v2.0 ====================

  @Post('forecasts')
  @ApiOperation({ 
    summary: 'Generuj prognozę rzutu',
    description: 'Prognoza zużycia paszy, kosztów, FCR, ADG, EPEF, śmiertelności, kosztu produkcji i marży dla całego cyklu tuczu.'
  })
  @ApiResponse({ status: 201, type: ForecastResponseDto })
  async generateForecast(@Body() dto: GenerateForecastDto) {
    return this.forecastService.generateForecast(dto.batchId, dto.recipeId);
  }

  @Post('forecasts/:id/analyze-accuracy')
  @ApiOperation({ 
    summary: 'Analizuj dokładność prognozy — samouczenie AI',
    description: 'AI porównuje prognozę z rzeczywistymi wynikami, identyfikuje błędy, wyciąga wnioski i koryguje model.'
  })
  @ApiResponse({ status: 200, type: ForecastAccuracyResponseDto })
  async analyzeForecastAccuracy(@Param('id', ParseUUIDPipe) id: string) {
    return this.forecastService.analyzeForecastAccuracy(id, 'system');
  }

  // ==================== PORÓWNANIE RECEPTUR v2.0 ====================

  @Post('comparisons')
  @ApiOperation({ 
    summary: 'Porównaj dwie receptury',
    description: 'AI wskazuje która receptura jest lepsza, uzasadnia werdykt, pokazuje różnice kosztów, FCR, ADG, zdrowotności i składników.'
  })
  @ApiResponse({ status: 201, type: ComparisonResponseDto })
  async compareRecipes(@Body() dto: CompareRecipesDto) {
    return this.comparisonService.compareRecipes(dto.recipeAId, dto.recipeBId, 'system');
  }

  // ==================== BIBLIOTEKA WIEDZY v2.0 ====================

  @Get('knowledge/search')
  @ApiOperation({ 
    summary: 'Wyszukaj w bibliotece wiedzy',
    description: 'Publikacje naukowe, zalecenia producentów, normy żywieniowe, typowe błędy, wskazówki ekspertów.'
  })
  async searchKnowledge(@Query() dto: SearchKnowledgeDto) {
    return this.knowledgeService.searchKnowledge(dto.query, dto.materialId, dto.type, dto.phase);
  }

  @Get('knowledge/material/:materialId')
  @ApiOperation({ summary: 'Pobierz wiedzę o surowcu' })
  async getMaterialKnowledge(@Param('materialId', ParseUUIDPipe) materialId: string) {
    return this.knowledgeService.getMaterialKnowledge(materialId);
  }

  @Post('knowledge/entries')
  @ApiOperation({ summary: 'Dodaj wpis do biblioteki wiedzy' })
  async addKnowledgeEntry(@Body() dto: CreateKnowledgeEntryDto) {
    return this.knowledgeService.addKnowledgeEntry(dto);
  }

  // ==================== ALARMY (v1.0) ====================
  @Get('alerts')
  @ApiOperation({ summary: 'Pobierz aktywne alarmy' })
  async getAlerts(@Query('severity') severity?: string) {
    return this.alertService.findAll({ where: severity ? { severity: severity as any } : { status: 'ACTIVE' } });
  }

  @Post('alerts/:id/acknowledge')
  @ApiOperation({ summary: 'Potwierdź alarm' })
  async acknowledgeAlert(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertService.acknowledge(id, 'system');
  }

  // ==================== DASHBOARD (v1.0) ====================
  @Get('dashboard')
  @ApiOperation({ summary: 'Pobierz dane dashboardu żywienia' })
  async getDashboard() {
    return this.dashboardService.getDashboardData();
  }

  // ==================== AI LEARNING (v1.0) ====================
  @Post('batches/:batchId/analyze')
  @ApiOperation({ summary: 'Analizuj wyniki rzutu AI' })
  async analyzeBatch(@Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.aiService.analyzeProductionResults(batchId);
  }

  // ==================== EKONOMIKA (v1.0) ====================
  @Get('recipes/:id/economics')
  @ApiOperation({ summary: 'Pobierz szczegółową analizę ekonomiczną receptury' })
  async getEconomics(@Param('id', ParseUUIDPipe) id: string) {
    const recipe = await this.recipeService.findOne(id);
    return {
      costPerTon: recipe.costPerTon,
      costPerKg: recipe.costPerKg,
      ingredientsBreakdown: recipe.ingredients.map(ing => ({
        name: ing.rawMaterial.name,
        percentage: ing.percentage,
        costPerTon: ing.costPerTon,
        shareOfTotalCost: (ing.costPerTon / recipe.costPerTon) * 100,
      })),
    };
  }
}
