import { authRouter } from "./auth-router";
import { farmRouter } from "./farm-router";
import { orgRouter } from "./org-router";
import { dailyRouter, feedProgramRouter } from "./daily-router";
import { createRouter, publicQuery } from "./middleware";
import { erpRouter, notificationsRouter } from "./erp-router";
import { analyticsRouter, aiRouter } from "./analytics-router";
import { nutritionRouter } from "./nutrition-router";
import { commandRouter } from "./command-router";
import { gapRouter } from "./gap-router";
import { transferRouter } from "./transfer-router";
import { feedIntelRouter } from "./feed-intel-router";
import { healthIntelRouter } from "./health-intel-router";
import { productionIntelRouter } from "./production-intel-router";
import { warehouseIntelRouter } from "./warehouse-intel-router";
import { economicsIntelRouter } from "./economics-intel-router";
import { iotIntelRouter } from "./iot-intel-router";
import { predictionRouter } from "./prediction-router";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  farm: farmRouter,
  org: orgRouter,
  daily: dailyRouter,
  feedProgram: feedProgramRouter,
  erp: erpRouter,
  notifications: notificationsRouter,
  analytics: analyticsRouter,
  ai: aiRouter,
  nutrition: nutritionRouter,
  command: commandRouter,
  gap: gapRouter,
  transfer: transferRouter,
  feedIntel: feedIntelRouter,
  healthIntel: healthIntelRouter,
  productionIntel: productionIntelRouter,
  warehouseIntel: warehouseIntelRouter,
  economicsIntel: economicsIntelRouter,
  iotIntel: iotIntelRouter,
  prediction: predictionRouter,
});

export type AppRouter = typeof appRouter;
