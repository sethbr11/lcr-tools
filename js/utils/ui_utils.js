/**
 * Creates a modal overlay with standard styling
 * @param {string} id - Unique ID for the overlay
 * @param {Object} options - Configuration options
 * @param {Function} onClose - Optional close callback function
 * @returns {HTMLElement} - The created overlay element
 */
function createModalOverlay(id, options = {}, onClose = null) {
  const { zIndex = "19999", backgroundColor = "rgba(0, 0, 0, 0.5)" } = options;

  if (document.getElementById(id)) {
    const existingOverlay = document.getElementById(id);
    existingOverlay.style.display = "flex";
    return existingOverlay;
  }

  const overlay = document.createElement("div");
  overlay.id = id;
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = backgroundColor;
  overlay.style.zIndex = zIndex;
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";

  // Add click outside to close functionality if close callback is provided
  if (onClose) {
    overlay.addEventListener("click", (event) => {
      // Only close if the click is directly on the overlay (not on the modal)
      if (event.target === overlay) {
        onClose();
      }
    });
  }

  document.body.appendChild(overlay);
  return overlay;
}

/**
 * Creates a modal with standard styling
 * @param {Object} options - Configuration options
 * @returns {HTMLElement} - The created modal element
 */
function createModal(options = {}) {
  const {
    width = "90%",
    maxWidth = "650px",
    maxHeight = "90vh",
    padding = "25px",
  } = options;

  const modal = document.createElement("div");
  modal.style.backgroundColor = "#fff";
  modal.style.padding = padding;
  modal.style.borderRadius = "8px";
  modal.style.boxShadow = "0 5px 15px rgba(0,0,0,0.3)";
  modal.style.width = width;
  modal.style.maxWidth = maxWidth;
  modal.style.maxHeight = maxHeight;
  modal.style.overflowY = "auto";
  modal.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  modal.style.color = "#333";

  return modal;
}

/**
 * Creates a close button with standard styling
 * @param {Function} onClose - Function to call when close button is clicked
 * @returns {HTMLElement} - The created close button
 */
function createCloseButton(onClose, options = {}) {
  const { id = null, title = "Close", additionalStyles = {} } = options;

  const closeButton = document.createElement("button");
  closeButton.innerHTML = "&times;";
  closeButton.title = title;
  closeButton.style.background = "transparent";
  closeButton.style.border = "none";
  closeButton.style.fontSize = "1.8em";
  closeButton.style.cursor = "pointer";
  closeButton.style.color = "#555";
  closeButton.style.lineHeight = "1";

  // Apply additional styles if provided
  Object.assign(closeButton.style, additionalStyles);

  // Set the ID if provided
  if (id) {
    closeButton.id = id;
  }

  closeButton.addEventListener("click", onClose);
  return closeButton;
}

/**
 * Shows status message in a specified element
 * @param {string} elementId - ID of the status element
 * @param {string} message - Message to display
 * @param {boolean} isError - Whether this is an error message
 */
function showStatus(elementId, message, isError = false) {
  const statusDiv = document.getElementById(elementId);
  if (statusDiv) {
    statusDiv.innerHTML = message;
    statusDiv.style.borderColor = isError ? "#f5c6cb" : "#c3e6cb";
    statusDiv.style.backgroundColor = isError ? "#f8d7da" : "#d4edda";
    statusDiv.style.color = isError ? "#721c24" : "#155724";
    statusDiv.style.display = message ? "block" : "none";
  }
}

/**
 * Creates a standardized modal header with title and close button
 * @param {string} title - The modal title
 * @param {Function} onClose - Close callback function
 * @param {Object} options - Configuration options
 * @returns {HTMLElement} - The created header element
 */
function createModalHeader(title, onClose, options = {}) {
  const { closeButtonId = null, titleColor = "#00509e" } = options;

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.borderBottom = "1px solid #eee";
  header.style.paddingBottom = "10px";
  header.style.marginBottom = "20px";

  const titleElement = document.createElement("h2");
  titleElement.style.margin = "0";
  titleElement.style.color = titleColor;
  titleElement.style.fontSize = "1.4em";
  titleElement.textContent = title;

  const closeButton = createCloseButton(onClose, {
    id: closeButtonId,
  });

  header.appendChild(titleElement);
  header.appendChild(closeButton);

  return header;
}

/**
 * Creates a standardized button with consistent styling
 * @param {string} text - Button text
 * @param {Function} onClick - Click handler
 * @param {Object} options - Style and behavior options
 * @returns {HTMLElement} - The created button element
 */
function createButton(text, onClick, options = {}) {
  const {
    id = null,
    variant = "primary", // primary, secondary, success, danger, warning
    size = "medium", // small, medium, large
    disabled = false,
    style = {},
  } = options;

  const button = document.createElement("button");
  if (id) button.id = id;
  button.textContent = text;
  button.disabled = disabled;

  // Base button styles
  button.style.border = "none";
  button.style.borderRadius = "4px";
  button.style.cursor = disabled ? "not-allowed" : "pointer";
  button.style.fontFamily = "inherit";

  // Size variations
  const sizes = {
    small: { padding: "5px 10px", fontSize: "0.85em" },
    medium: { padding: "10px 15px", fontSize: "1em" },
    large: { padding: "12px 20px", fontSize: "1em", fontWeight: "bold" },
  };
  Object.assign(button.style, sizes[size]);

  // Color variations
  const variants = {
    primary: { backgroundColor: "#007bff", color: "white" },
    secondary: { backgroundColor: "#6c757d", color: "white" },
    success: { backgroundColor: "#28a745", color: "white" },
    danger: { backgroundColor: "#dc3545", color: "white" },
    warning: { backgroundColor: "#f39c12", color: "white" },
  };

  if (disabled) {
    button.style.backgroundColor = "#6c757d";
    button.style.color = "white";
  } else {
    Object.assign(button.style, variants[variant]);
  }

  // Apply custom styles
  Object.assign(button.style, style);

  if (onClick && !disabled) {
    button.addEventListener("click", onClick);
  }

  return button;
}

