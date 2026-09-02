/**
 * Serwisy domenowe WAREHOUSE.
 * Port logiki z FOUNDATION warehouse module (NestJS/Prisma → czyste funkcje/Drizzle).
 * Źródło: warehouse.service.ts (1:1 progi: stockoutRisk 0.8/0.4/0.1, alert scan,
 *         FEFO reserveForRecipe, dashboard top5/90 dni).
 * Mapowanie: Product→warehouse_products, Lot extra→warehouse_lot_details,
 *            StockItem→warehouse_stock_items, StockMovement→warehouse_movements,
 *            WarehouseAIAnalysis→warehouse_ai_analyses, WarehouseAlert→warehouse_alerts.
 * ADAPTACJE:
 *  - Lot.remainingQuantity FOUNDATION = warehouse_lots.qty KIMI (mutowane w miejscu).
 *  - BestSupplier: FOUNDATION qualityScore → KIMI suppliers.rating (1–5).
 *  - Rezerwacja FEFO: receptury KIMI (recipe_items.percent, feed_ingredients)
 *    dopasowywane do partii po nazwie produktu (warehouse_lots.product).
 */
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "../api/queries/connection";
import * as s from "../db/schema";
import type {
  FindSubstitutesInput,
  LotDetailsUpsert,
  ReserveForRecipeInput,
  WarehouseAiAnalysisInput,
  WarehouseAlertCreate,
  WarehouseMovementCreate,
  WarehouseProductCreate,
} from "../contracts/warehouse";

const num = (v: unknown): number => Number(v ?? 0);
const r2 = (n: number) => Math.round(n * 100) / 100;
const DAY = 86400000;

/* ================== PRODUKTY ================== */

export async function createProduct(input: WarehouseProductCreate) {
  const db = getDb();
  const [dup] = await db.select().from(s.warehouseProducts)
    .where(eq(s.warehouseProducts.sku, input.sku));
  if (dup) throw new Error(`Produkt o SKU ${input.sku} już istnieje`);
  const [{ id }] = await db.insert(s.warehouseProducts).values({
    sku: input.sku, name: input.name, description: input.description,
    category: input.category, subcategory: input.subcategory, unit: input.unit,
    minStock: input.minStock.toFixed(2), maxStock: input.maxStock?.toFixed(2),
    reorderPoint: input.reorderPoint.toFixed(2), safetyStock: input.safetyStock.toFixed(2),
    leadTimeDays: input.leadTimeDays, shelfLifeDays: input.shelfLifeDays,
    fcrImpact: input.fcrImpact?.toFixed(2), adgImpact: input.adgImpact?.toFixed(1),
    healthImpact: input.healthImpact, bestPractices: input.bestPractices,
    dosageInfo: input.dosageInfo,
  }).returning({ id: s.warehouseProducts.id });
  return { id };
}

export async function listProducts(category?: string) {
  const db = getDb();
  const products = await db.select().from(s.warehouseProducts)
    .where(category ? eq(s.warehouseProducts.category, category as s.WarehouseProduct["category"]) : undefined);
  const stock = await db.select().from(s.warehouseStockItems);
  return products.map((p) => {
    const rows = stock.filter((x) => x.productId === p.id);
    const totalStock = rows.reduce((a, x) => a + num(x.quantity), 0);
    const totalValue = rows.reduce((a, x) => a + num(x.totalValue), 0);
    return {
      ...p, totalStock, totalValue,
      belowReorder: num(p.reorderPoint) > 0 && totalStock <= num(p.reorderPoint),
    };
  });
}

/* ================== PARTIE: jakość + kwarantanna ================== */

export async function upsertLotDetails(input: LotDetailsUpsert) {
  const db = getDb();
  const [lot] = await db.select().from(s.warehouseLots).where(eq(s.warehouseLots.id, input.lotId));
  if (!lot) throw new Error("Partia nie istnieje");
  const values = {
    manufacturer: input.manufacturer, productionDate: input.productionDate,
    purchaseCost: input.purchaseCost?.toFixed(4), currentCost: input.currentCost?.toFixed(4),
    qrCode: input.qrCode, barcode: input.barcode, certificateUrl: input.certificateUrl,
    moisture: input.moisture?.toFixed(2), protein: input.protein?.toFixed(2),
    energy: input.energy?.toFixed(1), mycotoxins: input.mycotoxins ?? null,
    labResults: input.labResults ?? null,
  };
  const [existing] = await db.select().from(s.warehouseLotDetails)
    .where(eq(s.warehouseLotDetails.lotId, input.lotId));
  if (existing) {
    await db.update(s.warehouseLotDetails).set(values)
      .where(eq(s.warehouseLotDetails.id, existing.id));
    return { id: existing.id, updated: true };
  }
  const [{ id }] = await db.insert(s.warehouseLotDetails)
    .values({ lotId: input.lotId, ...values }).returning({ id: s.warehouseLotDetails.id });
  return { id, updated: false };
}

