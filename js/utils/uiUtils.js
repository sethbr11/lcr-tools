/**
 * Utility file for managing user interface elements in the LCR extension.
 * Handles loading indicators, abort functionality via ESC key, and overlays
 * to provide feedback during long-running processes like data collection.
 */
(() => {
  utils.returnIfLoaded("uiUtils");
  const LOADER_ID_SHARED = "lcr-tools-loader-overlay-shared";

  /**
   * Removes the loading overlay from the DOM if present
   */
  const removeOverlay = () => {
    const el = document.getElementById(LOADER_ID_SHARED);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  };

  /**
   * Shows the loading overlay with optional message and subheader
   * @param {string} message - Main message to display
   * @param {string} subheader - Subheader message
   */
  const showLoadingIndicator = (
    message = "Processing... Please wait.",
    subheader = "Press the ESC key to abort"
  ) => {
    document.addEventListener("keydown", escapeKeyEventListener, {
      capture: true,
    });
    const overlay = document.getElementById(LOADER_ID_SHARED);
    if (overlay) {
      const existingTextElement = overlay.querySelector("p");
      if (existingTextElement) existingTextElement.textContent = message;
      const existingSubheaderElement = overlay.querySelector("span");
      if (existingSubheaderElement)
        existingSubheaderElement.textContent = subheader;
      return;
    }
    createLoadingIndicator(message, subheader);
    if (!document.getElementById("lcr-tools-spin-animation-style-shared")) {
      const style = document.createElement("style");
      style.id = "lcr-tools-spin-animation-style-shared";
      style.innerHTML = `
        @keyframes lcrToolsSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  };

  /**
   * Hides the loading overlay, optionally showing abort message if triggered by event
   * @param {Event} event - Optional event triggering the hide
   */
  const hideLoadingIndicator = (event) => {
    if (event) {
      window.lcrToolsShouldStopProcessing = true;
    }
    document.removeEventListener("keydown", escapeKeyEventListener, {
      capture: true,
    });
    const loaderElement = document.getElementById(LOADER_ID_SHARED);
    if (loaderElement) {
      if (event) {
        const txt = loaderElement.querySelector("p");
        if (txt) txt.textContent = "Process aborting at user request...";
        setTimeout(removeOverlay, 1000);
      } else {
        removeOverlay();
      }
    }
  };

  /**
   * Handles Escape key press to abort processing and log the action
   * @param {KeyboardEvent} e - The key event
   */
  const escapeKeyEventListener = (e) => {
    if (e.key === "Escape") {
      console.log("LCR Tools: ESC key pressed, aborting process...");
      hideLoadingIndicator(e);
      if (utils.checkIfLoaded("loggingUtils")) {
        const activeLogger = loggingUtils.getCurrentLogger();
        if (activeLogger) {
          activeLogger.logUserAction(
            "KEYPRESS",
            "Escape",
            "User requested abort via Escape key",
            { context: "loading_indicator" }
          );
        } else {
          console.log(
            "LCR Tools: Escape key pressed, but no active logger was found."
          );
        }
      }

      e.stopPropagation(); // Stop event from bubbling further if needed
      e.preventDefault(); // Prevent any default browser action for Escape
    }
  };

  /**
   * Creates and inserts the loading overlay into the DOM
   * @param {string} headerMessage - Header message
   * @param {string} subheaderMessage - Subheader message
   */
  const createLoadingIndicator = (headerMessage, subheaderMessage) => {
    const overlay = document.createElement("div");
    overlay.id = LOADER_ID_SHARED;
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.65)";
    overlay.style.zIndex = "20000";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";
    overlay.style.color = "white";
    overlay.style.fontSize = "18px";
    overlay.style.fontFamily =
      "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    overlay.style.textAlign = "center";

    const spinner = document.createElement("div");
    spinner.style.border = "8px solid #f3f3f3";
    spinner.style.borderTop = "8px solid #3498db";
    spinner.style.borderRadius = "50%";
    spinner.style.width = "60px";
    spinner.style.height = "60px";
    spinner.style.animation = "lcrToolsSpin 1s linear infinite";
    spinner.style.marginBottom = "15px";

    const loadingText = document.createElement("p");
    loadingText.textContent = headerMessage;
    loadingText.style.margin = "0";

    const subheaderText = document.createElement("span");
    subheaderText.textContent = subheaderMessage;
    subheaderText.style.marginTop = "5px";
    subheaderText.style.fontSize = "14px";
    subheaderText.style.color = "rgba(255, 255, 255, 0.8)";

    overlay.appendChild(spinner);
    overlay.appendChild(loadingText);
    overlay.appendChild(subheaderText);
    document.body.appendChild(overlay);
  };

  /**
   * Checks if the process has been aborted
   * @returns {boolean} - True if aborted
   */
  const isAborted = () => window.lcrToolsShouldStopProcessing;

  /**
   * Reset the aborted flag
   */
  const resetAborted = () => (window.lcrToolsShouldStopProcessing = false);

  /**
   * Removes an element from the DOM based on a selector.
   * @param {string} selector - The CSS selector for the element to remove.
   * @param {string} elementName - A descriptive name for the element (used in logs).
   * @returns {boolean} - True if the element was found and removed, false otherwise.
   */
  function removeElement(selector, elementName = "element") {
    const element = document.querySelector(selector);
    if (element) {
      element.parentNode.removeChild(element);
      console.log(`LCR Tools: Removed '${elementName}' from the page.`);
      return true;
    } else {
      console.warn(
        `LCR Tools: '${elementName}' not found. It might have already been removed or the page structure changed.`
      );
      return false;
    }
  }

  /**
   * Clicks a button or link based on a selector.
   * @param {string} selector - The CSS selector for the button or link.
   * @param {string} buttonName - A descriptive name for the button (used in logs).
   * @returns {boolean} - True if the button was found and clicked, false otherwise.
   */
  function clickButton(
    selector,
    buttonName = "button",
    ignoreNotPresent = false
  ) {
    const button = document.querySelector(selector);
    if (button) {
      console.log(`LCR Tools: Clicking the '${buttonName}'.`);
      button.click();

      // Log the action if loggingUtils is available
      if (utils.checkIfLoaded("loggingUtils")) {
        const activeLogger = loggingUtils.getCurrentLogger();
        if (activeLogger) {
          activeLogger.logUserAction(
            "CLICK",
            buttonName,
            `User clicked the '${buttonName}'.`,
            { selector }
          );
        } else {
          console.log(
            `LCR Tools: '${buttonName}' clicked, but no active logger was found.`
          );
        }
      }

      return true;
    } else {
      if (!ignoreNotPresent) {
        console.error(
          `LCR Tools: '${buttonName}' not found. Cannot perform click.`
        );
        alert(`LCR Tools: Could not find the '${buttonName}' on the page.`);
      }
      return false;
    }
  }

  /**
   * Changes the value of a dropdown and dispatches a change event.
   * @param {Object} options - Options for changing the dropdown value.
   * @param {string} options.dropdownSelector - Selector for the dropdown element.
   * @param {string} options.value - Value to set in the dropdown.
   * @param {string} options.dropdownName - Name of the dropdown (for logging).
   * @param {number} [options.delay=1000] - Delay after changing the value (ms).
   * @returns {Promise<boolean>} - True if the value was successfully changed, false otherwise.
   */
  async function changeDropdown({
    dropdownSelector,
    value,
    dropdownName,
    delay = 1000,
  }) {
    const dropdown = document.querySelector(dropdownSelector);
    if (!dropdown) {
      console.error(`LCR Tools: '${dropdownName}' dropdown not found.`);
      alert(`LCR Tools: '${dropdownName}' dropdown not found.`);
      return false;
    }

    if (dropdown.value === value) {
      console.log(
        `LCR Tools: '${dropdownName}' dropdown already set to '${value}'.`
      );
      return true;
    }

    if (!navigationUtils.setSelectValue(dropdown, value, dropdownName)) {
      console.error(
        `LCR Tools: Failed to set '${dropdownName}' dropdown to '${value}'.`
      );
      alert(
        `LCR Tools: Failed to set '${dropdownName}' dropdown to '${value}'.`
      );
      return false;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
    console.log(
      `LCR Tools: '${dropdownName}' dropdown successfully set to '${value}'.`
    );
    return true;
  }

  /**
   * Shows a toast notification message
   * @param {string} message - The message to display
   * @param {Object} options - Configuration options
   * @param {string} options.type - Type of toast: 'success', 'error', 'info', 'warning' (default: 'success')
   * @param {number} options.duration - How long to show the toast in ms (default: 3000)
   * @param {string} options.position - Position: 'top-right', 'top-left', 'bottom-right', 'bottom-left' (default: 'top-left')
   */
  function showToast(
    message,
    { type = "success", duration = 3000, position = "top-left" } = {}
  ) {
    // Ensure toast container exists
    let container = document.getElementById("lcr-tools-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "lcr-tools-toast-container";
      container.style.cssText = `
        position: fixed;
        z-index: 100000;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;

      // Set position based on parameter
      const positions = {
        "top-right": "top: 20px; right: 20px;",
        "top-left": "top: 20px; left: 20px;",
        "bottom-right": "bottom: 20px; right: 20px;",
        "bottom-left": "bottom: 20px; left: 20px;",
      };
      container.style.cssText += positions[position] || positions["top-left"];

      document.body.appendChild(container);

      // Add toast styles if not already present
      if (!document.getElementById("lcr-tools-toast-styles")) {
        const style = document.createElement("style");
        style.id = "lcr-tools-toast-styles";
        style.textContent = `
          @keyframes lcrToastSlideIn {
            from {
              opacity: 0;
              transform: translateX(-100%);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes lcrToastSlideOut {
            from {
              opacity: 1;
              transform: translateX(0);
            }
            to {
              opacity: 0;
              transform: translateX(-100%);
            }
          }
          .lcr-tools-toast {
            pointer-events: auto;
            animation: lcrToastSlideIn 0.3s ease-out;
            min-width: 250px;
            max-width: 400px;
          }
          .lcr-tools-toast.lcr-tools-toast-exiting {
            animation: lcrToastSlideOut 0.3s ease-in;
          }
        `;
        document.head.appendChild(style);
      }
    }

    // Create toast element
    const toast = document.createElement("div");
    toast.className = "lcr-tools-toast";

    // Define colors and icons for different types
    const typeConfig = {
      success: {
        bg: "#10b981",
        icon: "✓",
      },
      error: {
        bg: "#ef4444",
        icon: "✕",
      },
      warning: {
        bg: "#f59e0b",
        icon: "⚠",
      },
      info: {
        bg: "#3b82f6",
        icon: "ℹ",
      },
    };

    const config = typeConfig[type] || typeConfig.success;

    toast.style.cssText = `
      background: ${config.bg};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `;

    // Add icon
    const iconSpan = document.createElement("span");
    iconSpan.textContent = config.icon;
    iconSpan.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      flex-shrink: 0;
    `;

    // Add message
    const messageSpan = document.createElement("span");
    messageSpan.textContent = message;
    messageSpan.style.flex = "1";

    toast.appendChild(iconSpan);
    toast.appendChild(messageSpan);

    // Add to container
    container.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
      toast.classList.add("lcr-tools-toast-exiting");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        // Remove container if empty
        if (container.children.length === 0) {
          container.remove();
        }
      }, 300); // Match animation duration
    }, duration);
  }

  window.uiUtils = {
    showLoadingIndicator,
    hideLoadingIndicator,
    isAborted,
    resetAborted,
    removeElement,
    clickButton,
    changeDropdown,
    showToast,
  };
})();
