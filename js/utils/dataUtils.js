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
   * Parses a date string into a Date object, handling various LCR date formats
   * @param {string} dateStr - The date string to parse
   * @returns {Date|null} - Parsed date or null if unparseable
   */
  function parseLCRDate(dateStr) {
    if (!dateStr || typeof dateStr !== "string") return null;

    const trimmed = dateStr.trim();
    if (!trimmed) return null;

    // Try parsing as ISO date first (YYYY-MM-DD)
    let date = new Date(trimmed);
    if (!isNaN(date.getTime())) return date;

    // Try common LCR date formats
    const formats = [
      // MM/DD/YYYY or M/D/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // MM-DD-YYYY or M-D-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      // DD MMM YYYY (e.g., "15 Jan 2024")
      /^(\d{1,2})\s+(\w{3})\s+(\d{4})$/,
      // MMM DD, YYYY (e.g., "Jan 15, 2024")
      /^(\w{3})\s+(\d{1,2}),?\s+(\d{4})$/,
      // DD MMM (e.g., "15 Jan") - assume current year
      /^(\d{1,2})\s+(\w{3})$/,
      // MMM DD (e.g., "Jan 15") - assume current year
      /^(\w{3})\s+(\d{1,2})$/,
    ];

    for (const format of formats) {
      const match = trimmed.match(format);
      if (match) {
        let year, month, day;

        if (format.source.includes("\\w{3}")) {
          // Month name format
          const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
          const monthIndex = monthNames.indexOf(match[2] || match[1]);

          if (monthIndex !== -1) {
            if (format.source.includes("\\d{4}")) {
              // Full year format
              year = parseInt(match[3]);
              day = parseInt(match[1]);
              month = monthIndex;
            } else {
              // No year format - assume current year
              year = new Date().getFullYear();
              day = parseInt(match[1] || match[2]);
              month = monthIndex;
            }
          }
        } else {
          // Numeric format
          if (format.source.includes("\\d{4}")) {
            year = parseInt(match[3]);
            month = parseInt(match[1]) - 1; // JavaScript months are 0-based
            day = parseInt(match[2]);
          } else {
            // No year format - assume current year
            year = new Date().getFullYear();
            month = parseInt(match[1]) - 1;
            day = parseInt(match[2]);
          }
        }

        if (year && month !== undefined && day) {
          date = new Date(year, month, day);
          if (!isNaN(date.getTime())) return date;
        }
      }
    }

    return null;
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

    // Use the comprehensive parseLCRDate function for parsing
    const parsedDate = parseLCRDate(dateStr);

    if (!parsedDate) {
      const errorMsg = `${rowInfo}Error parsing date '${dateStr}'. Use format like MM/DD/YYYY or YYYY-MM-DD.`;
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

  /**
   * Checks if a string value looks like a date
   * @param {string} value - The value to check
   * @returns {boolean} - True if the value appears to be a date
   */
  function isDateValue(value) {
    // Common date patterns in LCR
    const datePatterns = [
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // MM/DD/YYYY or M/D/YYYY
      /^\d{1,2}-\d{1,2}-\d{4}$/, // MM-DD-YYYY or M-D-YYYY
      /^\d{4}-\d{1,2}-\d{1,2}$/, // YYYY-MM-DD
      /^\d{1,2}\/\d{1,2}\/\d{2}$/, // MM/DD/YY or M/D/YY
      /^\d{1,2}\s+\w{3}\s+\d{4}$/, // DD MMM YYYY (e.g., "15 Jan 2024")
      /^\w{3}\s+\d{1,2},?\s+\d{4}$/, // MMM DD, YYYY (e.g., "Jan 15, 2024")
      /^\d{1,2}\s+\w{3}$/, // DD MMM (e.g., "15 Jan")
      /^\w{3}\s+\d{1,2}$/, // MMM DD (e.g., "Jan 15")
    ];

    return datePatterns.some((pattern) => pattern.test(value.trim()));
  }

  /**
   * Checks if a column contains date-like data by analyzing sample values
   * @param {HTMLTableElement} table - The table element
   * @param {number} columnIndex - The column index
   * @returns {boolean} - True if the column appears to contain dates
   */
  function isDateColumn(table, columnIndex) {
    const rows = Array.from(table.querySelectorAll("tbody tr")).filter(
      (row) => row.offsetParent !== null
    );

    // Sample up to 10 rows to determine if this is a date column
    const sampleSize = Math.min(10, rows.length);
    let dateCount = 0;

    for (let i = 0; i < sampleSize; i++) {
      const cells = Array.from(rows[i].querySelectorAll("td"));
      if (cells[columnIndex]) {
        const cellValue = (
          cells[columnIndex].innerText ||
          cells[columnIndex].textContent ||
          ""
        ).trim();
        if (cellValue && isDateValue(cellValue)) {
          dateCount++;
        }
      }
    }

    // If more than 50% of sampled values look like dates, consider it a date column
    return dateCount > sampleSize * 0.5;
  }

  window.dataUtils = {
    formatDate,
    parseDate,
    parseFullName,
    fuzzyNameMatch,
    isDateValue,
    isDateColumn,
    parseLCRDate,
  };
})();