export async function setQuarantine(lotId: number, isQuarantined: boolean, reason: string | undefined, user: string) {
  const db = getDb();
  const [det] = await db.select().from(s.warehouseLotDetails)
    .where(eq(s.warehouseLotDetails.lotId, lotId));
  if (!det) {
    await db.insert(s.warehouseLotDetails).values({
      lotId, isQuarantined, quarantineReason: isQuarantined ? (reason ?? null) : null,
      releasedAt: isQuarantined ? null : new Date(), releasedBy: isQuarantined ? null : user,
    });
  } else {
    await db.update(s.warehouseLotDetails).set({
      isQuarantined, quarantineReason: isQuarantined ? (reason ?? null) : null,
      releasedAt: isQuarantined ? null : new Date(), releasedBy: isQuarantined ? null : user,
    }).where(eq(s.warehouseLotDetails.id, det.id));
  }
  if (isQuarantined) {
    await createAlert({
      type: "quarantine", severity: "warning", lotId,
      message: `Partia ${lotId} w kwarantannie: ${reason ?? "bez podania przyczyny"}`,
    });
  }
  return { ok: true };
}

/* ================== RUCHY MAGAZYNOWE (port createStockMovement) ================== */

export async function createStockMovement(input: WarehouseMovementCreate, user: string) {
  const db = getDb();
  const totalValue = input.quantity * input.unitCost;

  // walidacja partii przy wydaniu (1:1 FOUNDATION)
  if (input.lotId) {
    const [lot] = await db.select().from(s.warehouseLots).where(eq(s.warehouseLots.id, input.lotId));
    if (!lot) throw new Error("Partia nie istnieje");
    if (num(lot.qty) < input.quantity && input.type === "issue")
      throw new Error(`Niewystarczająca ilość w partii: dostępne ${num(lot.qty)}, żądane ${input.quantity}`);
    const [det] = await db.select().from(s.warehouseLotDetails)
      .where(eq(s.warehouseLotDetails.lotId, input.lotId));
    if (det?.isQuarantined && (input.type === "issue" || input.type === "consumption"))
      throw new Error(`Partia w kwarantannie: ${det.quarantineReason ?? ""}`);
  }

  const result = await db.transaction(async (tx) => {
    const [{ id }] = await tx.insert(s.warehouseMovements).values({
      lotId: input.lotId ?? null, productId: input.productId,
      type: input.type, subtype: input.subtype,
      quantity: input.quantity.toFixed(2), unitCost: input.unitCost.toFixed(4),
      totalValue: totalValue.toFixed(2),
      fromWarehouseId: input.fromWarehouseId ?? null, fromSiloId: input.fromSiloId ?? null,
      fromHouseId: input.fromHouseId ?? null, toWarehouseId: input.toWarehouseId ?? null,
      toSiloId: input.toSiloId ?? null, toHouseId: input.toHouseId ?? null,
      batchId: input.batchId ?? null, recipeId: input.recipeId ?? null,
      documentNumber: input.documentNumber, documentType: input.documentType,
      notes: input.notes,
      moistureAtMove: input.moistureAtMove?.toFixed(2),
      temperatureAtMove: input.temperatureAtMove?.toFixed(1),
      performedBy: user,
    }).returning({ id: s.warehouseLotDetails.id });

    // aktualizacja stanu partii (ADAPT: warehouse_lots.qty)
    if (input.lotId) {
      const [lot] = await tx.select().from(s.warehouseLots).where(eq(s.warehouseLots.id, input.lotId));
      if (lot) {
        const delta = input.type === "receipt" ? input.quantity : -input.quantity;
        const newQty = Math.max(0, num(lot.qty) + delta);
        await tx.update(s.warehouseLots).set({ qty: newQty.toFixed(2) })
          .where(eq(s.warehouseLots.id, lot.id));
      }
    }

    // snapshot stock_items (1:1 updateStockItem)
    if (input.type === "receipt" && input.toWarehouseId) {
      await upsertStockItem(tx, input.productId, input.toWarehouseId, input.quantity, input.unitCost);
    }
    if ((input.type === "issue" || input.type === "consumption") && input.fromWarehouseId) {
      await upsertStockItem(tx, input.productId, input.fromWarehouseId, -input.quantity, input.unitCost);
    }
    return { id, totalValue: r2(totalValue) };
  });
  return result;
}

