import { defineContentScript } from 'wxt/utils/define-content-script';
import { browser } from 'wxt/browser';
import { Constants, Types } from '@/types';
import { getPassiveActionEnabled } from '@/utils';
import { runAutoSyncStateDropdown } from '@/actions/autoSyncStateDropdown';

export default defineContentScript({
  matches: ['https://lcr.churchofjesuschrist.org/*'],
  runAt: 'document_idle',
  async main() {
    let cleanupStateObserver: Types.CleanupFn | null = null;

    const updateStateSyncObserver = async (): Promise<void> => {
      const enabled = await getPassiveActionEnabled(Constants.PASSIVE_STATE_DROPDOWN_KEY, false);

      console.log(
        `[LCR Tools] Passive content script initialized. State auto-sync is ${enabled ? 'ENABLED' : 'DISABLED'}.`
      );

      if (enabled && !cleanupStateObserver) {
        cleanupStateObserver = runAutoSyncStateDropdown();
      } else if (!enabled && cleanupStateObserver) {
        cleanupStateObserver();
        cleanupStateObserver = null;
      }
    };

    if (browser?.storage?.onChanged) {
      browser.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes[Constants.PASSIVE_STATE_DROPDOWN_KEY]) {
          void updateStateSyncObserver();
        }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          void updateStateSyncObserver();
        },
        { once: true }
      );
    } else {
      await updateStateSyncObserver();
    }
  },
});
