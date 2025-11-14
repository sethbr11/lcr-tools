/**
 * ACTION: MEMBER FLASHCARDS
 * Creates an interactive flashcard interface to help learn member names and faces.
 * Works on both the manage-photos page and the member directory page.
 * - On manage-photos: applies filters and collects from member-photo elements (FASTER)
 * - On member-list: clicks names to reveal popovers and extracts photo URLs (SLOWER)
 *
 * See memberFlashcardsUtils.js for in-depth implementation—this file acts as a
 * high level overview of everything that is happening.
 */
(async function () {
  utils.ensureLoaded("memberFlashcardsUtils", "uiUtils", "modalUtils");
  uiUtils.resetAborted();

  // Check if we're on member directory page and show confirmation
  const currentUrl = window.location.href;
  if (currentUrl.includes("records/member-list")) {
    const proceed = await memberFlashcardsUtils.showDirectoryPageWarning();
    if (!proceed) {
      console.log("LCR Tools: User cancelled flashcards on member directory");
      return;
    }
  }

  // Auto-detect page type and collect member data using appropriate method
  uiUtils.showLoadingIndicator("Setting up flashcards...");
  const memberData = await memberFlashcardsUtils.collectMemberDataAuto();

  if (!memberData || memberData.length === 0) {
    alert("LCR Tools: No members with photos found to create flashcards.");
    uiUtils.hideLoadingIndicator();
    return;
  }

  // Create and show flashcard interface
  uiUtils.showLoadingIndicator("Creating flashcards...");
  await memberFlashcardsUtils.createFlashcardInterface(memberData);

  uiUtils.hideLoadingIndicator();
})();
