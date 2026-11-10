import {
  fetchMemberCard,
  fetchSessionJson,
  getMemberInfoFromRow,
  processInBatches,
  resolveCurrentUnitNumber,
} from './lcrApiUtils';
import { getPhotoCache, updatePhotoCache } from '../security/storageUtils';
import { showLoadingIndicator } from '../ui/uiUtils';
import { Constants, Dom, Regex, Types } from '../types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Fetches Church Directory households and classifies members by portrait availability.
 * Reuses the shared photo cache before probing portrait URLs.
 *
 * @returns Members with photos and members without photos for the active unit.
 */
export async function scanDirectoryMemberPhotos(): Promise<Types.MemberPhotoScanResult> {
  const candidates = await collectDirectoryHouseholdCandidates();
  return classifyDirectoryPhotoStatuses(candidates);
}

/**
 * Classifies LCR member directory table rows by portrait availability using cache, DOM, and API cards.
 *
 * @param rows - Member directory table body rows.
 * @returns Members with photos and members without photos.
 */
export async function scanLcrMemberPhotos(
  rows: HTMLTableRowElement[]
): Promise<Types.MemberPhotoScanResult> {
  const result: Types.MemberPhotoScanResult = { withPhotos: [], withoutPhotos: [] };
  const membersToFetch: Types.MemberRowInfo[] = [];
  const newCacheEntries: Record<string, Types.PhotoCacheEntry> = {};
  const seenMemberIds = new Set<string>();
  const cache = await getPhotoCache();

  for (const row of rows) {
    const info = getMemberInfoFromRow(row);
    if (!info || seenMemberIds.has(info.memberId)) continue;
    seenMemberIds.add(info.memberId);

    const cached = Object.prototype.hasOwnProperty.call(cache, info.memberId)
      ? cache[info.memberId]
      : undefined;

    if (cached?.hasPhoto && cached.photoUrl) {
      recordPhotoStatus(
        result,
        null,
        statusFromRow(info, true, toAbsolutePhotoUrl(cached.photoUrl))
      );
      continue;
    }
    if (cached?.hasPhoto === false) {
      recordPhotoStatus(result, null, statusFromRow(info, false, undefined, cached));
      continue;
    }

    const img = row.querySelector<HTMLImageElement>(Dom.MEMBER_PHOTO_IMG);
    if (img?.src && !Regex.PLACEHOLDER_PHOTO_SRC.test(img.src)) {
      recordPhotoStatus(result, newCacheEntries, statusFromRow(info, true, img.src));
      continue;
    }

    membersToFetch.push(info);
  }

  if (membersToFetch.length > 0) {
    await processInBatches(
      membersToFetch,
      Constants.DEFAULT_BATCH_SIZE,
      async (member) => {
        const card = await fetchMemberCard(member.memberId);
        const tokenUrl = card?.photoMetadata?.tokenUrl;
        if (tokenUrl) {
          const photoUrl = `${tokenUrl}${Constants.LCR_PHOTO_LARGE_SUFFIX}`;
          recordPhotoStatus(result, newCacheEntries, statusFromRow(member, true, photoUrl));
        } else if (card !== null) {
          recordPhotoStatus(result, newCacheEntries, statusFromRow(member, false));
        }
      },
      showPhotoScanProgress
    );
  }

  return finishPhotoScan(result, newCacheEntries);
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Loads Church Directory household members that are not photo-private. */
async function collectDirectoryHouseholdCandidates(): Promise<Types.MemberPhotoStatus[]> {
  const unitNumber = resolveCurrentUnitNumber();
  if (!unitNumber) return [];

  const endpoint = `${Constants.DIRECTORY_HOUSEHOLDS_ENDPOINT}?unit=${encodeURIComponent(unitNumber)}`;
  const households = await fetchSessionJson<Types.DirectoryHousehold[]>(endpoint);
  return Array.isArray(households) ? parseHouseholdsToCandidates(households) : [];
}

/**
 * Confirms Church Directory portrait URLs, using cache when present, and persists new statuses.
 */
async function classifyDirectoryPhotoStatuses(
  candidates: Types.MemberPhotoStatus[]
): Promise<Types.MemberPhotoScanResult> {
  const cache = await getPhotoCache();
  const result: Types.MemberPhotoScanResult = { withPhotos: [], withoutPhotos: [] };
  const newCacheEntries: Record<string, Types.PhotoCacheEntry> = {};

  await processInBatches(
    candidates,
    Constants.DEFAULT_BATCH_SIZE,
    async (member) => {
      const cached = cache[member.memberId];
      if (cached?.hasPhoto && cached.photoUrl) {
        // prettier-ignore
        recordPhotoStatus(result, null, { ...member, hasPhoto: true, photoUrl: toAbsolutePhotoUrl(cached.photoUrl) });
        return;
      }
      if (cached?.hasPhoto === false) {
        recordPhotoStatus(result, null, { ...member, hasPhoto: false, photoUrl: undefined });
        return;
      }

      // Check if candidate already has verified photo status from household payload
      if ((member.hasPhoto && member.photoUrl) || (member.hasPhoto === false && !member.photoUrl)) {
        recordPhotoStatus(result, newCacheEntries, member);
        return;
      }

      const photoUrl =
        member.photoUrl ||
        `${Constants.CHURCH_DIRECTORY_URL}${Constants.DIRECTORY_PHOTOS_ENDPOINT}/${encodeURIComponent(member.memberId)}`;
      const exists = await directoryPhotoExists(photoUrl);
      // prettier-ignore
      recordPhotoStatus(result, newCacheEntries, exists ? { ...member, hasPhoto: true, photoUrl } : { ...member, hasPhoto: false, photoUrl: undefined });
    },
    showPhotoScanProgress
  );

  return finishPhotoScan(result, newCacheEntries);
}

/** Returns whether the Church Directory portrait endpoint has a real photo for the member. */
async function directoryPhotoExists(photoUrl: string): Promise<boolean> {
  try {
    const head = await fetch(photoUrl, { method: 'HEAD', credentials: 'include' });
    if (head.ok && head.status !== 204) {
      if (head.redirected && Regex.PLACEHOLDER_PHOTO_SRC.test(head.url)) {
        return false;
      }
      if (Regex.PLACEHOLDER_PHOTO_SRC.test(head.url)) {
        return false;
      }
      const contentType = (head.headers?.get?.('content-type') || '').toLowerCase();
      if (
        contentType.includes('svg') ||
        contentType.includes('text/html') ||
        contentType.includes('application/json')
      ) {
        return false;
      }
      const contentLength = head.headers?.get?.('content-length');
      if (contentLength && parseInt(contentLength, 10) === 0) {
        return false;
      }
      return true;
    }
    if (head.status !== 405 && head.status !== 501 && !head.ok) return false;

    const get = await fetch(photoUrl, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'image/*' },
    });
    if (!get.ok || get.status === 204) return false;
    if (get.redirected && Regex.PLACEHOLDER_PHOTO_SRC.test(get.url)) return false;
    if (Regex.PLACEHOLDER_PHOTO_SRC.test(get.url)) return false;

    const getContentType = (get.headers?.get?.('content-type') || '').toLowerCase();
    if (
      getContentType.includes('svg') ||
      getContentType.includes('text/html') ||
      getContentType.includes('application/json')
    ) {
      return false;
    }
    const getContentLength = get.headers?.get?.('content-length');
    if (getContentLength && parseInt(getContentLength, 10) === 0) return false;

    return true;
  } catch {
    return false;
  }
}

