/**
 * Action-specific utilities for memberFlashcards, re-exporting all base utilities.
 */

export * from '@/utils';
import { getPhotoCache } from '@/utils';
import { Constants, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Randomizes the order of an array in-place using the Fisher-Yates algorithm.
 *
 * @param array - Target array to shuffle.
 * @returns Shuffled copy of the original array.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Checks local storage photo cache to see if member photos are already cached.
 * Normalizes any relative paths to fully-qualified absolute URLs.
 *
 * @returns Array of FlashcardMember items retrieved from cache, or empty array.
 */
export async function getCachedFlashcardMembers(): Promise<Types.FlashcardMember[]> {
  const cache = await getPhotoCache();
  const members: Types.FlashcardMember[] = [];

  for (const [id, entry] of Object.entries(cache)) {
    if (entry && entry.hasPhoto && entry.photoUrl) {
      const photoUrl = entry.photoUrl.startsWith('/')
        ? `${Constants.CHURCH_DIRECTORY_URL}${entry.photoUrl}`
        : entry.photoUrl;

      members.push({
        memberId: id,
        fullName: entry.fullName || 'Member',
        photoUrl,
        hasPhoto: true,
      });
    }
  }

  return members;
}
