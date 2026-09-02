import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";

export const trpc = createTRPCReact<AppRouter>();

const queryClient = new QueryClient();
const apiBaseUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
const demoMode = import.meta.env.VITE_DEMO_MODE === "true";
let trpcUrl = "/api/trpc";
if (!demoMode && apiBaseUrl) {
  try {
    trpcUrl = new URL("/api/trpc", `${apiBaseUrl}/`).toString();
  } catch {
    console.error("Invalid VITE_API_URL; falling back to the local API path.");
  }
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: trpcUrl,
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
