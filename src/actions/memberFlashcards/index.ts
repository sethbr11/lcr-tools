// prettier-ignore
import { getCachedFlashcardMembers, hideLoadingIndicator, isAborted, resetAborted,
  showLoadingIndicator, showToast, isChurchDirectoryPage, isLcrMemberDirectoryPage,
  ensureLcrIndividualsTab, waitForLcrDirectoryRows, scanDirectoryMemberPhotos,
  scanLcrMemberPhotos } from './utils';
import { mountFlashcardInterface } from './flashcardDomHelper';
import { flashcardMembersFromScan } from './flashcardPhotoHelper';
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
export async function runMemberFlashcards(): Promise<
  Types.ActionResult<Types.MemberFlashcardsResult>
> {
  resetAborted();

  // Step 1: Handle Church Online Directory page flow (always pulls fresh unit directory)
  if (isChurchDirectoryPage()) {
    showLoadingIndicator('Loading directory members...', 'Press ESC to abort');
    const scan = await scanDirectoryMemberPhotos();
    hideLoadingIndicator();

    if (isAborted()) {
      showToast('Member flashcards cancelled.', { type: 'info' });
      return { success: false, error: 'Aborted by user' };
    }

    const directoryDeck = flashcardMembersFromScan(scan.withPhotos);
    if (directoryDeck.length === 0) {
      showToast('No member photos found in unit directory.', { type: 'warning' });
      return { success: false, error: 'No photos found' };
    }

    mountFlashcardInterface(directoryDeck, async () => {
      await runMemberFlashcards();
    });
    return { success: true, data: { source: 'directory-api', count: directoryDeck.length } };
  }

  // Step 2: Validate LCR Member Directory page
  if (!isLcrMemberDirectoryPage()) {
    showToast('Please visit the Member Directory or Church Directory to use Flashcards.', {
      type: 'warning',
    });
    return { success: false, error: 'Not on directory page' };
  }

  // Step 3: Switch from Households to Individuals before scanning member portraits
  if (!(await ensureLcrIndividualsTab(Constants.ACTION_NAME))) {
    if (isAborted()) {
      showToast('Member flashcards cancelled.', { type: 'info' });
      return { success: false, error: 'Aborted by user' };
    }
    return { success: false, error: 'LCR setup mismatch' };
  }

  // Step 4: Scan LCR member directory rows
  const rows = await waitForLcrDirectoryRows();
  if (rows.length === 0) {
    const cached = await getCachedFlashcardMembers();
    if (cached.length > 0) {
      mountFlashcardInterface(cached, async () => {
        await runMemberFlashcards();
      });
      return { success: true, data: { source: 'cache', count: cached.length } };
    }
    showToast('No member photos found on this page.', { type: 'warning' });
    return { success: false, error: 'No photos found' };
  }

  showLoadingIndicator('Scanning member records...', 'Press ESC to abort');
  const scan = await scanLcrMemberPhotos(rows);
  hideLoadingIndicator();

  if (isAborted()) {
    showToast('Member flashcards cancelled.', { type: 'info' });
    return { success: false, error: 'Aborted by user' };
  }

  const deck = flashcardMembersFromScan(scan.withPhotos);
  if (deck.length === 0) {
    showToast('No member photos found on this page.', { type: 'warning' });
    return { success: false, error: 'No photos found' };
  }

  // Step 5: Mount flashcard deck
  mountFlashcardInterface(deck, async () => {
    await runMemberFlashcards();
  });
  return { success: true, data: { count: deck.length } };
}
