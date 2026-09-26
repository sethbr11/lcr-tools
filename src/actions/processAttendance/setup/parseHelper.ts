import * as Utils from '../utils';
import { Constants, Regex, Types } from '../types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Parses pasted spreadsheet clipboard text or CSV lines into structured attendance rows.
 * Extracts timestamps, normalizes dates, deduplicates attendees, and requires a single shared date.
 *
 * @param text - Raw pasted spreadsheet or CSV text.
 * @param fallbackDate - Optional fallback date if rows omit dates.
 * @returns ParsedAttendanceResult containing names, shared date, raw rows, and errors.
 */
export function parsePastedAttendance(
  text: string,
  fallbackDate?: string
): Types.ParsedAttendanceResult {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return {
      names: [],
      targetDate: null,
      namesByDate: {},
      rawRows: [],
      errors: [],
      duplicateCount: 0,
      hasMixedDates: false,
    };
  }

  const lines = trimmed.split(Regex.NEWLINE);
  const rawRows: Types.ParsedAttendanceRow[] = [];
  const errors: string[] = [];
  const datesFound = new Set<string>();

  let headerOrder: 'firstFirst' | 'lastFirst' | 'auto' = 'auto';
  let rowNum = 0;

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    rowNum++;

    const cols = line.includes('\t')
      ? line.split(Regex.TAB_DELIMITER).map((c) => c.trim())
      : line.split(Regex.COMMA_DELIMITER).map((c) => c.trim());

    // Skip header rows and detect column order
    if (isHeaderRow(cols)) {
      const col0 = (cols[0] || '').toLowerCase();
      if (col0.includes('first')) headerOrder = 'firstFirst';
      else if (col0.includes('last')) headerOrder = 'lastFirst';
      continue;
    }

    const parsed = parseLineColumns(cols, cleanLine, rowNum, headerOrder);
    if (parsed) {
      rawRows.push(parsed);
      if (parsed.normalizedDateStr) datesFound.add(parsed.normalizedDateStr);
    } else {
      errors.push(`Row ${rowNum}: Unable to parse name from "${cleanLine.slice(0, 30)}"`);
    }
  }

  const uniqueDates = Array.from(datesFound).sort();
  const hasMixedDates = uniqueDates.length > 1;
  if (hasMixedDates) {
    errors.push(`${Constants.MIXED_DATES_ERROR} Found: ${uniqueDates.join(', ')}.`);
  }

  const sharedDate = hasMixedDates ? null : uniqueDates[0] || fallbackDate || null;
  if (sharedDate) {
    for (const row of rawRows) {
      if (row.normalizedDateStr) continue;
      row.normalizedDateStr = sharedDate;
      row.datePortion = sharedDate;
      row.dateObj = new Date(`${sharedDate}T12:00:00`);
    }
  }

  // Deduplicate and group by date
  const seenKeys = new Set<string>();
  const deduplicatedNames: Types.AttendeeName[] = [];
  const namesByDate: Record<string, Types.AttendeeName[]> = {};
  let duplicateCount = 0;

  for (const row of rawRows) {
    const rowDate = row.normalizedDateStr || sharedDate || '';
    const key = `${rowDate}|${row.firstName.toLowerCase()}|${row.lastName.toLowerCase()}`;

    if (seenKeys.has(key)) {
      duplicateCount++;
      continue;
    }
    seenKeys.add(key);

    const attendee = { firstName: row.firstName, lastName: row.lastName };
    deduplicatedNames.push(attendee);

    if (rowDate) {
      if (!namesByDate[rowDate]) {
        namesByDate[rowDate] = [];
      }
      namesByDate[rowDate].push(attendee);
    }
  }

  return {
    names: deduplicatedNames,
    targetDate: sharedDate,
    namesByDate,
    rawRows,
    errors,
    duplicateCount,
    hasMixedDates,
  };
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Normalizes an arbitrary date or timestamp string into YYYY-MM-DD. @internal */
export function normalizeDateString(raw: string): string | null {
  if (!raw) return null;
  const stripped = raw.replace(Regex.TIMESTAMP_TIME_STRIP, '').trim();
  if (!stripped) return null;

  // Already YYYY-MM-DD
  if (Regex.ISO_DATE_FORMAT.test(stripped)) return stripped;

  const parsed = new Date(stripped);
  if (isNaN(parsed.getTime())) {
    // Try MM/DD/YYYY or DD/MM/YYYY
    const parts = stripped.split(Regex.DATE_PARTS_SPLIT);
    if (parts.length === 3) {
      const [p1, p2, p3] = parts;
      if (p3.length === 4) {
        const d = new Date(Number(p3), Number(p1) - 1, Number(p2));
        if (!isNaN(d.getTime())) return Utils.formatDate(d, 'YYYY-MM-DD');
      }
    }
    return null;
  }

  return Utils.formatDate(parsed, 'YYYY-MM-DD');
}

