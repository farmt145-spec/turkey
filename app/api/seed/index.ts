import { getDb } from "../queries/connection";
import * as s from "@db/schema";
import { seedNutritionalStandards } from "./nutritional-standards";
import { seedFeedIngredients } from "./feed-ingredients";
import { seedRecipeTemplates, seedVaccinationTemplates } from "./recipes";
import { seedProductionData } from "./production-data";

let seededPromise: Promise<void> | null = null;

export async function ensureSharedTemplates() {
  const db = getDb();
  await seedNutritionalStandards(db);
  await seedFeedIngredients(db);
  await seedRecipeTemplates(db);
  await seedVaccinationTemplates(db);
}

export async function seedDemoData() {
  const db = getDb();
  await ensureSharedTemplates();
  const [firstCompany] = await db.select().from(s.companies).limit(1);
  if (!firstCompany) {
    await seedProductionData(db);
  }
}

export async function ensureSeeded() {
  if (!seededPromise) {
    seededPromise = seedDemoData().catch((error) => {
      seededPromise = null;
      throw error;
    });
  }
  await seededPromise;
}

if (process.argv[1] && process.argv[1].endsWith("/seed/index.ts")) {
  seedDemoData()
    .then(() => {
      console.log("Demo seed complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
