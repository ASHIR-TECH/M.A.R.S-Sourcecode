import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * A `SupportedStorage` adapter for supabase-js, backed by the Android
 * keystore / iOS keychain via expo-secure-store.
 *
 * Why not AsyncStorage, which is the usual choice? Because a session grants
 * real access to the user's account. AsyncStorage is plain unencrypted files in
 * the app sandbox, so on a rooted device or a stolen backup the refresh token is
 * readable. SecureStore keeps it behind hardware-backed encryption.
 *
 * Every method swallows its own failures. Supabase calls this adapter during
 * client startup, and an exception escaping here would take down auth
 * initialisation entirely -- a corrupt or undecryptable entry is simply "no
 * session", which is the correct interpretation anyway.
 */

/**
 * SecureStore refuses entries larger than 2048 bytes and warns that it "may
 * not be stored successfully" before eventually throwing in a future SDK.
 *
 * A real Supabase session is ~2316 bytes once the user object carries a full
 * identity payload, so it does not fit. Writing it in one call is exactly why
 * Android was dropping session persistence and logging users out on every
 * restart.
 *
 * Values are therefore split across `${key}.chunk.N` entries, with a marker at
 * the primary key recording how many chunks and how many total bytes to expect.
 * Splitting was chosen over dropping fields from the session because trimming
 * means guessing what supabase-js needs on restore, and the access token can
 * grow as entitlement claims are added.
 *
 * Sizing: 1800 leaves headroom under the 2048 ceiling for the suffix that gets
 * appended to the chunk key.
 */
const CHUNK_SIZE = 1800;
const MARKER_PREFIX = '__CHUNKED__:';

const chunkKey = (key: string, index: number) => `${key}.chunk.${index}`;

type Store = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const secureStore: Store = {
  async getItem(key) {
    return (await SecureStore.getItemAsync(key)) ?? null;
  },
  async setItem(key, value) {
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key) {
    await SecureStore.deleteItemAsync(key);
  },
};

const memoryStore = new Map<string, string>();
const memory: Store = {
  async getItem(key) {
    return memoryStore.get(key) ?? null;
  },
  async setItem(key, value) {
    memoryStore.set(key, value);
  },
  async removeItem(key) {
    memoryStore.delete(key);
  },
};

/**
 * Reads the number of chunks recorded by an existing marker, or 0 when the
 * entry is either absent or stored unchunked by a previous version.
 */
async function markerCount(store: Store, key: string): Promise<number> {
  const raw = await store.getItem(key);
  if (!raw || !raw.startsWith(MARKER_PREFIX)) return 0;
  const count = Number(raw.split(':')[1]);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

async function removeChunks(store: Store, key: string, count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    try {
      await store.removeItem(chunkKey(key, i));
    } catch {
      // Cleaning up a chunk that is already gone is not actionable.
    }
  }
}

async function readValue(store: Store, key: string): Promise<string | null> {
  const raw = await store.getItem(key);

  // Previous, unchunked layout -- still readable, so an upgrade does not
  // strand an existing session.
  if (raw && !raw.startsWith(MARKER_PREFIX)) return raw;
  if (raw === null) return null;

  const partsMarker = raw.split(':');
  const countPart = partsMarker[2] ?? partsMarker[1];
  const lengthPart = partsMarker[3] ?? partsMarker[2];
  const count = Number(countPart);
  const expectedLength = Number(lengthPart);

  if (!Number.isFinite(count) || count < 1 || !Number.isFinite(expectedLength)) {
    return null;
  }

  const parts: string[] = [];
  let total = 0;

  for (let i = 0; i < count; i += 1) {
    const part = await store.getItem(chunkKey(key, i));
    // A missing chunk means a write was interrupted or was never completed.
    // Reporting "no session" is correct and forces a clean re-auth rather than
    // handing supabase-js a half-restored token pair.
    if (part === null) return null;
    parts.push(part);
    total += part.length;
  }

  // Guards against mixed generations: a later write that wrote fewer chunks
  // than an earlier one, with a crash in between. If the byte total does not
  // match the marker, the parts do not belong together.
  if (total !== expectedLength) return null;

  return parts.join('');
}

async function writeValue(store: Store, key: string, value: string): Promise<void> {
  const previousCount = await markerCount(store, key);

  if (value.length <= CHUNK_SIZE) {
    await store.setItem(key, value);
    await removeChunks(store, key, previousCount);
    return;
  }

  const count = Math.ceil(value.length / CHUNK_SIZE);

  // Chunks first, marker last. A crash partway through leaves the previous
  // marker intact and points at the previous (complete) session, so the user
  // keeps the session they had rather than a torn one.
  for (let i = 0; i < count; i += 1) {
    await store.setItem(chunkKey(key, i), value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
  }
  await store.setItem(key, `${MARKER_PREFIX}:${count}:${value.length}`);

  // Drop any chunks the larger previous value left behind.
  if (previousCount > count) {
    await removeChunks(store, key, previousCount);
  } else if (previousCount > 0 && previousCount < count) {
    // nothing to do - old chunks are fewer
  }
}

async function deleteValue(store: Store, key: string): Promise<void> {
  const count = await markerCount(store, key);
  await removeChunks(store, key, count);
  try {
    await store.removeItem(key);
  } catch {
    // A delete that fails on a missing or invalid key is not actionable.
  }
}

// expo-secure-store does not work reliably on web, so fall back to memory.
// Consequence: web sessions do not survive a page reload.
const backend: Store = Platform.OS === 'web' ? memory : secureStore;

/**
 * SecureStore reads reject when the entry can no longer be decrypted -- most
 * often because the Android keystore key was invalidated (lock-screen change,
 * biometric reset, or restore from backup onto another device). We try to clear
 * the dead entry so the next write starts clean, but treat a failed delete as
 * irrelevant: either way there is no session to restore.
 */
export const secureStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return readValue(backend, key);
    try {
      return await readValue(backend, key);
    } catch {
      try {
        // Try to clean up any chunked remnants without re-throwing if the
        // primary key itself cannot be decrypted/read.
        try {
          const count = await markerCount(backend, key);
          await removeChunks(backend, key, count);
        } catch {
          // Ignore cleanup failures when the underlying store cannot read.
        }
        await SecureStore.deleteItemAsync(key);
      } catch {
        // Already gone, or still unreadable.
      }
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await writeValue(backend, key, value);
    } catch {
      // The session still works for this app run; it just will not survive a
      // restart and the user will sign in again next launch.
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await deleteValue(backend, key);
    } catch {
      // A delete that fails on a missing or invalid key is not actionable.
    }
  },
};

/** Exported for tests: the ceiling SecureStore enforces on a single entry. */
export const SECURE_STORE_ENTRY_LIMIT = 2048;
/** Exported for tests: the chunk size this adapter writes. */
export const SECURE_STORE_CHUNK_SIZE = CHUNK_SIZE;