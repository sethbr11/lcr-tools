import { browser } from 'wxt/browser';
import { Constants, Types } from '@/types';
import { decryptData, encryptData, getUnlockedPin, isEncryptedPayload } from './cryptoUtils';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Reads catalog API keys from isolated extension storage, decrypting if encrypted.
 *
 * @returns Promise resolving to stored catalog keys only.
 */
export async function getStoredApiKeys(): Promise<Types.StoredApiKeys> {
  try {
    if (!browser?.storage?.local) return {};
    const result = await browser.storage.local.get(Constants.API_KEYS_STORAGE_KEY);
    const raw = result[Constants.API_KEYS_STORAGE_KEY];
    if (!raw) return {};

    if (isEncryptedPayload(raw)) {
      const pin = await getUnlockedPin();
      if (!pin) return {};
      try {
        const decrypted = await decryptData<Types.StoredApiKeys>(raw, pin);
        return sanitizeStoredApiKeys(decrypted);
      } catch (err) {
        console.error('LCR Tools: Failed to decrypt API keys with session PIN:', err);
        return {};
      }
    }

    const sanitized = sanitizeStoredApiKeys(raw);
    const activePin = await getUnlockedPin();
    if (activePin && Object.keys(sanitized).length > 0) {
      await persistApiKeys(sanitized);
    }
    return sanitized;
  } catch (error) {
    console.error('LCR Tools: Failed to read API keys:', error);
    return {};
  }
}

/**
 * Persists one catalog API key value. Unknown identifiers are ignored.
 *
 * @param id - Catalog key identifier.
 * @param value - Secret string to store; empty values remove the slot.
 */
export async function saveApiKey(id: string, value: string): Promise<void> {
  if (!isKnownApiKeyId(id)) return;
  const current = await getStoredApiKeys();
  const trimmed = value.trim();
  if (trimmed) current[id] = trimmed;
  else delete current[id];
  await persistApiKeys(current);
}

/**
 * Removes one catalog API key from isolated extension storage.
 *
 * @param id - Catalog key identifier to clear.
 */
export async function clearApiKey(id: string): Promise<void> {
  if (!isKnownApiKeyId(id)) return;
  const current = await getStoredApiKeys();
  delete current[id];
  await persistApiKeys(current);
}

/**
 * Migrates existing plaintext API keys to encrypted storage using the newly created PIN.
 *
 * @param pin - Validated user security PIN string.
 */
export async function migrateApiKeysToEncryption(pin: string): Promise<void> {
  try {
    if (!browser?.storage?.local) return;
    const result = await browser.storage.local.get(Constants.API_KEYS_STORAGE_KEY);
    const raw = result[Constants.API_KEYS_STORAGE_KEY];
    if (raw && !isEncryptedPayload(raw)) {
      const sanitized = sanitizeStoredApiKeys(raw);
      const encrypted = await encryptData(sanitized, pin);
      const keyIds = Object.keys(sanitized) as Types.KnownApiKeyId[];
      await browser.storage.local.set({
        [Constants.API_KEYS_STORAGE_KEY]: { ...encrypted, keyIds },
      });
    }
  } catch (error) {
    console.error('LCR Tools: Failed to migrate API keys to encryption:', error);
  }
}

/**
 * Checks whether a catalog API key is configured in extension storage (even if locked).
 *
 * @param id - Catalog key identifier to check.
 * @returns True when a value is configured for the key.
 */
export async function hasStoredApiKey(id: Types.KnownApiKeyId): Promise<boolean> {
  try {
    if (!browser?.storage?.local) return false;
    const result = await browser.storage.local.get(Constants.API_KEYS_STORAGE_KEY);
    const raw = result[Constants.API_KEYS_STORAGE_KEY] as
      Types.EncryptedPayload | Types.StoredApiKeys | undefined;
    if (!raw) return false;

    if (isEncryptedPayload(raw)) {
      if (Array.isArray(raw.keyIds)) {
        return raw.keyIds.includes(id);
      }
      return true;
    }

    const sanitized = sanitizeStoredApiKeys(raw);
    return Boolean(sanitized[id]);
  } catch {
    return false;
  }
}

/**
 * Returns whether a string is an extension-managed API key identifier.
 *
 * @param id - Candidate catalog identifier.
 * @returns True when the identifier is in the published catalog.
 */
export function isKnownApiKeyId(id: string): id is Types.KnownApiKeyId {
  return Constants.API_KEY_CATALOG.some((entry) => entry.id === id);
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Writes the sanitized API key dictionary to extension storage (encrypted if PIN unlocked). */
async function persistApiKeys(keys: Types.StoredApiKeys): Promise<void> {
  try {
    if (!browser?.storage?.local) return;
    const pin = await getUnlockedPin();
    if (pin) {
      const encrypted = await encryptData(keys, pin);
      const keyIds = Object.keys(keys) as Types.KnownApiKeyId[];
      await browser.storage.local.set({
        [Constants.API_KEYS_STORAGE_KEY]: { ...encrypted, keyIds },
      });
      return;
    }
    await browser.storage.local.set({ [Constants.API_KEYS_STORAGE_KEY]: keys });
  } catch (error) {
    console.error('LCR Tools: Failed to save API keys:', error);
  }
}

/** Keeps only catalog identifiers with non-empty string values. */
function sanitizeStoredApiKeys(raw: unknown): Types.StoredApiKeys {
  if (!raw || typeof raw !== 'object') return {};
  const sanitized: Types.StoredApiKeys = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isKnownApiKeyId(id) || typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) sanitized[id] = trimmed;
  }
  return sanitized;
}
