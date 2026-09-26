import { describe, it, expect, beforeEach, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { Constants } from '@/types';
import {
  clearSecurityData,
  createPinVerificationSentinel,
  decryptData,
  encryptData,
  getUnlockedPin,
  hasSecurityPin,
  isEncryptedPayload,
  isSessionUnlocked,
  lockSession,
  setUnlockedPin,
  validatePinFormat,
  verifyPin,
} from '@/utils/security/cryptoUtils';

describe('cryptoUtils', () => {
  let localStorageData: Record<string, unknown> = {};
  let sessionStorageData: Record<string, unknown> = {};

  beforeEach(() => {
    localStorageData = {};
    sessionStorageData = {};
    vi.restoreAllMocks();

    vi.spyOn(browser.storage.local, 'get').mockImplementation(async (keys) => {
      if (typeof keys === 'string') return { [keys]: localStorageData[keys] };
      if (Array.isArray(keys)) {
        const result: Record<string, unknown> = {};
        for (const k of keys) result[k] = localStorageData[k];
        return result;
      }
      return { ...localStorageData };
    });

    vi.spyOn(browser.storage.local, 'set').mockImplementation(async (items) => {
      Object.assign(localStorageData, items);
    });

    vi.spyOn(browser.storage.local, 'remove').mockImplementation(async (keys) => {
      const arr = Array.isArray(keys) ? keys : [keys];
      for (const k of arr) delete localStorageData[k];
    });

    vi.spyOn(browser.storage.session, 'get').mockImplementation(async (keys) => {
      if (typeof keys === 'string') return { [keys]: sessionStorageData[keys] };
      return { ...sessionStorageData };
    });

    vi.spyOn(browser.storage.session, 'set').mockImplementation(async (items) => {
      Object.assign(sessionStorageData, items);
    });

    vi.spyOn(browser.storage.session, 'remove').mockImplementation(async (keys) => {
      const arr = Array.isArray(keys) ? keys : [keys];
      for (const k of arr) delete sessionStorageData[k];
    });

    void lockSession();
  });

  describe('validatePinFormat', () => {
    it('accepts 4 to 8 digit numeric strings', () => {
      expect(validatePinFormat('1234')).toBe(true);
      expect(validatePinFormat('123456')).toBe(true);
      expect(validatePinFormat('12345678')).toBe(true);
      expect(validatePinFormat(' 9876 ')).toBe(true);
    });

    it('rejects non-numeric, short, long, or empty strings', () => {
      expect(validatePinFormat('')).toBe(false);
      expect(validatePinFormat('123')).toBe(false);
      expect(validatePinFormat('123456789')).toBe(false);
      expect(validatePinFormat('abcd')).toBe(false);
      expect(validatePinFormat('12a4')).toBe(false);
    });
  });

  describe('isEncryptedPayload', () => {
    it('correctly distinguishes encrypted payload objects', () => {
      expect(isEncryptedPayload(null)).toBe(false);
      expect(isEncryptedPayload({})).toBe(false);
      expect(
        isEncryptedPayload({
          version: 1,
          salt: 'c2FsdA==',
          iv: 'aXY=',
          ciphertext: 'Y2lwaGVy',
        })
      ).toBe(true);
    });
  });

  describe('encryptData and decryptData', () => {
    it('round-trips arbitrary objects with AES-256-GCM', async () => {
      const sample = {
        name: 'Smith, Jonathan',
        nicknames: ['Jon', 'Johnny'],
        apiKey: 'pk-test-token-12345',
      };
      const pin = '4321';

      const encrypted = await encryptData(sample, pin);
      expect(encrypted.version).toBe(1);
      expect(encrypted.salt).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.ciphertext).toBeTruthy();

      const decrypted = await decryptData<typeof sample>(encrypted, pin);
      expect(decrypted).toEqual(sample);
    });

    it('generates distinct IVs and ciphertexts for identical inputs', async () => {
      const sample = { key: 'secret-value' };
      const pin = '5678';

      const first = await encryptData(sample, pin);
      const second = await encryptData(sample, pin);

      expect(first.iv).not.toBe(second.iv);
      expect(first.ciphertext).not.toBe(second.ciphertext);
    });

    it('throws error when decrypting with incorrect PIN', async () => {
      const sample = { data: 'test' };
      const encrypted = await encryptData(sample, '1111');

      await expect(decryptData(encrypted, '2222')).rejects.toThrow();
    });
  });

  describe('sentinel verification', () => {
    it('verifies correct PIN and rejects incorrect PIN', async () => {
      const pin = '9999';
      const sentinel = await createPinVerificationSentinel(pin);

      const valid = await verifyPin(pin, sentinel);
      expect(valid).toBe(true);

      const invalid = await verifyPin('0000', sentinel);
      expect(invalid).toBe(false);
    });
  });

  describe('session lifecycle and security storage state', () => {
    it('tracks security PIN existence in local storage', async () => {
      expect(await hasSecurityPin()).toBe(false);

      const sentinel = await createPinVerificationSentinel('1234');
      await browser.storage.local.set({ [Constants.PIN_STORAGE_KEY]: sentinel });

      expect(await hasSecurityPin()).toBe(true);
    });

    it('manages unlocked session state and locks cleanly', async () => {
      expect(await isSessionUnlocked()).toBe(false);
      expect(await getUnlockedPin()).toBeNull();

      await setUnlockedPin('1234');
      expect(await isSessionUnlocked()).toBe(true);
      expect(await getUnlockedPin()).toBe('1234');

      await lockSession();
      expect(await isSessionUnlocked()).toBe(false);
      expect(await getUnlockedPin()).toBeNull();
    });

    it('clears security data and locks session', async () => {
      await setUnlockedPin('1234');
      const sentinel = await createPinVerificationSentinel('1234');
      await browser.storage.local.set({
        [Constants.PIN_STORAGE_KEY]: sentinel,
        [Constants.API_KEYS_STORAGE_KEY]: { mapbox: 'secret' },
        [Constants.ATTENDANCE_NICKNAMES_KEY]: { jon: { canonicalName: 'Smith, Jonathan' } },
      });

      await clearSecurityData();

      expect(await isSessionUnlocked()).toBe(false);
      expect(await hasSecurityPin()).toBe(false);
      expect(localStorageData[Constants.API_KEYS_STORAGE_KEY]).toBeUndefined();
      expect(localStorageData[Constants.ATTENDANCE_NICKNAMES_KEY]).toBeUndefined();
    });
  });
});