/** db albo transakcja — strukturalnie zgodne (select/insert/update/delete). */
type DbOrTx = Pick<ReturnType<typeof getDb>, "select" | "insert" | "update" | "delete">;

async function upsertStockItem(
  tx: DbOrTx, productId: number, warehouseId: number,
  deltaQty: number, unitCost: number,
) {
  const [existing] = await tx.select().from(s.warehouseStockItems)
    .where(and(
      eq(s.warehouseStockItems.productId, productId),
      eq(s.warehouseStockItems.warehouseId, warehouseId),
    ));
  if (existing) {
    const newQty = Math.max(0, num(existing.quantity) + deltaQty);
    const cost = deltaQty >= 0 ? unitCost : num(existing.unitCost);
    await tx.update(s.warehouseStockItems).set({
      quantity: newQty.toFixed(2),
      available: (newQty - num(existing.reserved)).toFixed(2),
      unitCost: cost.toFixed(4),
      totalValue: (newQty * cost).toFixed(2),
    }).where(eq(s.warehouseStockItems.id, existing.id));
  } else if (deltaQty > 0) {
    await tx.insert(s.warehouseStockItems).values({
      productId, warehouseId,
      quantity: deltaQty.toFixed(2), available: deltaQty.toFixed(2),
      reserved: "0", unitCost: unitCost.toFixed(4),
      totalValue: (deltaQty * unitCost).toFixed(2),
    });
  }
}

export async function listMovements(filter: { productId?: number; lotId?: number; type?: string; limit: number }) {
  const db = getDb();
  const conds = [];
  if (filter.productId) conds.push(eq(s.warehouseMovements.productId, filter.productId));
  if (filter.lotId) conds.push(eq(s.warehouseMovements.lotId, filter.lotId));
  if (filter.type) conds.push(eq(s.warehouseMovements.type, filter.type as s.WarehouseMovement["type"]));
  return db.select().from(s.warehouseMovements)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(s.warehouseMovements.performedAt))
    .limit(filter.limit);
}

/* ================== INWENTARZ ================== */

export async function getInventory(warehouseId?: number) {
  const db = getDb();
  const [items, products, whs] = await Promise.all([
    warehouseId
      ? db.select().from(s.warehouseStockItems).where(eq(s.warehouseStockItems.warehouseId, warehouseId))
      : db.select().from(s.warehouseStockItems),
    db.select().from(s.warehouseProducts),
    db.select().from(s.warehouses),
  ]);
  return items.map((i) => ({
    ...i,
    product: products.find((p) => p.id === i.productId) ?? null,
    warehouse: whs.find((w) => w.id === i.warehouseId) ?? null,
  })).sort((a, b) => (a.product?.name ?? "").localeCompare(b.product?.name ?? ""));
}

/* ================== ANALIZA AI ZAPASÓW (port 1:1 generateAIAnalysis) ================== */

