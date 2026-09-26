import { isAttendanceCellAttended, parseDate, parseMonthDay } from './utils';
import { Constants, Regex, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Determines if a filter rule has an active selection or boundary constraint.
 *
 * @param rule - The filter rule to evaluate.
 * @returns True if rule specifies an active filter constraint.
 */
export function isRuleActive(rule: Types.FilterRule): boolean {
  if (rule.type === 'number') {
    return (
      (rule.minValue !== undefined && !isNaN(rule.minValue)) ||
      (rule.maxValue !== undefined && !isNaN(rule.maxValue))
    );
  }
  if (rule.type === 'date') {
    return Boolean(rule.fromDate || rule.toDate);
  }
  if (rule.type === 'month-day') {
    return (
      rule.selectedMonth !== undefined ||
      (rule.fromDay !== undefined && !isNaN(rule.fromDay)) ||
      (rule.toDay !== undefined && !isNaN(rule.toDay))
    );
  }
  return Boolean(rule.selectedValue);
}

/**
 * Checks whether a cell value satisfies an active filter rule.
 *
 * @param cellValue - String representation of the cell value.
 * @param rule - Active filter rule to evaluate against.
 * @param cell - Optional cell DOM element for custom DOM inspection.
 * @param row - Optional row DOM element for row-level inspections.
 * @returns True if cell satisfies the filter constraint.
 */
export function evaluateRuleMatch(
  cellValue: string,
  rule: Types.FilterRule,
  cell?: HTMLElement,
  row?: HTMLElement
): boolean {
  if (!isRuleActive(rule)) return true;

  if (rule.type === 'vacancy') {
    const isVacant = row
      ? Regex.VACANT_CALLING_TEXT.test(row.textContent || '')
      : Regex.VACANT_CALLING_TEXT.test(cellValue);
    if (rule.selectedValue === Constants.VACANCY_OPTION_EXCLUDE) {
      return !isVacant;
    }
    if (rule.selectedValue === Constants.VACANCY_OPTION_ONLY) {
      return isVacant;
    }
    return true;
  }

  if (rule.type === 'attendance') {
    if (!cell) return false;
    return isAttendanceCellAttended(cell, rule.selectedValue);
  }

  if (rule.type === 'number') {
    const cleanNumStr = cellValue.replace(Regex.NON_NUMERIC_CHARS, '');
    const numVal = parseFloat(cleanNumStr);
    if (isNaN(numVal)) return false;
    if (rule.minValue !== undefined && !isNaN(rule.minValue) && numVal < rule.minValue) {
      return false;
    }
    if (rule.maxValue !== undefined && !isNaN(rule.maxValue) && numVal > rule.maxValue) {
      return false;
    }
    return true;
  }

  if (rule.type === 'date') {
    const cellDate = parseDate(cellValue);
    if (!cellDate) return false;
    if (rule.fromDate) {
      const from = parseDate(rule.fromDate);
      if (from && cellDate < from) return false;
    }
    if (rule.toDate) {
      const to = parseDate(rule.toDate);
      if (to) {
        to.setHours(23, 59, 59, 999);
        if (cellDate > to) return false;
      }
    }
    return true;
  }

  if (rule.type === 'month-day') {
    const md = parseMonthDay(cellValue);
    if (!md) return false;
    if (rule.selectedMonth !== undefined && md.month !== rule.selectedMonth) {
      return false;
    }
    if (rule.fromDay !== undefined && !isNaN(rule.fromDay) && md.day < rule.fromDay) {
      return false;
    }
    if (rule.toDay !== undefined && !isNaN(rule.toDay) && md.day > rule.toDay) {
      return false;
    }
    return true;
  }

  if (rule.type === 'gender') {
    const cleanCell = cellValue.toUpperCase();
    const cleanFilter = rule.selectedValue.toUpperCase();
    if (cleanFilter === 'M' || cleanFilter === 'MALE') {
      return cleanCell === 'M' || cleanCell === 'MALE';
    }
    if (cleanFilter === 'F' || cleanFilter === 'FEMALE') {
      return cleanCell === 'F' || cleanCell === 'FEMALE';
    }
    return cleanCell === cleanFilter;
  }

  if (rule.type === 'boolean') {
    const isAffirmative =
      cellValue.toLowerCase() === 'yes' ||
      cellValue.toLowerCase() === 'true' ||
      cellValue.toLowerCase() === 'set apart';
    const filterLower = rule.selectedValue.toLowerCase();

    if (filterLower === 'yes' || filterLower === 'true') {
      return isAffirmative;
    }
    if (filterLower === 'no' || filterLower === 'false') {
      return !isAffirmative;
    }
    return true;
  }

  if (rule.type === 'presence') {
    let hasValue = hasPresenceValue(cellValue);
    if (cell && Regex.MINISTERING_COMPANIONSHIP_HEADER.test(rule.columnName)) {
      const links = cell.querySelectorAll('a');
      if (links.length > 0) {
        hasValue = links.length >= 2;
      }
    } else if (cell && Regex.PRESENCE_COLUMN_HEADER.test(rule.columnName)) {
      const links = cell.querySelectorAll('a');
      if (links.length > 0) {
        hasValue = true;
      } else if (
        !cellValue ||
        cellValue.toLowerCase().includes('assign') ||
        cellValue.toLowerCase() === 'none'
      ) {
        hasValue = false;
      }
    }
    const filterLower = rule.selectedValue.toLowerCase();
    if (filterLower === 'yes' || filterLower === 'true') return hasValue;
    if (filterLower === 'no' || filterLower === 'false') return !hasValue;
    return true;
  }

  return cellValue.toLowerCase() === rule.selectedValue.toLowerCase();
}

/**
 * Determines whether a cell contains a valid presence value for presence-based boolean filtering.
 *
 * @param val - Cell text value.
 * @returns True if value indicates a valid presence assignment.
 */
export function hasPresenceValue(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed || trimmed === '—' || trimmed === '–' || trimmed === '-') {
    return false;
  }
  const lower = trimmed.toLowerCase();
  return (
    lower !== 'none' &&
    lower !== 'n/a' &&
    lower !== 'none assigned' &&
    !lower.startsWith('assign') &&
    lower !== 'add'
  );
}
