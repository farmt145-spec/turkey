import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { copyCompanyTemplates } from "./queries/companies";
import * as s from "@db/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { audit } from "./audit";
import { requireBatchTenant, requireFarmTenant, requireHouseTenant, requireRequestedCompany, requireTenantCompany } from "./tenant";

/* Harmonogram domyślny — Workflow Engine */
export async function generateSchedule(batchId: number, startDate: string, sex: "toms" | "hens" | "mixed") {
  const db = getDb();
  const start = new Date(startDate);
  const growDays = sex === "toms" ? 140 : sex === "hens" ? 112 : 126;
  const add = (d: Date) => d.toISOString().slice(0, 10);
  const plan: Array<{ offset: number; type: s.ScheduleEvent["eventType"]; title: string }> = [
    { offset: -2, type: "washing", title: "Mycie kurnika" },
    { offset: -1, type: "disinfection", title: "Dezynfekcja kurnika" },
    { offset: -1, type: "housePrep", title: "Przygotowanie kurnika: nagrzanie, ściółka, sprawdzenie pojen" },
    { offset: 0, type: "placement", title: "Przyjęcie piskląt" },
    { offset: 7, type: "weighing", title: "Ważenie kontrolne (7. dzień)" },
    { offset: 14, type: "vaccination", title: "Szczepienie ND (Newcastle) — La Sota" },
    { offset: 14, type: "weighing", title: "Ważenie kontrolne (14. dzień)" },
    { offset: 21, type: "vaccination", title: "Szczepienie TRT / aMPV" },
    { offset: 21, type: "weighing", title: "Ważenie kontrolne (21. dzień)" },
    { offset: 28, type: "feedChange", title: "Zmiana paszy: Starter → Grower I" },
    { offset: 35, type: "vaccination", title: "Szczepienie HE (choroba krwotoczna)" },
    { offset: 42, type: "weighing", title: "Ważenie kontrolne (42. dzień)" },
    { offset: 49, type: "sampling", title: "Pobieranie prób (laboratorium)" },
    { offset: 56, type: "feedChange", title: "Zmiana paszy: Grower I → Grower II" },
    { offset: 56, type: "weighing", title: "Ważenie kontrolne (56. dzień)" },
    { offset: 63, type: "litter", title: "Ścielenie — dosypanie ściółki" },
    { offset: 70, type: "weighing", title: "Ważenie kontrolne (70. dzień)" },
    { offset: 77, type: "feedChange", title: "Zmiana paszy: Grower II → Finisher I" },
    { offset: 84, type: "weighing", title: "Ważenie kontrolne (84. dzień)" },
    { offset: 98, type: "weighing", title: "Ważenie kontrolne (98. dzień)" },
    { offset: Math.min(105, growDays - 14), type: "feedChange", title: "Zmiana paszy: Finisher I → Finisher II" },
    { offset: growDays - 7, type: "weighing", title: "Ważenie przed ubojem" },
    { offset: growDays, type: "sale", title: "Sprzedaż / ubój — raport końcowy" },
  ];
  for (const p of plan) {
    const d = new Date(start);
    d.setDate(d.getDate() + p.offset);
    await db.insert(s.scheduleEvents).values({ batchId, day: add(d), eventType: p.type, title: p.title });
  }
}

