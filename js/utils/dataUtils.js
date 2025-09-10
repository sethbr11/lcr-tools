/**
 * Utility file for manipulating, validating, processing, and transforming data.
 */

(() => {
  utils.returnIfLoaded("dataUtils");

  /**
   * Helper function: Calculates Levenshtein distance between two strings
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} - Edit distance
   */
  function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  /**
   * Formats a date object based on the specified format.
   * @param {Date} date - The date to format.
   * @param {string} [format="MM/DD/YYYY"] - The desired format ('MM/DD/YYYY' or 'YYYY-MM-DD').
   * @returns {string|null} - The formatted date string, or null if the date is invalid.
   */
  function formatDate(date, format = "MM/DD/YYYY") {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return null;
    }

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    switch (format) {
      case "YYYY-MM-DD":
        return `${year}-${month}-${day}`;
      case "MM/DD/YYYY":
      default:
        return `${month}/${day}/${year}`;
    }
  }

  /**
   * Parses a date string and validates it.
   * @param {string} dateStr - The date string to parse.
   * @param {Array} [errors] - The errors array to push validation errors.
   * @param {number} [rowIndex] - The row index for error reporting.
   * @returns {Date|null} - The parsed date object, or null if parsing fails.
   */
  function parseDate(dateStr, errors, rowIndex) {
    const rowInfo = rowIndex !== undefined ? `Row ${rowIndex + 1}: ` : "";
    if (!dateStr) {
      const errorMsg = `${rowInfo}Date is missing.`;
      if (errors) {
        errors.push(errorMsg);
        return null;
      }
      throw new Error(errorMsg);
    }

    let parsedDate;
    const currentYear = new Date().getFullYear();

    // Check for different formats and parse
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      parsedDate = new Date(dateStr + "T00:00:00"); // ISO Format
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      parsedDate = new Date(dateStr); // US Format
    } else if (/^\d{1,2} [a-zA-Z]{3}$/.test(dateStr)) {
      // Handle "DD MMM" format, e.g., "17 Aug"
      parsedDate = new Date(`${dateStr} ${currentYear}`);
    } else {
      // Invalid format
      const errorMsg = `${rowInfo}Error parsing date '${dateStr}'. Use format like MM/DD/YYYY or YYYY-MM-DD.`;
      if (errors) {
        errors.push(errorMsg);
        return null;
      }
      throw new Error(errorMsg);
    }

    // Ensure the parsed date is valid
    if (isNaN(parsedDate.getTime())) {
      const errorMsg = `${rowInfo}Invalid date value '${dateStr}'.`;
      if (errors) {
        errors.push(errorMsg);
        return null;
      }
      throw new Error(errorMsg);
    }

    // Check if the date is a Sunday
    const localCheckDate = new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate()
    );
    if (localCheckDate.getDay() !== 0) {
      const errorMsg = `Date '${dateStr}' (parsed as ${localCheckDate.toDateString()}) in CSV is not a Sunday.`;
      if (errors) {
        errors.push(errorMsg);
        return null;
      }
      throw new Error(errorMsg);
    }

    return localCheckDate;
  }

  /**
   * Parses a full name into components
   * @param {string} fullName - Full name to parse
   * @returns {Object} - {firstName, lastName, firstNamesArray}
   */
  function parseFullName(fullName) {
    let lastName = "";
    let firstName = "";

    const commaIdx = fullName.indexOf(",");
    if (commaIdx !== -1) {
      lastName = fullName.substring(0, commaIdx).trim().toLowerCase();
      firstName = fullName
        .substring(commaIdx + 1)
        .trim()
        .toLowerCase();
    } else {
      const parts = fullName.split(" ").filter((p) => p);
      if (parts.length > 0) lastName = parts[0].toLowerCase();
      if (parts.length > 1) firstName = parts.slice(1).join(" ").toLowerCase();
    }

    const firstNamesArray = firstName
      ? firstName
          .split(/\s+/)
          .map((n) => n.trim())
          .filter(Boolean)
      : [];

    return { firstName, lastName, firstNamesArray };
  }

  /**
   * Performs fuzzy name matching with multiple strategies
   * @param {Object} name - Name to compare
   * @param {Object} nameToMatch - Name to match to
   * @returns {Object} - {isMatch: boolean, method: string}
   */
  function fuzzyNameMatch(name, nameToMatch) {
    const lastName = name.lastName.toLowerCase();
    const firstName = name.firstName.toLowerCase();
    const lastNameToMatch = nameToMatch.lastName.toLowerCase();
    const firstNameToMatch = nameToMatch.firstName.toLowerCase();
    const firstNameToMatchsArray = nameToMatch.firstNamesArray || [];

    // Last names must match
    if (lastNameToMatch !== lastName) {
      return { isMatch: false, method: "No Match - Different Last Name" };
    }

    // Strategy 1: Exact first name match
    if (firstNameToMatchsArray.some((lcrFirst) => lcrFirst === firstName)) {
      return { isMatch: true, method: "Exact First Name (Any in LCR)" };
    }

    // Strategy 2: LCR first name includes CSV first name (relaxed)
    if (
      firstNameToMatch.includes(firstName) &&
      firstNameToMatch.length - firstName.length <= 3 &&
      firstName.length >= Math.max(1, firstNameToMatch.length - 3) &&
      firstName.length > 1
    ) {
      return {
        isMatch: true,
        method: "LCR First Name Includes CSV First Name (Relaxed)",
      };
    }

    // Strategy 3: CSV first name includes LCR first name (relaxed)
    if (
      firstName.includes(firstNameToMatch) &&
      firstName.length - firstNameToMatch.length <= 3 &&
      firstNameToMatch.length >= Math.max(1, firstName.length - 3) &&
      firstNameToMatch.length > 1
    ) {
      return {
        isMatch: true,
        method: "CSV First Name Includes LCR First Name (Relaxed)",
      };
    }

    // Strategy 4: Levenshtein distance with same first letter
    if (
      firstNameToMatch.charAt(0) === firstName.charAt(0) &&
      levenshteinDistance(firstNameToMatch, firstName) === 1
    ) {
      return { isMatch: true, method: "Levenshtein = 1 (Same First Letter)" };
    }

    return { isMatch: false, method: "No Match" };
  }

  window.dataUtils = {
    formatDate,
    parseDate,
    parseFullName,
    fuzzyNameMatch,
  };
})();
