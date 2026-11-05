import { browser } from 'wxt/browser';
import { Constants } from '@/types';
import { createPinVerificationSentinel, setUnlockedPin } from './cryptoUtils';
import { migrateApiKeysToEncryption } from './apiKeyStorageUtils';
import { migrateNicknamesToEncryption } from './storageUtils';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Creates the security PIN: stores its verification sentinel, encrypts any API keys and
 * nicknames saved before a PIN existed, and unlocks the current session.
 * Shared by the popup settings and the Trip Planner so both set a PIN the same way.
 *
 * @param pin - New PIN, already validated and confirmed by the caller.
 */
export async function establishSecurityPin(pin: string): Promise<void> {
  const sentinel = await createPinVerificationSentinel(pin);
  if (browser?.storage?.local) {
    await browser.storage.local.set({ [Constants.PIN_STORAGE_KEY]: sentinel });
  }
  await migrateApiKeysToEncryption(pin);
  await migrateNicknamesToEncryption(pin);
  await setUnlockedPin(pin);
}
