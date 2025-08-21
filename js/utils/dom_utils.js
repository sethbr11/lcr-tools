/**
 * Checks if an element is visible (not hidden by CSS or display:none)
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} - True if visible
 */
function isElementVisible(element) {
  if (!element) return false;

  const isHidden =
    element.classList.contains("hidden") ||
    element.classList.contains("ng-hide") ||
    getComputedStyle(element).display === "none";

  return !isHidden;
}

/**
 * Waits for a DOM element matching the selector to appear, or times out.
 * @param {string} selector - CSS selector for the element to wait for
 * @param {number} timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns {Promise<HTMLElement>} - Resolves with the found element, or rejects on timeout
 */
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    // Check if the element already exists
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    // Set up a MutationObserver to watch for DOM changes
    const observer = new MutationObserver((mutations) => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect(); // Stop observing once found
        resolve(element);
      }
    });

    // Start observing the document body for added/removed nodes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Set a timeout to reject the promise if not found in time
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Gets visible columns from a table header
 * @param {string} headerSelector - Selector for header elements
 * @param {Array<string>} excludeTexts - Header texts to exclude
 * @returns {Object} - Object with visibleHeaders array and visibleHeaderIndices array
 */
function getVisibleTableColumns(headerSelector, excludeTexts = []) {
  // Select all header elements matching the selector
  const headerElements = document.querySelectorAll(headerSelector);
  const visibleHeaders = [];
  const visibleHeaderIndices = [];

  // Iterate through each header element
  Array.from(headerElements).forEach((header, index) => {
    // Skip this header if it contains a checkbox (e.g., select-all column)
    if (header.querySelector('input[type="checkbox"]')) return;

    // Check if the header is visible using isElementVisible
    if (this.isElementVisible(header)) {
      const headerText = header.textContent.trim();

      // Only include headers with non-empty text and not in the exclude list
      if (headerText && !excludeTexts.includes(headerText)) {
        visibleHeaders.push(headerText);
        visibleHeaderIndices.push(index);
      }
    }
  });

  // Return both the visible header texts and their indices
  return { visibleHeaders, visibleHeaderIndices };
}

/**
 * Extracts text content from various cell types
 * @param {HTMLElement} cell - Table cell element
 * @param {number} columnIndex - Index of the column
 * @returns {string} - Extracted text
 */
function extractCellText(cell, columnIndex) {
  let cellText = "";

  if (columnIndex === 1) {
    // Name column - extract from member-card or span
    const memberCard = cell.querySelector("member-card span, span.ng-binding");
    cellText = memberCard
      ? memberCard.textContent.trim()
      : cell.textContent.trim();
  } else if (cell.classList.contains("phone")) {
    // Phone column
    const phoneLink = cell.querySelector('a[href^="tel:"]');
    cellText = phoneLink
      ? phoneLink.textContent.trim()
      : cell.textContent.trim();
  } else if (cell.classList.contains("email")) {
    // Email column
    const emailLink = cell.querySelector('a[href^="mailto:"]');
    if (emailLink) {
      const emailSpan = emailLink.querySelector("span.ng-binding");
      cellText = emailSpan
        ? emailSpan.textContent.trim()
        : emailLink.textContent.trim();
    } else {
      cellText = cell.textContent.trim();
    }
  } else if (cell.classList.contains("adr")) {
    // Address column - handle HTML formatting
    const addressHtml = cell.innerHTML;
    cellText = addressHtml
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, "")
      .trim();
  } else {
    // Default text extraction
    cellText = cell.textContent.trim();
  }

  // Clean up the text and remove extra whitespace
  return cellText.replace(/\s+/g, " ").trim();
}

window.domUtils = {
  isElementVisible,
  waitForElement,
  getVisibleTableColumns,
  extractCellText,
};
