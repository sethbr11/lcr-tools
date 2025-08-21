/**
 * Gets the most recent Sunday or today if it's Sunday
 * @returns {Date} - The most recent Sunday
 */
function getMostRecentSunday() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mostRecentSunday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  mostRecentSunday.setDate(mostRecentSunday.getDate() - dayOfWeek);
  return mostRecentSunday;
}

/**
 * Formats a date for HTML date input (YYYY-MM-DD)
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatForDateInput(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses header date format used in LCR tables (e.g., "15 Jan")
 * @param {string} dateStr - Date string to parse
 * @returns {Date|null} - Parsed date or null if invalid
 */
function parseHeaderDate(dateStr) {
  try {
    const parts = dateStr.split(" ");
    if (parts.length !== 2) return null;

    const day = parseInt(parts[0]);
    const monthStr = parts[1];
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

    const monthIndex = monthNames.findIndex(
      (m) => m.toLowerCase() === monthStr.toLowerCase()
    );

    if (day && monthIndex !== -1) {
      const currentYear = new Date().getFullYear();
      let yearToUse = currentYear;
      const currentMonth = new Date().getMonth();

      // Handle year boundaries
      if (monthIndex === 11 && currentMonth === 0) {
        yearToUse = currentYear - 1;
      } else if (monthIndex === 0 && currentMonth === 11) {
        yearToUse = currentYear + 1;
      }

      return new Date(yearToUse, monthIndex, day);
    }
    return null;
  } catch (e) {
    console.error("Error parsing header date:", dateStr, e);
    return null;
  }
}

/**
 * Formats date object to YYYY-MM-DD string
 * @param {Date} dateObj - Date to format
 * @returns {string|null} - Formatted date string or null if invalid
 */
function formatToYYYYMMDD(dateObj) {
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return null;
  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const day = dateObj.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

window.dateUtils = {
  getMostRecentSunday,
  formatForDateInput,
  parseHeaderDate,
  formatToYYYYMMDD,
};
