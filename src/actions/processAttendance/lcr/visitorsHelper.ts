import * as Utils from '../utils';
import { Dom, Constants, Types, Regex } from '../types';
import { ensureMonthSelected, getMonthNotFoundMessage, switchAttendanceTab } from './syncHelper';

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
  const monthSelected = await ensureMonthSelected(targetDate);
  if (!monthSelected) {
    const error = getMonthNotFoundMessage(targetDate);
    if (logs) logVisitorError(logs, targetDate, 'Month Dropdown', error);
    return { success: false, updated: [], error };
  }
  await Utils.waitForCondition(
    () =>
      document.querySelectorAll(Dom.NUMBER_INPUT).length > 0 ||
      document.querySelectorAll(Dom.TABLE_BODY_ROWS).length > 0,
    Constants.DROPDOWN_SETTLE_TIMEOUT_MS,
    Constants.DROPDOWN_SETTLE_POLL_MS
  );

  // Step 3: Resolve every input before typing so a partial write never reaches LCR
  const resolved: Types.ResolvedVisitorInput[] = [];
  const missing: Types.VisitorCategory[] = [];
  for (const [category, count] of Object.entries(counts)) {
    if (typeof count !== 'number' || count < 0) continue;
    const catName = category as Types.VisitorCategory;
    const input = findVisitorInput(catName, targetDate);
    if (input) resolved.push({ category: catName, count, input });
    else if (count > 0) missing.push(catName);
  }

  if (resolved.length === 0) {
    Utils.showLcrMaintenanceModal(
      'Process Attendance',
      'No matching visitor inputs found on this page.'
    );
    return { success: false, updated: [], error: 'No matching visitor inputs found on page.' };
  }

  if (missing.length > 0) {
    const error = `Visitor inputs not found for: ${missing.join(', ')}`;
    if (logs) logVisitorError(logs, targetDate, 'Visitor Inputs', error);
    return { success: false, updated: [], error };
  }

  const updated: string[] = [];
  for (const { category: catName, count, input } of resolved) {
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
    await Utils.sleep(Constants.VISITOR_INPUT_SETTLE_MS);
  }

  // Step 4: Settle delay and pre-save verification so React commits state and enables Save
  await Utils.sleep(Constants.VISITOR_SAVE_PREPARE_MS);
  // Re-query each input: LCR may have remounted it while the values were typed
  for (const { category, count } of resolved) {
    const input = findVisitorInput(category, targetDate);
    if (input && input.value !== String(count)) {
      setNativeInputValue(input, count);
    }
  }

  // Step 5: Click the LCR Save button
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
 * Dispatches simulated focus, input, change, and blur events using native value setter for React inputs.
 * Supports numbers and string values (passing empty string clears the input).
 *
 * @param input - Target HTMLInputElement.
 * @param value - New numerical or string value.
 */
export function setNativeInputValue(input: HTMLInputElement, value: number | string): void {
  const currentVal = input.value;
  const targetValStr = typeof value === 'string' ? value : String(value);
  if (currentVal === targetValStr) return;

  if (typeof input.focus === 'function') input.focus();

  const tracker = (input as unknown as { _valueTracker?: { setValue: (v: string) => void } })
    ._valueTracker;
  if (tracker && typeof tracker.setValue === 'function') {
    tracker.setValue(currentVal);
  }

  const prototype = window.HTMLInputElement?.prototype || Object.getPrototypeOf(input);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

  if (descriptor?.set) {
    descriptor.set.call(input, targetValStr);
  } else {
    input.value = targetValStr;
  }

  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

  if (typeof input.blur === 'function') input.blur();
}

