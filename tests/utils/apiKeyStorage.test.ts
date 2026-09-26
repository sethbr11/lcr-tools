import { describe, it, expect, beforeEach, vi } from 'vitest';
import { browser } from 'wxt/browser';
import {
  clearApiKey,
  getStoredApiKeys,
  isKnownApiKeyId,
  saveApiKey,
} from '@/utils/security/apiKeyStorageUtils';
import { Constants } from '@/types';

describe('apiKeyStorageUtils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(browser.storage.local, 'get').mockImplementation(async () => ({}));
    vi.spyOn(browser.storage.local, 'set').mockImplementation(async () => undefined);
  });

  it('accepts only catalog identifiers', () => {
    expect(isKnownApiKeyId('mapbox')).toBe(true);
    expect(isKnownApiKeyId('locationiq')).toBe(true);
    expect(isKnownApiKeyId('custom')).toBe(false);
  });

  it('drops unknown ids when reading stored keys', async () => {
    vi.spyOn(browser.storage.local, 'get').mockImplementation(async () => ({
      [Constants.API_KEYS_STORAGE_KEY]: {
        mapbox: 'mb-token',
        custom: 'not-allowed',
        locationiq: '  ',
      },
    }));
    const keys = await getStoredApiKeys();
    expect(keys).toEqual({ mapbox: 'mb-token' });
  });

  it('ignores save attempts for unknown identifiers', async () => {
    const setSpy = vi.spyOn(browser.storage.local, 'set');
    await saveApiKey('custom', 'secret');
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('saves and clears a catalog key', async () => {
    const stored: Record<string, unknown> = {};
    vi.spyOn(browser.storage.local, 'get').mockImplementation(async () => ({
      [Constants.API_KEYS_STORAGE_KEY]: stored[Constants.API_KEYS_STORAGE_KEY],
    }));
    vi.spyOn(browser.storage.local, 'set').mockImplementation(async (value) => {
      Object.assign(stored, value);
    });

    await saveApiKey('locationiq', 'liq-token');
    expect(await getStoredApiKeys()).toEqual({ locationiq: 'liq-token' });
    await clearApiKey('locationiq');
    expect(await getStoredApiKeys()).toEqual({});
  });

  it('encrypts saved keys when a session PIN is unlocked and decrypts correctly', async () => {
    const stored: Record<string, unknown> = {};
    vi.spyOn(browser.storage.local, 'get').mockImplementation(async () => ({
      [Constants.API_KEYS_STORAGE_KEY]: stored[Constants.API_KEYS_STORAGE_KEY],
    }));
    vi.spyOn(browser.storage.local, 'set').mockImplementation(async (value) => {
      Object.assign(stored, value);
    });

    const { setUnlockedPin, lockSession } = await import('@/utils/security/cryptoUtils');
    await setUnlockedPin('1234');

    await saveApiKey('mapbox', 'mb-secret-token');

    // The stored object in storage.local should be an encrypted payload, not plain string
    const rawStored = stored[Constants.API_KEYS_STORAGE_KEY] as Record<string, unknown>;
    expect(rawStored.version).toBe(1);
    expect(typeof rawStored.ciphertext).toBe('string');
    expect(rawStored.mapbox).toBeUndefined();

    // While unlocked, getStoredApiKeys returns the decrypted secret
    expect(await getStoredApiKeys()).toEqual({ mapbox: 'mb-secret-token' });

    // When locked, getStoredApiKeys cannot decrypt and returns empty
    await lockSession();
    expect(await getStoredApiKeys()).toEqual({});
  });

  it('checks if a key is stored even when locked using keyIds metadata', async () => {
    const { hasStoredApiKey } = await import('@/utils/security/apiKeyStorageUtils');

    // Plaintext storage check
    vi.spyOn(browser.storage.local, 'get').mockImplementation(async () => ({
      [Constants.API_KEYS_STORAGE_KEY]: { mapbox: 'token-123' },
    }));
    expect(await hasStoredApiKey('mapbox')).toBe(true);
    expect(await hasStoredApiKey('locationiq')).toBe(false);

    // Encrypted storage check with keyIds metadata
    vi.spyOn(browser.storage.local, 'get').mockImplementation(async () => ({
      [Constants.API_KEYS_STORAGE_KEY]: {
        version: 1,
        salt: 'c2FsdA==',
        iv: 'aXY=',
        ciphertext: 'Y2lwaGVy',
        keyIds: ['locationiq'],
      },
    }));
    expect(await hasStoredApiKey('locationiq')).toBe(true);
    expect(await hasStoredApiKey('mapbox')).toBe(false);

    // Encrypted legacy storage check without keyIds metadata
    vi.spyOn(browser.storage.local, 'get').mockImplementation(async () => ({
      [Constants.API_KEYS_STORAGE_KEY]: {
        version: 1,
        salt: 'c2FsdA==',
        iv: 'aXY=',
        ciphertext: 'Y2lwaGVy',
      },
    }));
    expect(await hasStoredApiKey('mapbox')).toBe(true);
  });
});
