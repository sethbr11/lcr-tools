/**
 * ACTION: MEMBER FLASHCARDS
 * Creates an interactive flashcard interface to help learn member names and faces.
 *
 * Support:
 * - LCR Member Directory: Scrapes LCR page by fetching member card API.
 * - Directory/Map Page: Intercepts network calls by reloading and capturing JSON data.
 */
(async function () {
  utils.ensureLoaded(
    "memberFlashcardsUtils",
    "uiUtils",
    "modalUtils",
    "storageUtils",
  );
  uiUtils.resetAborted();

  const isDirectoryPage = window.location.hostname.includes(
    "directory.churchofjesuschrist.org",
  );

  if (isDirectoryPage) {
    const isFlashcardsPending =
      sessionStorage.getItem("LCR_FLASHCARDS_PENDING") === "true";

    if (isFlashcardsPending) {
      // --- POST-RELOAD FLOW (runs in MAIN world via bootstrap injection) ---
      if (document.body) {
        uiUtils.showLoadingIndicator(
          "Waiting for directory data...",
          "Loading member photos...",
        );
      } else {
        window.addEventListener("DOMContentLoaded", () => {
          uiUtils.showLoadingIndicator(
            "Waiting for directory data...",
            "Loading member photos...",
          );
        });
      }

      const memberData =
        await memberFlashcardsUtils.waitForDirectoryDataAndProcess();

      if (!memberData || memberData.length === 0) {
        alert("LCR Tools: No members with photos found to create flashcards.");
        uiUtils.hideLoadingIndicator();
        sessionStorage.removeItem("LCR_FLASHCARDS_PENDING");
        return;
      }

      // Create and show flashcard interface
      uiUtils.showLoadingIndicator("Creating flashcards...");
      await memberFlashcardsUtils.createFlashcardInterface(memberData);
      uiUtils.hideLoadingIndicator();
      sessionStorage.removeItem("LCR_FLASHCARDS_PENDING");
    } else {
      // --- INITIAL CLICK FLOW (runs in ISOLATED world via popup injection) ---

      // 1. Show cache settings modal (same experience as LCR page)
      const { proceed } = await storageUtils.showPhotoActionConfirmationModal({
        title: "Member Flashcards",
        description:
          "<strong>Note:</strong> The first run on the Directory page requires a page reload to capture member photo data. Enabling the photo cache will make subsequent runs instant.",
      });
      if (!proceed) return;

      // 2. Check if we can run immediately from cache (no network requests)
      const ranFromCache =
        await memberFlashcardsUtils.checkCacheAndRunOrPrompt();
      if (ranFromCache) return;

      // 3. No cache available — prompt for reload to intercept network data
      const reload = await uiUtils.showConfirmationModal(
        "To load member flashcards, the page needs to reload so the extension can capture photo data. This only happens on the first run (results are cached for next time).",
        { confirmText: "Reload & Start", cancelText: "Cancel" },
      );

      if (reload) {
        sessionStorage.setItem("LCR_FLASHCARDS_PENDING", "true");
        window.location.reload();
      }
    }
    return;
  }

  // --- LCR Page Flow ---
  // Show confirmation warning and photo cache settings
  const { proceed } = await storageUtils.showPhotoActionConfirmationModal({
    title: "Member Flashcards",
    description:
      "<strong>Note:</strong> Running flashcards on the Member Directory page is slower because it needs to click each member's name to access their photo. Enabling the photo cache will make subsequent runs much faster.",
  });

  if (!proceed) {
    console.log("LCR Tools: User cancelled flashcards");
    return;
  }

  // Collect member data from the directory page
  uiUtils.showLoadingIndicator("Setting up flashcards...");
  const memberData =
    await memberFlashcardsUtils.collectMemberDataFromDirectory();

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
