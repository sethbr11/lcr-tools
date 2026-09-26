import * as Utils from '../utils';
import { Dom, Constants, Types, Regex } from '../types';
import { ensureMonthSelected, switchAttendanceTab } from './syncHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Switches the active tab on the LCR attendance page to "Visitors".
 *
 * @returns True if Visitors tab was activated.
 */
export async function switchToVisitorsTab(): Promise<boolean> {
  return switchAttendanceTab(Dom.VISITORS_TAB);
}

/**
 * Applies tailored visitor counts to LCR input fields and triggers save.
 * Matches exact DOM structure discovered in domAnonymizerOutput.html.
 *
 * @param _targetClass - Display name of the active class or quorum.
 * @param targetDate - ISO date string (YYYY-MM-DD).
 * @param counts - Category visitor counts to apply.
 * @param logs - Optional running action execution logs.
 * @returns Result object detailing updated categories and status.
 */
export async function processClassVisitorCounts(
  _targetClass: string,
  targetDate: string,
  counts: Types.VisitorCounts,
  logs?: Types.AttendanceLogEntry[]
): Promise<Types.ProcessVisitorCountsResult> {
  // Step 1: Switch to Visitors tab
  await switchToVisitorsTab();
  if (logs) {
    Utils.pushAttendanceLog(logs, {
      date: targetDate,
      action: 'NAVIGATE',
      target: 'Visitors Tab',
      lcrUpdateStatus: 'Switched to Visitors tab',
    });
  }

  // Step 2: Ensure correct month is loaded, then wait for visitor inputs/rows
  await ensureMonthSelected(targetDate);
  await Utils.waitForCondition(
    () =>
      document.querySelectorAll(Dom.NUMBER_INPUT).length > 0 ||
      document.querySelectorAll(Dom.TABLE_BODY_ROWS).length > 0,
    Constants.DROPDOWN_SETTLE_TIMEOUT_MS,
    Constants.DROPDOWN_SETTLE_POLL_MS
  );

  const updated: string[] = [];

  // Step 3: Iterate through categories and populate corresponding LCR inputs
  for (const [category, count] of Object.entries(counts)) {
    if (typeof count !== 'number' || count < 0) continue;
    const catName = category as Types.VisitorCategory;

    const input = findVisitorInput(catName, targetDate);
    if (input) {
      setNativeInputValue(input, count);
      updated.push(`${catName}: ${count}`);
      if (logs) {
        Utils.pushAttendanceLog(logs, {
          date: targetDate,
          action: 'INPUT',
          target: `Visitors: ${catName}`,
          lcrUpdateStatus: `Entered visitor count: ${catName} = ${count}`,
        });
      }
    }
  }

  if (updated.length === 0) {
    Utils.showLcrMaintenanceModal(
      'Process Attendance',
      'No matching visitor inputs found on this page.'
    );
    return { success: false, updated: [], error: 'No matching visitor inputs found on page.' };
  }

  // Step 4: Click the LCR Save button
  const saved = await clickSaveButton();
  if (logs) {
    Utils.pushAttendanceLog(logs, {
      date: targetDate,
      action: 'CLICK',
      target: 'Save Button',
      lcrUpdateStatus: saved
        ? `Clicked Save button on Visitors tab (${updated.join(', ')})`
        : 'Failed to click Save button on Visitors tab',
    });
  }

  if (saved) {
    Utils.showToast(`Visitor counts updated: ${updated.join(', ')}`, { type: 'success' });
  } else {
    Utils.showLcrMaintenanceModal(
      'Process Attendance',
      'Save button on the Visitors tab could not be found or triggered.'
    );
    return { success: false, updated, error: 'Save button not found' };
  }

  return { success: true, updated };
}

/**
 * Dispatches simulated input and change events using native value setter for React inputs.
 * Supports numbers and string values (passing empty string clears the input).
 *
 * @param input - Target HTMLInputElement.
 * @param value - New numerical or string value.
 */
