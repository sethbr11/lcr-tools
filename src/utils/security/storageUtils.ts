import { browser } from 'wxt/browser';
import { Constants, Types } from '@/types';
import { decryptData, encryptData, getUnlockedPin, isEncryptedPayload } from './cryptoUtils';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Retrieves the full cached photo map from extension local storage.
 *
 * @returns Promise resolving to a dictionary of member IDs and their photo metadata.
 */
export async function getPhotoCache(): Promise<Types.PhotoCache> {
  try {
    if (browser?.storage?.local) {
      const result = await browser.storage.local.get(Constants.PHOTO_CACHE_KEY);
      const cache = (result[Constants.PHOTO_CACHE_KEY] as Types.PhotoCache) || {};
      const now = Date.now();
      let hasExpired = false;
      const validCache: Types.PhotoCache = {};

      for (const [key, entry] of Object.entries(cache)) {
        if (entry.timestamp && now - entry.timestamp > Constants.PHOTO_CACHE_TTL_MS) {
          hasExpired = true;
        } else {
          validCache[key] = entry;
        }
      }

      if (hasExpired) {
        await browser.storage.local.set({ [Constants.PHOTO_CACHE_KEY]: validCache });
      }

      return validCache;
    }
  } catch (error) {
    console.error('LCR Tools: Failed to read photo cache:', error);
  }
  return {};
}

/**
 * Merges new member photo records into the local storage photo cache, pruning oldest entries if exceeding limit.
 *
 * @param newEntries - Key-value map of member IDs to photo metadata records.
 */
export async function updatePhotoCache(
  newEntries: Record<string, Types.PhotoCacheEntry>
): Promise<void> {
  const currentCache = await getPhotoCache();
  const updatedCache: Types.PhotoCache = { ...currentCache, ...newEntries };

  pruneCacheEntries(updatedCache);

  try {
    if (browser?.storage?.local) {
      await browser.storage.local.set({ [Constants.PHOTO_CACHE_KEY]: updatedCache });
    }
  } catch (error) {
    console.error('LCR Tools: Failed to persist photo cache:', error);
  }
}

/**
 * Purges all cached member photo data from browser local storage.
 */
export async function clearPhotoCache(): Promise<void> {
  try {
    if (browser?.storage?.local) {
      await browser.storage.local.remove(Constants.PHOTO_CACHE_KEY);
    }
  } catch (error) {
    console.error('LCR Tools: Failed to clear photo cache:', error);
  }
}

/**
 * Retrieves cached settings for member data and photo caching behavior.
 *
 * @returns Promise resolving to configuration settings object.
 */
export async function getCacheSettings(): Promise<Types.CacheSettings> {
  try {
    if (browser?.storage?.local) {
      const result = await browser.storage.local.get(Constants.CACHE_SETTINGS_KEY);
      return (result[Constants.CACHE_SETTINGS_KEY] as Types.CacheSettings) || {};
    }
  } catch (error) {
    console.error('LCR Tools: Failed to read cache settings:', error);
  }
  return {};
}

/**
 * Saves user settings for photo caching and data retention.
 *
 * @param settings - Configuration settings object.
 */
export async function saveCacheSettings(settings: Types.CacheSettings): Promise<void> {
  try {
    if (browser?.storage?.local) {
      await browser.storage.local.set({ [Constants.CACHE_SETTINGS_KEY]: settings });
    }
  } catch (error) {
    console.error('LCR Tools: Failed to save cache settings:', error);
  }
}

/**
 * Retrieves the full map of saved nickname mappings from extension storage, decrypting if encrypted.
 *
 * @returns Promise resolving to a dictionary of alias records.
 */
export async function getSavedNicknames(): Promise<Types.NicknameDictionary> {
  try {
    if (!browser?.storage?.local) return {};
    const res = await browser.storage.local.get(Constants.ATTENDANCE_NICKNAMES_KEY);
    const raw = res[Constants.ATTENDANCE_NICKNAMES_KEY];
    if (!raw) return {};

    if (isEncryptedPayload(raw)) {
      const pin = await getUnlockedPin();
      if (!pin) return {};
      try {
        return await decryptData<Types.NicknameDictionary>(raw, pin);
      } catch (err) {
        console.error('LCR Tools: Failed to decrypt saved nicknames:', err);
        return {};
      }
    }

    const dict = (raw as Types.NicknameDictionary) || {};
    const activePin = await getUnlockedPin();
    if (activePin && Object.keys(dict).length > 0) {
      await persistNicknames(dict);
    }
    return dict;
  } catch (error) {
    console.error('LCR Tools: Failed to read saved nicknames:', error);
    return {};
  }
}

