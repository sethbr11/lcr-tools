/**
 * Action-specific utilities for processAttendance, re-exporting all base utilities.
 * Leaf module: does not import templates or phase helpers.
 */

export * from '@/utils';
import {
  hideLoadingIndicator,
  levenshteinDistance,
  parseFullName,
  setAborted,
  sleep,
} from '@/utils';
import { Constants, Regex, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Finds every candidate whose name is an exact match for the target after normalization.
 * Case, extra whitespace, punctuation (other than the "Last, First" comma), and middle names are
 * ignored, and "First Last" matches "Last, First" when the first given name and last name are equal.
 *
 * @param target - Attendee name to resolve.
 * @param candidates - List of ward member full names.
 * @returns All exactly matching candidates (empty when none match).
 */
export function findExactMemberMatches(target: string, candidates: string[]): string[] {
  if (!target) return [];

  const targetFull = normalizeNameText(target);
  const targetParts = normalizedNameParts(target);

  return candidates.filter((candidate) => {
    if (normalizeNameText(candidate) === targetFull) return true;
    const candParts = normalizedNameParts(candidate);
    return (
      !!targetParts.firstName &&
      !!targetParts.lastName &&
      candParts.firstName === targetParts.firstName &&
      candParts.lastName === targetParts.lastName
    );
  });
}

/**
 * Suggests a single near-miss candidate for manual confirmation; never an auto-match.
 * A candidate qualifies when last names are equal (or nearly equal for long surnames) and
 * first names are equal, prefix-related, or nearly equal. Ties and exact matches yield null.
 *
 * @param target - Attendee name with no exact roll match.
 * @param candidates - List of ward member full names.
 * @returns The unique best-scoring candidate, or null when ambiguous or nothing qualifies.
 */
export function suggestMemberMatch(target: string, candidates: string[]): string | null {
  const targetParts = normalizedNameParts(target);
  if (!targetParts.firstName || !targetParts.lastName) return null;

  const exact = new Set(findExactMemberMatches(target, candidates));
  let best: string | null = null;
  let bestScore = Infinity;
  let tied = false;

  for (const candidate of candidates) {
    if (exact.has(candidate)) continue;
    const candParts = normalizedNameParts(candidate);
    if (!candParts.firstName || !candParts.lastName) continue;

    const lastDist = lastNameDistance(targetParts.lastName, candParts.lastName);
    const firstDist = firstNameDistance(targetParts.firstName, candParts.firstName);
    if (lastDist === null || firstDist === null) continue;

    const score = lastDist + firstDist;
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
      tied = false;
    } else if (score === bestScore) {
      tied = true;
    }
  }

  return tied ? null : best;
}

/**
 * Resolves the ward roll indices of every member whose name exactly matches the attendee.
 * Indices (not names) are returned so members sharing a name stay distinguishable.
 *
 * @param target - Attendee name to resolve.
 * @param wardMembers - Discovered ward members from the active attendance roll.
 * @returns Indices into wardMembers of all exact matches (empty when none match).
 */
