// prettier-ignore
import { getCachedFlashcardMembers, isAborted, resetAborted, showToast, isChurchDirectoryPage,
  isLcrMemberDirectoryPage, ensureLcrIndividualsTab, waitForLcrDirectoryRows,
  scanDirectoryMemberPhotos, scanLcrMemberPhotos } from './utils';
import { flashcardsCancelled, launchDeck, scanAndLaunchDeck } from './flashcardLaunchHelper';
import { Constants, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Main entrypoint orchestrating the Member Flashcards action.
 * Steps:
 *   1. Handle Church Online Directory page flow with shared photo-cache scan.
 *   2. Validate LCR Member Directory page.
 *   3. Switch the LCR directory to the Individuals tab when Households is active.
 *   4. Scan LCR rows with cache reuse and API fallback.
 *   5. Mount the 3D flashcard interface for members with portraits.
 *
 * @returns Promise resolving to action result.
 */
export async function runMemberFlashcards(): Promise<Types.FlashcardsActionResult> {
  resetAborted();

  // Step 1: Handle Church Online Directory page flow (always pulls fresh unit directory)
  if (isChurchDirectoryPage()) {
    // prettier-ignore
    return scanAndLaunchDeck('Loading directory members...', scanDirectoryMemberPhotos, Constants.NO_DIRECTORY_PHOTOS_TOAST, runMemberFlashcards, 'directory-api');
  }

  // Step 2: Validate LCR Member Directory page
  if (!isLcrMemberDirectoryPage()) {
    showToast(Constants.WRONG_PAGE_TOAST, { type: 'warning' });
    return { success: false, error: 'Not on directory page' };
  }

  // Step 3: Switch from Households to Individuals before scanning member portraits
  if (!(await ensureLcrIndividualsTab(Constants.ACTION_NAME))) {
    if (isAborted()) return flashcardsCancelled();
    return { success: false, error: 'LCR setup mismatch' };
  }

  // Step 4: Scan LCR member directory rows (falling back to cached portraits when none render)
  const rows = await waitForLcrDirectoryRows();
  if (rows.length === 0) {
    const cached = await getCachedFlashcardMembers();
    if (cached.length > 0) return launchDeck(cached, runMemberFlashcards, 'cache');
    showToast(Constants.NO_PAGE_PHOTOS_TOAST, { type: 'warning' });
    return { success: false, error: 'No photos found' };
  }

  // Step 5: Mount flashcard deck for members with portraits
  // prettier-ignore
  return scanAndLaunchDeck('Scanning member records...', () => scanLcrMemberPhotos(rows), Constants.NO_PAGE_PHOTOS_TOAST, runMemberFlashcards);
}
