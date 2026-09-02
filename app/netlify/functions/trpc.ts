import type { Handler } from "@netlify/functions";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "../../api/context";
import { appRouter } from "../../api/router";
import { ensureSeeded } from "../../api/seed";
import { eventToRequest, responseToHandlerResult } from "./_http";

export const handler: Handler = async (event) => {
  await ensureSeeded();

  const req = eventToRequest(event);
  const response = await fetchRequestHandler({
    endpoint: "/.netlify/functions/trpc",
    req,
    router: appRouter,
    createContext,
  });

  return responseToHandlerResult(response);
};
