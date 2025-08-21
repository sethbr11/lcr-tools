document.addEventListener("DOMContentLoaded", () => {
  const menuItemsContainer = document.getElementById("menu-items");
  const statusMessage = document.getElementById("status-message");

  // Function to display status messages in the popup
  function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.className = `status-banner ${
      isError ? "error" : "success"
    } show`;

    setTimeout(() => {
      statusMessage.classList.remove("show");
      setTimeout(() => {
        statusMessage.textContent = "";
        statusMessage.className = "status-banner";
      }, 300);
    }, 3000);
  }

  // Get the current tab to determine the URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error("Error querying tabs:", chrome.runtime.lastError.message);
      menuItemsContainer.innerHTML =
        '<p class="error-message">Error loading actions.<br>Please try again.</p>';
      showStatus("Error loading tab information.", true);
      return;
    }
    if (!tabs || tabs.length === 0) {
      console.error("No active tab found.");
      menuItemsContainer.innerHTML =
        '<p class="error-message">Could not determine the current page.</p>';
      showStatus("Could not determine the current page.", true);
      return;
    }

    const currentTab = tabs[0];
    const currentUrl = currentTab.url;

    // Define actions based on URL patterns
    const actions = getActionsForUrl(currentUrl);

    // Clear loading message and populate actions
    if (actions.length > 0) {
      menuItemsContainer.innerHTML = "";
      actions.forEach((action) => {
        const menuItem = document.createElement("button");
        menuItem.className = "menu-item";
        menuItem.textContent = action.title;
        menuItem.addEventListener("click", () => {
          if (action.type === "script") {
            // Ensure action.scriptFile is an array of strings
            const filesToInject = Array.isArray(action.scriptFile)
              ? action.scriptFile
              : [action.scriptFile];

            chrome.scripting.executeScript(
              {
                target: { tabId: currentTab.id },
                files: filesToInject,
              },
              (injectionResults) => {
                if (chrome.runtime.lastError) {
                  console.error(
                    `Error injecting script(s) ${filesToInject.join(", ")}:`,
                    chrome.runtime.lastError.message
                  );
                  showStatus(
                    `Error: ${chrome.runtime.lastError.message}`,
                    true
                  );
                } else if (
                  injectionResults &&
                  injectionResults.length > 0 &&
                  injectionResults[0].result === "success"
                ) {
                  showStatus(`"${action.title}" executed successfully.`);
                } else {
                  // Check for specific error messages passed from content script
                  if (
                    injectionResults &&
                    injectionResults.length > 0 &&
                    injectionResults[0].result &&
                    injectionResults[0].result.error
                  ) {
                    showStatus(
                      `Error: ${injectionResults[0].result.error}`,
                      true
                    );
                  } else {
                    const lastResult =
                      injectionResults && injectionResults.length > 0
                        ? injectionResults[injectionResults.length - 1].result
                        : null;
                    if (lastResult === "success") {
                      showStatus(`"${action.title}" executed successfully.`);
                    } else if (lastResult && lastResult.error) {
                      showStatus(`Error: ${lastResult.error}`, true);
                    } else {
                      showStatus(
                        `"${action.title}" completed. Check page for results.`
                      );
                    }
                  }
                }
              }
            );
            window.close();
          } else if (action.type === "page") {
            window.location.href = action.pageUrl[0];
          }
        });
        menuItemsContainer.appendChild(menuItem);
      });
    } else {
      menuItemsContainer.innerHTML =
        '<p class="no-actions-message">No specific actions available for this LCR page.<br><br>Navigate to an LCR report or member page to see available tools.</p>';
    }
  });
});

/**
 * Checks if the given URL matches the specified pattern(s), assuming the URL starts with "lcr.churchofjesuschrist.org/".
 * @param {string} url - The URL to check.
 * @param {string|Array<string>} patterns - A single URL pattern or an array of URL patterns to match against (without the base LCR URL).
 * @returns {boolean} - True if the URL matches any of the patterns, false otherwise.
 */
function lcrUrlMatch(url, patterns) {
  const LCR = "lcr.churchofjesuschrist.org/";

  if (typeof patterns === "string") {
    const fullPattern = patterns.startsWith(LCR) ? patterns : LCR + patterns;
    return url.includes(fullPattern);
  } else if (Array.isArray(patterns)) {
    return patterns.some((pattern) => {
      const fullPattern = pattern.startsWith(LCR) ? pattern : LCR + pattern;
      return url.includes(fullPattern);
    });
  }
  return false;
}

