/**
 * Utility file for managing modal dialogs in the LCR extension.
 * Handles creating, displaying, and closing standardized modal windows.
 */
(() => {
  utils.returnIfLoaded("modalUtils");

  // Global state for selection mode
  let isSelectMode = false;
  let selectedItems = new Set();
  let selectionConfig = null;

  /**
   * Creates a standard modal with a consistent design.
   * @param {Object} options - Options for the modal.
   * @param {string} options.id - Unique ID for the modal.
   * @param {string} options.title - Title of the modal.
   * @param {string} options.content - HTML content for the modal body.
   * @param {Array<Object>} [options.alerts] - Array of alert configurations.
   * @param {Array<Object>} [options.buttons] - Array of button configurations.
   * @param {Function} [options.onClose] - Callback to execute when the modal is closed.
   * @param {Object} [options.modalOptions] - Additional modal styling options.
   * @param {Object} [options.selectionConfig] - Configuration for selection functionality.
   * @param {string} options.selectionConfig.itemSelector - CSS selector for selectable items.
   * @param {string} options.selectionConfig.itemNameAttribute - Data attribute containing item name.
   * @param {Function} [options.selectionConfig.onSelectionChange] - Callback when selection changes.
   */
  function createStandardModal({
    id,
    title,
    content,
    alerts = [],
    buttons = [],
    onClose = null,
    modalOptions = {},
    selectionConfig: config = null,
  }) {
    // Remove any existing modal with the same ID
    closeModal(id);

    // Store selection config for this modal
    selectionConfig = config;
    if (config) {
      isSelectMode = false;
      selectedItems.clear();
    }

    // Create the modal container
    const modal = document.createElement("div");
    modal.id = id;
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.65)";
    modal.style.zIndex = "20000";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

    // Create the modal content wrapper
    const modalContent = document.createElement("div");
    modalContent.style.backgroundColor = "#fff";
    modalContent.style.borderRadius = "8px";
    modalContent.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
    modalContent.style.width = modalOptions.maxWidth || "600px";
    modalContent.style.maxHeight = "90%";
    modalContent.style.overflow = "hidden";
    modalContent.style.display = "flex";
    modalContent.style.flexDirection = "column";
    modalContent.style.padding = "20px";

    // Create the modal header (matching reference style)
    const modalHeader = document.createElement("div");
    modalHeader.style.display = "flex";
    modalHeader.style.justifyContent = "space-between";
    modalHeader.style.alignItems = "center";
    modalHeader.style.borderBottom = "1px solid #eee";
    modalHeader.style.paddingBottom = "10px";
    modalHeader.style.marginBottom = "20px";

    const modalTitle = document.createElement("h2");
    modalTitle.style.margin = "0";
    modalTitle.style.color = "#00509e";
    modalTitle.style.fontSize = "1.4em";
    modalTitle.textContent = title;

    const closeButton = document.createElement("button");
    closeButton.textContent = "×";
    closeButton.style.background = "none";
    closeButton.style.border = "none";
    closeButton.style.color = "#999";
    closeButton.style.fontSize = "24px";
    closeButton.style.cursor = "pointer";
    closeButton.style.padding = "0";
    closeButton.style.width = "30px";
    closeButton.style.height = "30px";
    closeButton.style.borderRadius = "50%";
    closeButton.style.display = "flex";
    closeButton.style.alignItems = "center";
    closeButton.style.justifyContent = "center";
    closeButton.addEventListener("click", () => closeModal(id, onClose));
    closeButton.addEventListener("mouseover", () => {
      closeButton.style.backgroundColor = "#f0f0f0";
    });
    closeButton.addEventListener("mouseout", () => {
      closeButton.style.backgroundColor = "transparent";
    });

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    // Create the modal body
    const modalBody = document.createElement("div");
    modalBody.style.flex = "1";
    modalBody.style.overflowY = "auto";
    modalBody.style.marginBottom = "20px";

    // Add alerts if provided
    if (alerts && alerts.length > 0) {
      const alertsContainer = document.createElement("div");
      alertsContainer.style.marginBottom = "15px";

      alerts.forEach((alert) => {
        const alertDiv = document.createElement("div");
        alertDiv.style.padding = "12px 15px";
        alertDiv.style.borderRadius = "4px";
        alertDiv.style.marginBottom = "10px";
        alertDiv.style.border = "1px solid";

        // Set alert styling based on type
        switch (alert.type) {
          case "warning":
            alertDiv.style.backgroundColor = "#fff3cd";
            alertDiv.style.borderColor = "#ffeaa7";
            alertDiv.style.color = "#856404";
            break;
          case "error":
            alertDiv.style.backgroundColor = "#f8d7da";
            alertDiv.style.borderColor = "#f5c6cb";
            alertDiv.style.color = "#721c24";
            break;
          case "info":
            alertDiv.style.backgroundColor = "#d1ecf1";
            alertDiv.style.borderColor = "#bee5eb";
            alertDiv.style.color = "#0c5460";
            break;
          case "success":
            alertDiv.style.backgroundColor = "#d4edda";
            alertDiv.style.borderColor = "#c3e6cb";
            alertDiv.style.color = "#155724";
            break;
          default:
            alertDiv.style.backgroundColor = "#f8f9fa";
            alertDiv.style.borderColor = "#dee2e6";
            alertDiv.style.color = "#6c757d";
        }

        alertDiv.innerHTML = alert.message;
        alertsContainer.appendChild(alertDiv);
      });

      modalBody.appendChild(alertsContainer);
    }

    // Add the main content
    const contentDiv = document.createElement("div");
    contentDiv.innerHTML = content;
    modalBody.appendChild(contentDiv);

    // Create the modal footer (buttons at bottom)
    let modalFooter = null;
    if (buttons.length > 0) {
      modalFooter = document.createElement("div");
      modalFooter.style.display = "flex";
      modalFooter.style.justifyContent = "flex-end";
      modalFooter.style.gap = "10px";
      modalFooter.style.borderTop = "1px solid #eee";
      modalFooter.style.paddingTop = "15px";

      buttons.forEach((buttonConfig) => {
        const button = document.createElement("button");
        button.textContent = buttonConfig.text;
        button.style.padding = "10px 20px";
        button.style.border = "none";
        button.style.borderRadius = "4px";
        button.style.cursor = "pointer";
        button.style.fontSize = "14px";
        button.style.fontWeight = "500";

        // Set button ID if provided
        if (buttonConfig.options?.id) {
          button.id = buttonConfig.options.id;
        }

        // Set button variant styling
        switch (buttonConfig.options?.variant) {
          case "success":
            button.style.backgroundColor = "#28a745";
            button.style.color = "#fff";
            break;
          case "danger":
            button.style.backgroundColor = "#dc3545";
            button.style.color = "#fff";
            break;
          case "warning":
            button.style.backgroundColor = "#ffc107";
            button.style.color = "#212529";
            break;
          default:
            button.style.backgroundColor = "#007bff";
            button.style.color = "#fff";
        }

        // Add hover effects
        button.addEventListener("mouseover", () => {
          button.style.opacity = "0.9";
          button.style.transform = "translateY(-1px)";
        });
        button.addEventListener("mouseout", () => {
          button.style.opacity = "1";
          button.style.transform = "translateY(0)";
        });

        button.addEventListener("click", buttonConfig.onClick);
        modalFooter.appendChild(button);
      });
    }

    // Assemble the modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    if (modalFooter) modalContent.appendChild(modalFooter);

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Close modal when clicking outside the modal content
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal(id, onClose);
      }
    });

    // Setup selection event listeners if selection is enabled
    if (config) setupSelectionEventListeners();
  }

  /**
   * Sets up event listeners for selection functionality
   */
  function setupSelectionEventListeners() {
    if (!selectionConfig) return;

    const selectModeBtn = document.getElementById("lcr-tools-select-mode-btn");
    const selectAllBtn = document.getElementById("lcr-tools-select-all-btn");
    const deselectAllBtn = document.getElementById(
      "lcr-tools-deselect-all-btn"
    );

    if (selectModeBtn) {
      selectModeBtn.addEventListener("click", toggleSelectMode);
    }

    if (selectAllBtn) {
      selectAllBtn.addEventListener("click", selectAllItems);
    }

    if (deselectAllBtn) {
      deselectAllBtn.addEventListener("click", deselectAllItems);
    }

    // Add listeners to checkboxes
    document
      .querySelectorAll(selectionConfig.itemSelector)
      .forEach((checkbox) => {
        checkbox.addEventListener("change", handleSelectionChange);
      });
  }

  /**
   * Toggles selection mode on/off
   */
  function toggleSelectMode() {
    if (!selectionConfig) return;

    isSelectMode = !isSelectMode;
    const selectModeBtn = document.getElementById("lcr-tools-select-mode-btn");
    const selectionControls = document.getElementById(
      "lcr-tools-selection-controls"
    );
    const checkboxes = document.querySelectorAll(selectionConfig.itemSelector);

    if (isSelectMode) {
      selectModeBtn.textContent = "Cancel";
      selectModeBtn.style.backgroundColor = "#dc3545";
      selectionControls.style.display = "block";
      checkboxes.forEach((checkbox) => {
        checkbox.style.display = "inline-block";
      });
      selectedItems.clear();
      handleSelectionChange();
    } else {
      selectModeBtn.textContent = "Select";
      selectModeBtn.style.backgroundColor = "#007bff";
      selectionControls.style.display = "none";
      checkboxes.forEach((checkbox) => {
        checkbox.style.display = "none";
        checkbox.checked = false;
      });
      selectedItems.clear();
      handleSelectionChange();
    }
  }

  /**
   * Selects all items
   */
  function selectAllItems() {
    if (!selectionConfig) return;

    const checkboxes = document.querySelectorAll(selectionConfig.itemSelector);
    selectedItems.clear();
    checkboxes.forEach((checkbox) => {
      checkbox.checked = true;
      selectedItems.add(checkbox.dataset[selectionConfig.itemNameAttribute]);
    });
    handleSelectionChange();
  }

  /**
   * Deselects all items
   */
  function deselectAllItems() {
    if (!selectionConfig) return;

    const checkboxes = document.querySelectorAll(selectionConfig.itemSelector);
    selectedItems.clear();
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });
    handleSelectionChange();
  }

  /**
   * Handles selection changes and triggers callback
   */
  function handleSelectionChange() {
    if (!selectionConfig) return;

    // Update selected items set
    selectedItems.clear();
    document
      .querySelectorAll(`${selectionConfig.itemSelector}:checked`)
      .forEach((checkbox) => {
        selectedItems.add(checkbox.dataset[selectionConfig.itemNameAttribute]);
      });

    // Trigger callback if provided
    if (selectionConfig.onSelectionChange) {
      selectionConfig.onSelectionChange(selectedItems, isSelectMode);
    }
  }

  /**
   * Gets the current selection state
   * @returns {Object} - Object with isSelectMode and selectedItems
   */
  function getSelectionState() {
    return {
      isSelectMode,
      selectedItems: new Set(selectedItems),
    };
  }

  /**
   * Closes and removes a modal from the DOM.
   * @param {string} id - The ID of the modal to close.
   * @param {Function} [onClose] - Optional callback to execute after closing.
   */
  function closeModal(id, onClose = null) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.remove();
      // Reset selection state when modal closes
      isSelectMode = false;
      selectedItems.clear();
      selectionConfig = null;
      if (onClose) onClose();
    }
  }

  /**
   * Creates a side modal that appears on the right or left side of the screen
   * without graying out the background content
   * @param {Object} options - Options for the side modal
   * @param {string} options.id - Unique ID for the modal
   * @param {string} options.title - Title of the modal
   * @param {string} options.content - HTML content for the modal body
   * @param {Array<Object>} [options.buttons] - Array of button configurations
   * @param {Function} [options.onClose] - Callback to execute when the modal is closed
   * @param {string} [options.side='right'] - Which side to show the modal ('left' or 'right')
   * @param {string} [options.width='400px'] - Width of the side modal
   */
  function createSideModal({
    id,
    title,
    content,
    buttons = [],
    onClose = null,
    side = "right",
    width = "400px",
  }) {
    // Remove any existing modal with the same ID
    closeModal(id);

    // Create the modal container
    const modal = document.createElement("div");
    modal.id = id;
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.height = "100%";
    modal.style.width = width;
    modal.style.zIndex = "20000";
    modal.style.display = "flex";
    modal.style.flexDirection = "column";
    modal.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    modal.style.backgroundColor = "#fff";
    modal.style.boxShadow =
      side === "right"
        ? "-4px 0 8px rgba(0, 0, 0, 0.2)"
        : "4px 0 8px rgba(0, 0, 0, 0.2)";
    modal.style.borderLeft = side === "right" ? "1px solid #ddd" : "none";
    modal.style.borderRight = side === "left" ? "1px solid #ddd" : "none";

    // Position on the correct side
    if (side === "right") {
      modal.style.right = "0";
    } else {
      modal.style.left = "0";
    }

    // Create the modal header
    const modalHeader = document.createElement("div");
    modalHeader.style.display = "flex";
    modalHeader.style.justifyContent = "space-between";
    modalHeader.style.alignItems = "center";
    modalHeader.style.borderBottom = "1px solid #eee";
    modalHeader.style.padding = "15px 20px";
    modalHeader.style.backgroundColor = "#f8f9fa";

    const modalTitle = document.createElement("h3");
    modalTitle.style.margin = "0";
    modalTitle.style.color = "#00509e";
    modalTitle.style.fontSize = "1.2em";
    modalTitle.textContent = title;

    const closeButton = document.createElement("button");
    closeButton.textContent = "×";
    closeButton.style.background = "none";
    closeButton.style.border = "none";
    closeButton.style.color = "#999";
    closeButton.style.fontSize = "20px";
    closeButton.style.cursor = "pointer";
    closeButton.style.padding = "0";
    closeButton.style.width = "25px";
    closeButton.style.height = "25px";
    closeButton.style.borderRadius = "50%";
    closeButton.style.display = "flex";
    closeButton.style.alignItems = "center";
    closeButton.style.justifyContent = "center";
    closeButton.addEventListener("click", () => closeModal(id, onClose));
    closeButton.addEventListener("mouseover", () => {
      closeButton.style.backgroundColor = "#e9ecef";
    });
    closeButton.addEventListener("mouseout", () => {
      closeButton.style.backgroundColor = "transparent";
    });

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    // Create the modal body
    const modalBody = document.createElement("div");
    modalBody.style.flex = "1";
    modalBody.style.overflowY = "auto";
    modalBody.style.padding = "20px";

    // Add the main content
    const contentDiv = document.createElement("div");
    contentDiv.innerHTML = content;
    modalBody.appendChild(contentDiv);

    // Create the modal footer (buttons at bottom)
    let modalFooter = null;
    if (buttons.length > 0) {
      modalFooter = document.createElement("div");
      modalFooter.style.display = "flex";
      modalFooter.style.flexDirection = "column";
      modalFooter.style.gap = "10px";
      modalFooter.style.borderTop = "1px solid #eee";
      modalFooter.style.padding = "15px 20px";
      modalFooter.style.backgroundColor = "#f8f9fa";

      buttons.forEach((buttonConfig) => {
        const button = document.createElement("button");
        button.textContent = buttonConfig.text;
        button.style.padding = "10px 15px";
        button.style.border = "none";
        button.style.borderRadius = "4px";
        button.style.cursor = "pointer";
        button.style.fontSize = "14px";
        button.style.fontWeight = "500";
        button.style.width = "100%";

        // Set button ID if provided
        if (buttonConfig.options?.id) {
          button.id = buttonConfig.options.id;
        }

        // Set button variant styling
        switch (buttonConfig.options?.variant) {
          case "success":
            button.style.backgroundColor = "#28a745";
            button.style.color = "#fff";
            break;
          case "danger":
            button.style.backgroundColor = "#dc3545";
            button.style.color = "#fff";
            break;
          case "warning":
            button.style.backgroundColor = "#ffc107";
            button.style.color = "#212529";
            break;
          case "secondary":
            button.style.backgroundColor = "#6c757d";
            button.style.color = "#fff";
            break;
          default:
            button.style.backgroundColor = "#007bff";
            button.style.color = "#fff";
        }

        // Add hover effects
        button.addEventListener("mouseover", () => {
          button.style.opacity = "0.9";
        });
        button.addEventListener("mouseout", () => {
          button.style.opacity = "1";
        });

        button.addEventListener("click", buttonConfig.onClick);
        modalFooter.appendChild(button);
      });
    }

    // Assemble the modal
    modal.appendChild(modalHeader);
    modal.appendChild(modalBody);
    if (modalFooter) modal.appendChild(modalFooter);

    document.body.appendChild(modal);

    // Add slide-in animation
    modal.style.transform =
      side === "right" ? "translateX(100%)" : "translateX(-100%)";
    modal.style.transition = "transform 0.3s ease-in-out";

    // Trigger the slide-in animation
    setTimeout(() => {
      modal.style.transform = "translateX(0)";
    }, 10);
  }

  /**
   * Shows a status message in a specific element
   * @param {string} elementId - The ID of the element to show status in
   * @param {string} message - The message to show
   * @param {boolean} isError - Whether this is an error message
   * @param {boolean} [autoHide=true] - Whether the message should auto-hide after 3 seconds
   */
  function showStatus(elementId, message, isError = false, autoHide = true) {
    const statusElement = document.getElementById(elementId);
    if (statusElement) {
      statusElement.style.display = "block";
      statusElement.style.backgroundColor = isError ? "#f8d7da" : "#d4edda";
      statusElement.style.color = isError ? "#721c24" : "#155724";
      statusElement.style.border = isError
        ? "1px solid #f5c6cb"
        : "1px solid #c3e6cb";
      statusElement.innerHTML = message;

      // Auto-hide after 3 seconds if enabled
      if (autoHide) {
        setTimeout(() => {
          statusElement.style.display = "none";
        }, 3000);
      }
    }
  }

  window.modalUtils = {
    createStandardModal,
    createSideModal,
    closeModal,
    showStatus,
    getSelectionState,
  };
})();
