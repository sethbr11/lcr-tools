import { isAborted, sleep } from '../coreUtils';
import { showLcrMaintenanceModal } from '../ui/maintenanceUtils';
import { Constants, Dom, Regex } from '../types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Returns whether the active page is Church Directory (directory.churchofjesuschrist.org).
 *
 * @returns True when the hostname is the Church Directory domain.
 */
export function isChurchDirectoryPage(): boolean {
  return Regex.CHURCH_DIRECTORY_DOMAIN.test(window.location.hostname);
}

/**
 * Returns whether the active page is an LCR member directory (Individuals/Households list).
 *
 * @returns True when the URL or DOM matches the LCR member directory.
 */
export function isLcrMemberDirectoryPage(): boolean {
  return (
    Regex.LCR_MEMBER_LIST_PATH.test(window.location.href) ||
    Boolean(document.querySelector(Dom.MEMBER_NAME_BUTTON)) ||
    Boolean(document.getElementById(Dom.INDIVIDUALS_TAB_ID)) ||
    Boolean(document.getElementById(Dom.HOUSEHOLDS_TAB_ID))
  );
}

/**
 * Ensures the LCR member directory is on the Individuals tab before scanning member rows.
 *
 * If the Individuals/Households tablist is absent, scanning proceeds. When the tablist is present,
 * Households is left and Individuals is selected, then the table is given a short settle period.
 *
 * @param actionName - Display name of the calling action for maintenance notifications.
 * @returns True when it is safe to scan individual member rows.
 */
export async function ensureLcrIndividualsTab(actionName: string): Promise<boolean> {
  const individualsTab = document.getElementById(Dom.INDIVIDUALS_TAB_ID);
  const householdsTab = document.getElementById(Dom.HOUSEHOLDS_TAB_ID);
  const tablist = document.querySelector(Dom.DIRECTORY_TABLIST);

  if (!individualsTab && !householdsTab && !tablist) return true;

  if (!individualsTab) {
    showLcrMaintenanceModal(
      actionName,
      'The Individuals tab could not be located on the LCR member directory.'
    );
    return false;
  }

  if (individualsTab.getAttribute('aria-selected') === Dom.ARIA_SELECTED_TRUE) return true;

  individualsTab.click();
  const becameSelected = await waitForIndividualsSelected(individualsTab);
  if (isAborted()) return false;
  if (!becameSelected) {
    showLcrMaintenanceModal(
      actionName,
      'The LCR member directory did not switch to the Individuals tab.'
    );
    return false;
  }

  await sleep(Constants.DIRECTORY_TAB_SETTLE_MS);
  return !isAborted();
}

/**
 * Waits briefly for LCR member directory table rows to appear after a tab or page load.
 *
 * @returns Table body rows currently in the document.
 */
export async function waitForLcrDirectoryRows(): Promise<HTMLTableRowElement[]> {
  let rows = queryDirectoryRows();
  if (rows.length > 0) return rows;
  if (!document.querySelector('table')) return rows;

  for (let i = 0; i < Constants.DIRECTORY_ROW_WAIT_ATTEMPTS; i++) {
    await sleep(Constants.DIRECTORY_ROW_WAIT_MS);
    rows = queryDirectoryRows();
    if (rows.length > 0) return rows;
  }
  return rows;
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Reads current LCR member directory table body rows. */
function queryDirectoryRows(): HTMLTableRowElement[] {
  return Array.from(document.querySelectorAll<HTMLTableRowElement>(Dom.MEMBER_DIRECTORY_ROWS));
}

/** Polls until the Individuals tab reports aria-selected true or the timeout elapses. */
async function waitForIndividualsSelected(tab: HTMLElement): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started <= Constants.DIRECTORY_TAB_SWITCH_TIMEOUT_MS) {
    if (isAborted()) return false;
    if (tab.getAttribute('aria-selected') === Dom.ARIA_SELECTED_TRUE) return true;
    await sleep(Constants.DIRECTORY_TAB_SWITCH_POLL_MS);
  }
  return tab.getAttribute('aria-selected') === Dom.ARIA_SELECTED_TRUE;
}