export async function generateAIAnalysis(input: WarehouseAiAnalysisInput) {
  const db = getDb();
  const [product] = await db.select().from(s.warehouseProducts)
    .where(eq(s.warehouseProducts.id, input.productId));
  if (!product) throw new Error("Produkt nie istnieje");

  // zużycie z ostatnich 90 dni (ruchy consumption)
  const ninetyDaysAgo = new Date(Date.now() - 90 * DAY);
  const movements = await db.select().from(s.warehouseMovements)
    .where(and(
      eq(s.warehouseMovements.productId, input.productId),
      eq(s.warehouseMovements.type, "consumption"),
      gte(s.warehouseMovements.performedAt, ninetyDaysAgo),
    )).orderBy(asc(s.warehouseMovements.performedAt));
  const totalConsumed = movements.reduce((a, m) => a + num(m.quantity), 0);
  const avgDailyConsumption = totalConsumed / 90;

  // bieżący stan
  const stockRows = await db.select().from(s.warehouseStockItems)
    .where(input.warehouseId
      ? and(eq(s.warehouseStockItems.productId, input.productId), eq(s.warehouseStockItems.warehouseId, input.warehouseId))
      : eq(s.warehouseStockItems.productId, input.productId));
  const currentStock = stockRows.reduce((a, x) => a + num(x.quantity), 0);
  const daysOfSupply = avgDailyConsumption > 0 ? currentStock / avgDailyConsumption : 999;

  // ryzyko braku (1:1: 0.8 / 0.4 / 0.1 wg leadTimeDays)
  const lead = product.leadTimeDays;
  const stockoutRisk = daysOfSupply < lead ? 0.8 : daysOfSupply < lead * 2 ? 0.4 : 0.1;

  // ryzyko przeterminowania: partie produktu ważne <30 dni (ADAPT: po nazwie produktu w warehouse_lots)
  const lots = await db.select().from(s.warehouseLots)
    .where(and(eq(s.warehouseLots.product, product.name), eq(s.warehouseLots.status, "active")));
  const expiring = lots.filter((l) => l.expiryDate && (new Date(l.expiryDate).getTime() - Date.now()) / DAY < 30);
  const expiryRisk = expiring.length > 0 && currentStock > 0
    ? Math.min(1, expiring.reduce((a, l) => a + num(l.qty), 0) / currentStock)
    : 0;

  // rotacja (1:1: % partii ze stanem >0)
  const rotationScore = lots.length > 0
    ? Math.round((lots.filter((l) => num(l.qty) > 0).length / lots.length) * 100)
    : 100;

  const predictedStockoutDate = avgDailyConsumption > 0
    ? new Date(Date.now() + daysOfSupply * DAY).toISOString().slice(0, 10)
    : null;
  const recommendedOrderQty = Math.max(0, num(product.reorderPoint) + num(product.safetyStock) - currentStock);
  const recommendedOrderDate = avgDailyConsumption > 0
    ? new Date(Date.now() + Math.max(0, (currentStock - num(product.reorderPoint)) / avgDailyConsumption) * DAY).toISOString().slice(0, 10)
    : null;

  // najlepszy dostawca (ADAPT: suppliers.rating desc, dostawcy partii tego produktu)
  const supplierIds = lots.map((l) => l.supplierId).filter((x): x is number => x != null);
  let bestSupplier: s.Supplier | null = null;
  if (supplierIds.length) {
    const sups = await db.select().from(s.suppliers);
    bestSupplier = sups
      .filter((x) => supplierIds.includes(x.id))
      .sort((a, b) => b.rating - a.rating)[0] ?? null;
  }

  const [{ id }] = await db.insert(s.warehouseAiAnalyses).values({
    productId: input.productId, warehouseId: input.warehouseId ?? null,
    avgDailyConsumption: avgDailyConsumption.toFixed(2),
    currentStock: currentStock.toFixed(2), daysOfSupply: daysOfSupply.toFixed(1),
    stockoutRisk: stockoutRisk.toFixed(2), expiryRisk: expiryRisk.toFixed(2),
    rotationScore, predictedStockoutDate,
    recommendedOrderQty: recommendedOrderQty.toFixed(2), recommendedOrderDate,
    bestSupplierId: bestSupplier?.id ?? null,
  }).returning({ id: s.warehouseStockItems.id });

  return {
    id, productId: product.id, productName: product.name,
    currentStock, avgDailyConsumption: r2(avgDailyConsumption),
    daysOfSupply: Math.round(daysOfSupply * 10) / 10,
    predictedStockoutDate,
    recommendedOrderQty: r2(recommendedOrderQty), recommendedOrderDate,
    bestSupplierId: bestSupplier?.id ?? null, bestSupplierName: bestSupplier?.name ?? null,
    stockoutRisk: Math.round(stockoutRisk * 100),
    expiryRisk: Math.round(expiryRisk * 100),
    rotationScore,
  };
}

export async function latestAnalysis(productId: number) {
  const [row] = await getDb().select().from(s.warehouseAiAnalyses)
    .where(eq(s.warehouseAiAnalyses.productId, productId))
    .orderBy(desc(s.warehouseAiAnalyses.generatedAt)).limit(1);
  return row ?? null;
}

