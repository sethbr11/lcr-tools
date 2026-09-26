/**
 * Action-specific utilities for tableFilters, re-exporting all base utilities.
 */

export * from '@/utils';
import { parseDate, parseMonthDay } from '@/utils/coreUtils';
// prettier-ignore
import { getAttendanceColumnOptions, getCellValue, getRelevantHeaderCells,
  isAttendanceColumn } from '@/utils/table/tableUtils';
import { Constants, Regex, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Checks whether a column header represents personal identifiable information (name, phone, email, address).
 *
 * @param columnName - Column title string.
 * @returns True if column is considered personal info and should be excluded from filters.
 */
export function isPersonalColumn(columnName: string): boolean {
  if (Regex.PRESENCE_COLUMN_HEADER.test(columnName)) return false;
  return Regex.PERSONAL_INFO_COLUMN_HEADER.test(columnName);
}

/**
 * Checks if a column represents a categorical Church calling or organization.
 *
 * @param columnName - Column title string.
 * @returns True if column is categorical (calling, organization, quorum, class).
 */
export function isCategoricalColumn(columnName: string): boolean {
  return (
    Regex.CALLING_COLUMN_HEADER.test(columnName) ||
    Regex.ORGANIZATION_COLUMN_HEADER.test(columnName)
  );
}

/**
 * Discovers distinct selectable values for a specific table column to populate dropdown filters.
 *
 * @param table - Target HTML table.
 * @param columnIndex - Zero-based column index.
 * @returns Sorted array of distinct value strings.
 */
export function getColumnFilterOptions(table: HTMLTableElement, columnIndex: number): string[] {
  if (isAttendanceColumn(table, columnIndex)) {
    return getAttendanceColumnOptions(table, columnIndex);
  }

  const { headers, indices } = getRelevantHeaderCells(table);
  const hIdx = indices.indexOf(columnIndex);
  const colName = hIdx !== -1 ? headers[hIdx] : '';
  if (Regex.PRESENCE_COLUMN_HEADER.test(colName) || Regex.MONTH_CONTACT_HEADER.test(colName)) {
    return ['Yes', 'No'];
  }

  const values = new Set<string>();
  let hasEmptyCell = false;
  const rows = Array.from(table.querySelectorAll('tbody tr'));

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells[columnIndex]) {
      const val = getCellValue(cells[columnIndex] as HTMLElement).trim();
      if (val && val !== '—' && val !== '-') {
        values.add(val);
      } else {
        hasEmptyCell = true;
      }
    }
  }

  // If column values are only 'Yes' (e.g. checkmarks) and there are empty cells (no checkmark),
  // this is a boolean flag column where empty represents 'No'.
  if (values.size === 1 && values.has('Yes') && hasEmptyCell) {
    values.add('No');
  }

  return Array.from(values).sort((a, b) => {
    if (a === 'Yes' && b === 'No') return -1;
    if (a === 'No' && b === 'Yes') return 1;
    return a.localeCompare(b);
  });
}

/**
 * Evaluates a column name and sample cell values to infer its semantic filter category.
 *
 * @param columnName - Column title string.
 * @param sampleValues - Array of extracted distinct sample cell strings.
 * @param table - Optional table element reference for cell structure inspection.
 * @param columnIndex - Optional zero-based column index for cell structure inspection.
 * @returns Inferred category type (attendance, gender, date, month-day, number, status, boolean, or select).
 */
