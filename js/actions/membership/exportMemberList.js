(async function () {
  window.lcrToolsShouldStopProcessing = false; // Reset abort flag

  if (
    typeof showLoadingIndicator !== "function" ||
    typeof hideLoadingIndicator !== "function"
  ) {
    console.error("LCR Tools: Loading indicator functions are not available.");
    alert("LCR Tools: Essential UI functions are missing. Cannot proceed.");
    return;
  }

  showLoadingIndicator("Starting process...");

  try {
    // --- Wait for scrolling to complete ---
    showLoadingIndicator("Scrolling page to load all content...");
    await scrapingUtils.autoScrollToLoadContent({
      scrollStep: 300,
      scrollInterval: 75,
      maxConsecutiveNoChange: 3,
      shouldStop: () => window.lcrToolsShouldStopProcessing, // Stop scrolling if aborted
    });

    if (window.lcrToolsShouldStopProcessing) {
      console.log("LCR Tools: Process aborted by user during scrolling.");
      alert("LCR Tools: Process aborted by user.");
      return { result: "aborted" }; // Exit gracefully
    }

    // --- Wait briefly and scroll to top ---
    showLoadingIndicator("Finalizing content loading & returning to top...");
    await scrapingUtils.sleep(1500);

    console.log("Page fully loaded, navigating back to the top...");
    await scrapingUtils.scrollToTop();

    if (window.lcrToolsShouldStopProcessing) {
      console.log("LCR Tools: Process aborted by user before CSV export.");
      alert("LCR Tools: Process aborted by user.");
      return { result: "aborted" }; // Exit gracefully
    }

    // --- Trigger CSV Export ---
    showLoadingIndicator("Exporting data to CSV...");
    console.log("Back at the top, starting CSV export...");
    tableToCSV();
  } catch (error) {
    console.error("Error during the process:", error);
    alert("An error occurred. Please check the console for details.");
  } finally {
    window.lcrToolsShouldStopProcessing = false; // Ensure flag is reset
    hideLoadingIndicator();
  }
})();

function tableToCSV() {
  if (window.lcrToolsShouldStopProcessing) {
    console.log("LCR Tools: Process aborted by user during CSV generation.");
    return; // Exit if the process was aborted
  }

  // Get only visible header columns
  const { visibleHeaders, visibleHeaderIndices } =
    domUtils.getVisibleTableColumns("thead th", ["Household Members"]);

  // Process data rows
  const rows = document.querySelectorAll("tbody tr");
  const bodyRows = [];

  Array.from(rows).forEach((row) => {
    if (window.lcrToolsShouldStopProcessing) {
      console.log("LCR Tools: Process aborted by user during row processing.");
      return; // Exit if the process was aborted
    }

    const cells = row.querySelectorAll("td");
    const rowData = [];

    visibleHeaderIndices.forEach((headerIndex) => {
      if (cells[headerIndex]) {
        const cell = cells[headerIndex];

        // Skip if cell is hidden
        if (domUtils.isElementVisible(cell)) {
          const cellText = domUtils.extractCellText(cell, headerIndex);
          rowData.push(csvUtils.formatCsvCell(cellText));
        }
      }
    });

    // Only add row if it has data
    if (
      rowData.length > 0 &&
      rowData.some((cell) => cell.replace(/"/g, "").trim() !== "")
    ) {
      bodyRows.push(rowData.join(","));
    }
  });

  if (window.lcrToolsShouldStopProcessing) {
    console.log("LCR Tools: Process aborted by user before finalizing CSV.");
    return; // Exit if the process was aborted
  }

  if (visibleHeaders.length === 0 || bodyRows.length === 0) {
    alert("No data found to export.");
    console.error("No data found to export.");
    return;
  }

  const csv = [
    visibleHeaders.map((h) => csvUtils.formatCsvCell(h)).join(","),
    ...bodyRows,
  ].join("\n");
  csvUtils.downloadCsv(csv, "membership_directory.csv");
  console.log("CSV download triggered successfully.");
}