/* ================== ALERTY (port 1:1 + dedup) ================== */

export async function createAlert(input: WarehouseAlertCreate) {
  const [{ id }] = await getDb().insert(s.warehouseAlerts).values({
    type: input.type, severity: input.severity,
    productId: input.productId ?? null, lotId: input.lotId ?? null,
    warehouseId: input.warehouseId ?? null,
    message: input.message, details: input.details ?? null,
  }).returning({ id: s.warehouseAlerts.id });
  return { id };
}

export async function listAlerts(filter: { warehouseId?: number; productId?: number; onlyActive: boolean }) {
  const db = getDb();
  const conds = [];
  if (filter.warehouseId) conds.push(eq(s.warehouseAlerts.warehouseId, filter.warehouseId));
  if (filter.productId) conds.push(eq(s.warehouseAlerts.productId, filter.productId));
  if (filter.onlyActive) conds.push(eq(s.warehouseAlerts.isResolved, false));
  return db.select().from(s.warehouseAlerts)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(s.warehouseAlerts.createdAt));
}

export async function resolveAlert(id: number, resolvedBy?: string) {
  await getDb().update(s.warehouseAlerts)
    .set({ isResolved: true, resolvedAt: new Date(), resolvedBy: resolvedBy ?? "system" })
    .where(eq(s.warehouseAlerts.id, id));
  return { ok: true };
}

/** Skan alertów 1:1 FOUNDATION runAlertScan + dedup aktywnych (jak feedIntel.scanStockAlerts) */
export async function runAlertScan() {
  const db = getDb();
  const products = await db.select().from(s.warehouseProducts)
    .where(eq(s.warehouseProducts.isActive, true));
  const stock = await db.select().from(s.warehouseStockItems);
  const active = await db.select().from(s.warehouseAlerts)
    .where(eq(s.warehouseAlerts.isResolved, false));
  const hasActive = (type: string, productId?: number, lotId?: number) =>
    active.some((a) => a.type === type && a.productId === productId && (lotId == null || a.lotId === lotId));

  let created = 0;

  // 1. niski stan (CRITICAL gdy ≤ safetyStock)
  for (const p of products) {
    const totalStock = stock.filter((x) => x.productId === p.id)
      .reduce((a, x) => a + num(x.quantity), 0);
    if (totalStock <= num(p.reorderPoint) && num(p.reorderPoint) > 0
        && !hasActive("low_stock", p.id)) {
      await createAlert({
        type: "low_stock",
        severity: totalStock <= num(p.safetyStock) ? "critical" : "warning",
        productId: p.id,
        message: `Niski stan magazynowy: ${p.name} (${totalStock} ${p.unit})`,
        details: { currentStock: totalStock, reorderPoint: num(p.reorderPoint) },
      });
      created++;
    }
  }

  // 2. ważność partii ≤30 dni (CRITICAL ≤7 dni)
  const thirtyDays = new Date(Date.now() + 30 * DAY).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const expiringLots = await db.select().from(s.warehouseLots)
    .where(and(
      eq(s.warehouseLots.status, "active"),
      lte(s.warehouseLots.expiryDate, thirtyDays),
      gte(s.warehouseLots.expiryDate, today),
    ));
  for (const lot of expiringLots) {
    if (hasActive("expiring_soon", undefined, lot.id)) continue;
    const daysLeft = Math.ceil((new Date(lot.expiryDate!).getTime() - Date.now()) / DAY);
    await createAlert({
      type: daysLeft <= 0 ? "expired" : "expiring_soon",
      severity: daysLeft <= 7 ? "critical" : "warning",
      lotId: lot.id,
      message: `${daysLeft <= 0 ? "Przeterminowana" : "Kończy ważność"} partia: ${lot.lotNumber} — ${lot.product} (${daysLeft} dni)`,
      details: { lotNumber: lot.lotNumber, daysLeft, remainingQty: num(lot.qty) },
    });
    created++;
  }

  // 3. brak paszy = EMERGENCY (1:1)
  const feedProducts = products.filter((p) => p.category === "feed_ready" || p.category === "feed_raw");
  for (const p of feedProducts) {
    const totalStock = stock.filter((x) => x.productId === p.id)
      .reduce((a, x) => a + num(x.quantity), 0);
    if (totalStock === 0 && !hasActive("feed_shortage", p.id)) {
      await createAlert({
        type: "feed_shortage", severity: "emergency", productId: p.id,
        message: `BRAK PASZY: ${p.name} — natychmiastowe zamówienie wymagane`,
        details: { productSku: p.sku },
      });
      created++;
    }
  }

  return { generated: created };
}

