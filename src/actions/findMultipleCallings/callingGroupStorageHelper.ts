import { browser } from 'wxt/browser';
import { Constants, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Loads saved calling groups from extension storage, or the built-in defaults when none exist.
 *
 * @returns Promise resolving to a cloned list of calling groups.
 */
export async function getCallingGroups(): Promise<Types.CallingGroup[]> {
  try {
    if (browser?.storage?.local) {
      const result = await browser.storage.local.get(Constants.CALLING_GROUPS_STORAGE_KEY);
      if (Object.prototype.hasOwnProperty.call(result, Constants.CALLING_GROUPS_STORAGE_KEY)) {
        const stored = result[Constants.CALLING_GROUPS_STORAGE_KEY];
        if (isCallingGroupArray(stored)) return cloneCallingGroups(stored);
      }
    }
  } catch (error) {
    console.error('LCR Tools: Failed to read calling groups:', error);
  }
  return cloneCallingGroups(Constants.DEFAULT_CALLING_GROUPS);
}

/**
 * Persists the user's calling group list, including an empty list after presets are removed.
 *
 * @param groups - Calling groups to store locally on this device.
 */
export async function saveCallingGroups(groups: Types.CallingGroup[]): Promise<void> {
  try {
    if (browser?.storage?.local) {
      await browser.storage.local.set({
        [Constants.CALLING_GROUPS_STORAGE_KEY]: cloneCallingGroups(groups),
      });
    }
  } catch (error) {
    console.error('LCR Tools: Failed to save calling groups:', error);
  }
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Returns a deep copy of calling groups so callers can mutate drafts safely. */
function cloneCallingGroups(groups: readonly Types.CallingGroup[]): Types.CallingGroup[] {
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    members: group.members.map((member) => ({
      calling: member.calling,
      organization: member.organization,
    })),
  }));
}

/** Narrows unknown storage payloads to a calling group array. */
function isCallingGroupArray(value: unknown): value is Types.CallingGroup[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const group = item as Types.CallingGroup;
    if (typeof group.id !== 'string' || typeof group.name !== 'string') return false;
    if (!Array.isArray(group.members)) return false;
    return group.members.every(
      (member) =>
        member &&
        typeof member === 'object' &&
        typeof member.calling === 'string' &&
        typeof member.organization === 'string'
    );
  });
}
