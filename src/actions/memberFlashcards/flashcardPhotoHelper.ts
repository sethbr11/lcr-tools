import { Constants, Types } from './types';

const preloadedUrls = new Set<string>();
const inflightUrls = new Map<string, HTMLImageElement>();

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Maps classified photo-scan records with portraits into flashcard deck members.
 *
 * @param statuses - Members confirmed to have a portrait URL.
 * @returns Flashcard members ready for the study deck.
 */
export function flashcardMembersFromScan(
  statuses: Types.MemberPhotoStatus[]
): Types.FlashcardMember[] {
  const members: Types.FlashcardMember[] = [];
  for (const status of statuses) {
    if (!status.hasPhoto || !status.photoUrl) continue;
    members.push({
      memberId: status.memberId,
      fullName: status.fullName,
      firstName: status.firstName,
      lastName: status.lastName,
      photoUrl: status.photoUrl,
      hasPhoto: true,
    });
  }
  return members;
}

/**
 * Returns whether a portrait URL has already finished loading into the browser cache.
 *
 * @param url - Absolute member portrait URL.
 * @returns True when the image previously loaded successfully.
 */
export function isFlashcardPhotoPreloaded(url: string): boolean {
  return preloadedUrls.has(url);
}

/**
 * Clears in-memory preload tracking when the flashcard modal is closed or rebuilt.
 */
export function resetFlashcardPhotoPreload(): void {
  preloadedUrls.clear();
  inflightUrls.clear();
}

/**
 * Preloads the current card plus nearby neighbors, then queues the rest of the deck.
 *
 * @param deck - Ordered flashcard members currently in the study session.
 * @param currentIndex - Zero-based index of the visible card.
 */
export function preloadFlashcardDeck(deck: Types.FlashcardMember[], currentIndex: number): void {
  if (deck.length === 0) return;

  const radius = Constants.FLASHCARD_PRELOAD_RADIUS;
  for (let offset = -radius; offset <= radius; offset++) {
    const index = wrapDeckIndex(currentIndex + offset, deck.length);
    const url = deck[index]?.photoUrl;
    if (url) preloadFlashcardPhoto(url);
  }

  window.setTimeout(() => {
    for (const member of deck) preloadFlashcardPhoto(member.photoUrl);
  }, 0);
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Wraps a possibly negative deck index into the valid member range. */
function wrapDeckIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

/** Starts loading a portrait into an off-DOM image so later card views can swap instantly. */
function preloadFlashcardPhoto(url: string): void {
  if (!url || preloadedUrls.has(url) || inflightUrls.has(url)) return;

  const img = new Image();
  img.onload = () => {
    preloadedUrls.add(url);
    inflightUrls.delete(url);
  };
  img.onerror = () => {
    inflightUrls.delete(url);
  };
  img.src = url;
  inflightUrls.set(url, img);
}
