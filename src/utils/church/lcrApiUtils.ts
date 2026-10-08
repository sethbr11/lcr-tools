import { isAborted, sleep } from '../coreUtils';
import { Constants, Dom, Regex, Types } from '@/types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Executes an async task across an array of items in staggered, parallel batches.
 *
 * @param items - Collection of items to process.
 * @param batchSize - Maximum number of concurrent tasks per batch.
 * @param taskFn - Async handler function executed for each item.
 * @param onProgress - Optional progress reporting callback (processed, currentBatchEnd, total).
 */
export async function processInBatches<T>(
  items: T[],
  batchSize: number,
  taskFn: (item: T) => Promise<void>,
  onProgress?: (processed: number, currentBatchEnd: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    if (isAborted()) break;

    const batch = items.slice(i, i + batchSize);
    if (onProgress) {
      onProgress(i, Math.min(i + batchSize, items.length), items.length);
    }

    await Promise.all(batch.map(taskFn));
    await sleep(100);
  }
}

/**
 * Fetches Church API member card data for a given member UUID.
 *
 * @param memberId - Member unique UUID identifier.
 * @returns Promise resolving to parsed LcrMemberCardData payload or null on failure.
 */
export async function fetchMemberCard(memberId: string): Promise<Types.LcrMemberCardData | null> {
  const endpoint = `${Constants.MLTP_API_BASE}/api/member/${encodeURIComponent(memberId)}/card`;
  try {
    const response = await fetch(endpoint, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    return (await response.json()) as Types.LcrMemberCardData;
  } catch (err) {
    console.error(`LCR Tools: Failed to fetch card data for member ${memberId}:`, err);
    return null;
  }
}

/**
 * Extracts member identifier and name attributes from an LCR member directory table row.
 *
 * @param row - Target table row element representing a member in the directory.
 * @returns Parsed MemberRowInfo object, or null if row does not contain valid member attributes.
 */
export function getMemberInfoFromRow(row: HTMLTableRowElement): Types.MemberRowInfo | null {
  const nameButton = row.querySelector('button.member-card__styled-ghost');
  if (!nameButton) return null;

  let memberId = row.id;
  if (!memberId) {
    const href = nameButton.getAttribute('href') || '';
    const match = href.match(Regex.MEMBER_PROFILE_UUID);
    if (match) {
      memberId = match[1];
    } else {
      return null;
    }
  }

  const directoryNameWithAge = (nameButton.textContent || '').trim();
  const directoryName = directoryNameWithAge.replace(Regex.TRAILING_COUNT_PARENS, '');

  const { firstName, lastName } = extractNameParts(directoryName);

  return {
    memberId,
    firstName,
    lastName,
    fullName: firstName ? `${firstName} ${lastName}` : lastName,
    directoryName,
  };
}

/**
 * Extracts a Church unit number from an element's text content or raw string.
 * Looks for trailing parentheses containing 4-8 digits first, then any parenthesized unit number.
 *
 * @param text - Raw text string from header or URL.
 * @returns Parsed unit number string, or null if no unit number found.
 */
export function parseUnitNumberFromText(text: string): string | null {
  if (!text) return null;
  const clean = text.trim();
  const trailingMatch = clean.match(Regex.TRAILING_UNIT_NUMBER);
  if (trailingMatch?.[1]) return trailingMatch[1];

  const parenMatch = clean.match(Regex.PAREN_UNIT_NUMBER);
  if (parenMatch?.[1]) return parenMatch[1];

  const labeledMatch = clean.match(Regex.LABELED_UNIT_NUMBER);
  if (labeledMatch?.[1]) return labeledMatch[1];

  const pureMatch = clean.match(Regex.PURE_UNIT_DIGITS);
  if (pureMatch?.[0]) return pureMatch[0];

  return null;
}

/**
 * Resolves the active Church unit number from the current document DOM or URL.
 * Checks LCR header elements (#static-current-unit-text, #current-unit-text, #mltp-unit-info-parent),
 * then falls back to URL parameters, pathnames, and Next.js query state.
 *
 * @param doc - Document object to inspect (defaults to global document).
 * @param href - URL string to inspect (defaults to window.location.href).
 * @returns Church unit number string, or null if not resolved.
 */
export function resolveCurrentUnitNumber(doc?: Document, href?: string): string | null {
  const currentDoc = doc ?? (typeof document !== 'undefined' ? document : undefined);
  const currentHref = href ?? (typeof window !== 'undefined' ? window.location.href : '');

  if (currentDoc) {
    // 1. Current Ward / Unit (static display)
    const staticEl = currentDoc.getElementById(Dom.STATIC_CURRENT_UNIT_TEXT_ID);
    if (staticEl?.textContent) {
      const parsed = parseUnitNumberFromText(staticEl.textContent);
      if (parsed) return parsed;
    }

    // 2. Current Ward / Unit (interactive switcher)
    const currentEl = currentDoc.getElementById(Dom.CURRENT_UNIT_TEXT_ID);
    if (currentEl?.textContent) {
      const parsed = parseUnitNumberFromText(currentEl.textContent);
      if (parsed) return parsed;
    }

    // 3. Parent Stake / District (fallback for stake level)
    const parentEl = currentDoc.getElementById(Dom.MLTP_UNIT_INFO_PARENT_ID);
    if (parentEl?.textContent) {
      const parsed = parseUnitNumberFromText(parentEl.textContent);
      if (parsed) return parsed;
    }
  }

  // 4. URL query parameters or dedicated numeric path segment
  if (currentHref) {
    const paramMatch = currentHref.match(Regex.NUMERIC_PARAM);
    if (paramMatch?.[1]) return paramMatch[1];

    try {
      const url = new URL(currentHref, 'https://directory.churchofjesuschrist.org');
      const pathMatch = url.pathname.match(Regex.UNIT_PATH_SEGMENT);
      if (pathMatch?.[1]) return pathMatch[1];
    } catch {
      // Ignore invalid URL format
    }
  }

  // 5. Next.js state (Church Directory pages)
  if (typeof window !== 'undefined') {
    if (window.__NEXT_DATA__?.query?.unit) {
      return String(window.__NEXT_DATA__.query.unit);
    }
    const pageProps = window.__NEXT_DATA__?.props?.pageProps as Record<string, unknown> | undefined;
    if (pageProps?.unit) return String(pageProps.unit);
    if (pageProps?.unitNumber) return String(pageProps.unitNumber);
  }

  return null;
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Splits directory name into first and last name components. */
function extractNameParts(directoryName: string): Types.MemberNameParts {
  let lastName = '';
  let firstName = '';
  const commaIdx = directoryName.indexOf(',');

  if (commaIdx !== -1) {
    lastName = directoryName.substring(0, commaIdx).trim();
    firstName = directoryName.substring(commaIdx + 1).trim();
  } else {
    const parts = directoryName.split(' ').filter(Boolean);
    if (parts.length > 1) {
      lastName = parts.pop() || '';
      firstName = parts.join(' ');
    } else {
      lastName = directoryName;
    }
  }

  return { firstName, lastName };
}
