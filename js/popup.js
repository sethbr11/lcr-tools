document.addEventListener("DOMContentLoaded", () => {
  const menuItemsContainer = document.getElementById("menu-items");
  const statusMessage = document.getElementById("status-message");

  // Function to display status messages in the popup
  function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.className = isError
      ? "status-message error"
      : "status-message success";
    setTimeout(() => {
      statusMessage.textContent = "";
      statusMessage.className = "status-message";
    }, 3000); // Clear message after 3 seconds
  }

  // Get the current tab to determine the URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error("Error querying tabs:", chrome.runtime.lastError.message);
      menuItemsContainer.innerHTML =
        '<p class="error-message">Error loading actions. Please try again.</p>';
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

    // Clear loading message
    menuItemsContainer.innerHTML = "";

    // Define actions based on URL patterns
    const actions = getActionsForUrl(currentUrl);

    if (actions.length > 0) {
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
                files: filesToInject, // Pass the array of script paths directly
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
                  showStatus(`Action "${action.title}" executed successfully.`);
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
                    // It's possible injectionResults is empty or undefined if the script doesn't return a value or an error occurs before return.
                    // Or if multiple files are injected, injectionResults will be an array of results.
                    // We're primarily interested in the result of the *last* injected script (the main action script).
                    const lastResult =
                      injectionResults && injectionResults.length > 0
                        ? injectionResults[injectionResults.length - 1].result
                        : null;
                    if (lastResult === "success") {
                      showStatus(
                        `Action "${action.title}" executed successfully.`
                      );
                    } else if (lastResult && lastResult.error) {
                      showStatus(`Error: ${lastResult.error}`, true);
                    } else {
                      showStatus(
                        `Action "${action.title}" completed. Check page for results.`
                      );
                    }
                  }
                }
              }
            );
            window.close(); // Close popup after action
          } else if (action.type === "page") {
            window.location.href = action.pageUrl[0];
          }
        });
        menuItemsContainer.appendChild(menuItem);
      });
    } else {
      menuItemsContainer.innerHTML =
        '<p class="no-actions-message">No specific actions available for this LCR page.</p>';
    }
  });
});

/**
 * Determines available actions based on the current URL.
 * @param {string} url - The current page URL.
 * @returns {Array<Object>} - An array of action objects.
 */
function getActionsForUrl(url) {
  const actions = [];
  const LCR = "lcr.churchofjesuschrist.org/";
  const loadInd = "js/utils/loading_indicator.js";

  // Actions for reports pages
  if (url.includes(LCR + "report")) {
    actions.push({
      title: "Download Report Data (CSV)",
      type: "script",
      scriptFile: [loadInd, "js/actions/reports/downloadReportData.js"],
    });
  }

  // Actions for "Member Directory" page
  if (url.includes(LCR + "records/member-list")) {
    actions.push({
      title: "Export Member List",
      type: "script",
      scriptFile: [loadInd, "js/actions/membership/exportMemberList.js"],
    });
    /** Example code for loading a page action instead of a script. Not in use
    actions.push({
      title: "Advanced Member Tools",
      type: "page",
      pageUrl: ["options_page.html?section=membership"],
    });
    */
  }

  // Actions for Member Profile pages
  if (url.includes(LCR + "records/member-profile")) {
    actions.push({
      title: "Edit Member Profile",
      type: "script",
      scriptFile: ["js/actions/member_profile/editProfile.js"],
    });
  }

  // Actions for "Manage Photos" page
  if (url.includes(LCR + "manage-photos")) {
    actions.push({
      title: "Download List of Members with No Photo",
      type: "script",
      scriptFile: [loadInd, "js/actions/photos/noPhotoList.js"],
    });
  }

  // Actions for "Class & Quorum Attendance" page
  if (url.includes(LCR + "report/class-and-quorum-attendance")) {
    actions.push({
      title: "Input Class/Quorum Attendance",
      type: "script",
      scriptFile: [
        "js/utils/loading_indicator.js", // 1. Defines show/hideLoadingIndicator
        "js/actions/attendance/process_attendance.js", // 2. Defines LCR_TOOLS_PROCESS_ATTENDANCE
        "js/actions/attendance/setup_attendance_ui.js", // 3. Creates UI and calls the processing function
      ],
    });
  }

  // Add more URL-specific actions here
  // e.g., if (url.includes(LCR + 'finance')) { ... }

  return actions;
}