/**
 * Creates a standardized status/alert box
 * @param {string} message - The message to display
 * @param {string} type - Type of alert (success, error, warning, info)
 * @param {Object} options - Configuration options
 * @returns {HTMLElement} - The created alert element
 */
function createAlert(message, type = "info", options = {}) {
  const { dismissible = false, onDismiss = null } = options;

  const alert = document.createElement("div");
  alert.style.padding = "12px";
  alert.style.borderRadius = "4px";
  alert.style.marginBottom = "20px";
  alert.style.border = "1px solid";
  alert.style.lineHeight = "1.4";

  const types = {
    success: {
      backgroundColor: "#d4edda",
      borderColor: "#c3e6cb",
      color: "#155724",
    },
    error: {
      backgroundColor: "#f8d7da",
      borderColor: "#f5c6cb",
      color: "#721c24",
    },
    warning: {
      backgroundColor: "#fff3cd",
      borderColor: "#ffeaa7",
      color: "#856404",
      borderLeft: "4px solid #f39c12",
    },
    info: {
      backgroundColor: "#d1ecf1",
      borderColor: "#bee5eb",
      color: "#0c5460",
    },
  };

  Object.assign(alert.style, types[type]);
  alert.innerHTML = message;

  if (dismissible && onDismiss) {
    alert.style.position = "relative";
    const dismissButton = document.createElement("button");
    dismissButton.innerHTML = "&times;";
    dismissButton.style.position = "absolute";
    dismissButton.style.top = "8px";
    dismissButton.style.right = "12px";
    dismissButton.style.background = "transparent";
    dismissButton.style.border = "none";
    dismissButton.style.fontSize = "1.2em";
    dismissButton.style.cursor = "pointer";
    dismissButton.style.color = "inherit";
    dismissButton.addEventListener("click", onDismiss);
    alert.appendChild(dismissButton);
  }

  return alert;
}

/**
 * Creates a complete modal with standardized structure
 * @param {Object} config - Modal configuration
 * @returns {Object} - Object containing overlay, modal elements and utility methods
 */
function createStandardModal(config) {
  const {
    id,
    title,
    content = "",
    buttons = [],
    alerts = [],
    onClose,
    modalOptions = {},
    overlayOptions = {},
  } = config;

  const overlay = createModalOverlay(id, overlayOptions, onClose);
  const modal = createModal(modalOptions);

  // Create header
  const header = createModalHeader(title, onClose);
  modal.appendChild(header);

  // Add alerts
  alerts.forEach((alert) => {
    const alertElement = createAlert(alert.message, alert.type, alert.options);
    modal.appendChild(alertElement);
  });

  // Add content
  if (content) {
    const contentDiv = document.createElement("div");
    contentDiv.innerHTML = content;
    modal.appendChild(contentDiv);
  }

  // Add buttons section
  if (buttons.length > 0) {
    const buttonContainer = document.createElement("div");
    buttonContainer.style.textAlign = "right";
    buttonContainer.style.marginTop = "25px";

    buttons.forEach((buttonConfig, index) => {
      const button = createButton(
        buttonConfig.text,
        buttonConfig.onClick,
        buttonConfig.options || {}
      );
      if (index > 0) {
        button.style.marginLeft = "10px";
      }
      buttonContainer.appendChild(button);
    });

    modal.appendChild(buttonContainer);
  }

  overlay.appendChild(modal);

  return {
    overlay,
    modal,
    close: () => closeModal(id),
    updateContent: (newContent) => {
      const contentDiv = modal.querySelector(
        "div:not([style*='display: flex'])"
      );
      if (contentDiv) {
        contentDiv.innerHTML = newContent;
      }
    },
    addAlert: (message, type, options) => {
      const alertElement = createAlert(message, type, options);
      modal.insertBefore(alertElement, modal.children[1]);
    },
  };
}

/**
 * Closes a modal by ID
 * @param {string} modalId - ID of the modal to close
 */
function closeModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (overlay) {
    overlay.remove();
  }
}

/**
 * Creates a standardized form input with label
 * @param {string} label - Input label text
 * @param {string} type - Input type
 * @param {Object} options - Input configuration
 * @returns {Object} - Object with container, label, and input elements
 */
function createFormInput(label, type, options = {}) {
  const {
    id = null,
    placeholder = "",
    required = false,
    value = "",
    style = {},
  } = options;

  const container = document.createElement("div");
  container.style.marginBottom = "20px";

  const labelElement = document.createElement("label");
  labelElement.textContent = label;
  labelElement.style.display = "block";
  labelElement.style.marginBottom = "8px";
  labelElement.style.fontWeight = "bold";

  if (id) labelElement.setAttribute("for", id);

  const input = document.createElement("input");
  input.type = type;
  if (id) input.id = id;
  if (placeholder) input.placeholder = placeholder;
  if (value) input.value = value;
  input.required = required;

  // Standard input styling
  input.style.padding = "8px";
  input.style.border = "1px solid #ccc";
  input.style.borderRadius = "4px";
  input.style.fontSize = "1em";
  input.style.width = "calc(100% - 18px)";

  // Apply custom styles
  Object.assign(input.style, style);

  container.appendChild(labelElement);
  container.appendChild(input);

  return { container, label: labelElement, input };
}

window.uiUtils = {
  createModalOverlay,
  createModal,
  createCloseButton,
  showStatus,
  createModalHeader,
  createButton,
  createAlert,
  createStandardModal,
  closeModal,
  createFormInput,
};
