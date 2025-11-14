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
        '<p class="no-actions-message">No specific actions available for this LCR page.</p>';
    }
  });

  // Simplified directory button setup
  const directoryButton = document.getElementById("directory-button");
  if (directoryButton) {
    directoryButton.addEventListener("click", () => {
      const container = document.querySelector(".popup-container");
      if (container) {
        container.classList.add("slide-out-left");
        setTimeout(() => {
          window.location.href = "directory.html";
        }, 300);
      } else {
        window.location.href = "directory.html";
      }
    });
  }
});
