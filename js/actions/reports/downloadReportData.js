// Handles pagination, boolean SVG icons, shows a loading indicator, and navigates to first page.

(async function () {
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
    // Boolean Icons
    trueIconSvg:
      'div.sc-5ba12d08-0 svg path[d*="M12 22c5.523"][d*="l-7.452 7.196"]',
    falseIconSvg: 'div.sc-5ba12d08-0 svg path[d*="M12 3.5a8.5"][d*="M2 12C2"]',
    trueIconImg: 'img[src*="icon-16-checkmark.png"]',
    // Pagination
    firstPageButton: "div.sc-f155593d-0.jVFBIX", // "Go to first page" button
    nextPageButton: "div.sc-b87b8e2-0.cLfglj", // "Next page" button
    lastPageButton: "div.sc-cb69f8b7-0.cXraMi", // "Go to last page" button
    pageNumbersContainer: ".sc-9d92d0db-0.lnnvp",
    firstPageNumberDiv: ".sc-9d92d0db-0.lnnvp .sc-66e0b3ee-0:first-child",
    activePageClass: "ghqlVx", // Class indicating the current page number
    pageIndicatorText:
      "div.sc-lf3bj0-0.biBXLT > div:last-of-type:not([class^='sc-'])", // e.g., "1-50/259"
  };
  const PAGINATION_DELAY_MS = 3000;
  const MAX_EMPTY_PAGE_SCRAPES = 2; // Stop after this many consecutive empty pages

  // --- Helper Functions ---

  if (
    typeof showLoadingIndicator !== "function" ||
    typeof hideLoadingIndicator !== "function"
  ) {
    console.error("LCR Tools: Loading indicator functions are not available.");
    alert("LCR Tools: Essential UI functions are missing. Cannot proceed.");
    return;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function formatCsvCell(text) {
    let formattedText = text.trim().replace(/"/g, '""');
    if (formattedText.includes(",")) {
      formattedText = `"${formattedText}"`;
    }
    return formattedText;
  }

  function extractHeaders(headerRow, skippedColumnIndices) {
    const headers = [];
    headerRow.querySelectorAll(SELECTORS.headerCell).forEach((th, index) => {
      // An "action column" is typically one with icons (like edit/delete) but no text header.
      const isActionColumn =
        (th.innerText.trim() === "" &&
          (th.querySelector("svg") || th.querySelector("span"))) ||
        th.innerText.trim() === "Actions";
      const isCheckboxColumn = th.classList.contains(SELECTORS.checkboxColumn);

      if (isActionColumn || isCheckboxColumn) {
        skippedColumnIndices.push(index);
      } else {
        headers.push(formatCsvCell(th.innerText));
      }
    });
    return headers;
  }

  function extractRowData(row, skippedColumnIndices) {
    const rowData = [];
    row.querySelectorAll(SELECTORS.dataCell).forEach((cell, index) => {
      if (skippedColumnIndices.includes(index)) return;

      const hasTrueIcon =
        cell.querySelector(SELECTORS.trueIconSvg) ||
        cell.querySelector(SELECTORS.trueIconImg);
      const hasFalseIcon = cell.querySelector(SELECTORS.falseIconSvg);

      let cellText;
      if (hasTrueIcon) {
        cellText = "x";
      } else if (hasFalseIcon) {
        cellText = "";
      } else {
        cellText = formatCsvCell(cell.innerText);
      }
      rowData.push(cellText);
    });
    return rowData;
  }

  function scrapeCurrentPageData(isFirstPage, skippedColumnIndices) {
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
        // Fallback for tables without a <thead>, find first row with <th>
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
      // Fallback for tables that don't use a <tbody> element to wrap data rows.
      // This gets all <tr> elements and filters out any that are inside a <thead>.
      dataRowElements = Array.from(
        reportTable.querySelectorAll(SELECTORS.allTableRows)
      ).filter((tr) => !tr.closest(SELECTORS.tableHeader));
    }

    const pageRowsData = [];
    dataRowElements.forEach((row) => {
      // Avoid re-processing the header row if it was picked up
      if (row.querySelector(SELECTORS.headerCell)) return;

      const rowData = extractRowData(row, skippedColumnIndices);
      if (rowData.length > 0) {
        pageRowsData.push(rowData.join(","));
      }
    });

    return { headers, pageRowsData };
  }

  async function navigateToFirstPage() {
    const firstPageButton = document.querySelector(SELECTORS.firstPageButton);
    if (!firstPageButton || firstPageButton.offsetParent === null) {
      console.log(
        "LCR Tools: 'Go to First Page' button not found. Assuming on first page."
      );
      return;
    }

    const firstPageNumber = document.querySelector(
      SELECTORS.firstPageNumberDiv
    );
    const isOnFirstPage =
      firstPageNumber &&
      firstPageNumber.classList.contains(SELECTORS.activePageClass);

    if (!isOnFirstPage) {
      console.log("LCR Tools: Navigating to the first page.");
      firstPageButton.click();
      await sleep(PAGINATION_DELAY_MS);
    } else {
      console.log("LCR Tools: Already on the first page.");
    }
  }

  // Determines if the current page is the last one by checking multiple pagination indicators.
  function isLastPage() {
    // Check 1: "Next Page" button is hidden or gone. Strongest indicator.
    const nextPageButton = document.querySelector(SELECTORS.nextPageButton);
    if (!nextPageButton || nextPageButton.offsetParent === null) {
      console.log(
        "LCR Tools: 'Next Page' button not visible. Assuming last page."
      );
      return true;
    }

    // Check 2: "Go to Last Page" button is hidden.
    const lastPageButton = document.querySelector(SELECTORS.lastPageButton);
    if (lastPageButton && lastPageButton.offsetParent === null) {
      console.log(
        "LCR Tools: 'Go to Last Page' button not visible. Assuming last page."
      );
      return true;
    }

    // Check 3: Page indicator text (e.g., "51-53 of 53").
    const pageIndicator = document.querySelector(SELECTORS.pageIndicatorText);
    if (pageIndicator && pageIndicator.textContent.includes("/")) {
      const [range, totalStr] = pageIndicator.textContent.split("/");
      const totalItems = parseInt(totalStr, 10);
      const maxShown = parseInt(range.split("-").pop(), 10);
      if (!isNaN(totalItems) && !isNaN(maxShown) && maxShown >= totalItems) {
        console.log(
          "LCR Tools: Page indicator shows all items are displayed. Assuming last page."
        );
        return true;
      }
    }

    return false;
  }

  // Generates a descriptive filename from the current URL's path.
  function generateFilename() {
    const path = window.location.pathname;
    const segments = path.split("/").filter(Boolean); // Filter out empty strings
    if (segments.length === 0) return "lcr_report.csv";

    // The longest path segment is often the most descriptive part of the report's URL.
    const longestSegment = segments.reduce((a, b) =>
      a.length > b.length ? a : b
    );
    return `${longestSegment.replace(/-/g, "_")}.csv`;
  }

  // Creates a CSV file from the given content and triggers a browser download.
  function downloadCsv(csvContent, filename) {
    // A Blob is a file-like object of immutable, raw data.
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    // Create a temporary URL for the blob.
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    // Programmatically click the link to start the download.
    link.click();
    // Clean up by removing the link and revoking the temporary URL.
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log(`LCR Tools: CSV download initiated as ${filename}.`);
  }

  // --- Main Execution ---

  showLoadingIndicator();

  try {
    await navigateToFirstPage();

    let allRowsData = [];
    let csvHeaders = [];
    const skippedColumnIndices = [];
    let isFirstPageForScraping = true;
    let hasMorePages = true;
    let consecutiveEmptyPageScrapes = 0;

    while (hasMorePages) {
      console.log(`LCR Tools: Scraping page...`);
      // Scrape all data from the currently visible table.
      const { headers, pageRowsData } = scrapeCurrentPageData(
        isFirstPageForScraping,
        skippedColumnIndices
      );

      // On the first loop, capture the headers.
      if (isFirstPageForScraping) {
        csvHeaders = headers;
        isFirstPageForScraping = false;
      }

      if (pageRowsData.length > 0) {
        allRowsData.push(...pageRowsData);
        consecutiveEmptyPageScrapes = 0; // Reset on success
      } else {
        // If a page has no data, increment a counter to avoid getting stuck in an infinite loop
        // on a broken pagination system.
        consecutiveEmptyPageScrapes++;
        console.warn(
          `LCR Tools: No data found on this page. Consecutive empty scrapes: ${consecutiveEmptyPageScrapes}`
        );
        if (consecutiveEmptyPageScrapes >= MAX_EMPTY_PAGE_SCRAPES) {
          console.log(
            `LCR Tools: Reached max (${MAX_EMPTY_PAGE_SCRAPES}) consecutive empty pages. Stopping.`
          );
          break;
        }
      }

      if (isLastPage()) {
        hasMorePages = false;
      } else {
        console.log("LCR Tools: Clicking 'Next Page'.");
        document.querySelector(SELECTORS.nextPageButton).click();
        await sleep(PAGINATION_DELAY_MS);
      }
    }

    if (allRowsData.length === 0) {
      alert("LCR Tools: No data found in the report.");
      return { result: { error: "No data found in report." } };
    }

    const csvContent = [csvHeaders.join(","), ...allRowsData].join("\n");
    const filename = generateFilename();
    downloadCsv(csvContent, filename);

    return { result: "success" };
  } catch (error) {
    console.error(
      "LCR Tools: An error occurred during the report download process.",
      error
    );
    alert(
      `LCR Tools: An error occurred while trying to download report data: ${error.message}`
    );
    return { result: { error: error.message } };
  } finally {
    hideLoadingIndicator();
  }
})();
