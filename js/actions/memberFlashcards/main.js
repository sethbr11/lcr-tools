/**
 * ACTION: MEMBER FLASHCARDS
 * Creates an interactive flashcard interface to help learn member names and faces.
 * Shows member photos and allows flipping to reveal names. Navigates to the manage-photos
 * page, applies proper filters, and creates flashcards from member-photo elements.
 *
 * See memberFlashcardsUtils.js for in-depth implementation—this file acts as a
 * high level overview of everything that is happening.
 */
(async function () {
  utils.ensureLoaded("memberFlashcardsUtils", "uiUtils");
  uiUtils.resetAborted();

  // Navigate to manage photos page and apply filters
  uiUtils.showLoadingIndicator("Setting up flashcards...");
  await memberFlashcardsUtils.navigateToManagePhotosPage();

  await memberFlashcardsUtils.navigateToManageTab();
  await memberFlashcardsUtils.setSubjectTypeToIndividual();
  await memberFlashcardsUtils.setPhotoFilterToMembersWithPhoto();

  // Wait for filters to apply and collect member data
  uiUtils.showLoadingIndicator("Applying filters and loading member data...");
  const memberData = await memberFlashcardsUtils.collectMemberData();

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
