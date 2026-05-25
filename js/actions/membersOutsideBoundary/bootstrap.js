/**
 * BOOTSTRAP: MEMBERS OUTSIDE BOUNDARY
 *
 * This script runs at document_start on the Directory page.
 * It checks if an audit is pending and only then loads the full suite of tools.
 * This minimizes the extension's footprint on normal page visits.
 */
(() => {
  const AUDIT_FLAG = "LCR_AUDIT_PENDING";

  // Check if we are waking up for a pending audit
  if (!sessionStorage.getItem(AUDIT_FLAG)) {
    return;
  }

  console.log("🕵️ LCR Tools: Audit pending. Loading boundary analysis tools...");

  // List of scripts to inject into the MAIN world
  const scripts = [
    "js/utils/utils.js",
    "js/utils/uiUtils.js",
    "js/utils/modalUtils.js",
    "js/utils/storageUtils.js",
    "js/utils/fileUtils.js",
    "js/actions/membersOutsideBoundary/templates.js",
    "js/actions/membersOutsideBoundary/membersOutsideBoundaryUtils.js",
  ];

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