/** Converts household member records into photo-status candidates with constructed portrait URLs. */
function parseHouseholdsToCandidates(
  households: Types.DirectoryHousehold[]
): Types.MemberPhotoStatus[] {
  const members: Types.MemberPhotoStatus[] = [];
  const seenUuids = new Set<string>();

  for (const household of households) {
    if (!household.members || !Array.isArray(household.members)) continue;

    for (const member of household.members) {
      if (!member.uuid || seenUuids.has(member.uuid)) continue;
      seenUuids.add(member.uuid);

      if (member.privacy?.photo && member.privacy.photo.toLowerCase().includes('private')) {
        continue;
      }

      const fullName = formatMemberDisplayName(member);
      if (!fullName) continue;

      let photoUrl: string | undefined = undefined;
      let hasExplicitPhoto: boolean | undefined = undefined;

      if (typeof member.hasPhoto === 'boolean') {
        hasExplicitPhoto = member.hasPhoto;
      } else if (member.photo === null || member.individualPhoto === null) {
        hasExplicitPhoto = false;
      }

      if (member.photoUrl) {
        photoUrl = toAbsolutePhotoUrl(member.photoUrl);
      } else if (member.photo?.url || member.photo?.tokenUrl) {
        photoUrl = toAbsolutePhotoUrl((member.photo.url || member.photo.tokenUrl)!);
      } else if (typeof member.individualPhoto === 'string') {
        photoUrl = toAbsolutePhotoUrl(member.individualPhoto);
      } else if (member.individualPhoto?.url || member.individualPhoto?.tokenUrl) {
        photoUrl = toAbsolutePhotoUrl(
          (member.individualPhoto.url || member.individualPhoto.tokenUrl)!
        );
      } else if (hasExplicitPhoto !== false) {
        photoUrl = `${Constants.CHURCH_DIRECTORY_URL}${Constants.DIRECTORY_PHOTOS_ENDPOINT}/${encodeURIComponent(member.uuid)}`;
      }

      members.push({
        memberId: member.uuid,
        fullName,
        firstName: member.givenName || '',
        lastName: member.surname || '',
        hasPhoto: hasExplicitPhoto === true,
        photoUrl,
      });
    }
  }

  return members;
}

