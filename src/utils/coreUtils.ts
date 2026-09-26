import { Constants, Regex, Types } from '@/types';

let isProcessingAborted = false;

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Pauses execution for a specified duration in milliseconds.
 *
 * @param ms - Duration to wait in milliseconds. Defaults to 1000ms.
 * @returns Promise that resolves once the timeout completes.
 */
export function sleep(ms: number = Constants.DEFAULT_SLEEP_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Replaces double curly-brace placeholder tags (e.g. {{name}}) within a template string.
 *
 * @param template - Raw template string containing placeholders.
 * @param replacements - Key-value dictionary where keys match placeholder tags.
 * @returns String with all matching tags substituted with replacement values.
 */
export function replaceTemplate(
  template: string,
  replacements: Record<string, string | number>
): string {
  let result = template;
  for (const key of Object.keys(replacements)) {
    result = result.replaceAll(`{{${key}}}`, String(replacements[key]));
  }
  return result;
}

/**
 * Formats a Date object into either MM/DD/YYYY or YYYY-MM-DD standard notation.
 *
 * @param date - Date object to format.
 * @param format - Output format string: 'MM/DD/YYYY' (default) or 'YYYY-MM-DD'.
 * @returns Formatted date string, or null if the input date is invalid.
 */
export function formatDate(
  date: Date | null | undefined,
  format: 'MM/DD/YYYY' | 'YYYY-MM-DD' = 'MM/DD/YYYY'
): string | null {
  if (!(date instanceof Date) || isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  return `${month}/${day}/${year}`;
}

/**
 * Parses diverse date string formats commonly produced by LCR reports and tables.
 *
 * @param dateStr - Raw date string from table or report.
 * @returns Parsed JavaScript Date object, or null if the string cannot be parsed.
 */
export function parseLCRDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // First attempt native date parsing (supports ISO formats)
  const nativeParsed = new Date(trimmed);
  if (!isNaN(nativeParsed.getTime())) return nativeParsed;

  return parseDateRegexPatterns(trimmed);
}

/**
 * Parses date strings with fallback handling for standard date formats.
 *
 * @param dateStr - Date string to parse.
 * @returns Parsed Date instance or null.
 */
export function parseDate(dateStr: string | null | undefined): Date | null {
  return parseLCRDate(dateStr);
}

/**
 * Parses calendar month and day from date strings without year context (e.g. '1 Sep' or 'September 6').
 *
 * @param dateStr - Raw date string without year.
 * @returns Parsed MonthDay object with 1-based month and day, or null if unparseable.
 */
export function parseMonthDay(dateStr: string | null | undefined): Types.MonthDay | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  let dayStr = '';
  let monthStr = '';

  const dayMonthMatch = trimmed.match(Regex.DAY_MONTH_PARTS);
  if (dayMonthMatch) {
    dayStr = dayMonthMatch[1];
    monthStr = dayMonthMatch[2].toLowerCase();
  } else {
    const monthDayMatch = trimmed.match(Regex.MONTH_DAY_PARTS);
    if (monthDayMatch) {
      monthStr = monthDayMatch[1].toLowerCase();
      dayStr = monthDayMatch[2];
    }
  }

  if (!dayStr || !monthStr) return null;

  const day = parseInt(dayStr, 10);
  if (isNaN(day) || day < 1 || day > 31) return null;

  let monthIndex = (Constants.SHORT_MONTH_NAMES as readonly string[]).indexOf(monthStr);
  if (monthIndex === -1) {
    monthIndex = (Constants.FULL_MONTH_NAMES as readonly string[]).indexOf(monthStr);
  }

  if (monthIndex === -1) return null;
  return { month: monthIndex + 1, day };
}

/**
 * Splits a full name string into structured first and last name components.
 *
 * @param name - Name string formatted as 'Last, First' or 'First Last'.
 * @returns Object with parsed firstName and lastName strings.
 */
