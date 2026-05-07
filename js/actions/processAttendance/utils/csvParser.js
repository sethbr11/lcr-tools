(() => {
  utils.returnIfLoaded("attendanceCsvParser");
  utils.ensureLoaded("dataUtils");

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
    if (dateHeaderIndex === -1)
      errors.push("CSV missing 'Date' header column.");
    if (firstNameHeaderIndex === -1)
      errors.push("CSV missing 'First Name' header column.");
    if (lastNameHeaderIndex === -1)
      errors.push("CSV missing 'Last Name' header column.");
    if (errors.length > 0) return { names: [], targetDate: null, errors };

    const parsedRows = [];
    const dateCounts = {};
    let totalRows = 0;

    // First pass: Parse all rows and collect dates
    for (let i = 1; i < lines.length; i++) {
      totalRows++;
      const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
      const cleanedValues = values.map((v) =>
        v.trim().replace(/^"|"$/g, "").replace(/""/g, '"')
      );

      if (
        cleanedValues.length <
        Math.max(dateHeaderIndex, firstNameHeaderIndex, lastNameHeaderIndex) + 1
      ) {
        errors.push(
          `Row ${i + 1}: Incorrect number of columns or malformed CSV data.`
        );
        continue;
      }

      const dateStr = cleanedValues[dateHeaderIndex];
      const firstName = cleanedValues[firstNameHeaderIndex];
      const lastName = cleanedValues[lastNameHeaderIndex];

      let dateObj = null;
      let normalizedDateStr = null;

      if (dateStr) {
        try {
          dateObj = dataUtils.parseLCRDate(dateStr);
          if (dateObj) {
            normalizedDateStr = dataUtils.formatDate(dateObj, "YYYY-MM-DD");
            dateCounts[normalizedDateStr] =
              (dateCounts[normalizedDateStr] || 0) + 1;
          }
        } catch (e) {
          // Ignore parsing errors for now, will catch in second pass
        }
      }

      parsedRows.push({
        rowNum: i + 1,
        dateStr,
        firstName,
        lastName,
        dateObj,
        normalizedDateStr,
      });
    }

    // Determine consensus date
    let targetDate = null;
    let maxCount = 0;
    const distinctDates = Object.keys(dateCounts);

    if (distinctDates.length > 0) {
      for (const date of distinctDates) {
        if (dateCounts[date] > maxCount) {
          maxCount = dateCounts[date];
          targetDate = date;
        }
      }
    }

    if (targetDate) {
      const [y, m, d] = targetDate.split("-").map(Number);
      const checkDate = new Date(y, m - 1, d);
      if (checkDate.getDay() !== 0) {
        // If the most common date isn't a Sunday, that's a problem.
        // Let the row-by-row validation handle the error message.
      }
    }

    const names = [];
    const nameSet = new Set();
    const namesByDate = {};

    // Second pass: Validate rows
    for (const row of parsedRows) {
      const {
        rowNum,
        dateStr,
        firstName,
        lastName,
        dateObj,
        normalizedDateStr,
      } = row;

      // Date validation
      if (!dateObj) {
        errors.push(
          `Row ${rowNum}: Could not parse date '${dateStr}'. Supported formats include: MM/DD/YYYY, YYYY-MM-DD, etc.`
        );
      } else {
        if (dateObj.getDay() !== 0) {
          errors.push(
            `Row ${rowNum}: Date '${dateStr}' is not a Sunday. Attendance must be for a Sunday.`
          );
        }
      }

      // Name validation
      if (!firstName) {
        errors.push(
          `Row ${rowNum} (Last Name: ${lastName || "N/A"}): First Name is missing.`
        );
      }
      if (!lastName) {
        errors.push(
          `Row ${rowNum} (First Name: ${
            firstName || "N/A"
          }): Last Name is missing.`
        );
      }

      if (firstName && lastName) {
        const fullNameKey = `${normalizedDateStr}:${lastName.toLowerCase()}, ${firstName.toLowerCase()}`;
        if (!nameSet.has(fullNameKey)) {
          nameSet.add(fullNameKey);
          names.push({ firstName, lastName });
          // Group by date
          if (normalizedDateStr) {
            if (!namesByDate[normalizedDateStr]) namesByDate[normalizedDateStr] = [];
            namesByDate[normalizedDateStr].push({ firstName, lastName });
          }
        }
      }
    }

    const duplicateCount = totalRows - names.length;

    if (errors.length > 0) return { names: [], targetDate: null, namesByDate: {}, errors };

    // Sort names within each date group
    const sortFn = (a, b) => {
      const comp = a.lastName.toLowerCase().localeCompare(b.lastName.toLowerCase());
      return comp !== 0 ? comp : a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase());
    };
    names.sort(sortFn);
    Object.values(namesByDate).forEach((arr) => arr.sort(sortFn));

    return { names, targetDate, namesByDate, errors: [], duplicateCount };
  }

  function computeDuplicateMessage(duplicateCount) {
    if (!duplicateCount) return "";
    return duplicateCount === 1
      ? "1 duplicate name was skipped."
      : `${duplicateCount} duplicate names were skipped.`;
  }

  /**
   * Parses tab-separated pasted text for attendance data.
   * Assumes columns are: Timestamp, First Name, Last Name (no header row).
   * The timestamp can include a time component (e.g. "4/12/2026 14:01:02")
   * which is stripped to extract just the date.
   *
   * @param {string} pastedText - The raw pasted text from a spreadsheet.
   * @returns {Object} - { names, targetDate, rawRows, errors, duplicateCount }
   */
  function parsePastedAttendance(pastedText) {
    const lines = pastedText.split(/\r\n|\n/).filter((line) => line.trim() !== "");

    if (lines.length === 0) {
      return {
        names: [],
        targetDate: null,
        rawRows: [],
        errors: ["No data found. Paste rows with Timestamp, First Name, Last Name (tab or comma separated)."],
      };
    }

    // Auto-detect delimiter: check if first line has more columns with tab or comma
    const firstLine = lines[0];
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = tabCount >= commaCount ? "\t" : ",";

    const rawRows = [];
    const dateCounts = {};
    const errors = [];

    // Parse each line using the detected delimiter
    for (let i = 0; i < lines.length; i++) {
      const columns = lines[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));

      if (columns.length < 3) {
        errors.push(
          `Row ${i + 1}: Expected 3 columns (Timestamp, First Name, Last Name), found ${columns.length}.`
        );
        continue;
      }

      // Extract date portion from timestamp (strip time like "14:01:02")
      const rawTimestamp = columns[0];
      const datePortion = rawTimestamp.replace(/\s+\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?$/i, "").trim();

      let dateObj = null;
      let normalizedDateStr = null;

      if (datePortion) {
        try {
          dateObj = dataUtils.parseLCRDate(datePortion);
          if (dateObj) {
            normalizedDateStr = dataUtils.formatDate(dateObj, "YYYY-MM-DD");
            dateCounts[normalizedDateStr] = (dateCounts[normalizedDateStr] || 0) + 1;
          }
        } catch (e) {
          // Will be caught in validation below
        }
      }

      const firstName = columns[1];
      const lastName = columns[2];

      rawRows.push({
        rowNum: i + 1,
        rawTimestamp,
        datePortion,
        firstName,
        lastName,
        dateObj,
        normalizedDateStr,
      });
    }

    if (rawRows.length === 0 && errors.length > 0) {
      return { names: [], targetDate: null, rawRows: [], errors };
    }

    // Determine consensus date (most common)
    let targetDate = null;
    let maxCount = 0;
    const distinctDates = Object.keys(dateCounts);

    if (distinctDates.length > 0) {
      for (const date of distinctDates) {
        if (dateCounts[date] > maxCount) {
          maxCount = dateCounts[date];
          targetDate = date;
        }
      }
    }

    // Validate rows
    const names = [];
    const nameSet = new Set();
    const namesByDate = {};
    let totalRows = 0;

    for (const row of rawRows) {
      totalRows++;

      // Date validation
      if (!row.dateObj) {
        errors.push(
          `Row ${row.rowNum}: Could not parse date from '${row.rawTimestamp}'.`
        );
      } else {
        if (row.dateObj.getDay() !== 0) {
          errors.push(
            `Row ${row.rowNum}: Date '${row.datePortion}' is not a Sunday.`
          );
        }
      }

      // Name validation
      if (!row.firstName) {
        errors.push(`Row ${row.rowNum}: First Name is missing.`);
      }
      if (!row.lastName) {
        errors.push(`Row ${row.rowNum}: Last Name is missing.`);
      }

      if (row.firstName && row.lastName) {
        const fullNameKey = `${row.normalizedDateStr}:${row.lastName.toLowerCase()}, ${row.firstName.toLowerCase()}`;
        if (!nameSet.has(fullNameKey)) {
          nameSet.add(fullNameKey);
          names.push({ firstName: row.firstName, lastName: row.lastName });
          // Group by date
          if (row.normalizedDateStr) {
            if (!namesByDate[row.normalizedDateStr]) namesByDate[row.normalizedDateStr] = [];
            namesByDate[row.normalizedDateStr].push({ firstName: row.firstName, lastName: row.lastName });
          }
        }
      }
    }

    const duplicateCount = totalRows - names.length;

    if (errors.length > 0) return { names: [], targetDate: null, namesByDate: {}, rawRows, errors };

    const sortFn = (a, b) => {
      const comp = a.lastName.toLowerCase().localeCompare(b.lastName.toLowerCase());
      return comp !== 0 ? comp : a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase());
    };
    names.sort(sortFn);
    Object.values(namesByDate).forEach((arr) => arr.sort(sortFn));

    return { names, targetDate, namesByDate, rawRows, errors: [], duplicateCount };
  }

  window.attendanceCsvParser = { parseAttendanceCsv, computeDuplicateMessage, parsePastedAttendance };
})();
