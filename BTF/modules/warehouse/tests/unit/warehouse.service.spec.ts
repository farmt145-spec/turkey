import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseService } from '../src/modules/warehouse/warehouse.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/modules/common/audit/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MovementType, MovementSubtype } from '@prisma/client';

describe('WarehouseService', () => {
  let service: WarehouseService;

  const mockPrisma = {
    product: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
    lot: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), count: jest.fn() },
    stockMovement: { create: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
    stockItem: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    transfer: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), count: jest.fn() },
    warehouseAlert: { create: jest.fn(), findMany: jest.fn(), update: jest.fn(), count: jest.fn() },
    warehouseAIAnalysis: { create: jest.fn() },
    recipe: { findUnique: jest.fn() },
    batch: { findUnique: jest.fn() },
    supplier: { findMany: jest.fn() },
    lotItem: { create: jest.fn() },
  };

  const mockAudit = { log: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();
    service = module.get<WarehouseService>(WarehouseService);
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should create a product', async () => {
      mockPrisma.product.create.mockResolvedValue({ id: 'p1', name: 'Kukurydza', sku: 'CORN-001' });
      const result = await service.createProduct({ organizationId: 'o1', sku: 'CORN-001', name: 'Kukurydza', category: 'FEED_RAW' as any }, 'u1');
      expect(result.id).toBe('p1');
      expect(mockAudit.log).toHaveBeenCalled();
    });
  });

  describe('createLot', () => {
    it('should create lot with stock movement', async () => {
      mockPrisma.lot.create.mockResolvedValue({ id: 'l1', lotNumber: 'LOT-001', productId: 'p1', initialQuantity: 1000 });
      mockPrisma.stockMovement.create.mockResolvedValue({});
      const result = await service.createLot({ productId: 'p1', lotNumber: 'LOT-001', purchaseCost: 2.5, initialQuantity: 1000 }, 'u1');
      expect(result.lotNumber).toBe('LOT-001');
      expect(mockPrisma.stockMovement.create).toHaveBeenCalled();
    });
  });

  describe('createStockMovement', () => {
    it('should create receipt and update stock', async () => {
      mockPrisma.stockMovement.create.mockResolvedValue({ id: 'm1' });
      mockPrisma.stockItem.findFirst.mockResolvedValue(null);
      mockPrisma.stockItem.create.mockResolvedValue({});
      const result = await service.createStockMovement({
        productId: 'p1', type: MovementType.RECEIPT, subtype: MovementSubtype.PZ,
        quantity: 500, unitCost: 2.5, toWarehouseId: 'w1',
      }, 'u1');
      expect(result.id).toBe('m1');
    });

    it('should throw on insufficient lot quantity', async () => {
      mockPrisma.lot.findUnique.mockResolvedValue({ id: 'l1', remainingQuantity: 100 });
      await expect(service.createStockMovement({
        lotId: 'l1', productId: 'p1', type: MovementType.ISSUE, subtype: MovementSubtype.RW,
        quantity: 500, unitCost: 2.5,
      }, 'u1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createTransfer', () => {
    it('should create transfer with items', async () => {
      mockPrisma.transfer.create.mockResolvedValue({ id: 't1', items: [{ productId: 'p1', quantity: 200 }] });
      const result = await service.createTransfer({
        type: 'WAREHOUSE_TO_WAREHOUSE' as any,
        fromWarehouseId: 'w1', toWarehouseId: 'w2',
        items: [{ productId: 'p1', quantity: 200 }],
      }, 'u1');
      expect(result.id).toBe('t1');
    });
  });

  describe('getInventory', () => {
    it('should return inventory items', async () => {
      mockPrisma.stockItem.findMany.mockResolvedValue([
        { productId: 'p1', quantity: 500, available: 400, reserved: 100, unitCost: 2.5, totalValue: 1250,
          product: { name: 'Kukurydza', sku: 'CORN-001', category: 'FEED_RAW', reorderPoint: 200 } },
      ]);
      const result = await service.getInventory({});
      expect(result).toHaveLength(1);
      expect(result[0].isLowStock).toBe(false);
    });
  });

  describe('runAlertScan', () => {
    it('should generate alerts for low stock and expiry', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Kukurydza', unit: 'kg', reorderPoint: 500, safetyStock: 100, category: 'FEED_RAW',
          stockItems: [{ quantity: 50, available: 50 }] },
      ]);
      mockPrisma.lot.findMany.mockResolvedValue([
        { id: 'l1', productId: 'p1', status: 'ACTIVE', expiryDate: new Date(Date.now() + 10 * 86400000), remainingQuantity: 100,
          product: { name: 'Kukurydza' } },
      ]);
      mockPrisma.warehouseAlert.create.mockResolvedValue({ id: 'a1' });

      const result = await service.runAlertScan('o1', 'u1');
      expect(result.generated).toBeGreaterThan(0);
    });
  });

  describe('generateAIAnalysis', () => {
    it('should calculate consumption and forecast', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', name: 'Kukurydza', unit: 'kg', reorderPoint: 200, safetyStock: 100, leadTimeDays: 7 });
      mockPrisma.stockMovement.findMany.mockResolvedValue(
        Array.from({ length: 90 }, (_, i) => ({ quantity: 50, performedAt: new Date(Date.now() - i * 86400000) })),
      );
      mockPrisma.stockItem.findMany.mockResolvedValue([{ quantity: 500, available: 500 }]);
      mockPrisma.lot.findMany.mockResolvedValue([]);
      mockPrisma.supplier.findMany.mockResolvedValue([{ id: 's1', name: 'AgroDostawca' }]);
      mockPrisma.warehouseAIAnalysis.create.mockResolvedValue({ id: 'ai1' });

      const result = await service.generateAIAnalysis('p1');
      expect(result.productId).toBe('p1');
      expect(result.daysOfSupply).toBeDefined();
      expect(result.stockoutRisk).toBeDefined();
    });
  });
});
