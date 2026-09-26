import { Dom, Regex, Types } from '@/types';
import { parseMonthDay } from '../coreUtils';
import { getNeeds } from '../navigationUtils';

export { tableToCSV, processTable } from './tableCsvUtils';
export {
  isAttendanceColumn,
  getAttendanceColumnOptions,
  isAttendanceCellAttended,
} from './tableAttendanceUtils';
export {
  requestTables,
  showTableSelectionModal,
  showMultiTableSelectionModal,
} from './tableSelectionUtils';
import { getTableDisplayName } from './tableTitleUtils';
export { getTableDisplayName };

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Scans the current DOM page to identify and categorize all visible Church LCR data tables.
 *
 * @returns Array of table metadata objects including element, category, name, and pagination needs.
 */
export function getPageTables(): Types.TableInfo[] {
  const foundTables: Types.TableInfo[] = [];

  // Check for specialized finance tables
  const financeTables = document.querySelectorAll<HTMLElement>(
    'article[data-qa="bloTable"], div.finance-table'
  );
  financeTables.forEach((ft, index) => {
    if (isVisible(ft)) {
      foundTables.push({
        name: `Finance Table ${index + 1}`,
        type: 'finance-table',
        table: ft,
        needs: [],
      });
    }
  });

  // Standard HTML tables
  const visibleTables = Array.from(document.querySelectorAll<HTMLTableElement>('table')).filter(
    (t) => isVisible(t)
  );

  const hasPopulatedTables = visibleTables.some(
    (t) => t.querySelectorAll('tbody tr, tr:not(thead tr)').length > 0
  );

  visibleTables.forEach((table, index) => {
    const rowCount = table.querySelectorAll('tbody tr, tr:not(thead tr)').length;
    if (hasPopulatedTables && rowCount === 0) return;

    const type = detectTableType(table);
    const name = getTableDisplayName(table, index);
    const needs = getNeeds(table);

    foundTables.push({ name, type, table, needs });
  });

  return foundTables;
}

/**
 * Extracts the cell value, normalizing checkmarks, icons, Yes/No states, and trimmed text.
 *
 * @param cell - Target table cell element.
 * @returns Normalized text string representing cell contents.
 */
export function getCellValue(cell: HTMLElement): string {
  const iconValue = parseCellIcon(cell);
  if (iconValue !== null) return iconValue;

  const knownValue = parseCellKnownLabel(cell);
  if (knownValue !== null) return knownValue;

  return cleanCellContent(cell);
}

/**
 * Extracts visible, meaningful column headers and their corresponding column indices.
 *
 * @param table - Target HTML table element.
 * @returns Object with headers array and indices array.
 */
export function getRelevantHeaderCells(table: HTMLTableElement): Types.RelevantHeadersResult {
  const thead = table.querySelector('thead');
  const headerRow = thead ? thead.querySelector('tr') : table.querySelector('tr:first-child');
  if (!headerRow) return { headers: [], indices: [] };

  const ths = Array.from(headerRow.querySelectorAll('th, td'));
  const headers: string[] = [];
  const indices: number[] = [];

  ths.forEach((th, index) => {
    if (!isVisible(th)) return;
    if (
      th.classList.contains('checkbox-col') ||
      th.classList.contains('actions-cell') ||
      th.classList.contains('hidden-print') ||
      th.querySelector('input[type="checkbox"]')
    ) {
      return;
    }
    const text = cleanCellContent(th as HTMLElement);
    if (!text || isExcludedLabel(text)) return;
    headers.push(text);
    indices.push(index);
  });

  return { headers, indices };
}

/**
 * Collects a unique, alphabetically sorted array of non-empty cell values for a given column index.
 *
 * @param table - HTML table element.
 * @param columnIndex - Zero-based index of the target column.
 * @returns Array of unique string values found in that column.
 */
export function getUniqueValues(table: HTMLTableElement, columnIndex: number): string[] {
  const values = new Set<string>();
  const rows = Array.from(table.querySelectorAll('tbody tr')).filter((r) => isVisible(r));

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells[columnIndex]) {
      const val = getCellValue(cells[columnIndex]).trim();
      if (val) values.add(val);
    }
  }

  return Array.from(values).sort();
}

/**
 * Parses LCR abbreviated column header dates (e.g. '15 Jan') into Date instances.
 *
 * @param dateStr - Header string containing day and month name.
 * @returns Parsed Date object or null if string does not match pattern.
 */
export function parseHeaderDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const md = parseMonthDay(dateStr);
  if (!md) return null;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const monthIndex = md.month - 1;
  let year = currentYear;
  if (monthIndex === 11 && currentMonth === 0) year--;
  else if (monthIndex === 0 && currentMonth === 11) year++;

  return new Date(year, monthIndex, md.day);
}

