/**
 * Utility file for handling page navigation and data collection on LCR pages.
 * Provides functions for pagination, scrolling, and detecting page states to
 * ensure complete data extraction across multi-page reports. Integrates with
 * UI utilities for loading indicators and abort handling.
 */
(() => {
  utils.returnIfLoaded("navigationUtils");

  const DEFAULT_MAX_TOTAL_PAGES = 20; // Default safety limit to prevent infinite loops
  const DEFAULT_PAGINATION_DELAY_MS = 500;

  // Common selectors for LCR pagination
  const SELECTORS = {
    firstPageButtons: [
      'button[data-testid="first"]',
      "div.sc-f155593d-0.jVFBIX",
    ],
    nextPageButtons: ['button[data-testid="next"]', "div.sc-b87b8e2-0.cLfglj"],
    lastPageButtons: ['button[data-testid="last"]', "div.sc-cb69f8b7-0.cXraMi"],
    firstPageNumberDiv: ".sc-9d92d0db-0.lnnvp .sc-66e0b3ee-0:first-child",
    activePageClass: "ghqlVx",
    pageIndicatorText:
      "div.sc-lf3bj0-0.biBXLT > div:last-of-type:not([class^='sc-'])",
    trueIconSvg:
      'div.sc-5ba12d08-0 svg path[d*="M12 22c5.523"][d*="l-7.452 7.196"]',
    falseIconSvg: 'div.sc-5ba12d08-0 svg path[d*="M12 3.5a8.5"][d*="M2 12C2"]',
    trueIconImg: 'img[src*="icon-16-checkmark.png"]',
    countSpan: 'span[translate="common.table.count"]',
    filteredSpan: 'span[translate="common.table.filtered"]',
    infiniteScrollElement: "[infinite-scroll]",
  };

  /**
   * Helper to find the first available button from a list of selectors
   * @param {string[]} selectors - Array of CSS selectors for buttons
   * @returns {HTMLElement|null} - The first matching button element or null
   */
  function findFirstAvailableButton(selectors) {
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn) return btn;
    }
    return null;
  }

  /**
   * Navigate to the first page of results
   * @param {number} delay - Delay after navigation (ms)
   * @returns {Promise<void>}
   */
  async function navigateToFirstPage(delay = DEFAULT_PAGINATION_DELAY_MS) {
    console.log("LCR Tools: Attempting to navigate to first page...");
    const firstPageButton = findFirstAvailableButton(
      SELECTORS.firstPageButtons
    );

    if (
      firstPageButton &&
      !firstPageButton.disabled &&
      firstPageButton.offsetParent !== null
    ) {
      console.log("LCR Tools: Clicking first page button.");
      firstPageButton.click();
      await new Promise((resolve) => setTimeout(resolve, delay));
    } else {
      console.log(
        "LCR Tools: Already on first page or first page button not available."
      );
    }
  }

  /**
   * Checks if current page is the last page using multiple methods
   * @returns {boolean} - True if on last page
   */
  function isLastPage() {
    // Method 1: Check next page button (any style)
    const nextPageButton = findFirstAvailableButton(SELECTORS.nextPageButtons);
    if (nextPageButton) {
      const isDisabled =
        nextPageButton.disabled || nextPageButton.hasAttribute("disabled");
      if (isDisabled) {
        console.log("LCR Tools: Next page button is disabled.");
        return true;
      }
    }

    // Method 2: Check last page button (any style)
    const lastPageButton = findFirstAvailableButton(SELECTORS.lastPageButtons);
    if (lastPageButton) {
      const isHidden = lastPageButton.offsetParent === null;
      const isDisabled =
        lastPageButton.disabled ||
        lastPageButton.classList.contains("disabled") ||
        lastPageButton.hasAttribute("disabled");
      if (isHidden || isDisabled) {
        console.log(
          "LCR Tools: Last page button indicates we're on last page."
        );
        return true;
      }
    }

    // Method 3: Check page indicator text (e.g., "251-269/269")
    const pageIndicator = document.querySelector(SELECTORS.pageIndicatorText);
    if (pageIndicator && pageIndicator.textContent.includes("/")) {
      try {
        const [currentRange, totalStr] = pageIndicator.textContent.split("/");
        const totalItems = parseInt(totalStr.trim(), 10);
        const currentMaxShown = parseInt(
          currentRange.split("-").pop().trim(),
          10
        );
        if (
          !isNaN(totalItems) &&
          !isNaN(currentMaxShown) &&
          currentMaxShown >= totalItems
        ) {
          console.log(
            `LCR Tools: Page indicator shows all items displayed (${currentMaxShown}/${totalItems}).`
          );
          return true;
        }
      } catch (e) {
        console.warn("LCR Tools: Error parsing page indicator:", e);
      }
    }

    // Method 4: Check active page against available page numbers
    const activePage = document.querySelector(
      `div.${SELECTORS.activePageClass}`
    );
    if (activePage) {
      const activePageNum = parseInt(activePage.textContent.trim(), 10);
      const allPageElements = document.querySelectorAll("div.sc-66e0b3ee-0");
      const pageNumbers = Array.from(allPageElements)
        .map((el) => parseInt(el.textContent.trim(), 10))
        .filter((num) => !isNaN(num))
        .sort((a, b) => a - b);

      if (
        pageNumbers.length > 0 &&
        activePageNum === Math.max(...pageNumbers)
      ) {
        console.log(
          `LCR Tools: Active page (${activePageNum}) is the highest available page.`
        );
        return true;
      }
    }

    return false;
  }

  /**
   * Navigates to the next page, if available
   * @param {number} delay - Delay after clicking (ms)
   * @param {number} maxPages - Maximum page limit to prevent infinite loops
   * @param {number} currentPageNumber - The current page number
   * @returns {Promise<boolean>} - Returns false if navigation failed or limit reached
   */
  async function goToNextPage(
    delay = DEFAULT_PAGINATION_DELAY_MS,
    maxPages = DEFAULT_MAX_TOTAL_PAGES,
    currentPageNumber = 1
  ) {
    if (currentPageNumber >= maxPages) {
      console.warn(
        `LCR Tools: Reached maximum page limit (${maxPages}). Stopping navigation.`
      );
      return false;
    }

    if (isLastPage()) {
      console.log("LCR Tools: Already on last page, cannot navigate further.");
      return false;
    }

    const nextPageButton = findFirstAvailableButton(SELECTORS.nextPageButtons);

    if (
      nextPageButton &&
      !nextPageButton.disabled &&
      nextPageButton.offsetParent !== null &&
      !nextPageButton.classList.contains("disabled")
    ) {
      console.log(`LCR Tools: Navigating to page ${currentPageNumber + 1}...`);
      nextPageButton.click();
      await new Promise((resolve) => setTimeout(resolve, delay));
      await new Promise((resolve) => setTimeout(resolve, 500)); // Short additional wait for content to load
      return true;
    } else {
      console.warn("LCR Tools: Next page button not available or disabled.");
      return false;
    }
  }

  /**
   * Scrolls page to load all content with auto-detection of completion
   * @param {Object} options - Configuration options
   * @returns {Promise} - Promise that resolves when scrolling is complete
   */
  async function autoScrollToLoadContent(options = {}) {
    const {
      container = window,
      scrollStep = 400,
      scrollInterval = 200,
      maxConsecutiveNoChange = 5,
      maxTotalIterations = 100,
      shouldStop = () => window.lcrToolsShouldStopProcessing || false, // Check global abort flag
    } = options;

    let lastScrollHeight = 0;
    let consecutiveNoChange = 0;
    let iterations = 0;

    return new Promise((resolve) => {
      const scrollIntervalId = setInterval(() => {
        if (shouldStop()) {
          clearInterval(scrollIntervalId);
          console.log("LCR Tools: Scrolling aborted by user.");
          resolve();
          return;
        }

        const currentScroll =
          container.scrollY !== undefined
            ? container.scrollY
            : container.scrollTop;
        const clientHeight =
          container.innerHeight !== undefined
            ? container.innerHeight
            : container.clientHeight;
        const currentScrollHeight = document.body.scrollHeight;

        iterations++;

        if (currentScroll + clientHeight >= currentScrollHeight - 10) {
          if (currentScrollHeight === lastScrollHeight) {
            consecutiveNoChange++;
            if (
              consecutiveNoChange >= maxConsecutiveNoChange ||
              iterations >= maxTotalIterations
            ) {
              clearInterval(scrollIntervalId);
              console.log(
                "LCR Tools: Auto-scroll completed - reached bottom or content stabilized."
              );
              resolve();
              return;
            }
          } else {
            lastScrollHeight = currentScrollHeight;
            consecutiveNoChange = 0;
          }
        } else {
          lastScrollHeight = currentScrollHeight;
          consecutiveNoChange = 0;
        }

        container.scrollBy(0, scrollStep);

        if (iterations >= maxTotalIterations) {
          clearInterval(scrollIntervalId);
          console.warn(
            "LCR Tools: Auto-scroll stopped due to max iterations reached."
          );
          resolve();
        }
      }, scrollInterval);
    });
  }

  /**
   * Scrolls to top of page smoothly
   * @param {number} delay - Delay before scrolling (ms)
   * @returns {Promise} - Promise that resolves after scrolling
   */
  async function scrollToTop(delay = 1500) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Sets select element value and dispatches change event
   * @param {HTMLElement} selectElement - The select element
   * @param {string} value - Value to set
   * @param {string} elementName - Name for logging
   * @returns {boolean} - Success status
   */
  function setSelectValue(selectElement, value, elementName = "element") {
    if (selectElement) {
      if (selectElement.value === value) {
        console.log(
          `LCR Tools: Select ${elementName} is already set to ${value}. Skipping.`
        );
        return true;
      }
      selectElement.value = value;
      const event = new Event("change", { bubbles: true });
      selectElement.dispatchEvent(event);
      console.log(`LCR Tools: Set select ${elementName} to ${value}`);
      return true;
    }
    console.warn(
      `LCR Tools: Select ${elementName} not found for value ${value}.`
    );
    return false;
  }

  /**
   * Checks the page's DOM for pagination elements and indicators suggesting not all data is loaded (e.g., need to scroll).
   * @returns {string[]} - Array of needs, e.g., ['pagination', 'scroll']
   */
  function getNeeds() {
    const needs = [];

    // Check for pagination elements
    const hasPagination =
      findFirstAvailableButton(SELECTORS.firstPageButtons) ||
      findFirstAvailableButton(SELECTORS.nextPageButtons) ||
      findFirstAvailableButton(SELECTORS.lastPageButtons);
    if (hasPagination) {
      needs.push("pagination");
    }

    // Check for scrolling need: Look for infinite-scroll directive and compare shown vs. total counts
    const infiniteScrollEl = document.querySelector(
      SELECTORS.infiniteScrollElement
    );
    if (infiniteScrollEl) needs.push("scroll");

    return needs;
  }

  // Default callbacks for common actions
  const defaultOnScrollStart = () => {
    console.log("LCR Tools: Scrolling to load all content...");
    if (window.uiUtils)
      uiUtils.showLoadingIndicator("Scrolling to load all content...");
  };

  const defaultOnPaginationStart = () => {
    if (window.uiUtils)
      uiUtils.showLoadingIndicator("Starting pagination to load all pages...");
  };

  const defaultOnPageProcess = (currentPage) => {
    if (window.uiUtils)
      uiUtils.showLoadingIndicator(`Processing Page ${currentPage + 1}`);
  };

  const defaultShouldStop = () => window.uiUtils && uiUtils.isAborted();

  /**
   * Collects data across pages with optional scrolling and pagination.
   * @param {Object} options - Configuration options
   * @param {string[]} options.needs - Array of needs (e.g., ['pagination', 'scroll'])
   * @param {Function} options.onPageData - Callback to process data on each page (returns data or null to stop)
   * @param {Function} [options.onScrollStart] - Optional callback when scrolling starts (defaults to logging and indicator)
   * @param {Function} [options.onPaginationStart] - Optional callback when pagination starts (defaults to indicator)
   * @param {Function} [options.onPageProcess] - Optional callback before processing each page (defaults to indicator with page)
   * @param {number} [options.maxPages] - Max pages for pagination
   * @param {Function} [options.shouldStop] - Function to check if process should abort (defaults to uiUtils.isAborted)
   * @returns {Promise<Array>} - Array of collected data from each page
   */
  async function collectDataWithNavigation(options = {}) {
    const {
      needs = [],
      onPageData,
      onScrollStart = defaultOnScrollStart,
      onPaginationStart = defaultOnPaginationStart,
      onPageProcess = defaultOnPageProcess,
      maxPages = DEFAULT_MAX_TOTAL_PAGES,
      shouldStop = defaultShouldStop,
    } = options;

    const collectedData = [];

    // Handle scrolling if needed
    if (needs.includes("scroll")) {
      onScrollStart();
      await autoScrollToLoadContent({ shouldStop });
      await scrollToTop();
      if (shouldStop()) return collectedData;
    }

    // Handle pagination if needed
    if (needs.includes("pagination")) {
      onPaginationStart();
      await navigateToFirstPage();

      let currentPage = 1;
      while (currentPage <= maxPages) {
        if (shouldStop()) break;
        onPageProcess(currentPage);

        const pageData = await onPageData(currentPage);
        if (!pageData) break; // Callback returns null to stop
        collectedData.push(pageData);

        const canGoNext = await goToNextPage(
          DEFAULT_PAGINATION_DELAY_MS,
          maxPages,
          currentPage
        );
        if (!canGoNext) break;
        currentPage++;
        await new Promise((resolve) =>
          setTimeout(resolve, DEFAULT_PAGINATION_DELAY_MS)
        );
      }
    } else {
      // No pagination: process single page
      if (shouldStop()) return collectedData;
      const pageData = await onPageData(1);
      if (pageData) collectedData.push(pageData);
    }

    return collectedData;
  }

  /**
   * Navigates to a specific tab if not already active.
   * @param {Object} options - Options for tab navigation.
   * @param {string} options.tabSelector - Selector for the tab's <li> element.
   * @param {string} options.linkSelector - Selector for the tab's <a> element.
   * @param {string} options.tabName - Name of the tab (for logging).
   * @param {number} [options.delay=1500] - Delay after clicking the tab (ms).
   * @returns {Promise<boolean>} - True if navigation succeeded, false otherwise.
   */
  async function navigateToTab({
    tabSelector,
    linkSelector,
    tabName,
    delay = 1500,
  }) {
    const tabElement = document.querySelector(tabSelector);
    if (tabElement && !tabElement.classList.contains("active")) {
      const tabLink = tabElement.querySelector(linkSelector);
      if (tabLink) {
        console.log(
          `LCR Tools: '${tabName}' tab is not active. Clicking '${tabName}' tab.`
        );
        tabLink.click();
        await new Promise((resolve) => setTimeout(resolve, delay));
        return true;
      } else {
        console.error(
          `LCR Tools: '${tabName}' tab link not found, though li element was present.`
        );
        alert(`LCR Tools: Could not find the '${tabName}' tab link to click.`);
        return false;
      }
    } else if (tabElement && tabElement.classList.contains("active")) {
      console.log(
        `LCR Tools: '${tabName}' tab is already active. Skipping click.`
      );
      return true;
    } else {
      console.error(`LCR Tools: '${tabName}' tab li element not found.`);
      alert(
        `LCR Tools: Could not find the '${tabName}' tab. Ensure you are on the correct page.`
      );
      return false;
    }
  }

  // Expose navigationUtils globally
  window.navigationUtils = {
    navigateToFirstPage,
    isLastPage,
    goToNextPage,
    autoScrollToLoadContent,
    scrollToTop,
    setSelectValue,
    getNeeds,
    collectDataWithNavigation,
    navigateToTab,
  };
})();
