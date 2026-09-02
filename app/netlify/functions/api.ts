import type { Handler } from "@netlify/functions";
import app from "../../api/boot";
import { ensureSeeded } from "../../api/seed";
import { ensureMySqlSchema } from "../../db/migrate-all";
import { eventToRequest, responseToHandlerResult } from "./_http";

export const handler: Handler = async (event) => {
  await ensureMySqlSchema();
  await ensureSeeded();
  const response = await app.fetch(eventToRequest(event));
  return responseToHandlerResult(response);
};
