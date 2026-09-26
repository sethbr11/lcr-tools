/**
 * Helper routines for watching and synchronizing state dropdown elements across LCR forms.
 */

import { showToast, sleep } from '@/utils';
import {
  findStateSelectElements,
  isSelectInteractable,
  logSyncMessage,
} from './stateDropdownDiscoveryHelper';
import { Constants, Dom, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Performs programmatic state synchronization by cycling the select value through an alternate option.
 *
 * @param select - The state HTMLSelectElement to synchronize.
 * @returns Promise resolving to true if a synchronization cycle was completed, false if skipped.
 */
export async function syncStateSelect(select: HTMLSelectElement): Promise<boolean> {
  if (select.getAttribute(Dom.SYNCED_DATA_ATTR) === 'true') return false;

  const initialValue = select.value;
  if (!initialValue) {
    setupAddressInputListeners(select);
    return false;
  }

  const altOption = Array.from(select.options).find(
    (opt) => opt.value && opt.value !== initialValue
  );
  if (!altOption) return false;

  logSyncMessage(
    `Synchronizing state dropdown (id: "${select.id || 'none'}", initial value: "${initialValue}").`
  );

  select.focus();
  select.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }));
  select.dispatchEvent(
    new MouseEvent('mousedown', { bubbles: true, composed: true, cancelable: true })
  );

  triggerNativeSelectValue(select, altOption.value);
  await sleep(Constants.STATE_SYNC_CYCLE_DELAY_MS);

  triggerNativeSelectValue(select, initialValue);
  await sleep(Constants.STATE_SYNC_CYCLE_DELAY_MS);

  select.dispatchEvent(
    new MouseEvent('mouseup', { bubbles: true, composed: true, cancelable: true })
  );
  select.dispatchEvent(
    new MouseEvent('click', { bubbles: true, composed: true, cancelable: true })
  );
  select.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  select.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }));
  select.dispatchEvent(new FocusEvent('blur', { bubbles: true, composed: true }));
  select.blur();

  select.setAttribute(Dom.SYNCED_DATA_ATTR, 'true');
  setupAddressInputListeners(select);

  select.addEventListener('change', () => {
    select.setAttribute(Dom.SYNCED_DATA_ATTR, 'true');
  });

  return true;
}

/**
 * Discovers and synchronizes all matching state selects currently rendered in the DOM.
 *
 * @param root - Optional parent node to search, defaulting to global document.
 * @returns Promise resolving to StateDropdownSyncResult containing count, elements, and state names.
 */
export async function syncAllStateSelects(
  root?: ParentNode
): Promise<Types.StateDropdownSyncResult> {
  if (typeof document === 'undefined' && !root) {
    return { syncedCount: 0, selectElements: [], syncedStateNames: [] };
  }
  const selects = findStateSelectElements(root);
  const syncedElements: HTMLSelectElement[] = [];
  const syncedStateNames: string[] = [];

  for (const sel of selects) {
    try {
      const didSync = await syncStateSelect(sel);
      if (didSync) {
        syncedElements.push(sel);
        const stateName = sel.options[sel.selectedIndex]?.textContent?.trim() || sel.value;
        syncedStateNames.push(stateName);
      }
    } catch (err) {
      logSyncMessage(`Error syncing select element: ${String(err)}`, 'error');
      showToast(Constants.STATE_SYNC_FAILURE_TOAST, {
        type: 'warning',
        duration: Constants.STATE_SYNC_TOAST_DURATION_MS,
      });
    }
  }

  if (syncedElements.length > 0) {
    const summary = syncedStateNames.join(', ');
    logSyncMessage(`State dropdown successfully synchronized: ${summary}`, 'info');
    showToast(`${Constants.STATE_SYNC_SUCCESS_TOAST_PREFIX}${summary}`, {
      type: 'success',
      duration: Constants.STATE_SYNC_TOAST_DURATION_MS,
    });
  }

  return {
    syncedCount: syncedElements.length,
    selectElements: syncedElements,
    syncedStateNames,
  };
}

/**
 * Attaches input and focus listeners to sibling address fields to ensure delayed sync triggers.
 *
 * @param select - The state dropdown to guard with address field interaction listeners.
 */