export function setNativeInputValue(input: HTMLInputElement, value: number | string): void {
  const currentVal = input.value;
  const targetValStr = typeof value === 'string' ? value : String(value);
  if (currentVal === targetValStr) return;

  const prototype = window.HTMLInputElement?.prototype || Object.getPrototypeOf(input);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

  if (descriptor?.set) descriptor.set.call(input, targetValStr);
  else input.value = targetValStr;

  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Discovers and triggers the primary LCR Save button on the Visitors tab, then waits for save completion.
 *
 * @param maxWaitMs - Maximum wait time in milliseconds for finding an enabled save button.
 * @returns True if save button was found, enabled, clicked, and save completed or timed out gracefully.
 */
export async function clickSaveButton(
  maxWaitMs: number = Constants.SAVE_COMPLETE_TIMEOUT_MS
): Promise<boolean> {
  let clicked = false;
  const found = await Utils.waitForCondition(
    () => {
      const saveBtn = document.querySelector<HTMLButtonElement>(Dom.SAVE_BUTTON);
      if (saveBtn && !saveBtn.disabled) {
        saveBtn.click();
        clicked = true;
        return true;
      }
      return false;
    },
    maxWaitMs,
    Constants.SAVE_COMPLETE_POLL_MS
  );

  if (!found || !clicked) return false;

  const spinnerPresent = !!document.querySelector(Dom.PROGRESS_SPINNER);
  if (!spinnerPresent) return true;

  await Utils.waitForCondition(
    () => {
      const spinner = document.querySelector(Dom.PROGRESS_SPINNER);
      if (spinner) return false;
      const saveBtn = document.querySelector<HTMLButtonElement>(Dom.SAVE_BUTTON);
      return !!saveBtn && !saveBtn.disabled;
    },
    Constants.SAVE_COMPLETE_TIMEOUT_MS,
    Constants.SAVE_COMPLETE_POLL_MS
  );

  return true;
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Locates the visitor count input for a category and Sunday date across LCR DOM strategies. */
function findVisitorInput(
  category: Types.VisitorCategory,
  targetDate: string
): HTMLInputElement | null {
  const slug = getCategorySlug(category);

  // Strategy 1: Direct name matching name="<uuid>::slug::<targetDate>"
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(Dom.NUMBER_INPUT));
  for (const input of inputs) {
    const name = input.getAttribute('name') || '';
    if (name.endsWith(`::${targetDate}`) && name.toLowerCase().includes(`::${slug}::`)) {
      return input;
    }
  }

  // Strategy 2: Targeting inside specific row ID (e.g. men_2026-09_ALL)
  const targetYearMonth = targetDate.slice(0, 7);
  const rowId = `${slug}_${targetYearMonth}_ALL`;
  const row = document.getElementById(rowId);
  if (row) {
    const colInput = findInputInRowByDate(row, targetDate);
    if (colInput) return colInput;
  }

  // Strategy 3: Targeting by row label text (Young Men/Women before Men/Women)
  const tableRows = Array.from(document.querySelectorAll<HTMLTableRowElement>(Dom.TABLE_BODY_ROWS));
  for (const r of tableRows) {
    const headerCell = r.cells[0]?.textContent || '';
    if (headerMatchesVisitorSlug(headerCell, slug)) {
      const colInput = findInputInRowByDate(r, targetDate);
      if (colInput) return colInput;
    }
  }

  return null;
}

/** Discovers input in row corresponding to the column date. */
function findInputInRowByDate(row: HTMLElement, targetDate: string): HTMLInputElement | null {
  const [year, month, day] = targetDate.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayStr = String(day).padStart(2, '0');
  const monthAbbr = dateObj.toLocaleString('en-US', { month: 'short' });
  const label = `${dayStr} ${monthAbbr}`.toLowerCase();

  const cells = Array.from(row.querySelectorAll('td'));
  for (const cell of cells) {
    const text = (cell.textContent || '').toLowerCase();
    if (text.includes(label)) {
      const input = cell.querySelector<HTMLInputElement>(Dom.NUMBER_INPUT);
      if (input) return input;
    }
  }

  // Check input inside cell that has name matching date
  const input = row.querySelector<HTMLInputElement>(`input[name$="::${targetDate}"]`);
  return input;
}

/** Maps display category to slug used in LCR DOM. */
function getCategorySlug(category: Types.VisitorCategory): string {
  switch (category) {
    case 'Men':
      return 'men';
    case 'Women':
      return 'women';
    case 'Young Men':
      return 'young_men';
    case 'Young Women':
      return 'young_women';
    case 'Children':
      return 'children';
    default:
      return 'men';
  }
}

/** True when a visitor row label matches the category slug without Men/Women collisions. */
function headerMatchesVisitorSlug(headerText: string, slug: string): boolean {
  const text = headerText.replace(Regex.MULTIPLE_SPACES, ' ');
  switch (slug) {
    case 'young_men':
      return Regex.VISITOR_LABEL_YOUNG_MEN.test(text);
    case 'young_women':
      return Regex.VISITOR_LABEL_YOUNG_WOMEN.test(text);
    case 'children':
      return Regex.VISITOR_LABEL_CHILDREN.test(text);
    case 'women':
      return Regex.VISITOR_LABEL_WOMEN.test(text) && !Regex.VISITOR_LABEL_YOUNG_WOMEN.test(text);
    case 'men':
      return (
        Regex.VISITOR_LABEL_MEN.test(text) &&
        !Regex.VISITOR_LABEL_WOMEN.test(text) &&
        !Regex.VISITOR_LABEL_YOUNG_MEN.test(text)
      );
    default:
      return false;
  }
}
