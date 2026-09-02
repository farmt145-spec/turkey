import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { EconomicsService } from './economics.service';
import { JwtAuthGuard } from '../../common/rbac/jwt-auth.guard';
import { RolesGuard } from '../../common/rbac/roles.guard';
import { Roles } from '../../common/rbac/roles.decorator';
import {
  CreateDailyCostDto,
  ProfitPredictorDto,
  ProfitPredictionResultDto,
  CreateScenarioDto,
  ScenarioResultDto,
  AIAdvisorDto,
  GenerateAdvisorDto,
  BenchmarkQueryDto,
  BenchmarkResultDto,
  CreateSaleRecordDto,
  SaleAnalysisDto,
  DashboardQueryDto,
  FinancialDashboardDto,
  GenerateExecutiveSummaryDto,
  ExecutiveSummaryDto,
} from './dto';

@ApiTags('Economics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('economics')
export class EconomicsController {
  constructor(private readonly economicsService: EconomicsService) {}

  // --- COSTS ---
  @Post('costs')
  @Roles('MANAGER', 'FARM_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create daily cost entry' })
  @ApiResponse({ status: 201, description: 'Cost entry created' })
  async createDailyCost(@Body() dto: CreateDailyCostDto, @Request() req) {
    return this.economicsService.createDailyCost(dto, req.user.userId);
  }

  @Get('costs/:batchId')
  @Roles('VIEWER', 'OPERATOR', 'MANAGER', 'FARM_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all costs for a batch' })
  async getBatchCosts(@Param('batchId') batchId: string) {
    return this.economicsService.getBatchCosts(batchId);
  }

  // --- AI PROFIT PREDICTOR ---
  @Post('predict')
  @Roles('MANAGER', 'FARM_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Predict profit for a batch' })
  @ApiResponse({ status: 200, type: ProfitPredictionResultDto })
  async predictProfit(@Body() dto: ProfitPredictorDto) {
    return this.economicsService.predictProfit(dto);
  }

  // --- SCENARIOS ---
  @Post('scenarios')
  @Roles('MANAGER', 'FARM_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create what-if scenario' })
  @ApiResponse({ status: 201, type: ScenarioResultDto })
  async createScenario(@Body() dto: CreateScenarioDto, @Request() req) {
    return this.economicsService.createScenario(dto, req.user.userId);
  }

  @Get('scenarios/:batchId')
  @Roles('VIEWER', 'OPERATOR', 'MANAGER', 'FARM_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get scenarios for a batch' })
  async getScenarios(@Param('batchId') batchId: string) {
    return this.economicsService.getScenarios(batchId);
  }

  // --- AI ADVISOR ---
  @Post('advisors/generate')
  @Roles('MANAGER', 'FARM_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Generate AI recommendations' })
  @ApiResponse({ status: 201, type: [AIAdvisorDto] })
  async generateAdvisors(@Body() dto: GenerateAdvisorDto) {
    return this.economicsService.generateAIRecommendations(dto.batchId);
  }

  @Get('advisors/:batchId')
  @Roles('VIEWER', 'OPERATOR', 'MANAGER', 'FARM_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get AI advisors for a batch' })
  async getAdvisors(@Param('batchId') batchId: string) {
    return this.economicsService.getAIAdvisors(batchId);
  }

  // --- BENCHMARKS ---
  @Get('benchmarks')
  @Roles('VIEWER', 'OPERATOR', 'MANAGER', 'FARM_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get benchmarks' })
  @ApiResponse({ status: 200, type: [BenchmarkResultDto] })
  async getBenchmarks(@Query() query: BenchmarkQueryDto) {
    return this.economicsService.getBenchmarks(query);
  }

  @Post('benchmarks/recalculate/:farmId')
  @Roles('MANAGER', 'FARM_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Recalculate benchmarks for farm' })
  async recalculateBenchmarks(
    @Param('farmId') farmId: string,
    @Query('period') period: string,
  ) {
    return this.economicsService.recalculateBenchmarks(farmId, period || 'current');
  }

  // --- SALES ---
  @Post('sales')
  @Roles('MANAGER', 'FARM_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Record a sale' })
  async createSale(@Body() dto: CreateSaleRecordDto, @Request() req) {
    return this.economicsService.createSaleRecord(dto, req.user.userId);
  }

  @Get('sales/analysis/:batchId')
  @Roles('VIEWER', 'OPERATOR', 'MANAGER', 'FARM_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Analyze optimal sale timing' })
  @ApiResponse({ status: 200, type: SaleAnalysisDto })
  async analyzeSale(@Param('batchId') batchId: string) {
    return this.economicsService.analyzeSale(batchId);
  }

  // --- DASHBOARD ---
  @Get('dashboard')
  @Roles('VIEWER', 'OPERATOR', 'MANAGER', 'FARM_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get financial dashboard' })
  @ApiResponse({ status: 200, type: FinancialDashboardDto })
  async getDashboard(@Query() query: DashboardQueryDto) {
    return this.economicsService.getDashboard(query);
  }

  // --- EXECUTIVE SUMMARY ---
  @Post('executive-summary')
  @Roles('MANAGER', 'FARM_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Generate executive summary' })
  @ApiResponse({ status: 201, type: ExecutiveSummaryDto })
  async generateExecutiveSummary(@Body() dto: GenerateExecutiveSummaryDto) {
    return this.economicsService.generateExecutiveSummary(dto);
  }
}
