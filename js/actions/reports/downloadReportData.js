(async function () {
  window.lcrToolsShouldStopProcessing = false; // Reset abort flag
  // --- Configuration & Constants ---
  const SELECTORS = {
    reportTable: "table.report-data-table, table",
    tableHeader: "thead",
    headerRow: "tr",
    headerCell: "th",
    tableBodyRows: "tbody > tr",
    allTableRows: "tr",
    dataCell: "td",
    checkboxColumn: ".checkbox-col",
  };
  const PAGINATION_DELAY_MS = 1000;
  const MAX_EMPTY_PAGE_SCRAPES = 3;
  const MAX_TOTAL_PAGES = 20;

  // --- Helper Functions ---
  if (
    typeof showLoadingIndicator !== "function" ||
    typeof hideLoadingIndicator !== "function"
  ) {
    console.error("LCR Tools: Loading indicator functions are not available.");
    alert("LCR Tools: Essential UI functions are missing. Cannot proceed.");
    return;
  }

  function extractHeaders(headerRow, skippedColumnIndices) {
    const headers = [];
    headerRow.querySelectorAll(SELECTORS.headerCell).forEach((th, index) => {
      const isActionColumn =
        (th.innerText.trim() === "" &&
          (th.querySelector("svg") || th.querySelector("span"))) ||
        th.innerText.trim() === "Actions";
      const isCheckboxColumn = th.classList.contains("checkbox-col");

      if (isActionColumn || isCheckboxColumn) {
        skippedColumnIndices.push(index);
      } else {
        headers.push(csvUtils.formatCsvCell(th.innerText));
      }
    });
    return headers;
  }

  function extractRowData(row, skippedColumnIndices) {
    const rowData = [];
    row.querySelectorAll(SELECTORS.dataCell).forEach((cell, index) => {
      if (skippedColumnIndices.includes(index)) return;

      const hasTrueIcon =
        cell.querySelector(paginationUtils.SELECTORS.trueIconSvg) ||
        cell.querySelector(paginationUtils.SELECTORS.trueIconImg);
      const hasFalseIcon = cell.querySelector(
        paginationUtils.SELECTORS.falseIconSvg
      );

      let cellText;
      if (hasTrueIcon) {
        cellText = "x";
      } else if (hasFalseIcon) {
        cellText = "";
      } else {
        cellText = csvUtils.formatCsvCell(cell.innerText);
      }
      rowData.push(cellText);
    });
    return rowData;
  }

  async function scrapeCurrentPageData(isFirstPage, skippedColumnIndices) {
    const reportTable = document.querySelector(SELECTORS.reportTable);
    if (!reportTable) {
      console.warn("LCR Tools: Report table not found on current page.");
      return { headers: [], pageRowsData: [] };
    }

    let headers = [];
    if (isFirstPage) {
      const tHead = reportTable.querySelector(SELECTORS.tableHeader);
      let headerRow = tHead ? tHead.querySelector(SELECTORS.headerRow) : null;
      if (!headerRow) {
        headerRow = reportTable.querySelector(
          `${SELECTORS.headerRow}:has(${SELECTORS.headerCell})`
        );
      }
      if (headerRow) {
        headers = extractHeaders(headerRow, skippedColumnIndices);
      }
    }

    let dataRowElements = reportTable.querySelectorAll(SELECTORS.tableBodyRows);
    if (dataRowElements.length === 0) {
      dataRowElements = Array.from(
        reportTable.querySelectorAll(SELECTORS.allTableRows)
      ).filter((tr) => !tr.closest(SELECTORS.tableHeader));
    }

    const pageRowsData = [];
    dataRowElements.forEach((row) => {
      if (row.querySelector(SELECTORS.headerCell)) return;
      const rowData = extractRowData(row, skippedColumnIndices);
      if (rowData.length > 0) {
        pageRowsData.push(rowData.join(","));
      }
    });

    return { headers, pageRowsData };
  }

  // --- Main Execution ---
  showLoadingIndicator("Starting report download...");

  try {
    console.log("LCR Tools: Starting report download process...");
    await paginationUtils.navigateToFirstPage(PAGINATION_DELAY_MS);

    let allRowsData = [];
    let csvHeaders = [];
    const skippedColumnIndices = [];
    let isFirstPageForScraping = true;
    let consecutiveEmptyPageScrapes = 0;
    let currentPageNumber = 1;

    while (
      currentPageNumber <= MAX_TOTAL_PAGES &&
      !window.lcrToolsShouldStopProcessing
    ) {
      console.log(`LCR Tools: Processing page ${currentPageNumber}...`);
      showLoadingIndicator(
        `Scraping data... Page ${currentPageNumber + 1}`,
        "Press ESC to abort"
      );

      const { headers, pageRowsData } = await scrapeCurrentPageData(
        isFirstPageForScraping,
        skippedColumnIndices
      );

      if (window.lcrToolsShouldStopProcessing) {
        console.log("LCR Tools: Process aborted by user during scraping.");
        alert("LCR Tools: Process aborted by user.");
        return { result: "aborted" }; // Exit gracefully
      }

      if (isFirstPageForScraping) {
        csvHeaders = headers || [];
        isFirstPageForScraping = false;
        console.log(
          `LCR Tools: Headers extracted: ${csvHeaders.length} columns`
        );
      }

      if (pageRowsData && pageRowsData.length > 0) {
        allRowsData.push(...pageRowsData);
        consecutiveEmptyPageScrapes = 0;
        console.log(
          `LCR Tools: Found ${pageRowsData.length} rows on page ${currentPageNumber}`
        );
      } else {
        consecutiveEmptyPageScrapes++;
        console.warn(
          `LCR Tools: No data found on page ${currentPageNumber}. Empty scrapes: ${consecutiveEmptyPageScrapes}`
        );

        if (consecutiveEmptyPageScrapes >= MAX_EMPTY_PAGE_SCRAPES) {
          console.log(
            `LCR Tools: Stopping after ${consecutiveEmptyPageScrapes} consecutive empty pages.`
          );
          break;
        }
      }

      // Check if we're on the last page before trying to navigate
      if (paginationUtils.isLastPage()) {
        console.log(
          `LCR Tools: Detected last page at page ${currentPageNumber}`
        );
        break;
      }

      // Try to navigate to next page
      const nextPageSuccess = await paginationUtils.goToNextPage(
        PAGINATION_DELAY_MS,
        MAX_TOTAL_PAGES,
        currentPageNumber
      );

      if (!nextPageSuccess) {
        console.log("LCR Tools: Could not navigate to next page, stopping.");
        break;
      }

      currentPageNumber++;
    }

    if (window.lcrToolsShouldStopProcessing) {
      console.log("LCR Tools: Process aborted by user.");
      alert("LCR Tools: Process aborted by user.");
      return { result: "aborted" };
    }

    console.log(
      `LCR Tools: Finished scraping. Total pages: ${currentPageNumber}, Total rows: ${allRowsData.length}`
    );

    if (allRowsData.length === 0) {
      alert("LCR Tools: No data found in the report.");
      return { result: { error: "No data found in report." } };
    }

    const csvContent = [csvHeaders.join(","), ...allRowsData].join("\n");
    const filename = fileUtils.generateFilenameFromUrl();
    csvUtils.downloadCsv(csvContent, filename);

    console.log("LCR Tools: Report download completed successfully.");
    return { result: "success" };
  } catch (error) {
    console.error("LCR Tools: Error during report download process:", error);
    alert(
      `LCR Tools: An error occurred while downloading report data: ${error.message}`
    );
    return { result: { error: error.message } };
  } finally {
    window.lcrToolsShouldStopProcessing = false; // Ensure flag is reset
    hideLoadingIndicator();
  }
})();
