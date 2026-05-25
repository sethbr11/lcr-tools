// Input utilities
const u = (n) => `js/utils/${n}.js`,
  utils = u("utils"),
  fileUtils = u("fileUtils"),
  logUtils = u("loggingUtils"),
  navUtils = u("navigationUtils"),
  tableUtils = u("tableUtils"),
  uiUtils = u("uiUtils"),
  modalUtils = u("modalUtils"),
  dataUtils = u("dataUtils"),
  lcrApiUtils = u("lcrApiUtils");

// Vendor files
const jszip = "js/vendor/jszip.min.js";

// Regex matched: basePage and confidential pages
const basePage = /^https:\/\/lcr\.churchofjesuschrist\.org\/(\?.*)?$/;
const CA_PATH_REGEX = /\/ca(?=\/|\?|$)/;

/**
 * Action metadata - single source of truth for all actions
 * This contains all information needed for both popup display and directory
 */
window.ACTION_METADATA = [
  {
    id: "downloadReportData",
    title: "Download Report Data (CSV)",
    category: "Data Export",
    description:
      "Export table data from LCR reports to CSV format for analysis in Excel or other tools.",
    type: "script",
    scriptFile: [
      utils,
      jszip,
      fileUtils,
      navUtils,
      tableUtils,
      uiUtils,
      modalUtils,
      "js/actions/downloadReportData/downloadUtils.js",
      "js/actions/downloadReportData/main.js",
    ],
    urlPatterns: {
      include: [
        "lcr.churchofjesuschrist.org/",
        "lcrf.churchofjesuschrist.org/",
        "lcrffe.churchofjesuschrist.org/",
      ],
      exclude: [
        "records/member-profile",
        "manage-photos",
        "report/self-reliance",
        "records/merge-duplicate",
        "mlt/approve-photos",
        CA_PATH_REGEX,
        basePage,
      ],
      excludeExactMinistering: true, // Special case
    },
    directoryPages: [{ name: "Most LCR pages with tables", url: null }],
    directoryExcluded: [
      "Member Profile Pages",
      "Manage Photos Page",
      "Self-Reliance Report",
      "Merge Duplicate Members",
      "Confidential Report Pages",
    ],
  },
  {
    id: "tableFilters",
    title: "Filter Table Data (WIP)",
    category: "Data Management",
    description:
      "Apply custom filters to tables on LCR pages to find specific data quickly. Work in progress.",
    type: "script",
    scriptFile: [
      utils,
      navUtils,
      dataUtils,
      tableUtils,
      uiUtils,
      modalUtils,
      "js/actions/tableFilters/templates.js",
      "js/actions/tableFilters/filterUtils.js",
      "js/actions/tableFilters/main.js",
    ],
    urlPatterns: {
      include: [
        "lcr.churchofjesuschrist.org/",
        "lcrf.churchofjesuschrist.org/",
        "lcrffe.churchofjesuschrist.org/",
      ],
      exclude: [
        "records/member-profile",
        "manage-photos",
        "report/self-reliance",
        "records/merge-duplicate",
        "mlt/approve-photos",
        CA_PATH_REGEX,
        basePage,
      ],
      excludeExactMinistering: true,
    },
    directoryPages: [{ name: "Most LCR pages with tables", url: null }],
    directoryExcluded: [
      "Member Profile Pages",
      "Manage Photos Page",
      "Self-Reliance Report",
      "Merge Duplicate Members",
      "Confidential Report Pages",
    ],
  },
  {
    id: "noPhotoList",
    title: "Download List of Members with No Photo",
    category: "Photo Management",
    description:
      "Generate a list of all members who are missing profile photos for easy follow-up.",
    type: "script",
    scriptFile: [
      utils,
      fileUtils,
      navUtils,
      uiUtils,
      modalUtils,
      u("storageUtils"),
      lcrApiUtils,
      "js/actions/noPhotoList/noPhotoUtils.js",
      "js/actions/noPhotoList/main.js",
    ],
    urlPatterns: {
      include: ["mlt/records/member-list"],
    },
    directoryPages: [
      {
        name: "Member Directory",
        url: "https://lcr.churchofjesuschrist.org/mlt/records/member-list",
      },
    ],
  },
  {
    id: "memberFlashcards",
    title: "Member Flashcards",
    category: "Photo Management",
    description:
      "Study and memorize member faces and names with an interactive flashcard interface.",
    type: "script",
    scriptFile: [
      utils,
      navUtils,
      uiUtils,
      modalUtils,
      u("storageUtils"),
      lcrApiUtils,
      "js/actions/memberFlashcards/templates.js",
      "js/actions/memberFlashcards/memberFlashcardsUtils.js",
      "js/actions/memberFlashcards/main.js",
    ],
    urlPatterns: {
      include: ["mlt/records/member-list"],
    },
    directoryPages: [
      {
        name: "Member Directory",
        url: "https://lcr.churchofjesuschrist.org/mlt/records/member-list",
      },
    ],
  },
  {
    id: "findMultipleCallings",
    title: "Find Members with More Than One Calling",
    category: "Callings",
    description:
      "Identify members who hold multiple callings to help balance workload across the ward/stake.",
    type: "script",
    scriptFile: [
      utils,
      uiUtils,
      tableUtils,
      fileUtils,
      modalUtils,
      "js/actions/findMultipleCallings/templates.js",
      "js/actions/findMultipleCallings/findMultipleCallingsUtils.js",
      "js/actions/findMultipleCallings/main.js",
    ],
    urlPatterns: {
      include: ["mlt/orgs", "mlt/report/member-callings"],
    },
    directoryPages: [
      {
        name: "Callings by Organization",
        url: "https://lcr.churchofjesuschrist.org/mlt/orgs",
      },
      {
        name: "Member Callings Report",
        url: "https://lcr.churchofjesuschrist.org/mlt/report/member-callings",
      },
    ],
  },
  {
    id: "processAttendance",
    title: "Input Class/Quorum Attendance",
    category: "Attendance",
    description:
      "Streamlined interface for quickly inputting attendance data for classes and quorums.",
    type: "script",
    scriptFile: [
      utils,
      fileUtils,
      dataUtils,
      uiUtils,
      modalUtils,
      logUtils,
      tableUtils,
      navUtils,
      "js/actions/processAttendance/templates.js",
      "js/actions/processAttendance/utils/csvParser.js",
      "js/actions/processAttendance/utils/domUtils.js",
      "js/actions/processAttendance/utils/guestLogic.js",
      "js/actions/processAttendance/utils/ui.js",
      "js/actions/processAttendance/utils/coreLogic.js",
      "js/actions/processAttendance/utils/inputHandlers.js",
      "js/actions/processAttendance/main.js",
    ],
    urlPatterns: {
      include: ["mlt/report/class-and-quorum-attendance"],
    },
    directoryPages: [
      {
        name: "Class & Quorum Attendance",
        url: "https://lcr.churchofjesuschrist.org/mlt/report/class-and-quorum-attendance",
      },
    ],
  },
  {
    id: "tripPlanning",
    title: "Trip Planning",
    category: "Mapping",
    description: "Optimize routes and plan trips to visit members.",
    type: "script",
    scriptFile: [utils, uiUtils, tableUtils, "js/actions/tripPlanning/main.js"],
    urlPatterns: {
      include: ["mlt/report/members-moved-in"],
    },
    directoryPages: [
      {
        name: "Members Moved In Report",
        url: "https://lcr.churchofjesuschrist.org/mlt/report/members-moved-in",
      },
    ],
  },
  {
    id: "membersOutsideBoundary",
    title: "Get Boundary Report",
    category: "Mapping",
    description:
      "Export full member list with designations of who is in and outside the ward boundary.",
    type: "script",
    scriptFile: [
      utils,
      uiUtils,
      modalUtils,
      fileUtils,
      "js/actions/membersOutsideBoundary/templates.js",
      "js/actions/membersOutsideBoundary/membersOutsideBoundaryUtils.js",
      "js/actions/membersOutsideBoundary/main.js",
    ],
    urlPatterns: {
      include: ["directory.churchofjesuschrist.org/"],
    },
    directoryPages: [
      {
        name: "Directory/Map Page",
        url: "https://directory.churchofjesuschrist.org/",
      },
    ],
  },
];