/* ================== DASHBOARD (port 1:1 getDashboard) ================== */

export async function getDashboard() {
  const db = getDb();
  const [products, lots, items, alerts] = await Promise.all([
    db.select().from(s.warehouseProducts).where(eq(s.warehouseProducts.isActive, true)),
    db.select().from(s.warehouseLots).where(eq(s.warehouseLots.status, "active")),
    db.select().from(s.warehouseStockItems),
    db.select().from(s.warehouseAlerts).where(eq(s.warehouseAlerts.isResolved, false)),
  ]);

  const totalValue = items.reduce((a, x) => a + num(x.totalValue), 0);
  const lowStockCount = items.filter((i) => {
    const p = products.find((x) => x.id === i.productId);
    return p && num(i.available) <= num(p.reorderPoint);
  }).length;

  // top 5 zużywanych produktów (90 dni, CONSUMPTION)
  const ninetyDaysAgo = new Date(Date.now() - 90 * DAY);
  const consumption = await db.select().from(s.warehouseMovements)
    .where(and(
      eq(s.warehouseMovements.type, "consumption"),
      gte(s.warehouseMovements.performedAt, ninetyDaysAgo),
    ));
  const byProduct = new Map<number, number>();
  for (const m of consumption) byProduct.set(m.productId, (byProduct.get(m.productId) ?? 0) + num(m.quantity));
  const topConsumed = [...byProduct.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([pid, qty]) => ({
      name: products.find((p) => p.id === pid)?.name ?? `#${pid}`, quantity: r2(qty),
    }));

  return {
    totalProducts: products.length,
    activeLots: lots.length,
    totalInventoryValue: Math.round(totalValue),
    activeAlerts: alerts.length,
    lowStockItems: lowStockCount,
    topConsumed,
  };
}

/* ================== REZERWACJA FEFO POD RECEPTURĘ (port reserveForRecipe) ================== */

export async function reserveForRecipe(input: ReserveForRecipeInput) {
  const db = getDb();
  const [recipe] = await db.select().from(s.recipes).where(eq(s.recipes.id, input.recipeId));
  if (!recipe) throw new Error("Receptura nie istnieje");
  const items = await db.select().from(s.recipeItems).where(eq(s.recipeItems.recipeId, input.recipeId));
  const ingredients = await db.select().from(s.feedIngredients);
  const details = await db.select().from(s.warehouseLotDetails);

  const reservations: {
    ingredientId: number; ingredientName: string; lotId: number;
    lotNumber: string; reservedQty: number; unitCost: number;
  }[] = [];

  for (const item of items) {
    const ingredient = ingredients.find((x) => x.id === item.ingredientId);
    if (!ingredient) continue;
    const requiredQty = (input.quantityKg * num(item.percent)) / 100;

    // FEFO: partie o najbliższej ważności najpierw (1:1), bez kwarantanny
    const lots = (await db.select().from(s.warehouseLots)
      .where(and(eq(s.warehouseLots.product, ingredient.name), eq(s.warehouseLots.status, "active")))
      .orderBy(asc(s.warehouseLots.expiryDate)))
      .filter((l) => num(l.qty) > 0 && !details.find((d) => d.lotId === l.id)?.isQuarantined);

    let remaining = requiredQty;
    for (const lot of lots) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, num(lot.qty));
      const det = details.find((d) => d.lotId === lot.id);
      reservations.push({
        ingredientId: ingredient.id, ingredientName: ingredient.name,
        lotId: lot.id, lotNumber: lot.lotNumber,
        reservedQty: r2(take), unitCost: num(det?.currentCost ?? det?.purchaseCost ?? 0),
      });
      remaining -= take;
    }
    if (remaining > 0)
      throw new Error(`Brak wystarczającej ilości ${ingredient.name} (brakuje ${r2(remaining)} kg)`);
  }

  const totalCost = reservations.reduce((a, r) => a + r.reservedQty * r.unitCost, 0);
  return {
    recipeId: input.recipeId, batchId: input.batchId,
    reservations, totalCost: r2(totalCost),
  };
}

