import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPhotoCache,
  updatePhotoCache,
  clearPhotoCache,
  getCacheSettings,
  saveCacheSettings,
  getSavedNicknames,
  saveNicknameMapping,
  removeNicknameMapping,
  clearAllNicknames,
} from '@/utils/security/storageUtils';

describe('storageUtils', () => {
  let memoryStorage: Record<string, unknown> = {};

  beforeEach(() => {
    memoryStorage = {};
    vi.restoreAllMocks();

    vi.spyOn(chrome.storage.local, 'get').mockImplementation(async (key) => {
      const k = typeof key === 'string' ? key : String(key);
      return { [k]: memoryStorage[k] };
    });

    vi.spyOn(chrome.storage.local, 'set').mockImplementation(async (items) => {
      Object.assign(memoryStorage, items);
    });

    vi.spyOn(chrome.storage.local, 'remove').mockImplementation(async (key) => {
      const k = typeof key === 'string' ? key : String(key);
      delete memoryStorage[k];
    });
  });

  describe('photo cache lifecycle', () => {
    it('should return empty object when cache is uninitialized', async () => {
      const cache = await getPhotoCache();
      expect(cache).toEqual({});
    });

    it('should update and merge photo cache entries', async () => {
      const now = Date.now();
      await updatePhotoCache({
        '101': {
          memberId: '101',
          firstName: 'John',
          lastName: 'Smith',
          hasPhoto: true,
          photoUrl: 'https://example.com/101.jpg',
          timestamp: now,
        },
      });

      let cache = await getPhotoCache();
      expect(cache['101']).toBeDefined();
      expect(cache['101'].firstName).toBe('John');

      // Add second member
      await updatePhotoCache({
        '102': {
          memberId: '102',
          firstName: 'Jane',
          lastName: 'Doe',
          hasPhoto: false,
          timestamp: now + 1,
        },
      });

      cache = await getPhotoCache();
      expect(Object.keys(cache).length).toBe(2);
      expect(cache['101'].hasPhoto).toBe(true);
      expect(cache['102'].hasPhoto).toBe(false);
    });

    it('should clear all entries on clearPhotoCache', async () => {
      await updatePhotoCache({
        '101': {
          memberId: '101',
          hasPhoto: true,
          timestamp: Date.now(),
        },
      });

      await clearPhotoCache();
      const cache = await getPhotoCache();
      expect(cache).toEqual({});
    });

    it('should prune cache if entries exceed MAX_CACHE_ENTRIES', async () => {
      const now = Date.now();
      const hugeBatch: Record<string, { memberId: string; hasPhoto: boolean; timestamp: number }> =
        {};
      for (let i = 0; i < 2005; i++) {
        hugeBatch[`member-${i}`] = {
          memberId: `member-${i}`,
          hasPhoto: true,
          timestamp: now + i,
        };
      }

      await updatePhotoCache(hugeBatch);
      const cache = await getPhotoCache();
      expect(Object.keys(cache).length).toBe(2000);
      // The oldest 5 entries (0 to 4) should have been pruned
      expect(cache['member-0']).toBeUndefined();
      expect(cache['member-4']).toBeUndefined();
      expect(cache['member-5']).toBeDefined();
    });

    it('should evict entries that exceed the 24-hour TTL expiration', async () => {
      const now = Date.now();
      const expiredTimestamp = now - 25 * 60 * 60 * 1000;

      await updatePhotoCache({
        'expired-1': {
          memberId: 'expired-1',
          hasPhoto: true,
          timestamp: expiredTimestamp,
        },
        'active-1': {
          memberId: 'active-1',
          hasPhoto: true,
          timestamp: now,
        },
      });

      const cache = await getPhotoCache();
      expect(cache['expired-1']).toBeUndefined();
      expect(cache['active-1']).toBeDefined();
    });
  });

  describe('cache settings lifecycle', () => {
    it('should retrieve and persist cache settings', async () => {
      expect(await getCacheSettings()).toEqual({});

      await saveCacheSettings({
        enabled: true,
        expirationDays: 14,
      });

      const settings = await getCacheSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.expirationDays).toBe(14);
    });
  });

  describe('attendance nickname mappings', () => {
    it('should save, retrieve, remove, and clear nickname mappings', async () => {
      await saveNicknameMapping('Jon Smith', 'Smith, Jonathan');
      const saved = await getSavedNicknames();
      expect(saved['jon smith']?.canonicalName).toBe('Smith, Jonathan');

      await removeNicknameMapping('Jon Smith');
      expect((await getSavedNicknames())['jon smith']).toBeUndefined();

      await saveNicknameMapping('Jon Smith', 'Smith, Jonathan');
      await clearAllNicknames();
      expect(await getSavedNicknames()).toEqual({});
    });

    it('should allow multiple aliases to map to the same member', async () => {
      await saveNicknameMapping('Jon', 'Smith, Jonathan');
      await saveNicknameMapping('Johnny', 'Smith, Jonathan');

      const saved = await getSavedNicknames();
      expect(saved['jon']?.canonicalName).toBe('Smith, Jonathan');
      expect(saved['johnny']?.canonicalName).toBe('Smith, Jonathan');
      expect(Object.keys(saved)).toHaveLength(2);
    });

    it('should encrypt nicknames when PIN is unlocked and prevent reads when locked', async () => {
      const { setUnlockedPin, lockSession } = await import('@/utils/security/cryptoUtils');
      await setUnlockedPin('7777');

      await saveNicknameMapping('Beth Jones', 'Jones, Elizabeth');

      // In local storage, payload is encrypted
      const rawStored = memoryStorage['lcr_attendance_nicknames'] as Record<string, unknown>;
      expect(rawStored.version).toBe(1);
      expect(typeof rawStored.ciphertext).toBe('string');
      expect(rawStored['beth jones']).toBeUndefined();

      // Unlocked read works
      const saved = await getSavedNicknames();
      expect(saved['beth jones']?.canonicalName).toBe('Jones, Elizabeth');

      // Locked read returns empty
      await lockSession();
      expect(await getSavedNicknames()).toEqual({});
    });
  });
});