/**
 * Determines available actions based on the current URL.
 * @param {string} url - The current page URL.
 * @returns {Array<Object>} - An array of action objects.
 */
function getActionsForUrl(url) {
  const actions = [];

  // Input utilities
  const u = (n) => `js/utils/${n}.js`,
    loadInd = u("loading_indicator"),
    csvUtils = u("csv_utils"),
    uiUtils = u("ui_utils"),
    scrapingUtils = u("scraping_utils"),
    fileUtils = u("file_utils"),
    dateUtils = u("date_utils"),
    loggingUtils = u("logging_utils"),
    domUtils = u("dom_utils"),
    stringUtils = u("string_utils"),
    paginationUtils = u("pagination_utils");

  /********* DOWNLOAD REPORT DATA ACTION ***********/
  /*********** Available on most pages *************/
  const excludedPathsForDownload = [
    "records/member-list",
    "records/member-profile",
    "manage-photos",
    "orgs/callings-by-organization",
    "report/self-reliance",
    "report/members-moved-in",
  ];
  // Exclude only if the URL ends with "ministering" (not "ministering-assignments")
  const isExactMinistering =
    url.includes("lcr.churchofjesuschrist.org/ministering") &&
    !url.includes("lcr.churchofjesuschrist.org/ministering-assignments");

  if (
    url.includes("lcr.churchofjesuschrist.org/") &&
    !lcrUrlMatch(url, excludedPathsForDownload) &&
    !isExactMinistering
  ) {
    actions.push({
      title: "Download Report Data (CSV)",
      type: "script",
      scriptFile: [
        loadInd,
        csvUtils,
        fileUtils,
        scrapingUtils,
        paginationUtils,
        "js/actions/reports/downloadReportData.js",
      ],
    });
  }

  /***** ACTIONS FOR "MEMBER DIRECTORY" PAGE *******/
  if (lcrUrlMatch(url, "records/member-list")) {
    actions.push({
      title: "Export Member List",
      type: "script",
      scriptFile: [
        loadInd,
        csvUtils,
        scrapingUtils,
        domUtils,
        "js/actions/membership/exportMemberList.js",
      ],
    });
  }

  /******* ACTIONS FOR MEMBER PROFILE PAGES ********/
  if (lcrUrlMatch(url, "records/member-profile")) {
    actions.push({
      title: "Edit Member Profile",
      type: "script",
      scriptFile: ["js/actions/member_profile/editProfile.js"],
    });
  }

  /******* ACTIONS FOR "MANAGE PHOTOS" PAGE ********/
  if (lcrUrlMatch(url, "manage-photos")) {
    actions.push({
      title: "Download List of Members with No Photo",
      type: "script",
      scriptFile: [
        csvUtils,
        loadInd,
        scrapingUtils,
        "js/actions/photos/noPhotoList.js",
      ],
    });
  }

  /** ACTIONS FOR "CLASS & QUORUM ATTENDANCE" PAGE */
  if (lcrUrlMatch(url, "report/class-and-quorum-attendance")) {
    actions.push({
      title: "Input Class/Quorum Attendance",
      type: "script",
      scriptFile: [
        loadInd,
        csvUtils,
        uiUtils,
        fileUtils,
        dateUtils,
        loggingUtils,
        stringUtils,
        scrapingUtils,
        paginationUtils,
        "js/actions/attendance/process_attendance.js",
        "js/actions/attendance/guest_attendance_handler.js",
        "js/actions/attendance/attendance_results_ui.js",
        "js/actions/attendance/setup_attendance_ui.js",
      ],
    });
  }

  /** ACTION FOR FINDING MEMBERS WITH MORE THAN **/
  /***************** ONE CALLING *****************/
  const membersMoreThanOneCallingPages = [
    "orgs/callings-by-organization",
    "orgs/members-with-callings",
  ];
  if (lcrUrlMatch(url, membersMoreThanOneCallingPages)) {
    actions.push({
      title: "Find Members with More Than One Calling",
      type: "script",
      scriptFile: [
        loadInd,
        uiUtils,
        csvUtils,
        "js/actions/callings/find_multiple_callings.js",
        "js/actions/callings/setup_multiple_callings_ui.js",
      ],
    });
  }

  // Add more URL-specific actions here
  // e.g., if (url.includes(LCR + 'finance')) { ... }
  return actions;
}

/** Example code for loading a page action instead of a script. Not in use
actions.push({
  title: "Advanced Member Tools",
  type: "page",
  pageUrl: ["options_page.html?section=membership"],
});
*/