export function parseFullName(name: string): Types.MemberNameParts {
  if (!name || typeof name !== 'string') return { firstName: '', lastName: '' };

  const trimmed = name.trim();
  const commaMatch = trimmed.match(Regex.LAST_FIRST_NAME);

  if (commaMatch) {
    return {
      lastName: commaMatch[1].trim(),
      firstName: commaMatch[2].trim(),
    };
  }

  const parts = trimmed.split(Regex.WHITESPACE);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

/**
 * Compares two names using normalized substring and edit distance matching.
 *
 * @param name1 - First name to evaluate.
 * @param name2 - Second name to evaluate.
 * @returns True if names are deemed equivalent or high probability matches.
 */
export function fuzzyNameMatch(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;
  const clean1 = normalizeName(name1);
  const clean2 = normalizeName(name2);

  if (clean1 === clean2) return true;
  if (clean1.includes(clean2) || clean2.includes(clean1)) return true;

  const dist = levenshteinDistance(clean1, clean2);
  const maxLen = Math.max(clean1.length, clean2.length);
  return maxLen > 0 && dist / maxLen <= 0.2;
}

/**
 * Calculates Levenshtein edit distance between two character sequences.
 *
 * @param a - First string sequence.
 * @param b - Second string sequence.
 * @returns Minimal edit operations needed to transform a into b.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Escapes unsafe HTML characters in a string to prevent XSS vulnerabilities.
 *
 * @param str - Value to sanitize for HTML context.
 * @returns HTML entity encoded string safe for DOM interpolation.
 */
export function escapeHtml(str: string | number | boolean | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Escapes values for safe inclusion in a standard comma-separated CSV cell.
 * Prevents formula injection (DDE attacks) in spreadsheet processors.
 *
 * @param value - Arbitrary cell value.
 * @returns Escaped CSV cell string.
 */
export function formatCSVCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let stringVal = String(value);

  if (Regex.FORMULA_PREFIX.test(stringVal)) stringVal = `'${stringVal}`;

  if (
    stringVal.includes(',') ||
    stringVal.includes('"') ||
    stringVal.includes('\n') ||
    stringVal.includes('\r') ||
    stringVal.startsWith("'")
  ) {
    return `"${stringVal.replace(Regex.CSV_DOUBLE_QUOTE, '""')}"`;
  }
  return stringVal;
}

/**
 * Formats table headers and data rows into a single valid CSV document string.
 *
 * @param headers - Array of column header strings.
 * @param rows - 2D matrix of row values.
 * @returns Formatted CSV document string.
 */
export function toCSV(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  const headerLine = headers.map(formatCSVCell).join(',');
  const rowLines = rows.map((row) => row.map(formatCSVCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Retrieves property value from nested object hierarchy using dot notation path.
 *
 * @param obj - Root object to traverse.
 * @param path - Dot-separated path string (e.g. 'member.contact.email').
 * @returns Resolved value at property path or undefined.
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc: unknown, part: string) => {
    if (acc && typeof acc === 'object' && Object.prototype.hasOwnProperty.call(acc, part)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

/**
 * Checks whether user has triggered an abort signal via ESC or cancellation button.
 *
 * @returns True if current processing pipeline has been cancelled.
 */
export function isAborted(): boolean {
  return isProcessingAborted;
}

/**
 * Sets the processing pipeline abort flag.
 *
 * @param value - New boolean state for the abort flag.
 */
export function setAborted(value: boolean): void {
  isProcessingAborted = value;
}

/**
 * Resets the abort flag back to false for starting fresh operations.
 */
export function resetAborted(): void {
  isProcessingAborted = false;
}

/**
 * Compatibility checker verifying presence of global window objects.
 *
 * @param windowVar - Property name on global window object.
 * @returns True if property is defined and truthy.
 */
export function returnIfLoaded(windowVar: string): boolean {
  return (
    typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>)[windowVar]
  );
}

/**
 * Verifies that specified global variables exist, throwing if any are missing.
 *
 * @param windowVars - List of required global variable names.
 */
export function ensureLoaded(...windowVars: string[]): void {
  for (const v of windowVars) {
    if (!returnIfLoaded(v)) {
      const msg = `${v}.js must be loaded before this file.`;
      console.error(msg);
      throw new Error(msg);
    }
  }
}

/**
 * Inspects whether a global variable is loaded with optional diagnostic logging.
 *
 * @param windowVar - Property name on global window object.
 * @param log - Whether to log the result to console.
 * @returns True if property exists.
 */
export function checkIfLoaded(windowVar: string, log: boolean = false): boolean {
  const loaded = returnIfLoaded(windowVar);
  if (log) console.log(`LCR Tools: ${windowVar} is ${loaded ? '' : 'not '}loaded.`);
  return loaded;
}

/**
 * Calls a utility method if loaded, falling back to a default value if unavailable.
 *
 * @param utilName - Window utility property name.
 * @param func - Function to execute when utility is present.
 * @param fallback - Default value returned when utility is absent.
 * @returns Execution result or fallback value.
 */
export function safeCall<T, R>(utilName: string, func: (util: T) => R, fallback: R): R {
  if (returnIfLoaded(utilName)) {
    try {
      return func((window as unknown as Record<string, unknown>)[utilName] as T);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Lowercases and strips punctuation from name string for comparison. */
function normalizeName(name: string): string {
  return name.toLowerCase().replace(Regex.NON_ALPHANUMERIC, '');
}

/** Parses date strings using common Church report regular expression patterns. */
function parseDateRegexPatterns(trimmed: string): Date | null {
  const usMatch = trimmed.match(Regex.SLASH_DATE_PARTS);
  if (usMatch) {
    return new Date(Number(usMatch[3]), Number(usMatch[1]) - 1, Number(usMatch[2]));
  }

  const dashMatch = trimmed.match(Regex.DASH_DATE_PARTS);
  if (dashMatch) {
    return new Date(Number(dashMatch[3]), Number(dashMatch[1]) - 1, Number(dashMatch[2]));
  }

  return null;
}