async function seedStarterCompanyData(companyId: number) {
  const db = getDb();
  const start = new Date();
  start.setDate(start.getDate() - 21);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + 126);

  const [{ id: lineId }] = await db.insert(s.geneticLines).values({
    companyId,
    name: "Starter Line",
    supplier: "Starter Hatchery",
  }).returning({ id: s.scheduleEvents.id });

  const [{ id: farmId }] = await db.insert(s.farms).values({
    companyId,
    name: "Moja Ferma 1",
    countryCode: "PL",
    city: "Start",
    lat: "52.00000",
    lng: "19.00000",
    capacity: 25000,
  }).returning({ id: s.farms.id });

  const [{ id: houseId }] = await db.insert(s.houses).values({
    farmId,
    name: "Kurnik A",
    houseType: "finisher",
    areaM2: "1600.0",
    maxDensityKgM2: "42.0",
    lengthM: "80.0",
    widthM: "20.0",
    heightM: "4.0",
    feederCount: 120,
    drinkerCount: 120,
    lightingLux: 25,
    lightingHours: "16.0",
    ventilationM3h: 80000,
  }).returning({ id: s.houses.id });

  const [{ id: batchId }] = await db.insert(s.batches).values({
    houseId,
    geneticLineId: lineId,
    code: `START-${companyId}-${Date.now()}`,
    geneticLine: "Starter Line",
    sex: "mixed",
    startDate,
    plannedEndDate: endDate.toISOString().slice(0, 10),
    initialCount: 12000,
    currentCount: 11880,
    chickSupplier: "Starter Hatchery",
    chickPrice: "1.650",
  }).returning({ id: s.batches.id });

  await db.insert(s.weighings).values({
    batchId,
    weighedAt: new Date(),
    dayAge: 21,
    sampleSize: 80,
    avgWeightG: 930,
    medianG: 920,
    stdDevG: 110,
    minG: 650,
    maxG: 1190,
    cv: "11.83",
    operator: "system",
  });

  await db.insert(s.feedUsages).values({
    batchId,
    day: new Date().toISOString().slice(0, 10),
    kg: "8420.0",
  });

  await db.insert(s.mortalities).values({
    batchId,
    day: new Date().toISOString().slice(0, 10),
    count: 8,
    cause: "start baseline",
  });

  await generateSchedule(batchId, startDate, "mixed");
}

