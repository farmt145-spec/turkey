import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import {
  CreateProductDto,
  CreateLotDto,
  CreateStockMovementDto,
  CreateTransferDto,
  ExecuteTransferDto,
  CreateAlertDto,
  ResolveAlertDto,
  GenerateForecastDto,
  InventoryQueryDto,
  TraceabilityQueryDto,
} from './dto';
import { MovementType, MovementSubtype, TransferStatus, AlertType, AlertSeverity, LotStatus } from '@prisma/client';

@Injectable()
export class WarehouseService {
  private readonly logger = new Logger(WarehouseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ============================================================
  // PRODUCTS
  // ============================================================

  async createProduct(dto: CreateProductDto, userId: string) {
    const product = await this.prisma.product.create({ data: dto as any });
    await this.auditService.log({
      userId,
      action: 'CREATE_PRODUCT',
      entityType: 'Product',
      entityId: product.id,
      newValue: product,
    });
    return product;
  }

  async getProducts(organizationId: string, category?: string) {
    return this.prisma.product.findMany({
      where: { organizationId, ...(category ? { category } : {}) },
      include: { aiInsights: true },
    });
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { aiInsights: true, stockItems: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // ============================================================
  // LOTS & TRACEABILITY
  // ============================================================

  async createLot(dto: CreateLotDto, userId: string) {
    const lot = await this.prisma.lot.create({
      data: {
        ...dto as any,
        currentCost: dto.purchaseCost,
        remainingQuantity: dto.initialQuantity,
        receivedDate: new Date(),
      },
    });

    // Create initial stock movement
    await this.prisma.stockMovement.create({
      data: {
        lotId: lot.id,
        productId: dto.productId,
        type: MovementType.RECEIPT,
        subtype: MovementSubtype.PZ,
        quantity: dto.initialQuantity,
        unitCost: dto.purchaseCost,
        totalValue: dto.initialQuantity * dto.purchaseCost,
        performedBy: userId,
      },
    });

    await this.auditService.log({
      userId,
      action: 'CREATE_LOT',
      entityType: 'Lot',
      entityId: lot.id,
      newValue: lot,
    });

    return lot;
  }

  async getLots(productId?: string, status?: LotStatus) {
    return this.prisma.lot.findMany({
      where: { ...(productId ? { productId } : {}), ...(status ? { status } : {}) },
      include: { product: true, supplier: true },
      orderBy: { receivedDate: 'desc' },
    });
  }

  async getLotTraceability(query: TraceabilityQueryDto) {
    const lot = await this.prisma.lot.findUnique({
      where: { id: query.lotId },
      include: { product: true, supplier: true },
    });
    if (!lot) throw new NotFoundException('Lot not found');

    const movements = await this.prisma.stockMovement.findMany({
      where: { lotId: lot.id },
      orderBy: { performedAt: 'asc' },
      include: { lot: { include: { product: true } } },
    });

    // Aggregate consumption by batch
    const batchConsumption: Record<string, { batchId: string; totalConsumed: number; houseName: string }> = {};
    for (const m of movements) {
      if (m.batchId && m.type === MovementType.CONSUMPTION) {
        if (!batchConsumption[m.batchId]) {
          const batch = await this.prisma.batch.findUnique({
            where: { id: m.batchId },
            include: { house: true },
          });
          batchConsumption[m.batchId] = {
            batchId: m.batchId,
            totalConsumed: 0,
            houseName: batch?.house?.name || 'Unknown',
          };
        }
        batchConsumption[m.batchId].totalConsumed += m.quantity;
      }
    }

    const totalConsumed = movements
      .filter((m) => m.type === MovementType.CONSUMPTION)
      .reduce((s, m) => s + m.quantity, 0);

    const totalTransferred = movements
      .filter((m) => m.type === MovementType.TRANSFER)
      .reduce((s, m) => s + m.quantity, 0);

    let finalDestination = 'W magazynie';
    if (totalConsumed >= lot.initialQuantity * 0.95) finalDestination = 'Zużyto w produkcji';
    else if (lot.status === 'EXPIRED') finalDestination = 'Przeterminowane';
    else if (lot.status === 'RETURNED') finalDestination = 'Zwrócone dostawcy';

    return {
      lotId: lot.id,
      lotNumber: lot.lotNumber,
      productName: lot.product.name,
      supplierName: lot.supplier?.name || 'N/A',
      productionDate: lot.productionDate,
      receivedDate: lot.receivedDate,
      expiryDate: lot.expiryDate,
      initialQuantity: lot.initialQuantity,
      remainingQuantity: lot.remainingQuantity,
      movements: movements.map((m) => ({
        id: m.id,
        type: m.type,
        subtype: m.subtype,
        quantity: m.quantity,
        date: m.performedAt,
        batchId: m.batchId,
        houseName: m.toHouseId ? 'Kurnik' : undefined,
        documentNumber: m.documentNumber,
      })),
      batchesFed: Object.values(batchConsumption),
      finalDestination,
    };
  }

  // ============================================================
  // STOCK MOVEMENTS (Receipts & Issues)
  // ============================================================

  async createStockMovement(dto: CreateStockMovementDto, userId: string) {
    const totalValue = dto.quantity * dto.unitCost;

    // Validate lot if provided
    if (dto.lotId) {
      const lot = await this.prisma.lot.findUnique({ where: { id: dto.lotId } });
      if (!lot) throw new NotFoundException('Lot not found');
      if (lot.remainingQuantity < dto.quantity && dto.type === MovementType.ISSUE) {
        throw new BadRequestException('Insufficient lot quantity');
      }
    }

    const movement = await this.prisma.stockMovement.create({
      data: {
        ...dto as any,
        totalValue,
        performedBy: userId,
      },
    });

    // Update lot remaining quantity
    if (dto.lotId) {
      const lot = await this.prisma.lot.findUnique({ where: { id: dto.lotId } });
      if (lot) {
        const delta = dto.type === MovementType.RECEIPT ? dto.quantity : -dto.quantity;
        await this.prisma.lot.update({
          where: { id: dto.lotId },
          data: {
            remainingQuantity: Math.max(0, lot.remainingQuantity + delta),
            status: lot.remainingQuantity + delta <= 0 ? 'DEPLETED' : lot.status,
          },
        });
      }
    }

    // Update stock items (simplified inventory)
    await this.updateStockItem(dto);

    await this.auditService.log({
      userId,
      action: `STOCK_${dto.type}`,
      entityType: 'StockMovement',
      entityId: movement.id,
      newValue: movement,
    });

    return movement;
  }

  private async updateStockItem(dto: CreateStockMovementDto) {
    // For receipts: add to destination
    if (dto.type === MovementType.RECEIPT && dto.toWarehouseId) {
      const existing = await this.prisma.stockItem.findFirst({
        where: {
          productId: dto.productId,
          warehouseId: dto.toWarehouseId,
          zoneId: dto.toZoneId || null,
          locationId: dto.toLocationId || null,
        },
      });

      if (existing) {
        const newQty = existing.quantity + dto.quantity;
        await this.prisma.stockItem.update({
          where: { id: existing.id },
          data: {
            quantity: newQty,
            available: newQty - existing.reserved,
            totalValue: newQty * dto.unitCost,
          },
        });
      } else {
        await this.prisma.stockItem.create({
          data: {
            productId: dto.productId,
            warehouseId: dto.toWarehouseId,
            zoneId: dto.toZoneId,
            locationId: dto.toLocationId,
            quantity: dto.quantity,
            available: dto.quantity,
            reserved: 0,
            unitCost: dto.unitCost,
            totalValue: dto.quantity * dto.unitCost,
          },
        });
      }
    }

    // For issues: subtract from source
    if ((dto.type === MovementType.ISSUE || dto.type === MovementType.CONSUMPTION) && dto.fromWarehouseId) {
      const existing = await this.prisma.stockItem.findFirst({
        where: {
          productId: dto.productId,
          warehouseId: dto.fromWarehouseId,
        },
      });

      if (existing) {
        const newQty = Math.max(0, existing.quantity - dto.quantity);
        await this.prisma.stockItem.update({
          where: { id: existing.id },
          data: {
            quantity: newQty,
            available: newQty - existing.reserved,
            totalValue: newQty * Number(existing.unitCost),
          },
        });
      }
    }
  }

  // ============================================================
  // TRANSFERS
  // ============================================================

  async createTransfer(dto: CreateTransferDto, userId: string) {
    const transfer = await this.prisma.transfer.create({
      data: {
        type: dto.type,
        farmId: dto.farmId,
        fromWarehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        fromSiloId: dto.fromSiloId,
        toSiloId: dto.toSiloId,
        fromHouseId: dto.fromHouseId,
        toHouseId: dto.toHouseId,
        fromFarmId: dto.fromFarmId,
        toFarmId: dto.toFarmId,
        notes: dto.notes,
        documentNumber: dto.documentNumber,
        requestedBy: userId,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            lotId: item.lotId,
            quantity: item.quantity,
            unit: item.unit || 'kg',
            unitCost: item.unitCost || 0,
            notes: item.notes,
          })),
        },
      },
      include: { items: true },
    });

