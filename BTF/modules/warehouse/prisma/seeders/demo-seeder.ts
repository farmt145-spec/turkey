import { PrismaClient, ProductCategory, WarehouseType, HouseType, MovementType, MovementSubtype, TransferType, BatchStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Bloody Turkey Enterprise — Demo Mode');

  // 1. Organization
  const org = await prisma.organization.create({
    data: { name: 'Bloody Turkey Demo Sp. z o.o.', taxId: 'PL1234567890', address: 'ul. Drobiowa 1, 00-001 Warszawa' },
  });

  // 2. Users
  await prisma.user.create({
    data: { email: 'admin@bloodyturkey.pl', name: 'Admin', role: 'SUPER_ADMIN', organizationId: org.id },
  });

  // 3. Farms (5)
  const farms = await Promise.all(
    ['Ferma Alpha', 'Ferma Beta', 'Ferma Gamma', 'Ferma Delta', 'Ferma Epsilon'].map((name, i) =>
      prisma.farm.create({ data: { organizationId: org.id, name, location: `Województwo ${i + 1}`, areaHa: 50 + i * 10 } }),
    ),
  );

  // 4. Houses (50)
  const houses = [];
  for (const farm of farms) {
    for (let h = 0; h < 10; h++) {
      houses.push(
        prisma.house.create({
          data: {
            farmId: farm.id,
            name: `Kurnik ${farm.name.slice(-1)}-${h + 1}`,
            type: h < 3 ? 'BROODER' : h < 7 ? 'GROWER' : 'FINISHER',
            capacity: 10000 + h * 500,
            areaM2: 1200 + h * 50,
          },
        }),
      );
    }
  }
  await Promise.all(houses);
  console.log('✅ 5 ferm, 50 kurników');

  // 5. Warehouses (10)
  const warehouses = [];
  for (const farm of farms) {
    warehouses.push(
      prisma.warehouse.create({ data: { organizationId: org.id, farmId: farm.id, name: `Magazyn Główny ${farm.name}`, type: 'MAIN' } }),
      prisma.warehouse.create({ data: { organizationId: org.id, farmId: farm.id, name: `Magazyn Paszowy ${farm.name}`, type: 'FEED' } }),
    );
  }
  await Promise.all(warehouses);
  console.log('✅ 10 magazynów');

  // 6. Silos (30)
  const allWarehouses = await prisma.warehouse.findMany();
  const silos = [];
  for (const wh of allWarehouses) {
    for (let s = 0; s < 3; s++) {
      silos.push(
        prisma.silo.create({
          data: { warehouseId: wh.id, farmId: wh.farmId, name: `Silos ${wh.name}-${s + 1}`, capacityKg: 25000, currentKg: 0 },
        }),
      );
    }
  }
  await Promise.all(silos);
  console.log('✅ 30 silosów');

  // 7. Suppliers
  const suppliers = await Promise.all(
    ['AgroKukurydza Sp. z o.o.', 'SojaPlus S.A.', 'Witaminy Drob', 'DezynfekcjaPro', 'PaszeMax', 'EnergaDrobiu'].map((name) =>
      prisma.supplier.create({ data: { name, rating: 4 + Math.random(), leadTimeAvg: 3 + Math.floor(Math.random() * 5), qualityScore: 4 + Math.random() } }),
    ),
  );

  // 8. Products (500)
  const categories = Object.values(ProductCategory);
  const products = [];
  for (let i = 0; i < 500; i++) {
    const cat = categories[i % categories.length];
    products.push(
      prisma.product.create({
        data: {
          organizationId: org.id,
          sku: `SKU-${String(i + 1).padStart(5, '0')}`,
          name: `${cat} ${i + 1}`,
          category: cat,
          unit: ['kg', 'l', 'szt', 'm3'][i % 4],
          minStock: 50 + Math.random() * 200,
          reorderPoint: 100 + Math.random() * 300,
          safetyStock: 25 + Math.random() * 50,
          leadTimeDays: 3 + Math.floor(Math.random() * 10),
          shelfLifeDays: cat === 'VACCINE' ? 180 : cat === 'MEDICATION' ? 730 : 365,
          fcrImpact: Math.random() * 0.4 - 0.2,
          adgImpact: Math.random() * 10 - 5,
          healthImpact: cat === 'VACCINE' ? 'Chroni przed chorobami wirusowymi' : null,
          bestPractices: 'Przechowywać w suchym miejscu',
        },
      }),
    );
  }
  await Promise.all(products);
  console.log('✅ 500 produktów');

  // 9. Lots (1000)
  const allProducts = await prisma.product.findMany();
  const lots = [];
  for (let i = 0; i < 1000; i++) {
    const product = allProducts[i % allProducts.length];
    const qty = 500 + Math.floor(Math.random() * 4500);
    lots.push(
      prisma.lot.create({
        data: {
          productId: product.id,
          lotNumber: `LOT-${String(i + 1).padStart(6, '0')}`,
          supplierId: suppliers[i % suppliers.length].id,
          manufacturer: `Producent ${i % 20}`,
          productionDate: new Date(Date.now() - Math.random() * 180 * 86400000),
          expiryDate: new Date(Date.now() + (30 + Math.random() * 330) * 86400000),
          purchaseCost: 1 + Math.random() * 10,
          currentCost: 1 + Math.random() * 10,
          initialQuantity: qty,
          remainingQuantity: qty,
          moisture: 10 + Math.random() * 5,
          protein: 15 + Math.random() * 10,
          energy: 2500 + Math.random() * 500,
          mycotoxins: { aflatoxin: Math.random() * 5, ochratoxin: Math.random() * 2 },
          qrCode: `QR-${i + 1}`,
          barcode: `590${String(i + 1).padStart(10, '0')}`,
        },
      }),
    );
  }
  await Promise.all(lots);
  console.log('✅ 1000 partii');

  // 10. Batches (100)
  const allHouses = await prisma.house.findMany();
  const batches = [];
  for (let i = 0; i < 100; i++) {
    const house = allHouses[i % allHouses.length];
    batches.push(
      prisma.batch.create({
        data: {
          farmId: house.farmId,
          houseId: house.id,
          batchNumber: `T-2024-${String(i + 1).padStart(3, '0')}`,
          breed: ['BUT Big 6', 'Nicholas', 'Hybrid Converter'][i % 3],
          chicksReceived: 8000 + Math.floor(Math.random() * 4000),
          chicksCost: 3.5,
          startDate: new Date(Date.now() - Math.random() * 120 * 86400000),
          plannedEndDate: new Date(Date.now() + (30 + Math.random() * 60) * 86400000),
          status: 'ACTIVE',
          currentCount: 7500 + Math.floor(Math.random() * 3000),
          mortalityTotal: Math.floor(Math.random() * 300),
          avgWeight: 2 + Math.random() * 12,
          fcr: 2.0 + Math.random() * 0.8,
          adg: 45 + Math.random() * 20,
          epef: 250 + Math.random() * 100,
        },
      }),
    );
  }
  await Promise.all(batches);
  console.log('✅ 100 rzutów');

  // 11. Stock Movements (history)
  const feedProducts = allProducts.filter((p) => p.category === 'FEED_READY' || p.category === 'FEED_RAW');
  const movements = [];
  for (let i = 0; i < 2000; i++) {
    const product = feedProducts[i % feedProducts.length] || allProducts[i % allProducts.length];
    movements.push(
      prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: i % 3 === 0 ? 'RECEIPT' : 'CONSUMPTION',
          subtype: i % 3 === 0 ? 'PZ' : 'CONSUME_FEED',
          quantity: 50 + Math.floor(Math.random() * 500),
          unitCost: 1 + Math.random() * 5,
          totalValue: 0,
          toWarehouseId: allWarehouses[i % allWarehouses.length]?.id,
          batchId: (await prisma.batch.findMany({ take: 1, skip: i % 100 }))[0]?.id,
          performedBy: 'system',
          performedAt: new Date(Date.now() - Math.random() * 90 * 86400000),
        },
      }),
    );
  }
  await Promise.all(movements);
  console.log('✅ 2000 ruchów magazynowych');

  // 12. Transfers
  for (let i = 0; i < 50; i++) {
    await prisma.transfer.create({
      data: {
        type: ['WAREHOUSE_TO_WAREHOUSE', 'SILO_TO_SILO', 'HOUSE_TO_HOUSE'][i % 3] as TransferType,
        farmId: farms[i % farms.length].id,
        fromWarehouseId: allWarehouses[i % allWarehouses.length]?.id,
        toWarehouseId: allWarehouses[(i + 1) % allWarehouses.length]?.id,
        status: 'COMPLETED',
        requestedBy: 'system',
        executedBy: 'system',
        executedAt: new Date(),
        completedAt: new Date(),
        items: {
          create: [
            { productId: allProducts[i % allProducts.length].id, quantity: 100 + Math.floor(Math.random() * 400), unit: 'kg', unitCost: 2.5 },
          ],
        },
      },
    });
  }
  console.log('✅ 50 transferów');

  // 13. Alerts
  for (let i = 0; i < 20; i++) {
    await prisma.warehouseAlert.create({
      data: {
        type: ['LOW_STOCK', 'EXPIRING_SOON', 'FEED_SHORTAGE', 'HIGH_MOISTURE'][i % 4] as any,
        severity: i < 5 ? 'CRITICAL' : i < 10 ? 'WARNING' : 'INFO',
        productId: allProducts[i % allProducts.length].id,
        message: `Demo alert ${i + 1}`,
        details: { demo: true, index: i },
      },
    });
  }
  console.log('✅ 20 alarmów');

  console.log('\n🎉 Demo Mode gotowy! Zaloguj się jako admin@bloodyturkey.pl');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
