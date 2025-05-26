const LOADER_ID_SHARED = "lcr-tools-loader-overlay-shared";
window.lcrToolsShouldStopProcessing = false; // Global flag for aborting

const lcrToolsEscapeKeyListener = (event) => {
  if (event.key === "Escape") {
    if (typeof logAction === "function") {
      // Check if logAction is available (might not be in all contexts)
      logAction("USER_ABORT_EscapeKeyPressed_ универсальный");
    } else {
      console.log("LCR Tools: Escape key pressed, attempting to abort.");
    }
    window.lcrToolsShouldStopProcessing = true;
    // Update loader message if it's visible
    const loaderElement = document.getElementById(LOADER_ID_SHARED);
    if (loaderElement) {
      const textElement = loaderElement.querySelector("p");
      if (textElement) {
        textElement.textContent = "Process aborting at user request...";
      }
    }
  }
};

/**
 * Shows a full-page loading indicator with a message.
 * @param {string} message - The message to display below the spinner.
 */
function showLoadingIndicator(message = "Processing... Please wait.") {
  window.lcrToolsShouldStopProcessing = false; // Reset flag when showing loader
  document.addEventListener("keydown", lcrToolsEscapeKeyListener);

  if (document.getElementById(LOADER_ID_SHARED)) {
    const existingTextElement = document
      .getElementById(LOADER_ID_SHARED)
      .querySelector("p");
    if (existingTextElement) {
      existingTextElement.textContent = message;
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
  overlay.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
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

  overlay.appendChild(spinner);
  overlay.appendChild(loadingText);
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
}

/**
 * Hides the loading indicator.
 */
function hideLoadingIndicator() {
  document.removeEventListener("keydown", lcrToolsEscapeKeyListener);
  const overlay = document.getElementById(LOADER_ID_SHARED);
  if (overlay) {
    overlay.parentNode.removeChild(overlay);
  }
  // Do NOT reset lcrToolsShouldStopProcessing here, let the main script handle it if needed for re-runs.
  // Or reset it if the expectation is that each show/hide cycle is independent. For now, let calling script manage.
}
