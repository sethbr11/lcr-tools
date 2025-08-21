/**
 * Calculates Levenshtein distance between two strings
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
 * Performs fuzzy name matching with multiple strategies
 * @param {Object} csvName - Name from CSV {firstName, lastName}
 * @param {Object} lcrName - Name from LCR {firstName, lastName, firstNamesArray}
 * @returns {Object} - {isMatch: boolean, method: string}
 */
function fuzzyNameMatch(csvName, lcrName) {
  const csvLastName = csvName.lastName.toLowerCase();
  const csvFirstName = csvName.firstName.toLowerCase();
  const lcrLastName = lcrName.lastName.toLowerCase();
  const lcrFirstName = lcrName.firstName.toLowerCase();
  const lcrFirstNamesArray = lcrName.firstNamesArray || [];

  // Last names must match
  if (lcrLastName !== csvLastName) {
    return { isMatch: false, method: "No Match - Different Last Name" };
  }

  // Strategy 1: Exact first name match (any in LCR)
  if (lcrFirstNamesArray.some((lcrFirst) => lcrFirst === csvFirstName)) {
    return { isMatch: true, method: "Exact First Name (Any in LCR)" };
  }

  // Strategy 2: LCR first name includes CSV first name (relaxed)
  if (
    lcrFirstName.includes(csvFirstName) &&
    lcrFirstName.length - csvFirstName.length <= 3 &&
    csvFirstName.length >= Math.max(1, lcrFirstName.length - 3) &&
    csvFirstName.length > 1
  ) {
    return {
      isMatch: true,
      method: "LCR First Name Includes CSV First Name (Relaxed)",
    };
  }

  // Strategy 3: CSV first name includes LCR first name (relaxed)
  if (
    csvFirstName.includes(lcrFirstName) &&
    csvFirstName.length - lcrFirstName.length <= 3 &&
    lcrFirstName.length >= Math.max(1, csvFirstName.length - 3) &&
    lcrFirstName.length > 1
  ) {
    return {
      isMatch: true,
      method: "CSV First Name Includes LCR First Name (Relaxed)",
    };
  }

  // Strategy 4: Levenshtein distance with same first letter
  if (
    lcrFirstName.charAt(0) === csvFirstName.charAt(0) &&
    this.levenshteinDistance(lcrFirstName, csvFirstName) === 1
  ) {
    return { isMatch: true, method: "Levenshtein = 1 (Same First Letter)" };
  }

  return { isMatch: false, method: "No Match" };
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

window.stringUtils = {
  levenshteinDistance,
  fuzzyNameMatch,
  parseFullName,
};
