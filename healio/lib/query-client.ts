import { QueryClient } from "@tanstack/react-query";

function readDurationMs(envName: string, fallbackMs: number, minMs: number, maxMs: number) {
  const raw = process.env[envName];
  if (!raw) return fallbackMs;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallbackMs;
  return Math.min(maxMs, Math.max(minMs, Math.floor(parsed)));
}

export function createQueryClient() {
  const staleTimeMs = readDurationMs("NEXT_PUBLIC_QUERY_STALE_MS", 120_000, 10_000, 15 * 60_000);
  const gcTimeMs = readDurationMs("NEXT_PUBLIC_QUERY_GC_MS", 10 * 60_000, 60_000, 60 * 60_000);

  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: staleTimeMs,
        gcTime: gcTimeMs,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
