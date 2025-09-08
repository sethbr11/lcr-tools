/**
 * Core utility file providing foundational helper functions for the LCR extension.
 * Manages loading checks, safe function calls, and dependency verification
 * to ensure other utilities load correctly and avoid errors.
 */
(() => {
  if (window.utils) return; // Prevent duplicate initialization

  /**
   * Checks if a window variable is already loaded and returns early if so
   * @param {string} windowVar - The name of the window variable to check
   */
  const returnIfLoaded = (windowVar) => {
    if (window[windowVar]) return;
  };

  /**
   * Checks if a specified utils file is loaded and displays an error if not
   * @param {string|string[]} windowVars - The name(s) of the window variable(s) to check
   */
  const ensureLoaded = (...windowVars) => {
    windowVars.forEach((windowVar) => {
      if (!window[windowVar]) {
        const errorMessage = `${windowVar}.js must be loaded before this file.`;
        console.error(errorMessage);
        alert(errorMessage);
        throw new Error(errorMessage); // Stop execution
      }
    });
  };

  /**
   * Checks if a specified utils file is loaded and returns a boolean value
   * @param {string} windowVar - The name of the window variable to check
   * @param {boolean} log - Whether to log the result
   * @returns {boolean} - True if loaded
   */
  const checkIfLoaded = (windowVar, log = false) => {
    if (log)
      console.log(`LCR Tools: ${windowVar} is ${log ? "" : "not"} loaded.`);
    return !!window[windowVar];
  };

  /**
   * Safely calls a function on a loaded utility if available, otherwise returns a fallback
   * @param {string} utilName - The name of the utility (window variable)
   * @param {Function} func - The function to call with the utility if loaded
   * @param {*} fallback - The fallback value if the utility is not loaded
   * @returns {*} - The result of the function or the fallback
   */
  const safeCall = (utilName, func, fallback) => {
    if (window[utilName]) {
      return func(window[utilName]);
    } else {
      return fallback;
    }
  };

  window.utils = {
    returnIfLoaded,
    ensureLoaded,
    checkIfLoaded,
    safeCall,
  };
})();