    await this.auditService.log({
      userId,
      action: 'CREATE_TRANSFER',
      entityType: 'Transfer',
      entityId: transfer.id,
      newValue: transfer,
    });

    return transfer;
  }

  async executeTransfer(dto: ExecuteTransferDto, userId: string) {
    const transfer = await this.prisma.transfer.findUnique({
      where: { id: dto.transferId },
      include: { items: true },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'PENDING' && transfer.status !== 'APPROVED') {
      throw new BadRequestException('Transfer cannot be executed');
    }

    // Execute each item as stock movement
    for (const item of transfer.items) {
      // Outbound movement
      await this.createStockMovement({
        productId: item.productId,
        lotId: item.lotId || undefined,
        type: MovementType.TRANSFER,
        subtype: this.mapTransferSubtype(transfer.type, 'out'),
        quantity: item.quantity,
        unitCost: Number(item.unitCost),
        fromWarehouseId: transfer.fromWarehouseId || undefined,
        fromSiloId: transfer.fromSiloId || undefined,
        fromHouseId: transfer.fromHouseId || undefined,
        toWarehouseId: transfer.toWarehouseId || undefined,
        toSiloId: transfer.toSiloId || undefined,
        toHouseId: transfer.toHouseId || undefined,
      }, userId);

      // Inbound movement
      await this.createStockMovement({
        productId: item.productId,
        lotId: item.lotId || undefined,
        type: MovementType.RECEIPT,
        subtype: this.mapTransferSubtype(transfer.type, 'in'),
        quantity: item.quantity,
        unitCost: Number(item.unitCost),
        fromWarehouseId: transfer.fromWarehouseId || undefined,
        toWarehouseId: transfer.toWarehouseId || undefined,
        toSiloId: transfer.toSiloId || undefined,
        toHouseId: transfer.toHouseId || undefined,
      }, userId);
    }

    const updated = await this.prisma.transfer.update({
      where: { id: dto.transferId },
      data: { status: 'COMPLETED', executedBy: userId, executedAt: new Date(), completedAt: new Date() },
      include: { items: true },
    });

    return updated;
  }

  private mapTransferSubtype(type: string, direction: 'in' | 'out'): MovementSubtype {
    const map: Record<string, { in: MovementSubtype; out: MovementSubtype }> = {
      WAREHOUSE_TO_WAREHOUSE: { in: MovementSubtype.TRANSFER_IN, out: MovementSubtype.WZ },
      SILO_TO_SILO: { in: MovementSubtype.TRANSFER_IN, out: MovementSubtype.WZ },
      FARM_TO_FARM: { in: MovementSubtype.TRANSFER_IN, out: MovementSubtype.WZ },
      BROODER_TO_HOUSE: { in: MovementSubtype.BROODER_IN, out: MovementSubtype.RW },
      HOUSE_TO_HOUSE: { in: MovementSubtype.TRANSFER_IN, out: MovementSubtype.RW },
      HOUSE_TO_SALE: { in: MovementSubtype.SALE, out: MovementSubtype.RW },
      HOUSE_TO_DISPOSAL: { in: MovementSubtype.DISPOSAL, out: MovementSubtype.RW },
    };
    return map[type]?.[direction] || MovementSubtype.ADJUST;
  }

  async getTransfers(farmId?: string, status?: TransferStatus) {
    return this.prisma.transfer.findMany({
      where: { ...(farmId ? { farmId } : {}), ...(status ? { status } : {}) },
      include: { items: { include: { product: true } } },
      orderBy: { requestedAt: 'desc' },
    });
  }

  // ============================================================
  // INVENTORY
  // ============================================================

  async getInventory(query: InventoryQueryDto) {
    const where: any = {};
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.zoneId) where.zoneId = query.zoneId;
    if (query.productId) where.productId = query.productId;

    const items = await this.prisma.stockItem.findMany({
      where,
      include: { product: true, warehouse: true, zone: true, location: true },
    });

    return items.map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      productSku: item.product.sku,
      category: item.product.category,
      warehouseId: item.warehouseId,
      warehouseName: item.warehouse.name,
      zoneId: item.zoneId,
      locationId: item.locationId,
      quantity: item.quantity,
      reserved: item.reserved,
      available: item.available,
      unitCost: Number(item.unitCost),
      totalValue: Number(item.totalValue),
      reorderPoint: item.product.reorderPoint,
      isLowStock: item.available <= item.product.reorderPoint,
    }));
  }

  async getInventoryByLot(productId?: string) {
    const lots = await this.prisma.lot.findMany({
      where: { ...(productId ? { productId } : {}), status: 'ACTIVE' },
      include: { product: true },
      orderBy: { expiryDate: 'asc' },
    });

    return lots.map((lot) => ({
      lotId: lot.id,
      lotNumber: lot.lotNumber,
      productId: lot.productId,
      productName: lot.product.name,
      productSku: lot.product.sku,
      remainingQuantity: lot.remainingQuantity,
      unitCost: Number(lot.currentCost),
      totalValue: lot.remainingQuantity * Number(lot.currentCost),
      expiryDate: lot.expiryDate,
      daysToExpiry: lot.expiryDate
        ? Math.ceil((new Date(lot.expiryDate).getTime() - Date.now()) / 86400000)
        : null,
      isExpiringSoon: lot.expiryDate
        ? (new Date(lot.expiryDate).getTime() - Date.now()) / 86400000 < 30
        : false,
    }));
  }

  // ============================================================
  // AI WAREHOUSE ANALYSIS
  // ============================================================

  async generateAIAnalysis(productId: string, warehouseId?: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    // Get last 90 days of movements
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
    const movements = await this.prisma.stockMovement.findMany({
      where: {
        productId,
        ...(warehouseId ? { toWarehouseId: warehouseId } : {}),
        type: MovementType.CONSUMPTION,
        performedAt: { gte: ninetyDaysAgo },
      },
      orderBy: { performedAt: 'asc' },
    });

    const totalConsumed = movements.reduce((s, m) => s + m.quantity, 0);
    const avgDailyConsumption = totalConsumed / 90;

    // Current stock
    const stockItems = await this.prisma.stockItem.findMany({
      where: { productId, ...(warehouseId ? { warehouseId } : {}) },
    });
    const currentStock = stockItems.reduce((s, item) => s + item.quantity, 0);
    const daysOfSupply = avgDailyConsumption > 0 ? currentStock / avgDailyConsumption : 999;

    // Stockout risk
    const stockoutRisk = daysOfSupply < product.leadTimeDays ? 0.8 : daysOfSupply < product.leadTimeDays * 2 ? 0.4 : 0.1;

    // Expiry risk (check lots)
    const lots = await this.prisma.lot.findMany({
      where: { productId, status: 'ACTIVE', expiryDate: { not: null } },
    });
    const expiringLots = lots.filter((l) => l.expiryDate && (new Date(l.expiryDate).getTime() - Date.now()) / 86400000 < 30);
    const expiryRisk = expiringLots.length > 0 ? Math.min(1, expiringLots.reduce((s, l) => s + l.remainingQuantity, 0) / currentStock) : 0;

    // Rotation score
    const rotationScore = lots.length > 0 ? Math.round((lots.filter((l) => l.remainingQuantity > 0).length / lots.length) * 100) : 100;

    // Forecasts
    const predictedStockoutDate = avgDailyConsumption > 0
      ? new Date(Date.now() + daysOfSupply * 86400000)
      : null;
    const recommendedOrderQty = Math.max(0, (product.reorderPoint + product.safetyStock) - currentStock);
    const recommendedOrderDate = avgDailyConsumption > 0
      ? new Date(Date.now() + Math.max(0, (currentStock - product.reorderPoint) / avgDailyConsumption) * 86400000)
      : null;

    // Best supplier
    const suppliers = await this.prisma.supplier.findMany({
      where: { lots: { some: { productId } } },
      orderBy: { qualityScore: 'desc' },
      take: 1,
    });
    const bestSupplier = suppliers[0];

    const analysis = await this.prisma.warehouseAIAnalysis.create({
      data: {
        productId,
        warehouseId,
        analysisType: 'FORECAST',
        avgDailyConsumption,
        currentStock,
        daysOfSupply,
        stockoutRisk,
        expiryRisk,
        rotationScore,
        predictedStockoutDate,
        recommendedOrderQty,
        recommendedOrderDate,
        bestSupplierId: bestSupplier?.id,
      },
    });

    return {
      productId,
      productName: product.name,
      currentStock,
      avgDailyConsumption: Math.round(avgDailyConsumption * 100) / 100,
      daysOfSupply: Math.round(daysOfSupply * 10) / 10,
      predictedStockoutDate,
      recommendedOrderQty: Math.round(recommendedOrderQty * 100) / 100,
      recommendedOrderDate,
      bestSupplierId: bestSupplier?.id,
      bestSupplierName: bestSupplier?.name,
      stockoutRisk: Math.round(stockoutRisk * 100),
      expiryRisk: Math.round(expiryRisk * 100),
      rotationScore,
    };
  }

  // ============================================================
  // ALERTS
  // ============================================================

  async createAlert(dto: CreateAlertDto, userId: string) {
    const alert = await this.prisma.warehouseAlert.create({
      data: {
        ...dto as any,
      },
    });

    await this.auditService.log({
      userId,
      action: 'CREATE_ALERT',
      entityType: 'WarehouseAlert',
      entityId: alert.id,
      newValue: alert,
    });

    return alert;
  }

  async resolveAlert(dto: ResolveAlertDto, userId: string) {
    const alert = await this.prisma.warehouseAlert.update({
      where: { id: dto.alertId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
    });

    await this.auditService.log({
      userId,
      action: 'RESOLVE_ALERT',
      entityType: 'WarehouseAlert',
      entityId: alert.id,
      newValue: alert,
    });

    return alert;
  }

  async getAlerts(warehouseId?: string, productId?: string, isResolved?: boolean) {
    return this.prisma.warehouseAlert.findMany({
      where: {
        ...(warehouseId ? { warehouseId } : {}),
        ...(productId ? { productId } : {}),
        ...(isResolved !== undefined ? { isResolved } : {}),
      },
      orderBy: [
        { severity: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async runAlertScan(organizationId: string, userId: string) {
    const alerts: any[] = [];

    // 1. Low stock alerts
    const products = await this.prisma.product.findMany({
      where: { organizationId, isActive: true },
      include: { stockItems: true },
    });

    for (const product of products) {
      const totalStock = product.stockItems.reduce((s, item) => s + item.quantity, 0);
      if (totalStock <= product.reorderPoint && product.reorderPoint > 0) {
        const alert = await this.prisma.warehouseAlert.create({
          data: {
            type: AlertType.LOW_STOCK,
            severity: totalStock <= product.safetyStock ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
            productId: product.id,
            message: `Niski stan magazynowy: ${product.name} (${totalStock} ${product.unit})`,
            details: { currentStock: totalStock, reorderPoint: product.reorderPoint },
          },
        });
        alerts.push(alert);
      }
    }

    // 2. Expiry alerts
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000);
    const expiringLots = await this.prisma.lot.findMany({
      where: {
        status: 'ACTIVE',
        expiryDate: { lte: thirtyDaysFromNow, gte: new Date() },
      },
      include: { product: true },
    });

    for (const lot of expiringLots) {
      const daysLeft = Math.ceil((new Date(lot.expiryDate!).getTime() - Date.now()) / 86400000);
      const alert = await this.prisma.warehouseAlert.create({
        data: {
          type: daysLeft <= 0 ? AlertType.EXPIRED : AlertType.EXPIRING_SOON,
          severity: daysLeft <= 7 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
          productId: lot.productId,
          lotId: lot.id,
          message: `${daysLeft <= 0 ? 'Przeterminowana' : 'Kończy ważność'} partia: ${lot.lotNumber} — ${lot.product.name} (${daysLeft} dni)`,
          details: { lotNumber: lot.lotNumber, daysLeft, remainingQty: lot.remainingQuantity },
        },
      });
      alerts.push(alert);
    }

    // 3. Feed shortage (critical for production)
    const feedProducts = products.filter((p) => p.category === 'FEED_READY' || p.category === 'FEED_RAW');
    for (const product of feedProducts) {
      const totalStock = product.stockItems.reduce((s, item) => s + item.quantity, 0);
      if (totalStock === 0) {
        const alert = await this.prisma.warehouseAlert.create({
          data: {
            type: AlertType.FEED_SHORTAGE,
            severity: AlertSeverity.EMERGENCY,
            productId: product.id,
            message: `BRAK PASZY: ${product.name} — natychmiastowe zamówienie wymagane`,
            details: { productSku: product.sku },
          },
        });
        alerts.push(alert);
      }
    }

    await this.auditService.log({
      userId,
      action: 'ALERT_SCAN',
      entityType: 'WarehouseAlert',
      entityId: 'batch',
      newValue: { count: alerts.length },
    });

    return { generated: alerts.length, alerts };
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  async getDashboard(organizationId: string) {
    const [products, lots, stockItems, transfers, alerts] = await Promise.all([
      this.prisma.product.count({ where: { organizationId } }),
      this.prisma.lot.count({ where: { product: { organizationId }, status: 'ACTIVE' } }),
      this.prisma.stockItem.findMany({
        where: { product: { organizationId } },
        include: { product: true },
      }),
      this.prisma.transfer.count({ where: { farm: { organizationId } } }),
      this.prisma.warehouseAlert.count({ where: { isResolved: false } }),
    ]);

    const totalValue = stockItems.reduce((s, item) => s + Number(item.totalValue), 0);
    const lowStockCount = stockItems.filter((item) => item.available <= item.product.reorderPoint).length;

    // Top consumed products
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
    const consumption = await this.prisma.stockMovement.groupBy({
      by: ['productId'],
      where: {
        type: MovementType.CONSUMPTION,
        performedAt: { gte: ninetyDaysAgo },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const topConsumed = await Promise.all(
      consumption.map(async (c) => {
        const product = await this.prisma.product.findUnique({ where: { id: c.productId } });
        return { name: product?.name || 'Unknown', quantity: c._sum.quantity || 0 };
      }),
    );

    return {
      totalProducts: products,
      activeLots: lots,
      totalInventoryValue: Math.round(totalValue),
      totalTransfers: transfers,
      activeAlerts: alerts,
      lowStockItems: lowStockCount,
      topConsumed,
    };
  }

  // ============================================================
  // RECIPE INTEGRATION (FIFO/FEFO)
  // ============================================================

  async reserveForRecipe(recipeId: string, batchId: string, quantity: number, userId: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { ingredients: { include: { product: true } } },
    });
    if (!recipe) throw new NotFoundException('Recipe not found');

    const reservations: any[] = [];

    for (const ingredient of recipe.ingredients) {
      const requiredQty = (quantity * ingredient.percentage) / 100;

      // FEFO: Get lots with earliest expiry first
      const lots = await this.prisma.lot.findMany({
        where: {
          productId: ingredient.productId,
          status: 'ACTIVE',
          remainingQuantity: { gt: 0 },
        },
        orderBy: { expiryDate: 'asc' },
      });

      let remainingToReserve = requiredQty;
      for (const lot of lots) {
        if (remainingToReserve <= 0) break;
        const reserveQty = Math.min(remainingToReserve, lot.remainingQuantity);

        // Create reservation
        await this.prisma.lotItem.create({
          data: {
            lotId: lot.id,
            productId: ingredient.productId,
            quantity: reserveQty,
            reserved: reserveQty,
            status: 'RESERVED',
          },
        });

        reservations.push({
          productId: ingredient.productId,
          productName: ingredient.product.name,
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          reservedQty: reserveQty,
          unitCost: Number(lot.currentCost),
        });

        remainingToReserve -= reserveQty;
      }

      if (remainingToReserve > 0) {
        throw new BadRequestException(
          `Brak wystarczającej ilości ${ingredient.product.name} (brakuje ${remainingToReserve} ${ingredient.product.unit})`,
        );
      }
    }

    // Calculate recipe cost
    const totalCost = reservations.reduce((s, r) => s + r.reservedQty * r.unitCost, 0);

    await this.auditService.log({
      userId,
      action: 'RESERVE_RECIPE',
      entityType: 'Recipe',
      entityId: recipeId,
      newValue: { batchId, reservations, totalCost },
    });

    return { recipeId, batchId, reservations, totalCost };
  }

  async findSubstitutes(productId: string, requiredQty: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId });
    if (!product) throw new NotFoundException('Product not found');

    // Find products in same category with available stock
    const substitutes = await this.prisma.product.findMany({
      where: {
        category: product.category,
        id: { not: productId },
        stockItems: { some: { available: { gte: requiredQty } } },
      },
      include: { stockItems: true, aiInsights: true },
    });

    return substitutes.map((sub) => ({
      productId: sub.id,
      name: sub.name,
      sku: sub.sku,
      availableStock: sub.stockItems.reduce((s, item) => s + item.available, 0),
      unitCost: sub.stockItems[0]?.unitCost || 0,
      fcrImpact: sub.fcrImpact,
      adgImpact: sub.adgImpact,
      healthImpact: sub.healthImpact,
      bestPractice: sub.bestPractices,
    }));
  }
}