/**
 * Parses month-day string into full Date object using current/nearest year.
 *
 * @param dateStr - Month-day string representation.
 * @returns Parsed Date object or null if string cannot be parsed.
 */
export function parseMonthDayToDate(dateStr: string): Date | null {
  const md = parseMonthDay(dateStr);
  if (!md) return null;

  const now = new Date();
  let year = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthIndex = md.month - 1;

  if (monthIndex === 11 && currentMonth === 0) year--;
  else if (monthIndex === 0 && currentMonth === 11) year++;

  return new Date(year, monthIndex, md.day);
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Determines if element is rendered and visible in page viewport. */
export function isVisible(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLElement) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }
  let current: Element | null = el.parentElement;
  while (current && !(current instanceof HTMLElement)) {
    current = current.parentElement;
  }
  if (current instanceof HTMLElement) {
    return isVisible(current);
  }
  return el.getClientRects().length > 0;
}

/** Strips hidden elements and extra spaces from element text. */
export function cleanCellContent(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(Dom.CELL_STRIP_SELECTORS).forEach((el) => el.remove());
  clone.querySelectorAll(Dom.LINE_BREAK_SELECTOR).forEach((el) => el.replaceWith(' '));
  clone
    .querySelectorAll(Dom.BLOCK_CELL_SELECTOR)
    .forEach((el) => el.insertAdjacentText('afterend', ' '));
  return (
    clone.textContent
      ?.replace(/\u00A0/g, ' ')
      .replace(Regex.MULTIPLE_SPACES, ' ')
      .trim() || ''
  );
}

/** Inspects cell for checkmarks, boolean icons, or interactive attendance toggles. */
export function parseCellIcon(cell: HTMLElement): string | null {
  const pressedBtn = cell.querySelector(Dom.ATTENDANCE_PRESSED_SELECTOR);
  if (pressedBtn) return 'Yes';

  const unpressedBtn = cell.querySelector(Dom.ATTENDANCE_UNPRESSED_SELECTOR);
  if (unpressedBtn) return 'No';

  const ariaPressed = cell.querySelector('button[aria-pressed="true"]');
  if (ariaPressed) return 'Yes';
  const ariaUnpressed = cell.querySelector('button[aria-pressed="false"]');
  if (ariaUnpressed) return 'No';

  const hasCheck = cell.querySelector(
    '.lds.icon-check-open, .lds.icon-check-open-small, .lds.icon-checkmark, img[alt*="checkmark"], svg path[d*="M7.453 17.542"], svg path[d*="M12 22c5.523"], svg[name="checkmarkActive"], svg[name="checkmarkForCheckbox"]'
  );
  if (hasCheck) return 'Yes';

  const hasCross = cell.querySelector('svg path[d*="M12 3.5a8.5"], svg[name="openCircle"]');
  if (hasCross) return 'No';

  const text = cell.textContent || '';
  if (text.includes('✓') || text.includes('✔') || text.includes('☑')) {
    return 'Yes';
  }
  if (text.includes('✗') || text.includes('✘') || text.includes('☐')) {
    return 'No';
  }

  return null;
}

/** Checks cell for known labels like Sustained placeholders or links. */
function parseCellKnownLabel(cell: HTMLElement): string | null {
  const text = cell.textContent || '';
  if (
    text.includes('Sustained (Click to add)') ||
    text.includes('Set Apart (Click to add)') ||
    text.includes('Add A Date') ||
    text.includes('Add a date')
  ) {
    return '';
  }

  const memberAnchor = cell.querySelector('a[href*="member-profile"]');
  if (memberAnchor) return cleanCellContent(memberAnchor as HTMLElement);

  return null;
}

/** Checks for standard Church action labels to suppress. */
function isExcludedLabel(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    lower === 'actions' ||
    lower === 'action' ||
    lower === 'select' ||
    lower === 'select all' ||
    lower === 'options' ||
    lower === 'edit' ||
    lower === ''
  );
}

/** Categorizes table structure based on class names and contents. */
function detectTableType(
  table: HTMLTableElement
): 'data-table' | 'summary' | 'emphasize' | 'labeled-table' {
  if (table.classList.contains('summary')) return 'summary';
  const firstTh = table.querySelector('thead th:first-child, tr:first-child th:first-child');
  if (firstTh && firstTh.querySelector('h4')) return 'summary';
  if (table.classList.contains('emphasize')) return 'emphasize';
  if (
    table.classList.contains('two-column') ||
    (table.rows[0]?.cells.length === 2 && table.classList.contains('labeled'))
  ) {
    return 'labeled-table';
  }
  return 'data-table';
}