export function inferColumnFilterType(
  columnName: string,
  sampleValues: string[] = [],
  table?: HTMLTableElement,
  columnIndex?: number
): Types.FilterType {
  if (table && columnIndex !== undefined && isAttendanceColumn(table, columnIndex)) {
    return 'attendance';
  }
  if (Regex.PRESENCE_COLUMN_HEADER.test(columnName)) return 'presence';
  if (Regex.MONTH_CONTACT_HEADER.test(columnName)) return 'boolean';
  if (Regex.BIRTHDAY_COLUMN_HEADER.test(columnName)) return 'month-day';
  if (Regex.GENDER_COLUMN_HEADER.test(columnName)) return 'gender';
  if (Regex.DATE_COLUMN_HEADER.test(columnName)) return 'date';
  if (Regex.NUMBER_COLUMN_HEADER.test(columnName)) return 'number';
  if (Regex.BOOLEAN_COLUMN_HEADER.test(columnName)) return 'boolean';
  if (Regex.STATUS_COLUMN_HEADER.test(columnName)) return 'status';

  if (sampleValues.length > 0) {
    const nonEmpties = sampleValues.filter((v) => v && v !== '—' && v !== '-');
    if (nonEmpties.length > 0) {
      const allBooleans = nonEmpties.every((v) => v === 'Yes' || v === 'No');
      if (allBooleans) return 'boolean';

      const allMonthDays = nonEmpties.every((v) => parseMonthDay(v) !== null);
      if (allMonthDays) return 'month-day';

      const allNumbers = nonEmpties.every((v) => !isNaN(Number(v.replace(Regex.COMMA_GLOBAL, ''))));
      if (allNumbers) return 'number';

      const allDates = nonEmpties.every((v) => parseDate(v) !== null);
      if (allDates) return 'date';
    }
  }

  return 'select';
}

/**
 * Detects the default calendar month (1-12) for a month-day column when scoped to a single month.
 *
 * @param table - Target HTML table.
 * @param columnIndex - Zero-based column index.
 * @returns 1-based month number (1-12) or undefined if multiple or undetermined.
 */
export function detectDefaultMonth(
  table: HTMLTableElement,
  columnIndex: number
): number | undefined {
  // 1. Check if all rows in the table belong to a single calendar month
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  const months = new Set<number>();

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('td'));
    const cell = cells[columnIndex];
    if (!cell) continue;
    const val = getCellValue(cell as HTMLElement).trim();
    const md = parseMonthDay(val);
    if (md) {
      months.add(md.month);
    }
  }

  if (months.size === 1) {
    return Array.from(months)[0];
  }

  // 2. Check for active LCR month filter dropdown on page (12 month options)
  const pageSelects = Array.from(document.querySelectorAll<HTMLSelectElement>('select'));
  for (const select of pageSelects) {
    if (select.options.length === 12) {
      const firstText = select.options[0]?.text?.toLowerCase() || '';
      const lastText = select.options[11]?.text?.toLowerCase() || '';
      if (firstText.includes('jan') && lastText.includes('dec')) {
        const val = parseInt(select.value, 10);
        if (!isNaN(val) && val >= 1 && val <= 12) {
          return val;
        }
      }
    }
  }

  return undefined;
}

/**
 * Evaluates whether a table contains at least one filterable column or vacancy rule.
 *
 * @param table - HTML table element to inspect.
 * @returns True if the table has filterable columns or vacant calling rows.
 */
export function isTableFilterable(table: HTMLTableElement): boolean {
  const hasVacancies = Array.from(table.querySelectorAll('tbody tr')).some((r) =>
    Regex.VACANT_CALLING_TEXT.test(r.textContent || '')
  );
  if (hasVacancies) return true;

  const { headers, indices } = getRelevantHeaderCells(table);
  for (let i = 0; i < headers.length; i++) {
    const colName = headers[i];
    if (isPersonalColumn(colName)) continue;

    const options = getColumnFilterOptions(table, indices[i]);
    const filterType = inferColumnFilterType(colName, options, table, indices[i]);
    const isRangeBased =
      filterType === 'number' || filterType === 'date' || filterType === 'month-day';
    const maxAllowedValues = isCategoricalColumn(colName)
      ? Constants.MAX_CATEGORY_DROPDOWN_VALUES
      : Constants.MAX_DROPDOWN_UNIQUE_VALUES;

    if (!isRangeBased && options.length > maxAllowedValues) continue;
    if (options.length === 0 && !isRangeBased) continue;

    return true;
  }

  return false;
}
