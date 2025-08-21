/**
 * Sleep utility for introducing delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after the specified time
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    shouldStop = () => false, // Callback to determine if scrolling should stop
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
  await this.sleep(delay);
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

window.scrapingUtils = {
  sleep,
  autoScrollToLoadContent,
  scrollToTop,
  setSelectValue,
};
