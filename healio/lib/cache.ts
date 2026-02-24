type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  createdAt: number;
};

type InMemoryCacheStore = Map<string, CacheEntry<unknown>>;

function getCacheStore(): InMemoryCacheStore {
  const globalScope = globalThis as typeof globalThis & {
    __healioInMemoryCacheStore?: InMemoryCacheStore;
  };
  if (!globalScope.__healioInMemoryCacheStore) {
    globalScope.__healioInMemoryCacheStore = new Map();
  }
  return globalScope.__healioInMemoryCacheStore;
}

export type CacheGetOrSetResult<T> = {
  value: T;
  hit: boolean;
  expiresAt: number;
};

export async function getOrSetInMemoryCache<T>(input: {
  key: string;
  ttlMs: number;
  factory: () => Promise<T> | T;
}): Promise<CacheGetOrSetResult<T>> {
  const now = Date.now();
  const existing = getCacheStore().get(input.key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > now) {
    return {
      value: structuredClone(existing.value),
      hit: true,
      expiresAt: existing.expiresAt,
    };
  }

  const value = await input.factory();
  const entry: CacheEntry<T> = {
    value: structuredClone(value),
    createdAt: now,
    expiresAt: now + Math.max(1, input.ttlMs),
  };
  getCacheStore().set(input.key, entry);
  return {
    value: structuredClone(entry.value),
    hit: false,
    expiresAt: entry.expiresAt,
  };
}

export function invalidateInMemoryCacheByPrefix(prefix: string) {
  let deleted = 0;
  for (const key of getCacheStore().keys()) {
    if (key.startsWith(prefix)) {
      getCacheStore().delete(key);
      deleted += 1;
    }
  }
  return deleted;
}

export function resetInMemoryCacheForTests() {
  getCacheStore().clear();
}