/** Files a status under with/without photos and, when a cache map is given, queues it for caching. */
function recordPhotoStatus(
  result: Types.MemberPhotoScanResult,
  newCacheEntries: Record<string, Types.PhotoCacheEntry> | null,
  status: Types.MemberPhotoStatus
): void {
  (status.hasPhoto ? result.withPhotos : result.withoutPhotos).push(status);
  if (newCacheEntries) newCacheEntries[status.memberId] = cacheEntryFromStatus(status);
}

/** Batch progress callback that updates the loader with the photo check count. */
function showPhotoScanProgress(_done: number, current: number, total: number): void {
  showLoadingIndicator(`Checking photos (${current}/${total})...`);
}

/** Saves newly learned photo statuses to the shared cache and returns the scan result. */
async function finishPhotoScan(
  result: Types.MemberPhotoScanResult,
  newCacheEntries: Record<string, Types.PhotoCacheEntry>
): Promise<Types.MemberPhotoScanResult> {
  if (Object.keys(newCacheEntries).length > 0) await updatePhotoCache(newCacheEntries);
  return result;
}

/** Builds a photo-status record from an LCR table row and optional cache names. */
function statusFromRow(
  info: Types.MemberRowInfo,
  hasPhoto: boolean,
  photoUrl?: string,
  cached?: Types.PhotoCacheEntry
): Types.MemberPhotoStatus {
  return {
    memberId: info.memberId,
    firstName: cached?.firstName || info.firstName,
    lastName: cached?.lastName || info.lastName,
    fullName: cached?.fullName || info.fullName,
    hasPhoto,
    photoUrl,
  };
}

/** Converts a photo-status record into a cache entry for isolated extension storage. */
function cacheEntryFromStatus(status: Types.MemberPhotoStatus): Types.PhotoCacheEntry {
  return {
    memberId: status.memberId,
    firstName: status.firstName,
    lastName: status.lastName,
    fullName: status.fullName,
    hasPhoto: status.hasPhoto,
    photoUrl: status.photoUrl,
    timestamp: Date.now(),
  };
}

/** Prefixes relative Directory photo paths with the Church Directory origin. */
function toAbsolutePhotoUrl(photoUrl: string): string {
  if (photoUrl.startsWith('/')) return `${Constants.CHURCH_DIRECTORY_URL}${photoUrl}`;
  return photoUrl;
}

/** Formats display name from Church Directory member name components. */
function formatMemberDisplayName(member: Types.DirectoryHouseholdMember): string {
  if (member.displayName && member.displayName.trim()) return member.displayName.trim();

  if (member.givenName && member.surname) {
    return `${member.givenName} ${member.surname}`.trim();
  }

  if (member.name) {
    const commaIndex = member.name.indexOf(',');
    if (commaIndex !== -1) {
      const surname = member.name.substring(0, commaIndex).trim();
      const given = member.name.substring(commaIndex + 1).trim();
      return `${given} ${surname}`.trim();
    }
    return member.name.trim();
  }

  return '';
}
