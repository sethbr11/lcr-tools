(async function () {
  console.log("LCR Tools: setupAttendanceUI.js injected.");

  // Ensure utility functions are available
  if (
    typeof showLoadingIndicator !== "function" ||
    typeof hideLoadingIndicator !== "function" ||
    typeof LCR_TOOLS_PROCESS_ATTENDANCE !== "function"
  ) {
    console.error(
      "LCR Tools: Essential functions (loading indicator or main processing) are not available. Ensure scripts are injected in the correct order (utils, processAttendance, setupAttendanceUI)."
    );
    alert(
      "LCR Tools: Critical error initializing attendance input. Required components are missing. Please try reloading the extension and the page."
    );
    return { result: { error: "Core function(s) missing." } };
  }

  const UI_OVERLAY_ID = "lcr-tools-attendance-ui-overlay";
  let parsedCsvDataForProcessing = null;

  function createAttendanceUI() {
    if (document.getElementById(UI_OVERLAY_ID)) {
      console.log("LCR Tools: Attendance UI already visible.");
      const existingOverlay = document.getElementById(UI_OVERLAY_ID);
      existingOverlay.style.display = "flex"; // Ensure it's visible
      return;
    }

    const overlay = document.createElement("div");
    overlay.id = UI_OVERLAY_ID;
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    overlay.style.zIndex = "19999";
    overlay.style.display = "flex";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";

    const modal = document.createElement("div");
    modal.style.backgroundColor = "#fff";
    modal.style.padding = "25px";
    modal.style.borderRadius = "8px";
    modal.style.boxShadow = "0 5px 15px rgba(0,0,0,0.3)";
    modal.style.width = "90%";
    modal.style.maxWidth = "650px";
    modal.style.maxHeight = "90vh";
    modal.style.overflowY = "auto";
    modal.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    modal.style.color = "#333";

    modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="margin:0; color: #00509e; font-size: 1.4em;">Input Class/Quorum Attendance</h2>
                <button id="lcr-tools-close-attendance-ui" title="Close" style="background:transparent; border:none; font-size:1.8em; cursor:pointer; color:#555; line-height:1;">&times;</button>
            </div>

            <div style="margin-bottom: 20px;">
                <label for="lcr-tools-attendance-date" style="display:block; margin-bottom:8px; font-weight:bold;">1. Select Attendance Date (Sunday):</label>
                <input type="date" id="lcr-tools-attendance-date" style="padding:8px; border:1px solid #ccc; border-radius:4px; min-width:180px; font-size: 1em;">
                <button id="lcr-tools-download-sample" style="padding:9px 12px; margin-left:10px; background-color:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer; font-size: 0.95em;">Download Sample CSV</button>
            </div>

            <div style="margin-bottom: 20px;">
                <label for="lcr-tools-csv-upload" style="display:block; margin-bottom:8px; font-weight:bold;">2. Upload Attendance CSV:</label>
                <input type="file" id="lcr-tools-csv-upload" accept=".csv" style="padding:8px; border:1px solid #ccc; border-radius:4px; width: calc(100% - 22px); font-size: 1em;">
                 <p style="font-size:0.85em; color: #555; margin-top: 5px;">CSV must contain 'Date', 'First Name', 'Last Name' columns. All dates in CSV must be the same Sunday.</p>
            </div>

            <div id="lcr-tools-attendance-status" style="margin-top:15px; padding:10px; border-radius:4px; font-size:0.9em; border:1px solid transparent; min-height: 20px;"></div>
            
            <p style="font-size:0.85em; color: #444; margin-top: 20px; padding: 10px; background-color: #f8f9fa; border-left: 3px solid #007bff; border-radius: 4px;">
                <strong>Note:</strong> After processing, two CSV files will be downloaded:<br>
                - An <strong>update summary report</strong> showing the status of each name from your input file.<br>
                - A <strong>detailed action log</strong> showing all steps taken by the extension.
            </p>

            <div style="text-align:right; margin-top:25px;">
                <button id="lcr-tools-process-attendance-btn" disabled style="padding:10px 15px; background-color:#007bff; color:white; border:none; border-radius:4px; cursor:pointer; font-size:1em;">Process Attendance on LCR</button>
            </div>
        `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Event Listeners
    document
      .getElementById("lcr-tools-close-attendance-ui")
      .addEventListener("click", closeAttendanceUI);

    const dateInput = document.getElementById("lcr-tools-attendance-date");
    const today = new Date(); // User's local current date and time
    const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6

    // Calculate the most recent Sunday or today if it's Sunday
    const mostRecentSunday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ); // Start with today at 00:00:00 local time
    mostRecentSunday.setDate(mostRecentSunday.getDate() - dayOfWeek); // This will set it to the previous Sunday, or today if today is Sunday

    // Format for date input (YYYY-MM-DD)
    const year = mostRecentSunday.getFullYear();
    const month = (mostRecentSunday.getMonth() + 1).toString().padStart(2, "0"); // getMonth() is 0-indexed
    const day = mostRecentSunday.getDate().toString().padStart(2, "0");
    dateInput.value = `${year}-${month}-${day}`;

    document
      .getElementById("lcr-tools-download-sample")
      .addEventListener("click", downloadSampleHandler);
    document
      .getElementById("lcr-tools-csv-upload")
      .addEventListener("change", csvUploadHandler);
    document
      .getElementById("lcr-tools-process-attendance-btn")
      .addEventListener("click", processAttendanceHandler);
  }

  function closeAttendanceUI() {
    const overlay = document.getElementById(UI_OVERLAY_ID);
    if (overlay) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  function showUiStatus(message, isError = false) {
    const statusDiv = document.getElementById("lcr-tools-attendance-status");
    if (statusDiv) {
      statusDiv.innerHTML = message; // Allow HTML for list items
      statusDiv.style.borderColor = isError ? "#f5c6cb" : "#c3e6cb";
      statusDiv.style.backgroundColor = isError ? "#f8d7da" : "#d4edda";
      statusDiv.style.color = isError ? "#721c24" : "#155724";
      statusDiv.style.display = message ? "block" : "none";
    }
  }

  function downloadSampleHandler() {
    const dateInput = document.getElementById("lcr-tools-attendance-date");
    const selectedDateValue = dateInput.value;
    if (!selectedDateValue) {
      showUiStatus("Please select a date first to download the sample.", true);
      return;
    }
    // Date input value is YYYY-MM-DD, which new Date() interprets correctly as local time at midnight
    const selectedDate = new Date(selectedDateValue + "T00:00:00");
    if (selectedDate.getDay() !== 0) {
      // Sunday is 0
      showUiStatus("Please select a Sunday for the attendance date.", true);
      return;
    }
    const formattedDate = `${(selectedDate.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${selectedDate
      .getDate()
      .toString()
      .padStart(2, "0")}/${selectedDate.getFullYear()}`;
    const csvHeader = `"Date","First Name","Last Name"\n`;
    const sampleRow = `"${formattedDate}","John","Doe"\n"${formattedDate}","Jane","Smith"`;
    const csvContent = csvHeader + sampleRow;

    downloadFile(
      csvContent,
      `sample_attendance_${selectedDateValue}.csv`,
      "text/csv;charset=utf-8;"
    );
    showUiStatus("Sample CSV downloaded.", false);
  }

  function csvUploadHandler(event) {
    const processBtn = document.getElementById(
      "lcr-tools-process-attendance-btn"
    );
    processBtn.disabled = true;
    parsedCsvDataForProcessing = null;
    showUiStatus("Processing uploaded CSV...", false);

    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        try {
          const { names, targetDate, errors } = parseCsvTextForAttendance(text);
          if (errors.length > 0) {
            const errorMessages = errors
              .map((err) => `<li>${err}</li>`)
              .join("");
            showUiStatus(
              `<strong>CSV Validation Errors:</strong><ul>${errorMessages}</ul> Please correct the CSV and re-upload.`,
              true
            );
            return;
          }
          if (names.length === 0) {
            showUiStatus("CSV parsed, but no names found to process.", true);
            return;
          }
          parsedCsvDataForProcessing = { names, targetDate };
          showUiStatus(
            `CSV successfully parsed: ${names.length} names for date ${targetDate}. Ready to process.`,
            false
          );
          processBtn.disabled = false;
        } catch (parseError) {
          showUiStatus(`Error parsing CSV: ${parseError.message}`, true);
        }
      };
      reader.onerror = () => {
        showUiStatus("Error reading the uploaded file.", true);
      };
      reader.readAsText(file);
    } else {
      showUiStatus("", false);
    }
  }

  function parseCsvTextForAttendance(csvText) {
    const lines = csvText.split(/\r\n|\n/).filter((line) => line.trim() !== "");
    if (lines.length < 2)
      return {
        names: [],
        targetDate: null,
        errors: ["CSV is empty or has no data rows."],
      };

    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/"/g, "").toLowerCase());
    const dateHeaderIndex = headers.indexOf("date");
    const firstNameHeaderIndex = headers.indexOf("first name");
    const lastNameHeaderIndex = headers.indexOf("last name");

    const errors = [];
    if (dateHeaderIndex === -1)
      errors.push("CSV missing 'Date' header column.");
    if (firstNameHeaderIndex === -1)
      errors.push("CSV missing 'First Name' header column.");
    if (lastNameHeaderIndex === -1)
      errors.push("CSV missing 'Last Name' header column.");
    if (errors.length > 0) return { names: [], targetDate: null, errors };

    const names = [];
    const nameCounts = {};
    let firstRowDateObj = null;
    let firstRowDateStr = "";

    for (let i = 1; i < lines.length; i++) {
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

      if (i === 1) {
        if (!dateStr) {
          errors.push(`Row ${i + 1}: Date is missing.`);
        } else {
          try {
            let parsedDate;
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              // YYYY-MM-DD
              parsedDate = new Date(dateStr + "T00:00:00");
            } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
              // MM/DD/YYYY
              parsedDate = new Date(dateStr);
            } else {
              throw new Error("Unrecognized date format");
            }

            if (isNaN(parsedDate.getTime()))
              throw new Error("Invalid date value");

            // Create a new date object based on parsed year, month, day to ensure local interpretation for getDay()
            const localCheckDate = new Date(
              parsedDate.getFullYear(),
              parsedDate.getMonth(),
              parsedDate.getDate()
            );
            if (localCheckDate.getDay() !== 0)
              errors.push(
                `Date '${dateStr}' (parsed as ${localCheckDate.toDateString()}) in CSV is not a Sunday.`
              );

            firstRowDateObj = localCheckDate; // Store the locally interpreted date
            firstRowDateStr = dateStr;
          } catch (e) {
            errors.push(
              `Row ${
                i + 1
              }: Error parsing date '${dateStr}'. Use format like MM/DD/YYYY or YYYY-MM-DD. (${
                e.message
              })`
            );
          }
        }
      } else if (cleanedValues[dateHeaderIndex] !== firstRowDateStr) {
        errors.push(
          `Row ${i + 1}: Date '${
            cleanedValues[dateHeaderIndex]
          }' differs from the first row's date ('${firstRowDateStr}'). All dates in the CSV must be the same.`
        );
      }

      if (!firstName)
        errors.push(
          `Row ${i + 1} (Last Name: ${
            lastName || "N/A"
          }): First Name is missing.`
        );
      if (!lastName)
        errors.push(
          `Row ${i + 1} (First Name: ${
            firstName || "N/A"
          }): Last Name is missing.`
        );
      if (!firstName || !lastName) continue;

      const fullNameKey = `${lastName.toLowerCase()}, ${firstName.toLowerCase()}`;
      nameCounts[fullNameKey] = (nameCounts[fullNameKey] || 0) + 1;
      names.push({ firstName, lastName });
    }

    for (const [name, count] of Object.entries(nameCounts)) {
      if (count > 1)
        errors.push(
          `Duplicate name in CSV: ${name
            .split(", ")
            .map((n) => n.charAt(0).toUpperCase() + n.slice(1))
            .join(", ")} (appears ${count} times).`
        );
    }

    if (errors.length > 0) return { names: [], targetDate: null, errors };

    names.sort((a, b) => {
      const comp = a.lastName
        .toLowerCase()
        .localeCompare(b.lastName.toLowerCase());
      return comp !== 0
        ? comp
        : a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase());
    });

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

  function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function processAttendanceHandler() {
    if (!parsedCsvDataForProcessing) {
      showUiStatus("No valid CSV data loaded. Please upload a CSV file.", true);
      return;
    }
    const { names, targetDate } = parsedCsvDataForProcessing;
    if (!names || names.length === 0 || !targetDate) {
      showUiStatus(
        "Data for processing is incomplete. Ensure date and names are present.",
        true
      );
      return;
    }

    closeAttendanceUI();

    const processingResult = await LCR_TOOLS_PROCESS_ATTENDANCE(
      targetDate,
      names
    );

    parsedCsvDataForProcessing = null;
    const processBtn = document.getElementById(
      "lcr-tools-process-attendance-btn"
    );
    // The button might not exist if the UI was closed, so check first.
    if (processBtn) processBtn.disabled = true;
    const fileInput = document.getElementById("lcr-tools-csv-upload");
    if (fileInput) fileInput.value = "";
  }

  // --- Initialize and create the UI ---
  createAttendanceUI();
  showUiStatus(
    "Select a Sunday, (optionally) download the sample CSV, then upload your attendance CSV.",
    false
  );
})();
