import { browser } from 'wxt/browser';
import { Constants, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Loads saved ignored callings from extension storage, or the built-in defaults when none exist.
 *
 * @returns Promise resolving to a cloned list of ignored callings.
 */
export async function getIgnoredCallings(): Promise<Types.IgnoredCalling[]> {
  try {
    if (browser?.storage?.local) {
      const result = await browser.storage.local.get(Constants.IGNORED_CALLINGS_STORAGE_KEY);
      if (Object.prototype.hasOwnProperty.call(result, Constants.IGNORED_CALLINGS_STORAGE_KEY)) {
        const stored = result[Constants.IGNORED_CALLINGS_STORAGE_KEY];
        if (isIgnoredCallingArray(stored)) return cloneIgnoredCallings(stored);
      }
    }
  } catch (error) {
    console.error('LCR Tools: Failed to read ignored callings:', error);
  }
  return cloneIgnoredCallings(Constants.DEFAULT_IGNORED_CALLINGS);
}

/**
 * Persists the user's ignored-calling list, including an empty list after presets are removed.
 *
 * @param ignored - Ignored callings to store locally on this device.
 */
export async function saveIgnoredCallings(ignored: Types.IgnoredCalling[]): Promise<void> {
  try {
    if (browser?.storage?.local) {
      await browser.storage.local.set({
        [Constants.IGNORED_CALLINGS_STORAGE_KEY]: cloneIgnoredCallings(ignored),
      });
    }
  } catch (error) {
    console.error('LCR Tools: Failed to save ignored callings:', error);
  }
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Returns a deep copy of ignored callings so callers can mutate drafts safely. */
function cloneIgnoredCallings(ignored: readonly Types.IgnoredCalling[]): Types.IgnoredCalling[] {
  return ignored.map((item) => ({
    calling: item.calling,
    organization: item.organization,
    enabled: item.enabled,
  }));
}

/** Narrows unknown storage payloads to an ignored-calling array. */
function isIgnoredCallingArray(value: unknown): value is Types.IgnoredCalling[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const ignored = item as Types.IgnoredCalling;
    return (
      typeof ignored.calling === 'string' &&
      typeof ignored.organization === 'string' &&
      typeof ignored.enabled === 'boolean'
    );
  });
}
