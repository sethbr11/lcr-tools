/**
 * Determines available actions based on the current URL.
 * @param {string} url - The current page URL.
 * @returns {Array<Object>} - An array of action objects.
 */
window.getActionsForUrl = function (url) {
  // Error handling: ensure url is defined and a string
  if (!url || typeof url !== "string") return [];
  const actions = [];
  const isFinance = true;

  // Input utilities
  const u = (n) => `js/utils/${n}.js`,
    utils = u("utils"),
    fileUtils = u("fileUtils"),
    logUtils = u("loggingUtils"),
    navUtils = u("navigationUtils"),
    tableUtils = u("tableUtils"),
    uiUtils = u("uiUtils"),
    modalUtils = u("modalUtils"),
    dataUtils = u("dataUtils");

  // Vendor files
  const jszip = "js/vendor/jszip.min.js";

  /******* Actions Available on most pages *********/
  const excludedPathsForDownload = [
    "records/member-profile",
    "manage-photos",
    "report/self-reliance",
    "records/merge-duplicate",
    "ca",
  ];
  // Exclude only if the URL ends with "ministering" (not "ministering-assignments")
  const isExactMinistering =
    url.includes("lcr.churchofjesuschrist.org/ministering") &&
    !url.includes("lcr.churchofjesuschrist.org/ministering-assignments");

  if (
    (url.includes("lcr.churchofjesuschrist.org/") ||
      lcrUrlMatch(url, "", isFinance)) && // Include all finance pages
    !url.match(/^https:\/\/lcr\.churchofjesuschrist\.org\/(\?.*)?$/) && // Exclude base page with or without query parameters
    !lcrUrlMatch(url, excludedPathsForDownload) &&
    !isExactMinistering
  ) {
    // DOWNLOAD REPORT DATA ACTION
    const downloadReportFiles = [
      jszip,
      fileUtils,
      navUtils,
      tableUtils,
      uiUtils,
      modalUtils,
      "js/actions/downloadReportData/downloadUtils.js",
      "js/actions/downloadReportData/main.js",
    ];

    actions.push({
      title: "Download Report Data (CSV)",
      type: "script",
      scriptFile: [utils, ...downloadReportFiles],
    });

    // TABLE FILTER ACTION
    const tableFilterFiles = [
      navUtils,
      dataUtils,
      tableUtils,
      uiUtils,
      modalUtils,
      "js/actions/tableFilters/templates.js",
      "js/actions/tableFilters/filterUtils.js",
      "js/actions/tableFilters/main.js",
    ];

    actions.push({
      title: "Filter Table Data (WIP)",
      type: "script",
      scriptFile: [utils, ...tableFilterFiles],
    });
  }

  /******* ACTIONS FOR MEMBER PROFILE PAGES ********/
  if (lcrUrlMatch(url, "records/member-profile")) {
    const memberProfileFiles = [
      uiUtils,
      "js/actions/editMemberProfile/editMemberProfileUtils.js",
      "js/actions/editMemberProfile/main.js",
    ];

    actions.push({
      title: "Edit Member Profile",
      type: "script",
      scriptFile: [utils, ...memberProfileFiles],
    });
  }

  /******* ACTIONS FOR "MANAGE PHOTOS" PAGE ********/
  if (lcrUrlMatch(url, "manage-photos")) {
    const managePhotosFiles = [
      fileUtils,
      navUtils,
      uiUtils,
      "js/actions/noPhotoList/noPhotoUtils.js",
      "js/actions/noPhotoList/main.js",
    ];

    actions.push({
      title: "Download List of Members with No Photo",
      type: "script",
      scriptFile: [utils, ...managePhotosFiles],
    });

    const memberFlashcardsFiles = [
      navUtils,
      uiUtils,
      modalUtils,
      "js/actions/memberFlashcards/templates.js",
      "js/actions/memberFlashcards/memberFlashcardsUtils.js",
      "js/actions/memberFlashcards/main.js",
    ];

    actions.push({
      title: "Member Flashcards",
      type: "script",
      scriptFile: [utils, ...memberFlashcardsFiles],
    });
  }

  /** ACTION FOR FINDING MEMBERS WITH MORE THAN **/
  /***************** ONE CALLING *****************/
  const membersMoreThanOneCallingPages = [
    "orgs/callings-by-organization",
    "orgs/members-with-callings",
    "mlt/report/member-callings",
  ];
  if (lcrUrlMatch(url, membersMoreThanOneCallingPages)) {
    const multipleCallingsFiles = [
      uiUtils,
      tableUtils,
      fileUtils,
      modalUtils,
      "js/actions/findMultipleCallings/templates.js",
      "js/actions/findMultipleCallings/findMultipleCallingsUtils.js",
      "js/actions/findMultipleCallings/main.js",
    ];

    actions.push({
      title: "Find Members with More Than One Calling",
      type: "script",
      scriptFile: [utils, ...multipleCallingsFiles],
    });
  }

  /** ACTIONS FOR "CLASS & QUORUM ATTENDANCE" PAGE */
  if (lcrUrlMatch(url, "report/class-and-quorum-attendance")) {
    const attendanceFiles = [
      fileUtils,
      dataUtils,
      uiUtils,
      modalUtils,
      logUtils,
      tableUtils,
      navUtils,
      "js/actions/processAttendance/templates.js",
      "js/actions/processAttendance/attendanceUtils.js",
      "js/actions/processAttendance/main.js",
    ];
    actions.push({
      title: "Input Class/Quorum Attendance",
      type: "script",
      scriptFile: [utils, ...attendanceFiles],
    });
  }

  // Add more URL-specific actions here
  // e.g., if (url.includes(LCR + 'finance')) { ... }
  return actions;
};

/** Example code for loading a page action instead of a script. Not in use
actions.push({
  title: "Advanced Member Tools",
  type: "page",
  pageUrl: ["options_page.html?section=membership"],
});
*/

/**
 * Helper function that checks if the given URL matches the specified pattern(s), assuming the URL starts with "lcr.churchofjesuschrist.org/".
 * @param {string} url - The URL to check.
 * @param {string|Array<string>} patterns - A single URL pattern or an array of URL patterns to match against (without the base LCR URL).
 * @param {boolean} finance - If the URL is a finance url (true) or a normal LCR url (false)
 * @returns {boolean} - True if the URL matches any of the patterns, false otherwise.
 */
function lcrUrlMatch(url, patterns, finance = false) {
  const LCR = finance
    ? ["lcrf.churchofjesuschrist.org/", "lcrffe.churchofjesuschrist.org/"]
    : ["lcr.churchofjesuschrist.org/"];

  const matchesPattern = (base, pattern) => {
    const fullPattern = pattern.startsWith(base) ? pattern : base + pattern;
    return url.includes(fullPattern);
  };

  if (typeof patterns === "string") {
    return LCR.some((base) => matchesPattern(base, patterns));
  } else if (Array.isArray(patterns)) {
    return patterns.some((pattern) =>
      LCR.some((base) => matchesPattern(base, pattern))
    );
  }
  return false;
}
