// Only declare if not already declared to prevent "Identifier has already been declared"
if (typeof LOADER_ID_SHARED === "undefined") {
  const LOADER_ID_SHARED = "lcr-tools-loader-overlay-shared"; // Unique ID for the shared loader

  // Make functions globally available in the content script's isolated world
  // by attaching them to window, but only if they don't exist.
  if (typeof window.lcrToolsShowLoadingIndicator === "undefined") {
    window.lcrToolsShowLoadingIndicator = function (
      message = "Processing... Please wait.",
      subheader = ""
    ) {
      document.addEventListener(
        "keydown",
        window.lcrToolsEscapeKeyListenerInstance,
        { capture: true }
      ); // Use instance

      if (document.getElementById(LOADER_ID_SHARED)) {
        const existingTextElement = document
          .getElementById(LOADER_ID_SHARED)
          .querySelector("p");
        if (existingTextElement) {
          existingTextElement.textContent = message;
          const existingSubheaderElement = document
            .getElementById(LOADER_ID_SHARED)
            .querySelector("span");
          if (existingSubheaderElement) {
            existingSubheaderElement.textContent = subheader;
          }
        }
        return;
      }

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
      loadingText.textContent = message;
      loadingText.style.margin = "0";

      const subheaderText = document.createElement("span");
      subheaderText.textContent = subheader;
      subheaderText.style.marginTop = "5px";
      subheaderText.style.fontSize = "14px";
      subheaderText.style.color = "rgba(255, 255, 255, 0.8)";

      overlay.appendChild(spinner);
      overlay.appendChild(loadingText);
      overlay.appendChild(subheaderText);
      document.body.appendChild(overlay);

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
  }

  if (typeof window.lcrToolsHideLoadingIndicator === "undefined") {
    window.lcrToolsHideLoadingIndicator = function () {
      document.removeEventListener(
        "keydown",
        window.lcrToolsEscapeKeyListenerInstance,
        { capture: true }
      ); // Use instance
      const overlay = document.getElementById(LOADER_ID_SHARED);
      if (overlay) {
        overlay.parentNode.removeChild(overlay);
      }
    };
  }

  if (typeof window.lcrToolsShouldStopProcessing === "undefined") {
    window.lcrToolsShouldStopProcessing = false; // Global flag for aborting
  }

  if (typeof window.lcrToolsEscapeKeyListenerInstance === "undefined") {
    window.lcrToolsEscapeKeyListenerInstance = (event) => {
      if (event.key === "Escape") {
        // Attempt to log the abort on the active logger if available
        try {
          if (
            window.loggingUtils &&
            typeof window.loggingUtils.getCurrentLogger === "function"
          ) {
            const activeLogger = window.loggingUtils.getCurrentLogger();
            if (
              activeLogger &&
              typeof activeLogger.logUserAction === "function"
            ) {
              activeLogger.logUserAction(
                "KEYPRESS",
                "Escape",
                "User requested abort via Escape key",
                { context: "loading_indicator" }
              );
            } else if (
              activeLogger &&
              typeof activeLogger.logAction === "function"
            ) {
              activeLogger.logAction(
                "USER_ABORT_EscapeKeyPressed_LOADING_INDICATOR",
                { context: "loading_indicator" }
              );
            } else {
              console.log(
                "LCR Tools: Escape key pressed, but active logger has no logging methods."
              );
            }
            // Also request abort via the active logger so processors that consult the logger see it.
            if (
              activeLogger &&
              typeof activeLogger.requestAbort === "function"
            ) {
              activeLogger.requestAbort(true);
            }
          } else {
            console.log(
              "LCR Tools: Escape key pressed (loader context), no active logger available."
            );
          }
        } catch (e) {
          console.warn(
            "LCR Tools: Error while attempting to log Escape key press",
            e
          );
        }

        window.lcrToolsShouldStopProcessing = true;
        const loaderElement = document.getElementById(LOADER_ID_SHARED);
        if (loaderElement) {
          const textElement = loaderElement.querySelector("p");
          if (textElement) {
            textElement.textContent = "Process aborting at user request...";
          }
        }
        event.stopPropagation(); // Stop event from bubbling further if needed
        event.preventDefault(); // Prevent any default browser action for Escape
      }
    };
  }

  // Expose the functions globally if they were just defined
  // This makes them callable as showLoadingIndicator() and hideLoadingIndicator()
  // in subsequent scripts injected into the same context.
  if (!window.showLoadingIndicator && window.lcrToolsShowLoadingIndicator) {
    window.showLoadingIndicator = window.lcrToolsShowLoadingIndicator;
  }
  if (!window.hideLoadingIndicator && window.lcrToolsHideLoadingIndicator) {
    window.hideLoadingIndicator = window.lcrToolsHideLoadingIndicator;
  }
} else {
  console.log(
    "LCR Tools: loadingIndicator.js already initialized in this context."
  );
}
