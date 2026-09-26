/**
 * Action entrypoint orchestrating passive state dropdown synchronization across LCR forms.
 */

import { logSyncMessage } from './stateDropdownDiscoveryHelper';
import { startStateDropdownWatcher } from './stateDropdownHelper';
import { Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Initializes passive observation of LCR forms to synchronize pre-selected state dropdowns.
 *
 * @returns Teardown function that disconnects the mutation observer when deactivated.
 */
export function runAutoSyncStateDropdown(): Types.CleanupObserverFn {
  // Step 1: Log passive state dropdown synchronization activation
  logSyncMessage(
    'Passive watcher initialized. Monitoring DOM for address forms and state dropdowns.'
  );

  // Step 2: Launch proactive polling and mutation watcher for async address loading
  const cleanupWatcher = startStateDropdownWatcher();

  // Step 3: Return teardown callback to disconnect watcher and observer upon deactivation
  return (): void => {
    logSyncMessage('Passive watcher deactivated.');
    cleanupWatcher();
  };
}
