/**
 * Unit test suite for passiveActionUtils local storage preferences.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import {
  getAllPassiveActionStates,
  getPassiveActionEnabled,
  setPassiveActionEnabled,
} from '@/utils/passiveActionUtils';

describe('passiveActionUtils', () => {
  let mockStore: Record<string, unknown> = {};

  beforeEach(() => {
    mockStore = {};
    vi.spyOn(browser.storage.local, 'get').mockImplementation((keys) => {
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockStore[keys] });
      }
      if (keys === null) {
        return Promise.resolve({ ...mockStore });
      }
      return Promise.resolve({});
    });

    vi.spyOn(browser.storage.local, 'set').mockImplementation((items) => {
      Object.assign(mockStore, items);
      return Promise.resolve();
    });
  });

  describe('getPassiveActionEnabled', () => {
    it('returns defaultEnabled fallback when setting is not stored', async () => {
      const res = await getPassiveActionEnabled('lcr_passive_test_key', false);
      expect(res).toBe(false);

      const resTrue = await getPassiveActionEnabled('lcr_passive_test_key', true);
      expect(resTrue).toBe(true);
    });

    it('returns stored boolean value when present', async () => {
      mockStore['lcr_passive_test_key'] = true;
      const res = await getPassiveActionEnabled('lcr_passive_test_key', false);
      expect(res).toBe(true);
    });

    it('returns defaultEnabled when stored value is not a boolean', async () => {
      mockStore['lcr_passive_test_key'] = 'invalid_string';
      const res = await getPassiveActionEnabled('lcr_passive_test_key', false);
      expect(res).toBe(false);
    });
  });

  describe('setPassiveActionEnabled', () => {
    it('persists enabled boolean to local storage', async () => {
      await setPassiveActionEnabled('lcr_passive_test_key', true);
      expect(mockStore['lcr_passive_test_key']).toBe(true);

      await setPassiveActionEnabled('lcr_passive_test_key', false);
      expect(mockStore['lcr_passive_test_key']).toBe(false);
    });
  });

  describe('getAllPassiveActionStates', () => {
    it('returns only keys matching the passive actions prefix with boolean values', async () => {
      mockStore = {
        lcr_passive_state_dropdown: true,
        lcr_passive_another_tool: false,
        lcr_photo_cache: { user: 'data' },
        other_key: true,
      };

      const states = await getAllPassiveActionStates();
      expect(states).toEqual({
        lcr_passive_state_dropdown: true,
        lcr_passive_another_tool: false,
      });
    });

    it('returns empty dictionary when no matching keys exist', async () => {
      mockStore = {
        lcr_photo_cache: {},
      };

      const states = await getAllPassiveActionStates();
      expect(states).toEqual({});
    });
  });
});
