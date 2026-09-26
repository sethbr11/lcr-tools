import { fuzzyNameMatch, resolveCurrentUnitNumber } from '@/utils';
import { Constants, Regex, Types } from '../types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Copies Church Directory household coordinates onto matching members.
 * Matching is performed locally; no names or addresses leave the browser.
 * Resolves unit number from current document DOM (#static-current-unit-text, etc.) or URL href.
 *
 * @param members - Extracted Moved In members.
 * @param href - Active page URL used to resolve a unit number.
 * @param fetchImpl - Fetch implementation, injectable for tests.
 * @param doc - Optional Document instance for resolving unit headers in tests.
 * @returns Members with Church coordinates attached when a match is found.
 */
export async function attachChurchCoordinates(
  members: Types.TripPlanningMember[],
  href: string = typeof window !== 'undefined' ? window.location.href : '',
  fetchImpl: typeof fetch = fetch,
  doc?: Document
): Promise<Types.TripPlanningMember[]> {
  const currentDoc = doc ?? (typeof document !== 'undefined' ? document : undefined);
  const unitNumber = resolveCurrentUnitNumber(currentDoc, href);
  if (!unitNumber || members.length === 0) return members.map((member) => ({ ...member }));

  const households = await fetchDirectoryHouseholds(unitNumber, fetchImpl);
  if (households.length === 0) return members.map((member) => ({ ...member }));

  return members.map((member) => {
    const match = findMatchingHousehold(member, households);
    const coords = match ? readHouseholdCoordinates(match) : null;
    if (!coords) return { ...member };
    return { ...member, lat: coords.lat, lng: coords.lng, coordSource: 'church' };
  });
}

/**
 * Resolves a Church unit number from the current page URL when present.
 *
 * @param href - URL string to inspect for query parameter or numeric unit segment.
 * @returns Parsed unit number string, or null if no unit number found.
 */
export function resolveUnitNumberFromHref(href: string): string | null {
  return resolveCurrentUnitNumber(undefined, href);
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Fetches Directory household records for a unit using the Church Account session. */
async function fetchDirectoryHouseholds(
  unitNumber: string,
  fetchImpl: typeof fetch
): Promise<Types.DirectoryHouseholdGeo[]> {
  const endpoint = `${Constants.CHURCH_DIRECTORY_URL}${Constants.DIRECTORY_HOUSEHOLDS_ENDPOINT}?unit=${encodeURIComponent(unitNumber)}`;
  try {
    const response = await fetchImpl(endpoint, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? (payload as Types.DirectoryHouseholdGeo[]) : [];
  } catch {
    return [];
  }
}

/** Finds the Directory household whose name matches a moved-in member. */
function findMatchingHousehold(
  member: Types.TripPlanningMember,
  households: Types.DirectoryHouseholdGeo[]
): Types.DirectoryHouseholdGeo | null {
  const nameMatches = households.filter((household) =>
    householdMatchesName(member.name, household)
  );
  if (nameMatches.length === 1) return nameMatches[0];
  if (nameMatches.length > 1 && member.address) {
    const addressMatch = nameMatches.find((household) => {
      const householdAddress = household.address || '';
      return householdAddress.length > 0 && addressesShareToken(member.address, householdAddress);
    });
    if (addressMatch) return addressMatch;
  }
  return nameMatches[0] || null;
}

/** Returns true when a household or any of its members fuzzy-matches the member name. */
function householdMatchesName(memberName: string, household: Types.DirectoryHouseholdGeo): boolean {
  const candidates = [
    household.name,
    household.displayName,
    ...(household.members || []).flatMap((person) => [
      person.name,
      person.displayName,
      [person.surname, person.givenName].filter(Boolean).join(', '),
    ]),
  ].filter((value): value is string => Boolean(value));
  return candidates.some((candidate) => fuzzyNameMatch(memberName, candidate));
}

/** Uses a shared street-number token as a local address disambiguator. */
function addressesShareToken(left: string, right: string): boolean {
  const leftNumber = left.trim().match(Regex.LEADING_STREET_NUMBER);
  const rightNumber = right.trim().match(Regex.LEADING_STREET_NUMBER);
  return Boolean(leftNumber && rightNumber && leftNumber[0] === rightNumber[0]);
}

/** Reads latitude and longitude from either nested or top-level Directory fields. */
function readHouseholdCoordinates(
  household: Types.DirectoryHouseholdGeo
): Types.CoordinatePoint | null {
  const lat = household.coordinates?.latitude || household.latitude || 0;
  const lng = household.coordinates?.longitude || household.longitude || 0;
  if (!lat || !lng) return null;
  return { lat, lng };
}