/**
 * Discovers and triggers the primary LCR Save button on the Visitors tab, then waits for save completion.
 *
 * @param maxWaitMs - Maximum wait time in milliseconds for finding an enabled save button.
 * @returns True if save button was found, enabled, clicked, and the save spinner cleared; false otherwise.
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

  await Utils.sleep(Constants.VISITOR_SAVE_TRIGGER_MS);

  const spinnerPresent = !!document.querySelector(Dom.PROGRESS_SPINNER);
  if (!spinnerPresent) return true;

  return Utils.waitForCondition(
    () => !document.querySelector(Dom.PROGRESS_SPINNER),
    Constants.SAVE_COMPLETE_TIMEOUT_MS,
    Constants.SAVE_COMPLETE_POLL_MS
  );
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Locates the visitor count input for a category and Sunday date across LCR DOM strategies. */
function findVisitorInput(
  category: Types.VisitorCategory,
  targetDate: string
): HTMLInputElement | null {
  const slugs = getCategorySlugs(category);

  // Strategy 1: Direct name matching name="<uuid>::slug::<targetDate>"
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(Dom.NUMBER_INPUT));
  for (const input of inputs) {
    const name = (input.getAttribute('name') || '').toLowerCase();
    if (name.endsWith(`::${targetDate}`) && slugs.some((s) => name.includes(`::${s}::`))) {
      return input;
    }
  }

  // Strategy 2: Targeting inside specific row ID (e.g. men_2026-09_ALL)
  const targetYearMonth = targetDate.slice(0, 7);
  for (const s of slugs) {
    const row =
      document.getElementById(`${s}_${targetYearMonth}_ALL`) ||
      document.getElementById(`${s.replace('_', '-')}_${targetYearMonth}_ALL`);
    if (row) {
      const colInput = findInputInRowByDate(row, targetDate);
      if (colInput) return colInput;
    }
  }

  // Strategy 3: Targeting by row label text (Young Men/Women before Men/Women)
  const primarySlug = slugs[0];
  const tableRows = Array.from(document.querySelectorAll<HTMLTableRowElement>(Dom.TABLE_BODY_ROWS));
  for (const r of tableRows) {
    const headerCell = r.cells[0]?.textContent || '';
    if (headerMatchesVisitorSlug(headerCell, primarySlug)) {
      const colInput = findInputInRowByDate(r, targetDate);
      if (colInput) return colInput;
    }
  }

  return null;
}

/** Discovers input in row corresponding to the column date. */
function findInputInRowByDate(row: HTMLElement, targetDate: string): HTMLInputElement | null {
  const [year, month, day] = targetDate.split('-').map(Number);
  const monthAbbr = new Date(year, month - 1, day)
    .toLocaleString('en-US', { month: 'short' })
    .toLowerCase();

  // Compare whole day numbers so "4 Jan" never matches a "14 Jan" column
  const labelsDate = (text: string): boolean =>
    Array.from(text.matchAll(Regex.DAY_MONTH_LABEL)).some(
      (m) => Number(m[1]) === day && m[2].toLowerCase() === monthAbbr
    );

  const cells = Array.from(row.querySelectorAll('td'));
  for (const cell of cells) {
    if (labelsDate(cell.textContent || '')) {
      const input = cell.querySelector<HTMLInputElement>(Dom.NUMBER_INPUT);
      if (input) return input;
    }
  }

  // Check input inside cell that has name matching date
  const input = row.querySelector<HTMLInputElement>(`input[name$="::${targetDate}"]`);
  return input;
}

/** Records an ERROR log entry for a visitor save step that could not proceed. */
function logVisitorError(
  logs: Types.AttendanceLogEntry[],
  targetDate: string,
  target: string,
  message: string
): void {
  Utils.pushAttendanceLog(logs, {
    date: targetDate,
    action: 'ERROR',
    target,
    level: 'ERROR',
    lcrUpdateStatus: message,
  });
}

/** Maps display category to slug variants used in LCR DOM. */
function getCategorySlugs(category: Types.VisitorCategory): string[] {
  switch (category) {
    case 'Men':
      return ['men'];
    case 'Women':
      return ['women'];
    case 'Young Men':
      return ['young_men', 'young-men', 'youngmen'];
    case 'Young Women':
      return ['young_women', 'young-women', 'youngwomen'];
    case 'Children':
      return ['children', 'child', 'primary'];
    default:
      return ['men'];
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
