import { hideLoadingIndicator, isAborted, showLoadingIndicator, showToast } from './utils';
import { mountFlashcardInterface } from './flashcardDomHelper';
import { flashcardMembersFromScan } from './flashcardPhotoHelper';
import { Constants, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Runs a photo scan behind a loader, then mounts a deck of the members with photos.
 *
 * @param loadingText - Loader headline shown while scanning.
 * @param scan - Starts the photo scan.
 * @param emptyToast - Toast shown when no member has a photo.
 * @param relaunch - Restarts the action (used by the deck's reset-cache button).
 * @param source - Optional data source label for the result.
 * @returns Action result describing the mounted deck, abort, or empty scan.
 */
export async function scanAndLaunchDeck(
  loadingText: string,
  scan: () => Promise<Types.MemberPhotoScanResult>,
  emptyToast: string,
  relaunch: () => Promise<unknown>,
  source?: string
): Promise<Types.FlashcardsActionResult> {
  showLoadingIndicator(loadingText, 'Press ESC to abort');
  const result = await scan();
  hideLoadingIndicator();
  if (isAborted()) return flashcardsCancelled();

  const deck = flashcardMembersFromScan(result.withPhotos);
  if (deck.length === 0) {
    showToast(emptyToast, { type: 'warning' });
    return { success: false, error: 'No photos found' };
  }
  return launchDeck(deck, relaunch, source);
}

/**
 * Mounts the flashcard interface for a deck.
 *
 * @param deck - Members to study.
 * @param relaunch - Restarts the action (used by the deck's reset-cache button).
 * @param source - Optional data source label for the result.
 * @returns Successful action result with the deck size.
 */
export function launchDeck(
  deck: Types.FlashcardMember[],
  relaunch: () => Promise<unknown>,
  source?: string
): Types.FlashcardsActionResult {
  mountFlashcardInterface(deck, async () => {
    await relaunch();
  });
  return { success: true, data: { count: deck.length, ...(source ? { source } : {}) } };
}

/**
 * Shows the cancelled toast and returns the aborted result.
 *
 * @returns Failed action result for a user abort.
 */
export function flashcardsCancelled(): Types.FlashcardsActionResult {
  showToast(Constants.CANCELLED_TOAST, { type: 'info' });
  return { success: false, error: 'Aborted by user' };
}