/* ================== SUBSTYTUTY (port findSubstitutes) ================== */

export async function findSubstitutes(input: FindSubstitutesInput) {
  const db = getDb();
  const [product] = await db.select().from(s.warehouseProducts)
    .where(eq(s.warehouseProducts.id, input.productId));
  if (!product) throw new Error("Produkt nie istnieje");

  const stock = await db.select().from(s.warehouseStockItems);
  const sameCategory = await db.select().from(s.warehouseProducts)
    .where(and(
      eq(s.warehouseProducts.category, product.category),
      eq(s.warehouseProducts.isActive, true),
    ));
  return sameCategory
    .filter((p) => p.id !== product.id)
    .map((p) => {
      const rows = stock.filter((x) => x.productId === p.id);
      const available = rows.reduce((a, x) => a + num(x.available), 0);
      return {
        productId: p.id, name: p.name, sku: p.sku,
        availableStock: r2(available), unitCost: num(rows[0]?.unitCost ?? 0),
        fcrImpact: num(p.fcrImpact), adgImpact: num(p.adgImpact),
        healthImpact: p.healthImpact, bestPractice: p.bestPractices,
      };
    })
    .filter((x) => x.availableStock >= input.requiredQty);
}

/* ================== IDENTYFIKOWALNOŚĆ PARTII (port getLotTraceability) ================== */

export async function lotTraceability(lotId: number) {
  const db = getDb();
  const [lot] = await db.select().from(s.warehouseLots).where(eq(s.warehouseLots.id, lotId));
  if (!lot) throw new Error("Partia nie istnieje");
  const [det] = await db.select().from(s.warehouseLotDetails)
    .where(eq(s.warehouseLotDetails.lotId, lotId));
  const supplier = lot.supplierId
    ? (await db.select().from(s.suppliers).where(eq(s.suppliers.id, lot.supplierId)))[0] ?? null
    : null;

  const movements = await db.select().from(s.warehouseMovements)
    .where(eq(s.warehouseMovements.lotId, lotId))
    .orderBy(asc(s.warehouseMovements.performedAt));

  // agregacja zużycia wg rzutu (1:1)
  const batchConsumption = new Map<number, { batchId: number; batchCode: string; totalConsumed: number }>();
  for (const m of movements) {
    if (m.batchId && m.type === "consumption") {
      const [b] = await db.select().from(s.batches).where(eq(s.batches.id, m.batchId));
      const entry = batchConsumption.get(m.batchId)
        ?? { batchId: m.batchId, batchCode: b?.code ?? `#${m.batchId}`, totalConsumed: 0 };
      entry.totalConsumed += num(m.quantity);
      batchConsumption.set(m.batchId, entry);
    }
  }
  const totalConsumed = movements.filter((m) => m.type === "consumption")
    .reduce((a, m) => a + num(m.quantity), 0);
  const initialQty = movements.filter((m) => m.type === "receipt")
    .reduce((a, m) => a + num(m.quantity), 0) || num(lot.qty) + totalConsumed;

  let finalDestination = "W magazynie";
  if (totalConsumed >= initialQty * 0.95) finalDestination = "Zużyto w produkcji";
  else if (det?.isQuarantined) finalDestination = "W kwarantannie";

  return {
    lotId: lot.id, lotNumber: lot.lotNumber, productName: lot.product,
    supplierName: supplier?.name ?? "N/A",
    productionDate: det?.productionDate ?? null,
    receivedDate: lot.receivedDate, expiryDate: lot.expiryDate,
    initialQuantity: r2(initialQty), remainingQuantity: num(lot.qty),
    quality: det ? {
      moisture: num(det.moisture), protein: num(det.protein), energy: num(det.energy),
      mycotoxins: det.mycotoxins, isQuarantined: det.isQuarantined,
      quarantineReason: det.quarantineReason,
    } : null,
    movements: movements.map((m) => ({
      id: m.id, type: m.type, subtype: m.subtype,
      quantity: num(m.quantity), date: m.performedAt.toISOString(),
      batchId: m.batchId, documentNumber: m.documentNumber,
    })),
    batchesFed: [...batchConsumption.values()].map((b) => ({ ...b, totalConsumed: r2(b.totalConsumed) })),
    finalDestination,
  };
}
