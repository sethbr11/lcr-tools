/**
 * BOOTSTRAP: MEMBERS OUTSIDE BOUNDARY
 *
 * This script runs at document_start on the Directory page.
 * It checks if an audit is pending and only then loads the full suite of tools.
 * This minimizes the extension's footprint on normal page visits.
 */
(() => {
  const AUDIT_FLAG = "LCR_AUDIT_PENDING";
  const FLASHCARDS_FLAG = "LCR_FLASHCARDS_PENDING";

  const isAuditPending = sessionStorage.getItem(AUDIT_FLAG);
  const isFlashcardsPending = sessionStorage.getItem(FLASHCARDS_FLAG);

  // Check if we are waking up for a pending audit or flashcard study session
  if (!isAuditPending && !isFlashcardsPending) {
    return;
  }

  console.log("🕵️ LCR Tools: Pending action detected. Injected bootstrap...");

  // List of scripts to inject into the MAIN world
  let scripts = [];
  if (isAuditPending) {
    scripts = [
      "js/utils/utils.js",
      "js/utils/uiUtils.js",
      "js/utils/modalUtils.js",
      "js/utils/storageUtils.js",
      "js/utils/fileUtils.js",
      "js/actions/membersOutsideBoundary/templates.js",
      "js/actions/membersOutsideBoundary/membersOutsideBoundaryUtils.js",
    ];
  } else if (isFlashcardsPending) {
    scripts = [
      "js/utils/utils.js",
      "js/utils/navigationUtils.js",
      "js/utils/uiUtils.js",
      "js/utils/modalUtils.js",
      "js/utils/storageUtils.js",
      "js/utils/lcrApiUtils.js",
      "js/actions/memberFlashcards/templates.js",
      "js/actions/memberFlashcards/memberFlashcardsUtils.js",
      "js/actions/memberFlashcards/main.js",
    ];
  }

  /**
   * Inject a script into the page context
   * @param {string} src - Extension-relative path to the script
   */
  const injectScript = (src) => {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL(src);
    s.async = false; // Maintain execution order
    (document.head || document.documentElement).appendChild(s);
  };

  // Inject all required scripts
  scripts.forEach(injectScript);
})();
