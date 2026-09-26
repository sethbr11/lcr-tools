import * as Utils from '../utils';
import { Constants, Dom, Types } from '../types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Verifies that the current page structure conforms to the expected LCR attendance setup.
 *
 * @returns True if required attendance page elements are detected in the DOM.
 */
export function verifyLcrAttendanceSetup(): boolean {
  const hasTable = !!document.querySelector(Dom.ATTENDANCE_TABLE);
  const hasTab =
    !!document.querySelector(Dom.MEMBERS_TAB) || !!document.querySelector(Dom.VISITORS_TAB);
  const hasSelect = !!document.querySelector(Dom.SELECT_CONTROL);
  // Rows load after month/Sunday sync — do not require them at the gate.
  return hasTable && hasTab && hasSelect;
}

/**
 * Activates an LCR tab if not already selected, waiting for aria-selected confirmation.
 *
 * @param selector - Tab element CSS selector.
 * @returns True when the tab is active (or becomes active after click).
 */
export async function switchAttendanceTab(selector: string): Promise<boolean> {
  const tab = document.querySelector<HTMLElement>(selector);
  if (!tab) return false;
  if (tab.getAttribute('aria-selected') === Dom.ARIA_SELECTED_TRUE) return true;

  tab.click();
  await Utils.waitForCondition(
    () => tab.getAttribute('aria-selected') === Dom.ARIA_SELECTED_TRUE,
    Constants.TAB_SWITCH_TIMEOUT_MS,
    Constants.TAB_SWITCH_POLL_MS
  );
  return true;
}

/**
 * Switches the active tab on the LCR attendance page to "Members".
 *
 * @returns True if Members tab was successfully activated.
 */
export async function switchToMembersTab(): Promise<boolean> {
  return switchAttendanceTab(Dom.MEMBERS_TAB);
}

/**
 * Synchronizes the LCR month dropdown with the target Sunday date.
 *
 * @param targetDate - ISO date string (YYYY-MM-DD).
 * @returns True if month matched or updated successfully.
 */
export async function ensureMonthSelected(targetDate: string): Promise<boolean> {
  return selectDropdownOptionByValue(targetDate.slice(0, 7));
}

/**
 * Synchronizes Members tab, month dropdown, class dropdown, and Sunday view with abort checks.
 *
 * @param options - Target date and optional class selection values.
 * @param logs - Running attendance audit log array.
 * @returns 'ok' when sync completes, or 'aborted' if the user cancelled mid-sync.
 */
export async function synchronizeAttendancePage(
  options: Types.SyncAttendancePageOptions,
  logs: Types.AttendanceLogEntry[]
): Promise<Types.SyncAttendancePageStatus> {
  const { targetDate, targetClassValue, targetClassText } = options;

  await switchToMembersTab();
  if (Utils.isAborted()) return 'aborted';
  Utils.pushAttendanceLog(logs, {
    date: targetDate,
    action: 'NAVIGATE',
    target: 'Members Tab',
    lcrUpdateStatus: 'Switched to Members tab',
  });

  await ensureMonthSelected(targetDate);
  if (Utils.isAborted()) return 'aborted';
  Utils.pushAttendanceLog(logs, {
    date: targetDate,
    action: 'SELECT',
    target: 'Month Dropdown',
    lcrUpdateStatus: `Selected month: ${targetDate.slice(0, 7)}`,
  });

  if (targetClassValue) {
    await ensureClassSelected(targetClassValue);
    if (Utils.isAborted()) return 'aborted';
    Utils.pushAttendanceLog(logs, {
      date: targetDate,
      action: 'SELECT',
      target: 'Class Dropdown',
      lcrUpdateStatus: `Selected class: ${targetClassText || targetClassValue}`,
    });
  }

  await selectSundayView(targetDate);
  if (Utils.isAborted()) return 'aborted';
  Utils.pushAttendanceLog(logs, {
    date: targetDate,
    action: 'SELECT',
    target: 'Sunday Button',
    lcrUpdateStatus: `Selected Sunday view: ${targetDate}`,
  });

  return 'ok';
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Synchronizes an LCR select dropdown to the specified target option value. */
async function selectDropdownOptionByValue(targetValue: string): Promise<boolean> {
  if (!targetValue) return true;

  const allSelects = Array.from(document.querySelectorAll<HTMLSelectElement>(Dom.SELECT_CONTROL));
  const matchedSelect = allSelects.find((s) =>
    Array.from(s.options || []).some((opt) => opt.value === targetValue)
  );
  if (!matchedSelect) return true;
  if (matchedSelect.value === targetValue) return true;

  matchedSelect.value = targetValue;
  matchedSelect.dispatchEvent(new Event('change', { bubbles: true }));

  return Utils.waitForCondition(
    () => matchedSelect.value === targetValue,
    Constants.DROPDOWN_SETTLE_TIMEOUT_MS,
    Constants.DROPDOWN_SETTLE_POLL_MS
  );
}

/** Synchronizes the LCR class/quorum dropdown with the selected class value. */
async function ensureClassSelected(targetClassValue: string): Promise<boolean> {
  return selectDropdownOptionByValue(targetClassValue);
}

/** Selects the single Sunday view button corresponding to the target date. */
async function selectSundayView(targetDate: string): Promise<boolean> {
  const [year, month, day] = targetDate.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayStr = String(day).padStart(2, '0');
  const monthAbbr = dateObj.toLocaleString('en-US', { month: 'short' });
  const label = `${dayStr} ${monthAbbr}`.toLowerCase();

  let targetBtn: HTMLButtonElement | undefined;
  await Utils.waitForCondition(
    () => {
      const buttons = Array.from(
        document.querySelectorAll<HTMLButtonElement>(Dom.SUNDAY_TAB_BUTTONS)
      );
      targetBtn = buttons.find((b) => (b.textContent || '').trim().toLowerCase() === label);
      return !!targetBtn;
    },
    Constants.SUNDAY_BUTTON_TIMEOUT_MS,
    Constants.SUNDAY_BUTTON_POLL_MS
  );

  if (!targetBtn) return false;
  if (targetBtn.getAttribute('aria-selected') === Dom.ARIA_SELECTED_TRUE) return true;

  targetBtn.click();
  return Utils.waitForCondition(
    () => targetBtn?.getAttribute('aria-selected') === Dom.ARIA_SELECTED_TRUE,
    Constants.SUNDAY_BUTTON_TIMEOUT_MS,
    Constants.SUNDAY_BUTTON_POLL_MS
  );
}