export function setupAddressInputListeners(select: HTMLSelectElement): void {
  const container =
    select.closest(Dom.ADDRESS_GROUP_SELECTOR) ||
    select.form ||
    (typeof document !== 'undefined' ? document : null);
  if (!container) return;

  const inputs = container.querySelectorAll<HTMLInputElement>(Dom.ADDRESS_INPUT_SELECTORS);

  const onAddressInteraction = (): void => {
    if (select.getAttribute(Dom.SYNCED_DATA_ATTR) !== 'true' && select.value) {
      void syncStateSelect(select);
    }
  };

  inputs.forEach((input) => {
    if (input.getAttribute(Dom.INPUT_HOOKED_DATA_ATTR) === 'true') return;
    input.setAttribute(Dom.INPUT_HOOKED_DATA_ATTR, 'true');
    input.addEventListener('input', onAddressInteraction);
    input.addEventListener('focusin', onAddressInteraction);
  });
}

/**
 * Launches continuous proactive polling, button click watching, and mutation tracking across wizard screens.
 *
 * @param options - Polling interval and maximum attempt count configurations.
 * @returns Cleanup teardown function to cancel timer, listeners, and disconnect observer.
 */
export function startStateDropdownWatcher(
  options: Types.StateSyncWatcherOptions = {}
): Types.CleanupObserverFn {
  if (typeof document === 'undefined') {
    return (): void => {};
  }

  const intervalMs = options.pollIntervalMs || Constants.STATE_SYNC_POLL_INTERVAL_MS;
  const pendingTimeouts: ReturnType<typeof setTimeout>[] = [];
  let isSyncing = false;

  const checkAndSync = async (): Promise<void> => {
    if (typeof document === 'undefined' || isSyncing) return;
    isSyncing = true;

    try {
      const selects = findStateSelectElements(document);
      if (selects.length === 0) return;

      const unsynced = selects.filter((s) => s.getAttribute(Dom.SYNCED_DATA_ATTR) !== 'true');
      if (unsynced.length === 0) return;

      const notInteractable = unsynced.filter((s) => !isSelectInteractable(s));
      if (notInteractable.length > 0) {
        logSyncMessage(
          `State dropdown found (${notInteractable[0].id || notInteractable[0].name || 'unnamed'}), waiting until interactable (spinner active or field disabled)...`
        );
        return;
      }

      const readyToSync = unsynced.filter(isSelectInteractable);
      if (readyToSync.length > 0) {
        logSyncMessage(
          `State dropdown is fully interactable! Initial value: "${readyToSync[0].value}". Synchronizing...`
        );
        await sleep(Constants.STATE_SYNC_SETTLING_DELAY_MS);
        if (!isSelectInteractable(readyToSync[0])) return;
        await syncAllStateSelects(document);
      }
    } catch (err) {
      logSyncMessage(`Watcher check encountered an unexpected error: ${String(err)}`, 'error');
    } finally {
      isSyncing = false;
    }
  };

  void checkAndSync();
  const timer = setInterval(() => {
    void checkAndSync();
  }, intervalMs);

  const observer = new MutationObserver(() => {
    void checkAndSync();
  });

  const onDocumentClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement | null;
    const button = target?.closest(Dom.WIZARD_NAV_BUTTON_SELECTOR);
    if (button) {
      Constants.STEP_TRANSITION_CHECK_DELAYS_MS.forEach((delayMs) => {
        const timeoutId = setTimeout(() => {
          void checkAndSync();
        }, delayMs);
        pendingTimeouts.push(timeoutId);
      });
    }
  };

  document.addEventListener('click', onDocumentClick, true);

  const targetNode = document.body || document.documentElement;
  if (targetNode) {
    observer.observe(targetNode, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-busy', 'disabled', 'value'],
    });
  }

  return (): void => {
    clearInterval(timer);
    pendingTimeouts.forEach(clearTimeout);
    document.removeEventListener('click', onDocumentClick, true);
    observer.disconnect();
  };
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Updates select value via React prototype descriptor and dispatches native synthetic events. */
function triggerNativeSelectValue(select: HTMLSelectElement, value: string): void {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    'value'
  )?.set;

  if (nativeSetter) {
    nativeSetter.call(select, value);
  } else {
    select.value = value;
  }

  const targetOption = Array.from(select.options).find((opt) => opt.value === value);
  if (targetOption) {
    select.selectedIndex = targetOption.index;
  }

  select.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  select.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
}
