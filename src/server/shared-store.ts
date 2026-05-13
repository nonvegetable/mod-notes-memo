/**
 * Shared storage for mod notes
 * 
 * Production: Uses Devvit's Redis API for persistence
 * Development/Playtest: Uses file-based store (tries multiple writable locations)
 * 
 * NOTE: Devvit handlers are isolated, so we rely on disk persistence between calls
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Try multiple possible store locations
function getStoreFilePath(): string {
  const candidates = [
    path.join(process.cwd(), '.modnotes-store.json'),
    path.join(os.homedir(), '.modnotes-store.json'),
    path.join('/tmp', 'modnotes-store.json'),
  ];
  
  // Try to find a writable location
  for (const filePath of candidates) {
    try {
      // Test by trying to read or write
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch {}
      }
      // If we can write here, use this location
      fs.accessSync(dir, fs.constants.W_OK);
      return filePath;
    } catch (err) {
      // This location isn't writable, try next
      continue;
    }
  }
  
  // Fallback to first option (might fail at write time, but that's ok)
  return candidates[0];
}

let STORE_FILE = getStoreFilePath();

// Use globalThis to ensure the store is shared across all module instances
function getInMemoryStore(): Record<string, string> {
  if (!(globalThis as any).modNotesStore) {
    (globalThis as any).modNotesStore = {};
  }
  return (globalThis as any).modNotesStore;
}

// Try to import Devvit Redis (will fail in some build contexts, that's ok)
let redisAvailable = false;
let redis: any = null;

try {
  // This import only works in actual Devvit runtime
  const devvitModule = require('@devvit/public-api');
  if (devvitModule && devvitModule.redis) {
    redis = devvitModule.redis;
    redisAvailable = true;
    console.log('✅ Using Devvit Redis for production storage');
  }
} catch (err) {
  console.log('📝 Devvit Redis not available, using file-based store for playtest');
}

// Load from disk (called on every handler invocation)
function loadFromDisk() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = fs.readFileSync(STORE_FILE, 'utf-8');
      const store = getInMemoryStore();
      const parsed = JSON.parse(data);
      // Merge disk data into memory store
      Object.assign(store, parsed);
      return true;
    }
  } catch (err) {
    // Silently ignore errors
  }
  return false;
}

// Save to file (called after every setInStore)
function saveToDisk() {
  try {
    const store = getInMemoryStore();
    const dir = path.dirname(STORE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
    return true;
  } catch (err) {
    // In read-only filesystems, silently ignore
    // Data will still be available in memory during the current request
    return false;
  }
}
    if (!(err instanceof Error) || !err.message.includes('EROFS')) {
      console.error('Failed to save store to disk:', err);
    }
  }
}

/**
 * Get a value from storage
 * In production: uses Devvit Redis
 * In playtest: loads from disk (since handlers are isolated) then returns from memory
 */
export async function getFromStore(key: string): Promise<string | null> {
  if (redisAvailable && redis) {
    try {
      const value = await redis.get(key);
      return value ?? null;
    } catch (err) {
      console.error('Redis get error, falling back to disk:', err);
      // Fallthrough to disk-based retrieval
    }
  }
  
  // Load fresh data from disk before reading (handlers are isolated)
  loadFromDisk();
  const store = getInMemoryStore();
  const value = store[key];
  console.log('📥 getFromStore:', key, '→ store has', Object.keys(store).length, 'keys:', Object.keys(store), '→', value ? 'FOUND' : 'NOT FOUND');
  return value ?? null;
}

/**
 * Set a value in storage
 * In production: uses Devvit Redis
 * In playtest: writes to disk for persistence across handler invocations
 */
export async function setInStore(key: string, value: string): Promise<void> {
  if (redisAvailable && redis) {
    try {
      await redis.set(key, value);
      return;
    } catch (err) {
      console.error('Redis set error, falling back to disk:', err);
    }
  }
  
  const store = getInMemoryStore();
  store[key] = value;
  const saved = saveToDisk();
  console.log('💾 setInStore:', key, '→ store now has', Object.keys(store).length, 'keys:', Object.keys(store), '→ disk:', saved ? 'saved' : 'failed (will retry on next request)');
}

/**
 * Delete a value from storage
 */
export async function deleteFromStore(key: string): Promise<void> {
  if (redisAvailable && redis) {
    try {
      await redis.del(key);
      return;
    } catch (err) {
      console.error('Redis delete error, falling back to memory:', err);
    }
  }
  
  const store = getInMemoryStore();
  delete store[key];
  saveToDisk();
}

/**
 * Legacy mockRedisStore object for backward compatibility
 * This is a synchronous wrapper for the async functions above
 * Note: In production with async Redis, this may have race conditions
 * Use getFromStore/setInStore for new code
 */
export const mockRedisStore = new Proxy({} as Record<string, string>, {
  set(target, prop: string | symbol, value) {
    if (typeof prop === 'string') {
      const store = getInMemoryStore();
      store[prop] = value as string;
      saveToDisk();
    }
    return true;
  },
  get(target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getInMemoryStore()[prop];
    }
    return undefined;
  },
});

// Initialize on first import
loadFromDisk();
