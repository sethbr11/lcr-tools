import { browser } from 'wxt/browser';
import { ScriptPublicPath } from 'wxt/utils/inject-script';
import { Dom, Constants, Regex, Types } from '@/types';

const ACTION_SCRIPT_MAP: Record<string, ScriptPublicPath> = {
  downloadReportData: '/action-download-report-data.js',
  tableFilters: '/action-table-filters.js',
  noPhotoList: '/action-no-photo-list.js',
  memberFlashcards: '/action-member-flashcards.js',
  findMultipleCallings: '/action-find-multiple-callings.js',
  processAttendance: '/action-process-attendance.js',
  membersOutsideBoundary: '/action-members-outside-boundary.js',
  tripPlanning: '/action-trip-planning.js',
};

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Injects target script bundle into the active tab via browser scripting API.
 * If active tab is a browser internal page (e.g. chrome://), gracefully handles execution.
 *
 * @param action - Action definition to execute.
 * @param tabId - Target browser tab identifier.
 * @param tabUrl - Optional current active tab URL.
 */
export async function executeAction(
  action: Types.ActionDefinition,
  tabId?: number,
  tabUrl?: string
): Promise<void> {
  if (!tabId) return;

  const scriptFile = ACTION_SCRIPT_MAP[action.id];
  if (!scriptFile) {
    showStatusMessage(`Unknown action script for: ${action.id}`, true);
    return;
  }

  let targetTabId = tabId;
  let targetTabUrl = tabUrl;

  try {
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id) {
      targetTabId = activeTab.id;
      if (activeTab.url) targetTabUrl = activeTab.url;
    }
  } catch {
    // Fall back to provided tab parameters if tabs query fails
  }

  // Pre-check for internal browser URLs
  if (targetTabUrl && Regex.INTERNAL_BROWSER_URL.test(targetTabUrl)) {
    showStatusMessage('Cannot run on internal browser pages. Switch to an LCR tab.', true);
    return;
  }

  try {
    await browser.scripting.executeScript({
      target: { tabId: targetTabId },
      files: [scriptFile],
    });
    window.close();
  } catch (error) {
    const isInternalPage =
      !targetTabUrl ||
      Regex.INTERNAL_BROWSER_URL.test(targetTabUrl) ||
      (error instanceof Error && error.message.includes('chrome://'));

    if (isInternalPage) {
      showStatusMessage('Cannot run on internal browser pages. Switch to an LCR tab.', true);
      return;
    }

    console.error('LCR Tools: Injection error:', error);
    showStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}

/**
 * Displays transient notification banner inside the popup interface.
 *
 * @param message - Text notification string to display.
 * @param isError - Whether the banner should render with error styling.
 */
export function showStatusMessage(message: string, isError: boolean = false): void {
  const elements = [
    document.getElementById('status-message'),
    document.getElementById('directory-status-message'),
    document.getElementById('settings-status-message'),
    document.getElementById(Dom.ALIASES_STATUS_ID),
    document.getElementById(Dom.API_KEYS_STATUS_ID),
  ].filter((el): el is HTMLElement => el !== null);

  if (elements.length === 0) return;

  for (const el of elements) {
    el.textContent = message;
    el.className = `status-banner ${isError ? 'error' : 'success'} show`;
  }

  setTimeout(() => {
    for (const el of elements) {
      el.classList.remove('show');
    }
  }, 3000);
}

/**
 * In development builds only: mounts a "Copy Anonymized DOM" utility button in the popup.
 * Tree-shaken completely out of production bundles by Vite.
 *
 * @param tabId - Target active tab ID.
 */
export function setupDevDomAnonymizer(tabId?: number): void {
  if (!import.meta.env.DEV || !tabId) return;

  const devSection =
    document.getElementById('dev-tools-section') || document.getElementById('dev-tools-card');
  let btn = document.getElementById('dev-anonymize-button') as HTMLButtonElement | null;

  if (devSection) {
    devSection.style.display = 'flex';
  }

  if (!btn) {
    const container =
      document.querySelector('.settings-view-content') ||
      document.querySelector('.settings-actions');
    if (!container) return;

    btn = document.createElement('button');
    btn.id = 'dev-anonymize-button';
    btn.className = 'settings-action-button dev-action-btn';
    btn.type = 'button';
    btn.title = 'Copy sanitized, 100% PII-free DOM structure of active tab to clipboard';
    btn.textContent = 'Copy Anonymized DOM';
    container.appendChild(btn);
  } else {
    btn.textContent = 'Copy Anonymized DOM';
  }

  if (btn.dataset.initialized === 'true') return;
  btn.dataset.initialized = 'true';

  btn.addEventListener('click', async () => {
    try {
      await browser.scripting.executeScript({
        target: { tabId },
        files: ['/dev-dom-anonymizer.js'],
      });
      showStatusMessage('Anonymized DOM copied to clipboard!', false);
    } catch (err) {
      showStatusMessage(`Failed to copy DOM: ${String(err)}`, true);
    }
  });

  setupDevAttendanceSimulation(tabId);
}

/**
 * In development builds only: wires up the "Simulate Attendance Marking" action button.
 *
 * @param tabId - Target active tab ID.
 */
export function setupDevAttendanceSimulation(tabId?: number): void {
  if (!import.meta.env.DEV) return;

  const simBtn = document.getElementById(Dom.DEV_SIMULATE_BUTTON_ID) as HTMLButtonElement | null;

  if (simBtn && simBtn.dataset.initialized !== 'true') {
    simBtn.dataset.initialized = 'true';
    simBtn.addEventListener('click', async () => {
      if (!tabId) return;
      try {
        await browser.storage.local.set({
          [Constants.DEV_SIMULATE_ATTENDANCE_KEY]: true,
        });
        await browser.scripting.executeScript({
          target: { tabId },
          files: ['/action-process-attendance.js'],
        });
        window.close();
      } catch (err) {
        showStatusMessage(`Failed to run simulation: ${String(err)}`, true);
      }
    });
  }
}