/** Parses individual columns into a structured row. */
function parseLineColumns(
  cols: string[],
  rawLine: string,
  rowNum: number,
  headerOrder: 'firstFirst' | 'lastFirst' | 'auto'
): Types.ParsedAttendanceRow | null {
  let rawTimestamp = '';
  let datePortion = '';
  let firstName = '';
  let lastName = '';

  if (cols.length >= 3) {
    // [ 1. Timestamp / Date ] [ 2. First Name ] [ 3. Last Name ]
    rawTimestamp = cols[0];
    firstName = cols[1];
    lastName = cols[2];
  } else if (cols.length === 2) {
    const dateCandidate = normalizeDateString(cols[0]);
    if (dateCandidate) {
      rawTimestamp = cols[0];
      const nameParts = Utils.parseFullName(cols[1]);
      firstName = nameParts.firstName;
      lastName = nameParts.lastName;
    } else if (headerOrder === 'firstFirst') {
      firstName = cols[0];
      lastName = cols[1];
    } else if (headerOrder === 'lastFirst') {
      firstName = cols[1];
      lastName = cols[0];
    } else if (rawLine.includes(',') && Regex.LAST_FIRST_NAME.test(rawLine)) {
      const parts = Utils.parseFullName(rawLine);
      firstName = parts.firstName;
      lastName = parts.lastName;
    } else {
      firstName = cols[0];
      lastName = cols[1];
    }
  } else if (cols.length === 1 && cols[0]) {
    const nameParts = Utils.parseFullName(cols[0]);
    firstName = nameParts.firstName;
    lastName = nameParts.lastName;
  }

  if (!firstName && !lastName) return null;

  const normalizedDateStr = normalizeDateString(rawTimestamp);
  const dateObj = normalizedDateStr ? new Date(`${normalizedDateStr}T12:00:00`) : null;
  datePortion = normalizedDateStr || '';

  return { rowNum, rawTimestamp, datePortion, firstName, lastName, dateObj, normalizedDateStr };
}

/** Determines if columns represent a table header. */
function isHeaderRow(cols: string[]): boolean {
  if (cols.length === 0) return false;
  const combined = cols.join(' ').toLowerCase();
  return (
    combined.includes('timestamp') ||
    combined.includes('first name') ||
    combined.includes('last name') ||
    combined.includes('member name') ||
    (combined.includes('date') && !Regex.ISO_DATE_FORMAT.test(cols[0]))
  );
}

/* ==========================================================================
   TEST-ONLY FUNCTIONS
   ========================================================================== */

/** Convenience parser returning simple AttendeeRecord objects for tests and backward compatibility. @internal */
export function parseAttendanceText(rawText: string): Types.AttendeeRecord[] {
  const result = parsePastedAttendance(rawText);
  return result.names.map((n) => ({
    firstName: n.firstName,
    lastName: n.lastName,
    fullName: `${n.firstName} ${n.lastName}`.trim(),
  }));
}

/** Checks if a given date string represents a Sunday. @internal */
export function isSundayDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return false;
  const d = new Date(year, month - 1, day);
  return d.getDay() === 0;
}
