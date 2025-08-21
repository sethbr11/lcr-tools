(async function () {
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
      return;
    }

    // Create the basic content structure first
    const content = `
      <div style="margin-bottom: 20px;">
        <label for="lcr-tools-attendance-date" style="display:block; margin-bottom:8px; font-weight:bold;">1. Select Attendance Date (Sunday):</label>
        <input type="date" id="lcr-tools-attendance-date" style="padding:8px; border:1px solid #ccc; border-radius:4px; min-width:180px; font-size: 1em; display: inline-block;">
        <button id="lcr-tools-download-sample" style="padding:9px 12px; margin-left:10px; background-color:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer; font-size: 0.95em; vertical-align: top;">Download Sample CSV</button>
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
    `;

    const buttons = [
      {
        text: "Process Attendance on LCR",
        onClick: null, // We'll set this up manually after modal creation
        options: {
          id: "lcr-tools-process-attendance-btn",
          variant: "primary",
          disabled: true,
        },
      },
    ];

    uiUtils.createStandardModal({
      id: UI_OVERLAY_ID,
      title: "Input Class/Quorum Attendance",
      content,
      buttons,
      onClose: closeAttendanceUI,
    });

    // Now that the modal is created, set up the form elements properly
    const dateInput = document.getElementById("lcr-tools-attendance-date");
    const mostRecentSunday = dateUtils.getMostRecentSunday();
    if (dateInput) {
      dateInput.value = dateUtils.formatForDateInput(mostRecentSunday);
    }

    // Set up the process button event listener manually
    const processBtn = document.getElementById(
      "lcr-tools-process-attendance-btn"
    );
    if (processBtn) {
      processBtn.addEventListener("click", processAttendanceHandler);
    }

    // Add other event listeners
    const csvUpload = document.getElementById("lcr-tools-csv-upload");
    if (csvUpload) {
      csvUpload.addEventListener("change", csvUploadHandler);
    }

    const downloadSampleBtn = document.getElementById(
      "lcr-tools-download-sample"
    );
    if (downloadSampleBtn) {
      downloadSampleBtn.addEventListener("click", downloadSampleHandler);
    }

    showUiStatus(
      "Select a Sunday, (optionally) download the sample CSV, then upload your attendance CSV.",
      false
    );
  }

  function closeAttendanceUI() {
    uiUtils.closeModal(UI_OVERLAY_ID);
  }

  function showUiStatus(message, isError = false) {
    uiUtils.showStatus("lcr-tools-attendance-status", message, isError);
  }

  function downloadSampleHandler() {
    const dateInput = document.getElementById("lcr-tools-attendance-date");
    const selectedDateValue = dateInput.value;
    if (!selectedDateValue) {
      showUiStatus("Please select a date first to download the sample.", true);
      return;
    }

    const selectedDate = new Date(selectedDateValue + "T00:00:00");
    if (selectedDate.getDay() !== 0) {
      showUiStatus("Please select a Sunday for the attendance date.", true);
      return;
    }

    const formattedDate = csvUtils.formatDateForCsv(selectedDate);
    const csvHeader = `"Date","First Name","Last Name"\n`;
    const sampleRow = `"${formattedDate}","John","Doe"\n"${formattedDate}","Jane","Smith"`;
    const csvContent = csvHeader + sampleRow;

    csvUtils.downloadCsv(
      csvContent,
      `sample_attendance_${selectedDateValue}.csv`
    );
    showUiStatus("Sample CSV downloaded.", false);
  }

  function csvUploadHandler(event) {
    const processBtn = document.getElementById(
      "lcr-tools-process-attendance-btn"
    );
    if (processBtn) {
      processBtn.disabled = true;
      processBtn.style.backgroundColor = "#6c757d";
      processBtn.style.cursor = "not-allowed";
    }
    parsedCsvDataForProcessing = null;
    showUiStatus("Processing uploaded CSV...", false);

    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        try {
          const { names, targetDate, errors } =
            csvUtils.parseAttendanceCsv(text);
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

          // Enable the process button
          if (processBtn) {
            processBtn.disabled = false;
            processBtn.style.backgroundColor = "#007bff";
            processBtn.style.cursor = "pointer";
          }
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

  async function processAttendanceHandler() {
    window.lcrToolsShouldStopProcessing = false; // Reset abort flag
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

    try {
      const processingResult = await LCR_TOOLS_PROCESS_ATTENDANCE(
        targetDate,
        names
      );
      if (window.lcrToolsShouldStopProcessing)
        throw new Error("Process aborted by user.");
    } catch (error) {
      showUiStatus(`Error processing attendance: ${error.message}`, true);
    } finally {
      window.lcrToolsShouldStopProcessing = false; // Ensure flag is reset
    }

    parsedCsvDataForProcessing = null;
    const processBtn = document.getElementById(
      "lcr-tools-process-attendance-btn"
    );
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