/**
 * Persists a new or updated nickname-to-canonical mapping in extension local storage.
 *
 * @param alias - Informal or nickname string as entered on attendance roster.
 * @param canonicalName - Official ward roll member full name.
 */
export async function saveNicknameMapping(alias: string, canonicalName: string): Promise<void> {
  if (!alias || !canonicalName) return;
  const cleanAlias = alias.trim().toLowerCase();
  const cleanCanonical = canonicalName.trim();

  if (cleanAlias === cleanCanonical.toLowerCase()) return;

  try {
    const current = await getSavedNicknames();
    current[cleanAlias] = {
      alias: alias.trim(),
      canonicalName: cleanCanonical,
      updatedAt: Date.now(),
    };
    await persistNicknames(current);
  } catch (error) {
    console.error('LCR Tools: Failed to save nickname mapping:', error);
  }
}

/**
 * Removes a specific nickname mapping from extension local storage.
 *
 * @param alias - Informal or nickname string identifying the mapping to delete.
 */
export async function removeNicknameMapping(alias: string): Promise<void> {
  if (!alias) return;
  const cleanKey = alias.trim().toLowerCase();
  try {
    const current = await getSavedNicknames();
    if (current[cleanKey]) {
      delete current[cleanKey];
      await persistNicknames(current);
    }
  } catch (error) {
    console.error('LCR Tools: Failed to remove nickname mapping:', error);
  }
}

/**
 * Migrates existing plaintext attendance nicknames to encrypted storage using the newly created PIN.
 *
 * @param pin - Validated user security PIN string.
 */
export async function migrateNicknamesToEncryption(pin: string): Promise<void> {
  try {
    if (!browser?.storage?.local) return;
    const res = await browser.storage.local.get(Constants.ATTENDANCE_NICKNAMES_KEY);
    const raw = res[Constants.ATTENDANCE_NICKNAMES_KEY];
    if (raw && !isEncryptedPayload(raw)) {
      const dict = (raw as Types.NicknameDictionary) || {};
      const encrypted = await encryptData(dict, pin);
      await browser.storage.local.set({ [Constants.ATTENDANCE_NICKNAMES_KEY]: encrypted });
    }
  } catch (error) {
    console.error('LCR Tools: Failed to migrate nicknames to encryption:', error);
  }
}

/**
 * Purges all saved nickname mappings from extension local storage.
 */
export async function clearAllNicknames(): Promise<void> {
  try {
    if (browser?.storage?.local) {
      await browser.storage.local.remove(Constants.ATTENDANCE_NICKNAMES_KEY);
    }
  } catch (error) {
    console.error('LCR Tools: Failed to clear nickname mappings:', error);
  }
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Enforces FIFO max capacity bounds and 24-hour TTL expiration on photo cache object. */
function pruneCacheEntries(cache: Types.PhotoCache): void {
  const now = Date.now();
  for (const [key, entry] of Object.entries(cache)) {
    if (entry.timestamp && now - entry.timestamp > Constants.PHOTO_CACHE_TTL_MS) {
      delete cache[key];
    }
  }

  const keys = Object.keys(cache);
  if (keys.length > Constants.MAX_CACHE_ENTRIES) {
    keys.sort((a, b) => (cache[a]?.timestamp || 0) - (cache[b]?.timestamp || 0));
    const keysToRemove = keys.slice(0, keys.length - Constants.MAX_CACHE_ENTRIES);
    for (const key of keysToRemove) {
      delete cache[key];
    }
  }
}

/** Persists nickname dictionary to extension storage (encrypted if PIN unlocked). */
async function persistNicknames(nicknames: Types.NicknameDictionary): Promise<void> {
  try {
    if (!browser?.storage?.local) return;
    const pin = await getUnlockedPin();
    if (pin) {
      const encrypted = await encryptData(nicknames, pin);
      await browser.storage.local.set({ [Constants.ATTENDANCE_NICKNAMES_KEY]: encrypted });
      return;
    }
    await browser.storage.local.set({ [Constants.ATTENDANCE_NICKNAMES_KEY]: nicknames });
  } catch (error) {
    console.error('LCR Tools: Failed to persist nickname mappings:', error);
  }
}
