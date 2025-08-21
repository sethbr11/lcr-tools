if (!window.__lcrx_pagination_utils_loaded__) {
  window.__lcrx_pagination_utils_loaded__ = true;
  const DEFAULT_MAX_TOTAL_PAGES = 20; // Default safety limit to prevent infinite loops
  const DEFAULT_PAGINATION_DELAY_MS = 1000;

  window.paginationUtils = {
    // Common selectors for LCR pagination
    SELECTORS: {
      // New data-testid based pagination
      firstPageButton: 'button[data-testid="first"]',
      nextPageButton: 'button[data-testid="next"]',
      lastPageButton: 'button[data-testid="last"]',
      // Old class-based pagination fallbacks
      firstPageButtonOld: "div.sc-f155593d-0.jVFBIX",
      nextPageButtonOld: "div.sc-b87b8e2-0.cLfglj",
      lastPageButtonOld: "div.sc-cb69f8b7-0.cXraMi",
      // Page indicators
      firstPageNumberDiv: ".sc-9d92d0db-0.lnnvp .sc-66e0b3ee-0:first-child",
      activePageClass: "ghqlVx",
      pageIndicatorText:
        "div.sc-lf3bj0-0.biBXLT > div:last-of-type:not([class^='sc-'])",
      // Boolean icons for reports
      trueIconSvg:
        'div.sc-5ba12d08-0 svg path[d*="M12 22c5.523"][d*="l-7.452 7.196"]',
      falseIconSvg:
        'div.sc-5ba12d08-0 svg path[d*="M12 3.5a8.5"][d*="M2 12C2"]',
      trueIconImg: 'img[src*="icon-16-checkmark.png"]',
    },

    /**
     * Navigate to the first page of results
     * @param {number} delay - Delay after navigation (ms)
     * @returns {Promise<void>}
     */
    async navigateToFirstPage(delay = DEFAULT_PAGINATION_DELAY_MS) {
      console.log("LCR Tools: Attempting to navigate to first page...");

      // Try new data-testid based pagination first
      let firstPageButton = document.querySelector(
        this.SELECTORS.firstPageButton
      );

      // Fall back to old class-based pagination
      if (!firstPageButton) {
        firstPageButton = document.querySelector(
          this.SELECTORS.firstPageButtonOld
        );
      }

      if (
        firstPageButton &&
        !firstPageButton.disabled &&
        firstPageButton.offsetParent !== null
      ) {
        console.log("LCR Tools: Clicking first page button.");
        firstPageButton.click();
        await scrapingUtils.sleep(delay);
      } else {
        console.log(
          "LCR Tools: Already on first page or first page button not available."
        );
      }
    },

    /**
     * Checks if current page is the last page using multiple methods
     * @returns {boolean} - True if on last page
     */
    isLastPage() {
      // Method 1: Check new data-testid based pagination
      let nextPageButton = document.querySelector(
        this.SELECTORS.nextPageButton
      );
      if (nextPageButton) {
        const isDisabled =
          nextPageButton.disabled || nextPageButton.hasAttribute("disabled");
        if (isDisabled) {
          console.log("LCR Tools: Next page button is disabled (new style).");
          return true;
        }
      }

      // Method 2: Check old class-based pagination
      if (!nextPageButton) {
        nextPageButton = document.querySelector(
          this.SELECTORS.nextPageButtonOld
        );
        if (nextPageButton) {
          const isHidden = nextPageButton.offsetParent === null;
          const isDisabled =
            nextPageButton.classList.contains("disabled") ||
            nextPageButton.hasAttribute("disabled");
          if (isHidden || isDisabled) {
            console.log(
              "LCR Tools: Next page button is hidden/disabled (old style)."
            );
            return true;
          }
        }
      }

      // Method 3: Check last page button state
      let lastPageButton = document.querySelector(
        this.SELECTORS.lastPageButton
      );
      if (!lastPageButton) {
        lastPageButton = document.querySelector(
          this.SELECTORS.lastPageButtonOld
        );
      }
      if (lastPageButton) {
        const isHidden = lastPageButton.offsetParent === null;
        const isDisabled =
          lastPageButton.disabled ||
          lastPageButton.classList.contains("disabled");
        if (isHidden || isDisabled) {
          console.log(
            "LCR Tools: Last page button indicates we're on last page."
          );
          return true;
        }
      }

      // Method 4: Check page indicator text (e.g., "251-269/269")
      const pageIndicator = document.querySelector(
        this.SELECTORS.pageIndicatorText
      );
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

      // Method 5: Check active page against available page numbers
      const activePage = document.querySelector(
        `div.${this.SELECTORS.activePageClass}`
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
    },

    /**
     * Navigates to the next page, if available
     * @param {number} delay - Delay after clicking (ms)
     * @param {number} maxPages - Maximum page limit to prevent infinite loops
     * @param {number} currentPageNumber - The current page number
     * @returns {Promise<boolean>} - Returns false if navigation failed or limit reached
     */
    async goToNextPage(
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

      if (this.isLastPage()) {
        console.log(
          "LCR Tools: Already on last page, cannot navigate further."
        );
        return false;
      }

      // Try new data-testid based pagination first
      let nextPageButton = document.querySelector(
        this.SELECTORS.nextPageButton
      );

      // Fall back to old class-based pagination
      if (!nextPageButton || nextPageButton.disabled) {
        nextPageButton = document.querySelector(
          this.SELECTORS.nextPageButtonOld
        );
      }

      if (
        nextPageButton &&
        !nextPageButton.disabled &&
        nextPageButton.offsetParent !== null &&
        !nextPageButton.classList.contains("disabled")
      ) {
        console.log(
          `LCR Tools: Navigating to page ${currentPageNumber + 1}...`
        );
        nextPageButton.click();
        await scrapingUtils.sleep(delay);

        // Verify navigation actually happened by checking if page content changed
        await scrapingUtils.sleep(500); // Short additional wait for content to load
        return true;
      } else {
        console.warn("LCR Tools: Next page button not available or disabled.");
        return false;
      }
    },
  };
}