export function findExactMemberIndices(target: string, wardMembers: Types.WardMember[]): number[] {
  const indicesByName = new Map<string, number[]>();
  wardMembers.forEach((member, index) => {
    indicesByName.set(member.fullName, [...(indicesByName.get(member.fullName) ?? []), index]);
  });
  const names = findExactMemberMatches(
    target,
    wardMembers.map((m) => m.fullName)
  );
  return [...new Set(names)].flatMap((name) => indicesByName.get(name) ?? []);
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

/**
 * Records an attendee who was not auto-marked: queues them for review (with a close-match
 * suggestion when the name is not shared by several members) and logs why.
 *
 * @param attendee - Attendee from the pasted roster.
 * @param exactIndices - Indices of ward members whose names match exactly (0 or 2+).
 * @param wardMembers - Ward members on the loaded roll.
 * @param targetDate - ISO target Sunday date string (YYYY-MM-DD).
 * @param isSimulation - Whether the log should say this was a simulation.
 * @param unmatchedList - Review queue the record is appended to.
 * @param logs - Action log the UNMATCHED entry is appended to.
 */
export function recordUnmatchedAttendee(
  attendee: Types.AttendeeName,
  exactIndices: number[],
  wardMembers: Types.WardMember[],
  targetDate: string,
  isSimulation: boolean,
  unmatchedList: Types.UnmatchedRecord[],
  logs: Types.AttendanceLogEntry[]
): void {
  const fullName = `${attendee.firstName} ${attendee.lastName}`.trim();
  const sharedName = exactIndices.length > 1 ? wardMembers[exactIndices[0]].fullName : null;
  const suggestion = sharedName
    ? null
    : suggestMemberMatch(
        fullName,
        wardMembers.map((m) => m.fullName)
      );
  unmatchedList.push({
    firstName: attendee.firstName,
    lastName: attendee.lastName,
    fullName,
    date: targetDate,
    suggestedMemberName: suggestion ?? undefined,
  });

  const ambiguous = `Multiple ward members named ${sharedName} — choose manually`;
  // prettier-ignore
  const detail = isSimulation
    ? `Unmatched (Simulated)${sharedName ? ` - ${ambiguous}` : suggestion ? ` - possible match: ${suggestion}` : ''}`
    : sharedName ? ambiguous : `Attendee not found on roll: ${fullName}${suggestion ? ` (possible match: ${suggestion})` : ''}`;
  pushAttendanceLog(logs, {
    date: targetDate,
    action: 'UNMATCHED',
    target: fullName,
    firstName: attendee.firstName,
    lastName: attendee.lastName,
    lcrUpdateStatus: detail,
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

/** Lowercases, strips punctuation except the Last, First comma, and collapses whitespace. */
function normalizeNameText(name: string): string {
  return name
    .toLowerCase()
    .replace(Regex.NAME_PUNCTUATION, '')
    .split(',')
    .map((part) => part.split(Regex.WHITESPACE).filter(Boolean).join(' '))
    .join(', ');
}

/**
 * Parses a name into first and last components, each normalized for comparison.
 * Only the first given name is kept: LCR stores "Last, First Middle", but attendance rosters
 * rarely include middle names, so middle names and initials are ignored on both sides.
 */
function normalizedNameParts(name: string): ReturnType<typeof parseFullName> {
  const parts = parseFullName(name ?? '');
  const givenNames = normalizeNameText(parts.firstName).replace(Regex.COMMA_GLOBAL, '');
  return {
    firstName: givenNames.split(' ')[0] ?? '',
    lastName: normalizeNameText(parts.lastName).replace(Regex.COMMA_GLOBAL, ''),
  };
}

/** Last-name distance: 0 when equal, 1 for long surnames one edit apart, else null. */
function lastNameDistance(a: string, b: string): number | null {
  if (a === b) return 0;
  const bothLong =
    a.length >= Constants.FUZZY_LAST_NAME_MIN_LENGTH &&
    b.length >= Constants.FUZZY_LAST_NAME_MIN_LENGTH;
  return bothLong && levenshteinDistance(a, b) <= 1 ? 1 : null;
}

/** First-name distance: 0 when equal, 0.5 for a prefix of 3+ chars, edit distance 1 for 4+ chars, else null. */
function firstNameDistance(a: string, b: string): number | null {
  if (a === b) return 0;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (shorter.length >= Constants.FUZZY_PREFIX_MIN_LENGTH && longer.startsWith(shorter)) return 0.5;
  const bothLong =
    a.length >= Constants.FUZZY_FIRST_NAME_MIN_LENGTH &&
    b.length >= Constants.FUZZY_FIRST_NAME_MIN_LENGTH;
  return bothLong && levenshteinDistance(a, b) <= 1 ? 1 : null;
}
