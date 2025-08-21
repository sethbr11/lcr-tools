/**
 * Formats a cell value for CSV output, handling quotes and commas.
 * @param {string} text - The text to format.
 * @returns {string} - Formatted CSV cell.
 */
function formatCsvCell(text) {
  // Trim whitespace and escape double quotes by doubling them
  let formattedText = text.trim().replace(/"/g, '""');

  // If the text contains a comma, wrap it in double quotes
  if (formattedText.includes(",")) formattedText = `"${formattedText}"`;

  return formattedText;
}

/**
 * Downloads CSV content as a file.
 * @param {string} csvContent - The CSV content to download.
 * @param {string} filename - The filename for the download.
 */
function downloadCsv(csvContent, filename) {
  // Create a Blob object with the CSV content and specify the MIME type
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  // Generate a temporary URL for the Blob
  const url = URL.createObjectURL(blob);

  // Create a temporary anchor element for triggering the download
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  // Append the anchor to the document, trigger the click, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke the temporary URL to free up resources
  URL.revokeObjectURL(url);
  console.log(`LCR Tools: CSV download initiated as ${filename}.`);
}

/**
 * Parses CSV text for attendance data with validation.
 * @param {string} csvText - The raw CSV text.
 * @returns {Object} - Parsed data with names, targetDate, and errors.
 */
function parseAttendanceCsv(csvText) {
  // Split the CSV text into lines and filter out empty lines
  const lines = csvText.split(/\r\n|\n/).filter((line) => line.trim() !== "");

  // Return an error if the CSV has no data rows
  if (lines.length < 2) {
    return {
      names: [],
      targetDate: null,
      errors: ["CSV is empty or has no data rows."],
    };
  }

  // Parse the header row and normalize the column names
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/"/g, "").toLowerCase());

  // Find the indices of required columns
  const dateHeaderIndex = headers.indexOf("date");
  const firstNameHeaderIndex = headers.indexOf("first name");
  const lastNameHeaderIndex = headers.indexOf("last name");

  const errors = [];

  // Validate the presence of required columns
  if (dateHeaderIndex === -1) errors.push("CSV missing 'Date' header column.");
  if (firstNameHeaderIndex === -1)
    errors.push("CSV missing 'First Name' header column.");
  if (lastNameHeaderIndex === -1)
    errors.push("CSV missing 'Last Name' header column.");
  if (errors.length > 0) return { names: [], targetDate: null, errors };

  const names = [];
  const nameCounts = {};
  let firstRowDateObj = null;
  let firstRowDateStr = "";

  // Process each data row
  for (let i = 1; i < lines.length; i++) {
    // Split the row into values, handling quoted fields
    const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];

    // Clean up the values by trimming and unescaping quotes
    const cleanedValues = values.map((v) =>
      v.trim().replace(/^"|"$/g, "").replace(/""/g, '"')
    );

    // Check if the row has enough columns
    if (
      cleanedValues.length <
      Math.max(dateHeaderIndex, firstNameHeaderIndex, lastNameHeaderIndex) + 1
    ) {
      errors.push(
        `Row ${i + 1}: Incorrect number of columns or malformed CSV data.`
      );
      continue;
    }

    // Extract the date, first name, and last name from the row
    const dateStr = cleanedValues[dateHeaderIndex];
    const firstName = cleanedValues[firstNameHeaderIndex];
    const lastName = cleanedValues[lastNameHeaderIndex];

    if (i === 1) {
      // Parse and validate the date from the first row
      try {
        firstRowDateObj = parseDate(dateStr, errors, i);
        firstRowDateStr = dateStr;
      } catch (e) {
        errors.push(e.message);
      }
    } else if (cleanedValues[dateHeaderIndex] !== firstRowDateStr) {
      // Ensure all rows have the same date as the first row
      errors.push(
        `Row ${i + 1}: Date '${
          cleanedValues[dateHeaderIndex]
        }' differs from the first row's date ('${firstRowDateStr}'). All dates in the CSV must be the same.`
      );
    }

    // Validate the presence of first and last names
    if (!firstName) {
      errors.push(
        `Row ${i + 1} (Last Name: ${lastName || "N/A"}): First Name is missing.`
      );
    }
    if (!lastName) {
      errors.push(
        `Row ${i + 1} (First Name: ${
          firstName || "N/A"
        }): Last Name is missing.`
      );
    }
    if (!firstName || !lastName) continue;

    // Create a unique key for the full name and track duplicates
    const fullNameKey = `${lastName.toLowerCase()}, ${firstName.toLowerCase()}`;
    nameCounts[fullNameKey] = (nameCounts[fullNameKey] || 0) + 1;
    names.push({ firstName, lastName });
  }

  // Check for duplicate names and add errors if found
  checkDuplicateNames(nameCounts, errors);

  if (errors.length > 0) return { names: [], targetDate: null, errors };

  // Sort the names alphabetically by last name, then by first name
  names.sort((a, b) => {
    const comp = a.lastName
      .toLowerCase()
      .localeCompare(b.lastName.toLowerCase());
    return comp !== 0
      ? comp
      : a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase());
  });

  // Format the target date as YYYY-MM-DD
  const targetDateString = firstRowDateObj
    ? `${firstRowDateObj.getFullYear()}-${(firstRowDateObj.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${firstRowDateObj
        .getDate()
        .toString()
        .padStart(2, "0")}`
    : null;
  return { names, targetDate: targetDateString, errors: [] };
}