export const orgRouter = createRouter({
  /* ------- firmy / tryb ------- */
  companies: authedQuery.query(async ({ ctx }) => {
    const companyId = requireTenantCompany(ctx.user!);
    return getDb().select().from(s.companies).where(and(eq(s.companies.id, companyId), ne(s.companies.status, "archived")));
  }),

  createCompany: authedQuery
    .input(z.object({
      name: z.string().min(2),
      countryCode: z.string().length(2),
      baseCurrency: z.string().length(3).default("EUR"),
      seedStarterData: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [{ id: companyId }] = await db.insert(s.companies).values({
        name: input.name.trim(),
        countryCode: input.countryCode.trim().toUpperCase(),
        baseCurrency: input.baseCurrency.trim().toUpperCase(),
      }).returning({ id: s.weighings.id });

      await db.update(s.users).set({ companyId, role: "admin" }).where(eq(s.users.id, ctx.user!.id));
      await audit("companies", companyId, "create", { newValues: input });
      await copyCompanyTemplates({ db, companyId });

      if (input.seedStarterData) {
        await seedStarterCompanyData(companyId);
      }

      return { id: companyId };
    }),

  /* ------- linie genetyczne ------- */
  geneticLines: authedQuery
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input, ctx }) => {
      requireRequestedCompany(ctx.user!, input.companyId);
      return getDb().select().from(s.geneticLines)
        .where(and(eq(s.geneticLines.companyId, input.companyId), ne(s.geneticLines.status, "archived")));
    }),

  createGeneticLine: authedQuery
    .input(z.object({ companyId: z.number(), name: z.string().min(2), supplier: z.string().optional(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      requireRequestedCompany(ctx.user!, input.companyId);
      const [{ id }] = await getDb().insert(s.geneticLines).values(input).returning({ id: s.geneticLines.id });
      await audit("genetic_lines", id, "create", { newValues: input });
      return { id };
    }),

  /* ------- struktura ------- */
  structure: authedQuery
    .input(z.object({ companyId: z.number() }).optional())
    .query(async ({ ctx }) => {
      const companyId = requireTenantCompany(ctx.user!);
      const db = getDb();
      const companies = await db.select().from(s.companies).where(and(eq(s.companies.id, companyId), ne(s.companies.status, "archived")));
      const farmRows = await db.select().from(s.farms).where(and(eq(s.farms.companyId, companyId), ne(s.farms.status, "archived")));
      const houseRows = await db.select().from(s.houses).where(ne(s.houses.status, "archived"));
      const sectorRows = await db.select().from(s.sectors).where(ne(s.sectors.status, "archived"));
      const batchRows = await db.select().from(s.batches).where(ne(s.batches.status, "archived"));
      return {
        companies: companies.map((c) => ({
          ...c,
          farms: farmRows.filter((f) => f.companyId === c.id).map((f) => ({
            ...f,
            houses: houseRows.filter((h) => h.farmId === f.id).map((h) => ({
              ...h,
              sectors: sectorRows.filter((sec) => sec.houseId === h.id),
              batches: batchRows.filter((b) => b.houseId === h.id),
            })),
          })),
        })),
      };
    }),

  createFarm: authedQuery
    .input(z.object({
      companyId: z.number(), name: z.string().min(2), countryCode: z.string().length(2),
      city: z.string().min(2), lat: z.number(), lng: z.number(), capacity: z.number().int().min(0),
    }))
    .mutation(async ({ input, ctx }) => {
      requireRequestedCompany(ctx.user!, input.companyId);
      const [{ id }] = await getDb().insert(s.farms).values({
        ...input, countryCode: input.countryCode.toUpperCase(),
        lat: input.lat.toFixed(5), lng: input.lng.toFixed(5),
      }).returning({ id: s.farms.id });
      await audit("farms", id, "create", { newValues: input });
      return { id };
    }),

  updateFarm: authedQuery
    .input(z.object({
      id: z.number(), name: z.string().min(2).optional(), city: z.string().optional(),
      capacity: z.number().int().optional(), lat: z.number().optional(), lng: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await requireFarmTenant(ctx.user!, input.id);
      const [old] = await db.select().from(s.farms).where(eq(s.farms.id, input.id));
      const { id, ...rest } = input;
      const data: Record<string, string | number> = {};
      if (rest.name) data.name = rest.name;
      if (rest.city) data.city = rest.city;
      if (rest.capacity !== undefined) data.capacity = rest.capacity;
      if (rest.lat !== undefined) data.lat = rest.lat.toFixed(5);
      if (rest.lng !== undefined) data.lng = rest.lng.toFixed(5);
      await db.update(s.farms).set({ ...data, updatedBy: "panel" }).where(eq(s.farms.id, id));
      await audit("farms", id, "update", { oldValues: old, newValues: data });
      return { ok: true };
    }),

  archiveFarm: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await requireFarmTenant(ctx.user!, input.id);
      const [old] = await db.select().from(s.farms).where(eq(s.farms.id, input.id));
      await db.update(s.farms).set({ status: "archived", updatedBy: "panel" }).where(eq(s.farms.id, input.id));
      await audit("farms", input.id, "delete", { oldValues: old });
      return { ok: true };
    }),

  createHouse: authedQuery
    .input(z.object({
      farmId: z.number(), name: z.string().min(1),
      houseType: z.enum(["brooder", "finisher"]), areaM2: z.number().min(10),
      sectorCount: z.number().int().min(0).max(8).default(0),
      lengthM: z.number().min(0).optional(), widthM: z.number().min(0).optional(), heightM: z.number().min(0).optional(),
      feederCount: z.number().int().min(0).optional(), drinkerCount: z.number().int().min(0).optional(),
      lightingLux: z.number().int().min(0).optional(), lightingHours: z.number().min(0).max(24).optional(), ventilationM3h: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireFarmTenant(ctx.user!, input.farmId);
      const db = getDb();
      const [{ id }] = await db.insert(s.houses).values({
        farmId: input.farmId, name: input.name, houseType: input.houseType,
        areaM2: input.areaM2.toFixed(1), maxDensityKgM2: input.houseType === "brooder" ? "25.0" : "42.0",
        lengthM: (input.lengthM ?? 0).toFixed(1), widthM: (input.widthM ?? 0).toFixed(1), heightM: (input.heightM ?? 0).toFixed(1),
        feederCount: input.feederCount ?? 0, drinkerCount: input.drinkerCount ?? 0,
        lightingLux: input.lightingLux ?? 0, lightingHours: (input.lightingHours ?? 0).toFixed(1), ventilationM3h: input.ventilationM3h ?? 0,
      }).returning({ id: s.houses.id });
      await audit("houses", id, "create", { newValues: input });
      for (let i = 0; i < input.sectorCount; i++) {
        const [{ id: sid }] = await db.insert(s.sectors).values({
          houseId: id, name: `Sektor ${String.fromCharCode(65 + i)}`,
          areaM2: (input.areaM2 / input.sectorCount).toFixed(1),
        }).returning({ id: s.sectors.id });
        await audit("sectors", sid, "create", { newValues: { houseId: id, index: i } });
      }
      return { id };
    }),

  updateHouse: authedQuery
    .input(z.object({
      id: z.number(), name: z.string().min(1).optional(),
      areaM2: z.number().optional(), maxDensityKgM2: z.number().optional(),
      lengthM: z.number().min(0).optional(), widthM: z.number().min(0).optional(), heightM: z.number().min(0).optional(),
      feederCount: z.number().int().min(0).optional(), drinkerCount: z.number().int().min(0).optional(),
      lightingLux: z.number().int().min(0).optional(), lightingHours: z.number().min(0).max(24).optional(), ventilationM3h: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireHouseTenant(ctx.user!, input.id);
      const db = getDb();
      const [old] = await db.select().from(s.houses).where(eq(s.houses.id, input.id));
      const data: Record<string, string | number> = {};
      if (input.name) data.name = input.name;
      if (input.areaM2) data.areaM2 = input.areaM2.toFixed(1);
      if (input.maxDensityKgM2) data.maxDensityKgM2 = input.maxDensityKgM2.toFixed(1);
      if (input.lengthM !== undefined) data.lengthM = input.lengthM.toFixed(1);
      if (input.widthM !== undefined) data.widthM = input.widthM.toFixed(1);
      if (input.heightM !== undefined) data.heightM = input.heightM.toFixed(1);
      if (input.feederCount !== undefined) data.feederCount = input.feederCount;
      if (input.drinkerCount !== undefined) data.drinkerCount = input.drinkerCount;
      if (input.lightingLux !== undefined) data.lightingLux = input.lightingLux;
      if (input.lightingHours !== undefined) data.lightingHours = input.lightingHours.toFixed(1);
      if (input.ventilationM3h !== undefined) data.ventilationM3h = input.ventilationM3h;
      await db.update(s.houses).set({ ...data, updatedBy: "panel" }).where(eq(s.houses.id, input.id));
      await audit("houses", input.id, "update", { oldValues: old, newValues: data });
      return { ok: true };
    }),

  archiveHouse: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireHouseTenant(ctx.user!, input.id);
      const db = getDb();
      const [old] = await db.select().from(s.houses).where(eq(s.houses.id, input.id));
      await db.update(s.houses).set({ status: "archived", updatedBy: "panel" }).where(eq(s.houses.id, input.id));
      await audit("houses", input.id, "delete", { oldValues: old });
      return { ok: true };
    }),

  createBatch: authedQuery
    .input(z.object({
      houseId: z.number(), sectorId: z.number().optional(), code: z.string().min(3),
      geneticLine: z.string(), geneticLineId: z.number().optional(),
      sex: z.enum(["toms", "hens", "mixed"]), initialCount: z.number().int().min(1),
      startDate: z.string(), chickSupplier: z.string().optional(), chickPrice: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireHouseTenant(ctx.user!, input.houseId);
      const db = getDb();
      if (input.sectorId) {
        const [sector] = await db.select().from(s.sectors)
          .where(and(eq(s.sectors.id, input.sectorId), eq(s.sectors.houseId, input.houseId)));
        if (!sector) throw new TRPCError({ code: "FORBIDDEN", message: "TENANT_MISMATCH: sector is not part of the selected house." });
      }
      if (input.geneticLineId) {
        const companyId = requireTenantCompany(ctx.user!);
        const [line] = await db.select().from(s.geneticLines)
          .where(and(eq(s.geneticLines.id, input.geneticLineId), eq(s.geneticLines.companyId, companyId)));
        if (!line) throw new TRPCError({ code: "FORBIDDEN", message: "TENANT_MISMATCH: genetic line is not owned by your company." });
      }
      const growDays = input.sex === "toms" ? 140 : input.sex === "hens" ? 112 : 126;
      const end = new Date(input.startDate); end.setDate(end.getDate() + growDays);
      const [{ id }] = await db.insert(s.batches).values({
        houseId: input.houseId, sectorId: input.sectorId, geneticLineId: input.geneticLineId,
        code: input.code, geneticLine: input.geneticLine, sex: input.sex,
        initialCount: input.initialCount, currentCount: input.initialCount,
        startDate: input.startDate, plannedEndDate: end.toISOString().slice(0, 10),
        chickSupplier: input.chickSupplier, chickPrice: (input.chickPrice ?? 1.6).toFixed(3),
      }).returning({ id: s.batches.id });
      await audit("batches", id, "create", { newValues: input });
      await generateSchedule(id, input.startDate, input.sex);
      return { id };
    }),

  closeBatch: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireBatchTenant(ctx.user!, input.id);
      const db = getDb();
      const [old] = await db.select().from(s.batches).where(eq(s.batches.id, input.id));
      await db.update(s.batches).set({ status: "closed", currentCount: 0, soldCount: old.currentCount + old.soldCount, updatedBy: "panel" }).where(eq(s.batches.id, input.id));
      await audit("batches", input.id, "update", { oldValues: old, newValues: { status: "closed" } });
      return { ok: true };
    }),

  /* ------- harmonogram ------- */
  schedule: authedQuery
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireBatchTenant(ctx.user!, input.batchId);
      return getDb().select().from(s.scheduleEvents)
        .where(eq(s.scheduleEvents.batchId, input.batchId))
        .orderBy(s.scheduleEvents.day);
    }),

  toggleScheduleEvent: authedQuery
    .input(z.object({ id: z.number(), done: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [event] = await db.select().from(s.scheduleEvents).where(eq(s.scheduleEvents.id, input.id));
      if (!event) throw new Error("Zdarzenie harmonogramu nie istnieje");
      await requireBatchTenant(ctx.user!, event.batchId);
      await db.update(s.scheduleEvents)
        .set({ done: input.done, doneAt: input.done ? new Date() : null })
        .where(eq(s.scheduleEvents.id, input.id));
      await audit("schedule_events", input.id, "update", { newValues: { done: input.done } });
      return { ok: true };
    }),

  upcomingSchedule: authedQuery.query(async ({ ctx }) => {
    const companyId = requireTenantCompany(ctx.user!);
    const db = getDb();
    const [rows, batchRows, houseRows, farmRows] = await Promise.all([
      db.select().from(s.scheduleEvents).where(eq(s.scheduleEvents.done, false)).orderBy(s.scheduleEvents.day),
      db.select().from(s.batches),
      db.select().from(s.houses),
      db.select().from(s.farms).where(eq(s.farms.companyId, companyId)),
    ]);
    const houseIds = new Set(houseRows.filter((h) => farmRows.some((f) => f.id === h.farmId)).map((h) => h.id));
    const owned = batchRows.filter((b) => houseIds.has(b.houseId));
    const ownedIds = new Set(owned.map((b) => b.id));
    const codeOf = (id: number) => owned.find((b) => b.id === id)?.code ?? "?";
    return rows.filter((r) => ownedIds.has(r.batchId)).map((r) => ({ ...r, batchCode: codeOf(r.batchId) }));
  }),

  /* ------- transfery ------- */
  transfers: authedQuery.query(async ({ ctx }) => {
    const companyId = requireTenantCompany(ctx.user!);
    const db = getDb();
    const [rows, batchRows, houseRows, farmRows] = await Promise.all([
      db.select().from(s.transfers).orderBy(desc(s.transfers.transferDate)),
      db.select().from(s.batches),
      db.select().from(s.houses),
      db.select().from(s.farms).where(eq(s.farms.companyId, companyId)),
    ]);
    const houseIds = new Set(houseRows.filter((h) => farmRows.some((f) => f.id === h.farmId)).map((h) => h.id));
    const owned = batchRows.filter((b) => houseIds.has(b.houseId));
    const ownedIds = new Set(owned.map((b) => b.id));
    const loc = (batchId: number) => {
      const b = owned.find((x) => x.id === batchId);
      const h = b && houseRows.find((x) => x.id === b.houseId);
      const f = h && farmRows.find((x) => x.id === h.farmId);
      return b ? `${b.code} · ${h?.name ?? "?"} · ${f?.city ?? "?"}` : "?";
    };
    return rows.filter((t) => ownedIds.has(t.sourceBatchId) && ownedIds.has(t.targetBatchId)).map((t) => ({ ...t, source: loc(t.sourceBatchId), target: loc(t.targetBatchId) }));
  }),

  executeTransfer: authedQuery
    .input(z.object({
      sourceBatchId: z.number(), targetHouseId: z.number(), birdCount: z.number().int().min(1),
      driver: z.string().optional(), vehicle: z.string().optional(),
      durationMin: z.number().int().optional(), transportMortality: z.number().int().min(0).default(0),
      signatureFrom: z.string().optional(), signatureTo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireBatchTenant(ctx.user!, input.sourceBatchId);
      await requireHouseTenant(ctx.user!, input.targetHouseId);
      const db = getDb();
      const [src] = await db.select().from(s.batches).where(eq(s.batches.id, input.sourceBatchId));
      if (!src) throw new Error("Rzut źródłowy nie istnieje");
      if (input.birdCount + input.transportMortality > src.currentCount)
        throw new Error(`Za mało ptaków: dostępne ${src.currentCount}, żądane ${input.birdCount + input.transportMortality}`);
      const [tgtHouse] = await db.select().from(s.houses).where(eq(s.houses.id, input.targetHouseId));
      if (!tgtHouse) throw new Error("Kurnik docelowy nie istnieje");
      // walidacja obsady — ostatnie ważenie źródła
      const lastW = await db.select().from(s.weighings)
        .where(eq(s.weighings.batchId, input.sourceBatchId))
        .orderBy(desc(s.weighings.dayAge)).limit(1);
      const avgG = lastW[0]?.avgWeightG ?? 45;
      const densityAfter = (input.birdCount * avgG / 1000) / Number(tgtHouse.areaM2);
      if (densityAfter > Number(tgtHouse.maxDensityKgM2))
        throw new Error(`Przekroczenie obsady: ${densityAfter.toFixed(1)} kg/m² > max ${tgtHouse.maxDensityKgM2} kg/m²`);

      // Calculation Engine: atomowa zmiana liczby ptaków
      await db.transaction(async (tx) => {
        await tx.update(s.batches)
          .set({ currentCount: src.currentCount - input.birdCount - input.transportMortality, updatedBy: "transfer" })
          .where(eq(s.batches.id, src.id));
        const [existing] = await tx.select().from(s.batches)
          .where(and(eq(s.batches.houseId, input.targetHouseId), eq(s.batches.status, "active")));
        let targetId: number;
        if (existing) {
          await tx.update(s.batches)
            .set({ currentCount: existing.currentCount + input.birdCount, updatedBy: "transfer" })
            .where(eq(s.batches.id, existing.id));
          targetId = existing.id;
        } else {
          const [{ id }] = await tx.insert(s.batches).values({
            houseId: input.targetHouseId, code: `${src.code}/T`, geneticLine: src.geneticLine,
            geneticLineId: src.geneticLineId, sex: src.sex, chickSupplier: src.chickSupplier,
            chickPrice: src.chickPrice, startDate: src.startDate, plannedEndDate: src.plannedEndDate,
            initialCount: input.birdCount, currentCount: input.birdCount,
          }).returning({ id: s.batches.id });
          targetId = id;
        }
        const docNo = `TR/${new Date().getFullYear()}/${String(Date.now() % 100000).padStart(5, "0")}`;
        await tx.insert(s.transfers).values({
          sourceBatchId: src.id, targetBatchId: targetId, birdCount: input.birdCount,
          avgWeightG: avgG, transportMortality: input.transportMortality,
          transferDate: new Date(), durationMin: input.durationMin,
          driver: input.driver, vehicle: input.vehicle,
          signatureFrom: input.signatureFrom, signatureTo: input.signatureTo, documentNo: docNo,
        });
      });
      await audit("batches", src.id, "update", { oldValues: { currentCount: src.currentCount }, newValues: { currentCount: src.currentCount - input.birdCount }, author: "TransferManager" });
      return { ok: true };
    }),

  /* ------- magazyn / silosy ------- */
  warehouseOverview: authedQuery.query(async ({ ctx }) => {
    const companyId = requireTenantCompany(ctx.user!);
    const db = getDb();
    const [silos, wh, farmRows, recipes] = await Promise.all([
      db.select().from(s.silos).where(ne(s.silos.status, "archived")),
      db.select().from(s.warehouses).where(ne(s.warehouses.status, "archived")),
      db.select().from(s.farms).where(eq(s.farms.companyId, companyId)),
      db.select().from(s.recipes).where(eq(s.recipes.companyId, companyId)),
    ]);
    const farmOf = (id: number) => farmRows.find((f) => f.id === id);
    return {
      silos: silos.filter((x) => farmOf(x.farmId)).map((x) => ({ ...x, farm: farmOf(x.farmId), recipe: recipes.find((r) => r.id === x.recipeId) ?? null })),
      warehouses: wh.filter((x) => farmOf(x.farmId)).map((x) => ({ ...x, farm: farmOf(x.farmId) })),
    };
  }),

  /* ------- audit log ------- */
  auditLog: authedQuery
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }).optional())
    .query(async ({ input }) => {
      return getDb().select().from(s.auditLog).orderBy(desc(s.auditLog.id)).limit(input?.limit ?? 50);
    }),
});
