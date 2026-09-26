/**
 * Action-specific utilities for processAttendance, re-exporting all base utilities.
 * Leaf module: does not import templates or phase helpers.
 */

export * from '@/utils';
import { fuzzyNameMatch, hideLoadingIndicator, parseFullName, setAborted, sleep } from '@/utils';
import { Constants, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Finds the closest matching member name among a candidate list of ward member names.
 * Accurately matches both "First Last" and "Last, First" permutations.
 *
 * @param targetName - Attendee name to resolve.
 * @param candidateNames - List of ward member full names.
 * @returns Best matching candidate name or null if no confident match.
 */
export function matchMemberName(targetName: string, candidateNames: string[]): string | null {
  if (!targetName) return null;

  const targetClean = targetName.trim().toLowerCase();

  // Step 1: Exact string match
  const exact = candidateNames.find((c) => c.trim().toLowerCase() === targetClean);
  if (exact) return exact;

  // Step 2: Component-level comparison (First Name + Last Name)
  const targetParts = parseFullName(targetName);
  const targetFirst = targetParts.firstName.toLowerCase();
  const targetLast = targetParts.lastName.toLowerCase();

  if (targetFirst && targetLast) {
    for (const candidate of candidateNames) {
      const candParts = parseFullName(candidate);
      if (
        candParts.firstName.toLowerCase() === targetFirst &&
        candParts.lastName.toLowerCase() === targetLast
      ) {
        return candidate;
      }
    }
  }

  // Step 3: Fuzzy matching with reversed formats
  const targetReversed =
    targetFirst && targetLast ? `${targetParts.lastName}, ${targetParts.firstName}` : '';
  const targetDirect =
    targetFirst && targetLast ? `${targetParts.firstName} ${targetParts.lastName}` : '';

  for (const candidate of candidateNames) {
    if (fuzzyNameMatch(targetName, candidate)) return candidate;
    if (targetReversed && fuzzyNameMatch(targetReversed, candidate)) return candidate;
    if (targetDirect && fuzzyNameMatch(targetDirect, candidate)) return candidate;
  }

  return null;
}

/**
 * Positions a floating dropdown list adjacent to an input element, accounting for screen boundaries.
 *
 * @param dropdown - Dropdown container element to position.
 * @param input - Reference HTMLInputElement target.
 * @param itemCount - Number of items currently shown in the dropdown.
 */
export function positionDropdown(
  dropdown: HTMLElement,
  input: HTMLInputElement,
  itemCount: number
): void {
  const rect = input.getBoundingClientRect();
  const dropdownHeight = Math.min(160, itemCount * 32 + 8);
  const spaceBelow = window.innerHeight - rect.bottom;
  if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
    dropdown.style.top = `${rect.top - dropdownHeight - 2}px`;
  } else {
    dropdown.style.top = `${rect.bottom + 2}px`;
  }
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.width = `${Math.max(rect.width, 220)}px`;
  dropdown.style.display = 'block';
}

/**
 * Repeatedly polls a predicate function until it returns true or until the timeout is reached.
 *
 * @param predicate - Synchronous or asynchronous condition returning a boolean or truthy value.
 * @param timeoutMs - Maximum duration in milliseconds to poll.
 * @param intervalMs - Interval duration in milliseconds between polling checks.
 * @returns Resolves to true if the condition was met within timeout, or false otherwise.
 */
export async function waitForCondition(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs: number = Constants.WAIT_CONDITION_DEFAULT_TIMEOUT_MS,
  intervalMs: number = Constants.WAIT_CONDITION_DEFAULT_POLL_MS
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime <= timeoutMs) {
    try {
      const result = await predicate();
      if (result) return true;
    } catch {
      // Continue polling if predicate throws during rapid DOM transitions
    }
    await sleep(intervalMs);
  }
  return false;
}

/**
 * Appends a structured attendance audit log entry with auto-assigned index and timestamp.
 *
 * @param logs - Running attendance log array to mutate.
 * @param fields - Log fields excluding originalIndex; timestamp is optional and auto-filled.
 */
export function pushAttendanceLog(
  logs: Types.AttendanceLogEntry[],
  fields: Types.AttendanceLogFields
): void {
  logs.push({
    ...fields,
    originalIndex: logs.length,
    timestamp: fields.timestamp ?? formatLogTimestamp(),
  });
}

/**
 * Runs an async routine while Escape sets the global abort flag and dismisses loaders.
 *
 * @param fn - Async work to execute under the Escape abort listener.
 * @returns The resolved value of the provided async routine.
 */
export async function withEscapeAbort<T>(fn: () => Promise<T>): Promise<T> {
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setAborted(true);
      hideLoadingIndicator();
    }
  };
  window.addEventListener('keydown', escHandler, { capture: true });
  try {
    return await fn();
  } finally {
    window.removeEventListener('keydown', escHandler, { capture: true });
  }
}

/**
 * Sorts attendee records alphabetically by surname / last name, then by first name.
 *
 * @param attendees - Array of records containing firstName and lastName.
 * @returns Sorted copy of attendee records.
 */
export function sortAttendeesAlphabetically<T extends Types.AttendeeName>(attendees: T[]): T[] {
  return [...attendees].sort((a, b) => {
    const lastNameCmp = (a.lastName || '')
      .trim()
      .localeCompare((b.lastName || '').trim(), undefined, {
        sensitivity: 'base',
      });
    if (lastNameCmp !== 0) return lastNameCmp;
    return (a.firstName || '').trim().localeCompare((b.firstName || '').trim(), undefined, {
      sensitivity: 'base',
    });
  });
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Formats current local time as HH:MM:SS for action audit logs. @internal */
export function formatLogTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = pad(date.getHours());
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${h}:${m}:${s}`;
}
