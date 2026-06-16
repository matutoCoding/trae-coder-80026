const PERSIST_PREFIX = 'ktv_booking_';

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const saveToStorage = <T>(key: string, value: T): void => {
  if (!isBrowser) return;
  try {
    const fullKey = PERSIST_PREFIX + key;
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(fullKey, serialized);
    console.log(`[Persist] Saved ${fullKey}`);
  } catch (e) {
    console.error(`[Persist] Failed to save ${key}:`, e);
  }
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  if (!isBrowser) return defaultValue;
  try {
    const fullKey = PERSIST_PREFIX + key;
    const serialized = window.localStorage.getItem(fullKey);
    if (serialized === null) {
      console.log(`[Persist] No data for ${fullKey}, using default`);
      return defaultValue;
    }
    const parsed = JSON.parse(serialized) as T;
    console.log(`[Persist] Loaded ${fullKey}`);
    return parsed;
  } catch (e) {
    console.error(`[Persist] Failed to load ${key}:`, e);
    return defaultValue;
  }
};

export const clearStorage = (key?: string): void => {
  if (!isBrowser) return;
  try {
    if (key) {
      const fullKey = PERSIST_PREFIX + key;
      window.localStorage.removeItem(fullKey);
      console.log(`[Persist] Cleared ${fullKey}`);
    } else {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(PERSIST_PREFIX)) {
          keys.push(k);
        }
      }
      keys.forEach(k => window.localStorage.removeItem(k));
      console.log(`[Persist] Cleared all persisted data (${keys.length} keys)`);
    }
  } catch (e) {
    console.error('[Persist] Failed to clear storage:', e);
  }
};