/**
 * Determines available actions based on the current URL.
 * @param {string} url - The current page URL.
 * @returns {Array<Object>} - An array of action objects.
 */
window.getActionsForUrl = function (url) {
  // Error handling: ensure url is defined and a string
  if (!url || typeof url !== "string") return [];
  const actions = [];

  // Iterate through ACTION_METADATA and check if each action should be available
  window.ACTION_METADATA.forEach((actionMeta) => {
    if (matchesUrlPatterns(url, actionMeta.urlPatterns)) {
      // Only include the properties needed for popup display
      actions.push({
        title: actionMeta.title,
        type: actionMeta.type,
        scriptFile: actionMeta.scriptFile,
        pageUrl: actionMeta.pageUrl, // For page-type actions
      });
    }
  });

  return actions;
};

/**
 * Helper function to check if URL matches the action's URL patterns
 */
function matchesUrlPatterns(url, patterns) {
  if (!patterns || !patterns.include) return false;

  // Check if URL matches any include pattern
  const includeMatch = patterns.include.some((pattern) =>
    url.includes(pattern),
  );
  if (!includeMatch) return false;

  // Check exclude patterns
  if (patterns.exclude) {
    for (const excludePattern of patterns.exclude) {
      if (excludePattern instanceof RegExp) {
        if (excludePattern.test(url)) return false;
      } else if (url.includes(excludePattern)) {
        return false;
      }
    }
  }

  // Special case: exact ministering check
  if (patterns.excludeExactMinistering) {
    const isExactMinistering =
      url.includes("lcr.churchofjesuschrist.org/ministering") &&
      !url.includes("lcr.churchofjesuschrist.org/ministering-assignments");
    if (isExactMinistering) return false;
  }

  return true;
}
