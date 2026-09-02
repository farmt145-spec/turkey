import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service';
import { JwtAuthGuard } from '../../common/rbac/jwt-auth.guard';
import { RolesGuard } from '../../common/rbac/roles.guard';
import { Roles } from '../../common/rbac/roles.decorator';
import {
  CreateProductDto,
  CreateLotDto,
  CreateStockMovementDto,
  CreateTransferDto,
  ExecuteTransferDto,
  CreateAlertDto,
  ResolveAlertDto,
  InventoryQueryDto,
  TraceabilityQueryDto,
} from './dto';

@ApiTags('Warehouse')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  // --- PRODUCTS ---
  @Post('products')
  @Roles('MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create product' })
  async createProduct(@Body() dto: CreateProductDto, @Request() req) {
    return this.warehouseService.createProduct(dto, req.user.userId);
  }

  @Get('products')
  @Roles('VIEWER', 'OPERATOR', 'MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List products' })
  async getProducts(
    @Query('organizationId') orgId: string,
    @Query('category') category?: string,
  ) {
    return this.warehouseService.getProducts(orgId, category);
  }

  @Get('products/:id')
  @Roles('VIEWER', 'OPERATOR', 'MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get product details' })
  async getProduct(@Param('id') id: string) {
    return this.warehouseService.getProduct(id);
  }

  // --- LOTS ---
  @Post('lots')
  @Roles('MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create lot' })
  async createLot(@Body() dto: CreateLotDto, @Request() req) {
    return this.warehouseService.createLot(dto, req.user.userId);
  }

  @Get('lots')
  @Roles('VIEWER', 'OPERATOR', 'MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List lots' })
  async getLots(
    @Query('productId') productId?: string,
    @Query('status') status?: string,
  ) {
    return this.warehouseService.getLots(productId, status as any);
  }

  @Post('lots/traceability')
  @Roles('VIEWER', 'OPERATOR', 'MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Full traceability for a lot' })
  async getTraceability(@Body() query: TraceabilityQueryDto) {
    return this.warehouseService.getLotTraceability(query);
  }

  // --- STOCK MOVEMENTS ---
  @Post('movements')
  @Roles('OPERATOR', 'MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create stock movement' })
  async createMovement(@Body() dto: CreateStockMovementDto, @Request() req) {
    return this.warehouseService.createStockMovement(dto, req.user.userId);
  }

  // --- TRANSFERS ---
  @Post('transfers')
  @Roles('OPERATOR', 'MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create transfer' })
  async createTransfer(@Body() dto: CreateTransferDto, @Request() req) {
    return this.warehouseService.createTransfer(dto, req.user.userId);
  }

  @Post('transfers/execute')
  @Roles('MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Execute transfer' })
  async executeTransfer(@Body() dto: ExecuteTransferDto, @Request() req) {
    return this.warehouseService.executeTransfer(dto, req.user.userId);
  }

  @Get('transfers')
  @Roles('VIEWER', 'OPERATOR', 'MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List transfers' })
  async getTransfers(
    @Query('farmId') farmId?: string,
    @Query('status') status?: string,
  ) {
    return this.warehouseService.getTransfers(farmId, status as any);
  }

  // --- INVENTORY ---
  @Get('inventory')
  @Roles('VIEWER', 'OPERATOR', 'MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get inventory snapshot' })
  async getInventory(@Query() query: InventoryQueryDto) {
    return this.warehouseService.getInventory(query);
  }

  @Get('inventory/by-lot')
  @Roles('VIEWER', 'OPERATOR', 'MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get inventory by lot (FIFO/FEFO)' })
  async getInventoryByLot(@Query('productId') productId?: string) {
    return this.warehouseService.getInventoryByLot(productId);
  }

  // --- AI ANALYSIS ---
  @Post('ai/analyze/:productId')
  @Roles('MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Run AI warehouse analysis for product' })
  async analyzeProduct(
    @Param('productId') productId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.warehouseService.generateAIAnalysis(productId, warehouseId);
  }

  @Get('ai/substitutes/:productId')
  @Roles('MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Find substitute products' })
  async findSubstitutes(
    @Param('productId') productId: string,
    @Query('quantity') quantity: number,
  ) {
    return this.warehouseService.findSubstitutes(productId, quantity || 0);
  }

  // --- ALERTS ---
  @Post('alerts')
  @Roles('OPERATOR', 'MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create alert' })
  async createAlert(@Body() dto: CreateAlertDto, @Request() req) {
    return this.warehouseService.createAlert(dto, req.user.userId);
  }

  @Post('alerts/resolve')
  @Roles('OPERATOR', 'MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Resolve alert' })
  async resolveAlert(@Body() dto: ResolveAlertDto, @Request() req) {
    return this.warehouseService.resolveAlert(dto, req.user.userId);
  }

  @Get('alerts')
  @Roles('VIEWER', 'OPERATOR', 'MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List alerts' })
  async getAlerts(
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
    @Query('isResolved') isResolved?: string,
  ) {
    return this.warehouseService.getAlerts(
      warehouseId,
      productId,
      isResolved !== undefined ? isResolved === 'true' : undefined,
    );
  }

  @Post('alerts/scan/:organizationId')
  @Roles('MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Run automated alert scan' })
  async runAlertScan(@Param('organizationId') orgId: string, @Request() req) {
    return this.warehouseService.runAlertScan(orgId, req.user.userId);
  }

  // --- DASHBOARD ---
  @Get('dashboard/:organizationId')
  @Roles('VIEWER', 'OPERATOR', 'MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Warehouse dashboard' })
  async getDashboard(@Param('organizationId') orgId: string) {
    return this.warehouseService.getDashboard(orgId);
  }

  // --- RECIPE INTEGRATION ---
  @Post('recipes/reserve')
  @Roles('MANAGER', 'FARM_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Reserve ingredients for recipe (FIFO/FEFO)' })
  async reserveForRecipe(
    @Body() body: { recipeId: string; batchId: string; quantity: number },
    @Request() req,
  ) {
    return this.warehouseService.reserveForRecipe(
      body.recipeId,
      body.batchId,
      body.quantity,
      req.user.userId,
    );
  }
}
