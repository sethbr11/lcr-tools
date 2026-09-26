import { Dom } from '@/types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Detects whether a table column index contains interactive attendance toggle buttons.
 *
 * @param table - Target HTML table.
 * @param columnIndex - Zero-based column index.
 * @returns True if column contains attendance toggle buttons.
 */
export function isAttendanceColumn(table: HTMLTableElement, columnIndex: number): boolean {
  const sampleRows = Array.from(table.querySelectorAll('tbody tr')).slice(0, 10);
  for (const row of sampleRows) {
    const cells = Array.from(row.querySelectorAll('td'));
    const cell = cells[columnIndex];
    if (cell?.querySelector(Dom.ATTENDANCE_BUTTON_SELECTOR)) {
      return true;
    }
  }
  return false;
}

/**
 * Discovers clean attendance filtering options for an attendance column.
 * Options always include 'Yes' and 'No', and include specific meeting names if multiple exist.
 *
 * @param table - Target HTML table.
 * @param columnIndex - Zero-based column index.
 * @returns Array of valid attendance filter values.
 */
export function getAttendanceColumnOptions(table: HTMLTableElement, columnIndex: number): string[] {
  const options = new Set<string>(['Yes', 'No']);
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  const meetingNames = new Set<string>();

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('td'));
    const cell = cells[columnIndex];
    if (!cell) continue;

    const btns = Array.from(
      cell.querySelectorAll<HTMLButtonElement>(Dom.ATTENDANCE_BUTTON_SELECTOR)
    );
    for (const btn of btns) {
      const siblingSpan =
        (btn.nextElementSibling?.matches(Dom.ATTENDANCE_ORG_NAME_SELECTOR)
          ? btn.nextElementSibling
          : null) || btn.parentElement?.querySelector(Dom.ATTENDANCE_ORG_NAME_SELECTOR);
      const spanText = siblingSpan?.textContent?.trim();

      let meetingName = spanText || '';
      if (!meetingName) {
        const label = btn.getAttribute('aria-label') || '';
        if (label.includes(',')) {
          const parts = label.split(',').map((s) => s.trim());
          meetingName = parts[parts.length - 1];
        }
      }
      if (meetingName) {
        meetingNames.add(meetingName);
      }
    }
  }

  if (meetingNames.size > 1) {
    Array.from(meetingNames)
      .sort()
      .forEach((m) => options.add(m));
  }

  return Array.from(options);
}

/**
 * Evaluates whether an attendance cell matches the specified attendance filter value.
 *
 * @param cell - Target table cell element.
 * @param filterValue - Selected filter string ('Yes', 'No', or specific meeting name).
 * @returns True if cell satisfies the attendance filter requirement.
 */
export function isAttendanceCellAttended(cell: HTMLElement, filterValue: string): boolean {
  if (!cell || !filterValue) return true;

  const pressedBtns = Array.from(
    cell.querySelectorAll<HTMLButtonElement>(Dom.ATTENDANCE_PRESSED_SELECTOR)
  );
  const unpressedBtns = Array.from(
    cell.querySelectorAll<HTMLButtonElement>(Dom.ATTENDANCE_UNPRESSED_SELECTOR)
  );

  if (filterValue === 'Yes') {
    return pressedBtns.length > 0;
  }

  if (filterValue === 'No') {
    return pressedBtns.length === 0 && unpressedBtns.length > 0;
  }

  const lowerFilter = filterValue.toLowerCase();
  for (const btn of pressedBtns) {
    const label = (btn.getAttribute('aria-label') || '').toLowerCase();
    if (label.includes(lowerFilter)) return true;

    if (
      btn.nextElementSibling?.matches(Dom.ATTENDANCE_ORG_NAME_SELECTOR) &&
      btn.nextElementSibling.textContent?.trim().toLowerCase() === lowerFilter
    ) {
      return true;
    }

    const siblingSpan = btn.parentElement?.querySelector(Dom.ATTENDANCE_ORG_NAME_SELECTOR);
    const spanText = siblingSpan?.textContent?.trim()?.toLowerCase();
    if (spanText && spanText === lowerFilter) return true;
  }

  return false;
}
