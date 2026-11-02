import * as Utils from '../utils';
import { Constants, Dom, Regex, Types } from '../types';

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
 * @returns True when the tab is active (or confirmed active after click); false if the wait times out.
 */
export async function switchAttendanceTab(selector: string): Promise<boolean> {
  const tab = document.querySelector<HTMLElement>(selector);
  if (!tab) return false;
  if (tab.getAttribute('aria-selected') === Dom.ARIA_SELECTED_TRUE) return true;

  tab.click();
  return Utils.waitForCondition(
    () => tab.getAttribute('aria-selected') === Dom.ARIA_SELECTED_TRUE,
    Constants.TAB_SWITCH_TIMEOUT_MS,
    Constants.TAB_SWITCH_POLL_MS
  );
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
 * Each step must be confirmed before the next runs, so callers never write to an unverified page.
 *
 * @param options - Target date and optional class selection values.
 * @param logs - Running attendance audit log array.
 * @returns `ok` when every step is confirmed, `aborted` if the user cancelled mid-sync, or
 *   `failed` with the step and a user-readable message when a control could not be confirmed.
 */
export async function synchronizeAttendancePage(
  options: Types.SyncAttendancePageOptions,
  logs: Types.AttendanceLogEntry[]
): Promise<Types.SyncAttendancePageStatus> {
  const { targetDate, targetClassValue, targetClassText } = options;
  const targetMonth = targetDate.slice(0, 7);

  // Step 1: Members tab
  const onMembersTab = await switchToMembersTab();
  if (Utils.isAborted()) return { status: 'aborted' };
  if (!onMembersTab) {
    return failSyncStep(
      logs,
      targetDate,
      'members-tab',
      'Members Tab',
      "Could not switch to LCR's Members tab."
    );
  }
  Utils.pushAttendanceLog(logs, {
    date: targetDate,
    action: 'NAVIGATE',
    target: 'Members Tab',
    lcrUpdateStatus: 'Switched to Members tab',
  });

  // Step 2: Month dropdown
  const monthSelected = await ensureMonthSelected(targetDate);
  if (Utils.isAborted()) return { status: 'aborted' };
  if (!monthSelected) {
    return failSyncStep(
      logs,
      targetDate,
      'month',
      'Month Dropdown',
      getMonthNotFoundMessage(targetDate)
    );
  }
  Utils.pushAttendanceLog(logs, {
    date: targetDate,
    action: 'SELECT',
    target: 'Month Dropdown',
    lcrUpdateStatus: `Selected month: ${targetMonth}`,
  });

  // Step 3: Class dropdown
  if (targetClassValue) {
    const classLabel = targetClassText || targetClassValue;
    const classSelected = await ensureClassSelected(targetClassValue);
    if (Utils.isAborted()) return { status: 'aborted' };
    if (!classSelected) {
      return failSyncStep(
        logs,
        targetDate,
        'class',
        'Class Dropdown',
        `Could not find class '${classLabel}' in LCR's class dropdown.`
      );
    }
    Utils.pushAttendanceLog(logs, {
      date: targetDate,
      action: 'SELECT',
      target: 'Class Dropdown',
      lcrUpdateStatus: `Selected class: ${classLabel}`,
    });
  }

  // Step 4: Sunday view
  const sundaySelected = await selectSundayView(targetDate);
  if (Utils.isAborted()) return { status: 'aborted' };
  if (!sundaySelected) {
    return failSyncStep(
      logs,
      targetDate,
      'sunday',
      'Sunday Button',
      `Could not find the 'Sunday ${getSundayLabel(targetDate, true)}' button.`
    );
  }
  Utils.pushAttendanceLog(logs, {
    date: targetDate,
    action: 'SELECT',
    target: 'Sunday Button',
    lcrUpdateStatus: `Selected Sunday view: ${targetDate}`,
  });

  return { status: 'ok' };
}

/**
 * Builds the user-readable message shown when the target month is missing from LCR's month dropdown.
 *
 * @param targetDate - ISO date string (YYYY-MM-DD).
 * @returns Message naming the missing YYYY-MM month value.
 */
export function getMonthNotFoundMessage(targetDate: string): string {
  return `Could not find ${targetDate.slice(0, 7)} in LCR's month dropdown.`;
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
  if (!matchedSelect) return false;
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
  const labels = [true, false].map((padDay) => getSundayLabel(targetDate, padDay).toLowerCase());

  let targetBtn: HTMLButtonElement | undefined;
  await Utils.waitForCondition(
    () => {
      const buttons = Array.from(
        document.querySelectorAll<HTMLButtonElement>(Dom.SUNDAY_TAB_BUTTONS)
      );
      targetBtn = buttons.find((b) => labels.includes(normalizeButtonLabel(b.textContent)));
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

/** Builds a Sunday button label such as "01 Nov" (padded) or "1 Nov" (unpadded). */
function getSundayLabel(targetDate: string, padDay: boolean): string {
  const [year, month, day] = targetDate.split('-').map(Number);
  const monthAbbr = new Date(year, month - 1, day).toLocaleString('en-US', { month: 'short' });
  return `${padDay ? String(day).padStart(2, '0') : day} ${monthAbbr}`;
}

/** Trims, lowercases, and collapses whitespace in button text for exact label comparison. */
function normalizeButtonLabel(text: string | null): string {
  return (text || '').replace(Regex.MULTIPLE_SPACES, ' ').trim().toLowerCase();
}

/** Records an ERROR log entry for a sync step and returns the matching failed status. */
function failSyncStep(
  logs: Types.AttendanceLogEntry[],
  targetDate: string,
  step: Types.SyncAttendancePageStep,
  target: string,
  message: string
): Types.SyncAttendancePageFailed {
  Utils.pushAttendanceLog(logs, {
    date: targetDate,
    action: 'ERROR',
    target,
    level: 'ERROR',
    lcrUpdateStatus: message,
  });
  return { status: 'failed', step, message };
}
