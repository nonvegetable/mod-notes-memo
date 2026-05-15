/**
 * Shared storage for mod notes
 * 
 * Production: Uses Devvit's Redis API for persistence
 * Development/Playtest: Uses globalThis in-memory store
 * 
 * Note: In serverless environments, each request may get a fresh module instance.
 * We use globalThis to ensure data is shared across handlers in the same execution context.
 * Data persists for the playtest session but is lost on restart (expected behavior).
 */

// Use globalThis as the primary storage (works across module instances in same context)
function getInMemoryStore(): Record<string, string> {
  const global = globalThis as { modNotesStore?: Record<string, string> };
  if (!global.modNotesStore) {
    global.modNotesStore = {};
    console.log('🆕 Initialized new in-memory store');
  }
  return global.modNotesStore;
}

// Try to import Devvit Redis (will fail in some build contexts, that's ok)
let redisAvailable = false;
let redis: { get: (key: string) => Promise<string | null>; set: (key: string, value: string) => Promise<void>; del: (key: string) => Promise<void> } | null = null;

try {
  // This import only works in actual Devvit runtime
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const devvitModule = require('@devvit/public-api');
  if (devvitModule && devvitModule.redis) {
    redis = devvitModule.redis;
    redisAvailable = true;
    console.log('✅ Using Devvit Redis for production storage');
  }
} catch (err) {
  console.log('📝 Devvit Redis not available, using in-memory store for playtest');
}

/**
 * Get a value from storage
 * In production: uses Devvit Redis
 * In playtest: uses in-memory store via globalThis
 */
export async function getFromStore(key: string): Promise<string | null> {
  if (redisAvailable && redis) {
    try {
      const value = await redis.get(key);
      return value ?? null;
    } catch (err) {
      console.error('Redis get error, falling back to memory:', err);
      const store = getInMemoryStore();
      console.log('📥 getFromStore:', key, '→ found:', !!store[key]);
      return store[key] ?? null;
    }
  }

  // Playtest: use in-memory store
  const store = getInMemoryStore();
  console.log('📥 getFromStore:', key, '→ store has', Object.keys(store).length, 'keys, found:', !!store[key]);
  return store[key] ?? null;
}

/**
 * Set a value in storage
 * In production: uses Devvit Redis
 * In playtest: uses in-memory store via globalThis
 */
export async function setInStore(key: string, value: string): Promise<void> {
  if (redisAvailable && redis) {
    try {
      await redis.set(key, value);
      console.log('💾 setInStore (redis):', key);
      return;
    } catch (err) {
      console.error('Redis set error, falling back to memory:', err);
    }
  }

  // Playtest: store in memory (globalThis)
  const store = getInMemoryStore();
  store[key] = value;
  console.log('💾 setInStore (memory):', key, '→ store now has', Object.keys(store).length, 'keys');
}

/**
 * Delete a value from storage
 * In production: uses Devvit Redis
 * In playtest: uses in-memory store via globalThis
 */
export async function deleteFromStore(key: string): Promise<void> {
  if (redisAvailable && redis) {
    try {
      await redis.del(key);
      console.log('🗑️ deleteFromStore (redis):', key);
      return;
    } catch (err) {
      console.error('Redis delete error, falling back to memory:', err);
    }
  }

  // Playtest: delete from memory
  const store = getInMemoryStore();
  delete store[key];
  console.log('🗑️ deleteFromStore (memory):', key, '→ store now has', Object.keys(store).length, 'keys');
}

/**
 * Legacy mockRedisStore object for backward compatibility
 * This is a synchronous wrapper for the async functions above
 * Note: This is provided for compatibility but should not be used in new code
 * Use getFromStore/setInStore for new code
 */
export const mockRedisStore = new Proxy({} as Record<string, string>, {
  set(_target, prop: string | symbol, value) {
    if (typeof prop === 'string') {
      const store = getInMemoryStore();
      store[prop] = value as string;
    }
    return true;
  },
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getInMemoryStore()[prop];
    }
    return undefined;
  },
});
