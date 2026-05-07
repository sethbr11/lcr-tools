/**
 * ACTION: MEMBER FLASHCARDS
 * Creates an interactive flashcard interface to help learn member names and faces.
 * Scrapes the Member Directory page by clicking names to reveal popovers and extract photo URLs.
 *
 * See memberFlashcardsUtils.js for in-depth implementation.
 */
(async function () {
  utils.ensureLoaded("memberFlashcardsUtils", "uiUtils", "modalUtils", "storageUtils");
  uiUtils.resetAborted();

  // Show confirmation warning and photo cache settings
  const { proceed } = await storageUtils.showPhotoActionConfirmationModal({
    title: "Member Flashcards",
    description: "<strong>Note:</strong> Running flashcards on the Member Directory page is slower because it needs to click each member's name to access their photo. Enabling the photo cache will make subsequent runs much faster."
  });
  
  if (!proceed) {
    console.log("LCR Tools: User cancelled flashcards");
    return;
  }

  // Collect member data from the directory page
  uiUtils.showLoadingIndicator("Setting up flashcards...");
  const memberData = await memberFlashcardsUtils.collectMemberDataFromDirectory();

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
