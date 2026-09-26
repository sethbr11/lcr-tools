/**
 * Local storage utility functions for reading and persisting passive action states.
 */

import { browser } from 'wxt/browser';
import { Constants, Types } from '@/types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Retrieves the enabled status of a passive action from extension storage.
 *
 * @param storageKey - The storage key associated with the passive action.
 * @param defaultEnabled - Optional fallback boolean when setting is not yet stored.
 * @returns Promise resolving to true if enabled, false otherwise.
 */
export async function getPassiveActionEnabled(
  storageKey: string,
  defaultEnabled = false
): Promise<boolean> {
  if (!browser?.storage?.local) return defaultEnabled;
  try {
    const result = await browser.storage.local.get(storageKey);
    const value = result[storageKey];
    if (typeof value === 'boolean') return value;
    return defaultEnabled;
  } catch (err) {
    console.error(`LCR Tools: Failed to read passive state for ${storageKey}:`, err);
    return defaultEnabled;
  }
}

/**
 * Persists the enabled status of a passive action to extension storage.
 *
 * @param storageKey - The storage key associated with the passive action.
 * @param enabled - The new enabled boolean state to save.
 * @returns Promise resolving once persisted.
 */
export async function setPassiveActionEnabled(storageKey: string, enabled: boolean): Promise<void> {
  if (!browser?.storage?.local) return;
  try {
    await browser.storage.local.set({ [storageKey]: enabled });
  } catch (err) {
    console.error(`LCR Tools: Failed to save passive state for ${storageKey}:`, err);
  }
}

/**
 * Retrieves all stored passive action states matching the passive actions prefix.
 *
 * @returns Promise resolving to a map of storage keys to enabled boolean flags.
 */
export async function getAllPassiveActionStates(): Promise<Types.PassiveActionStateMap> {
  if (!browser?.storage?.local) return {};
  try {
    const all = await browser.storage.local.get(null);
    const result: Types.PassiveActionStateMap = {};
    for (const [key, val] of Object.entries(all)) {
      if (key.startsWith(Constants.PASSIVE_ACTIONS_PREFIX) && typeof val === 'boolean') {
        result[key] = val;
      }
    }
    return result;
  } catch (err) {
    console.error('LCR Tools: Failed to read all passive action states:', err);
    return {};
  }
}