/**
 * Formats a date for CSV display (MM/DD/YYYY)
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatDateForCsv(date) {
  return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date
    .getDate()
    .toString()
    .padStart(2, "0")}/${date.getFullYear()}`;
}

// ------HELPER FUNCTIONS------

/**
 * Parses a date string and validates it.
 * @param {string} dateStr - The date string to parse.
 * @param {Array} errors - The errors array to push validation errors.
 * @param {number} rowIndex - The row index for error reporting.
 * @returns {Date} - The parsed date object.
 */
function parseDate(dateStr, errors, rowIndex) {
  if (!dateStr) throw new Error(`Row ${rowIndex + 1}: Date is missing.`);

  let parsedDate;

  // Check for different formats and parse
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    parsedDate = new Date(dateStr + "T00:00:00"); // ISO Format
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    parsedDate = new Date(dateStr); // US Format
  } else {
    // Invalid format
    throw new Error(
      `Row ${
        rowIndex + 1
      }: Error parsing date '${dateStr}'. Use format like MM/DD/YYYY or YYYY-MM-DD.`
    );
  }

  // Ensure the parsed date is valid
  if (isNaN(parsedDate.getTime())) {
    throw new Error(`Row ${rowIndex + 1}: Invalid date value '${dateStr}'.`);
  }

  // Check if the date is a Sunday
  const localCheckDate = new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate()
  );
  if (localCheckDate.getDay() !== 0) {
    throw new Error(
      `Date '${dateStr}' (parsed as ${localCheckDate.toDateString()}) in CSV is not a Sunday.`
    );
  }

  return localCheckDate;
}

/**
 * Checks for duplicate names in the CSV and adds errors if found.
 * @param {Object} nameCounts - A map of name keys to their counts.
 * @param {Array} errors - The errors array to push validation errors.
 */
function checkDuplicateNames(nameCounts, errors) {
  for (const [name, count] of Object.entries(nameCounts)) {
    if (count > 1) {
      // Format the name for error reporting
      errors.push(
        `Duplicate name in CSV: ${name
          .split(", ")
          .map((n) => n.charAt(0).toUpperCase() + n.slice(1))
          .join(", ")} (appears ${count} times).`
      );
    }
  }
}

window.csvUtils = {
  formatCsvCell,
  downloadCsv,
  parseAttendanceCsv,
  formatDateForCsv,
};
