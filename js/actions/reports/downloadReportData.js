// Handles pagination, boolean SVG icons, shows a loading indicator, and navigates to first page.

(async function () {
  if (
    typeof showLoadingIndicator !== "function" ||
    typeof hideLoadingIndicator !== "function"
  ) {
    console.error("LCR Tools: Loading indicator functions are not available.");
    alert("LCR Tools: Essential UI functions are missing. Cannot proceed.");
    return;
  }

  // Helper function to introduce a delay
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Function to extract data from the current page's table
  function scrapeCurrentPageData(isFirstPage) {
    const pageRowsData = [];
    let headers = [];
    const reportTable =
      document.querySelector("table.report-data-table") ||
      document.querySelector("table");

    if (!reportTable) {
      console.warn("LCR Tools: Report table not found on current page.");
      return { headers: [], pageRowsData: [] };
    }

    // Extract Headers (only on the first page and if thead exists)
    if (isFirstPage) {
      const tHead = reportTable.querySelector("thead");
      if (tHead) {
        const headerRow = tHead.querySelector("tr");
        if (headerRow) {
          headerRow.querySelectorAll("th").forEach((th) => {
            let headerText = th.innerText.trim().replace(/"/g, '""');
            if (headerText.includes(",")) {
              headerText = `"${headerText}"`;
            }
            headers.push(headerText);
          });
        }
      }
      // Fallback if no thead or th in thead, try first tr with th
      if (headers.length === 0) {
        const firstRowWithTh = reportTable.querySelector("tr:has(th)");
        if (firstRowWithTh) {
          firstRowWithTh.querySelectorAll("th").forEach((th) => {
            let headerText = th.innerText.trim().replace(/"/g, '""');
            if (headerText.includes(",")) {
              headerText = `"${headerText}"`;
            }
            headers.push(headerText);
          });
        }
      }
    }

    // Extract Data Rows (from tbody or all tr not in thead)
    let dataRowElements = reportTable.querySelectorAll("tbody > tr");
    if (dataRowElements.length === 0) {
      // If no tbody, get all tr and filter out those in thead (if any)
      dataRowElements = Array.from(reportTable.querySelectorAll("tr")).filter(
        (tr) => !tr.closest("thead")
      );
    }

    dataRowElements.forEach((row) => {
      // Skip if this row was accidentally picked up as a header row again (e.g. no tbody and it's the first row with th)
      if (
        isFirstPage &&
        headers.length > 0 &&
        Array.from(row.querySelectorAll("th")).length === headers.length
      ) {
        let isHeaderRow = true;
        row.querySelectorAll("th").forEach((th, index) => {
          let currentThText = th.innerText.trim().replace(/"/g, '""');
          if (currentThText.includes(",")) currentThText = `"${currentThText}"`;
          if (currentThText !== headers[index]) isHeaderRow = false;
        });
        if (isHeaderRow) return; // Skip this row as it's likely the header row already processed
      }

      const rowData = [];
      const cells = row.querySelectorAll("td"); // Data cells are typically <td>

      cells.forEach((cell) => {
        let cellText = "";
        const trueIcon = cell.querySelector(
          'div.sc-5ba12d08-0 svg path[d*="M12 22c5.523"][d*="l-7.452 7.196"]'
        );
        const falseIcon = cell.querySelector(
          'div.sc-5ba12d08-0 svg path[d*="M12 3.5a8.5"][d*="M2 12C2"]'
        );

        if (trueIcon) {
          cellText = "x";
        } else if (falseIcon) {
          cellText = "";
        } else {
          cellText = cell.innerText.trim().replace(/"/g, '""');
          if (cellText.includes(",")) {
            cellText = `"${cellText}"`;
          }
        }
        rowData.push(cellText);
      });

      if (rowData.length > 0) {
        pageRowsData.push(rowData.join(","));
      }
    });
    return { headers, pageRowsData };
  }

  showLoadingIndicator(); // Show loader at the start

  try {
    // --- Navigate to First Page ---
    const firstPageButton = document.querySelector("div.sc-f155593d-0.jVFBIX"); // Double left arrow icon container
    if (firstPageButton && firstPageButton.offsetParent !== null) {
      const firstPageNumberDiv = document.querySelector(
        ".sc-9d92d0db-0.lnnvp .sc-66e0b3ee-0:first-child"
      );
      if (
        firstPageNumberDiv &&
        !firstPageNumberDiv.classList.contains("ghqlVx")
      ) {
        console.log(
          "LCR Tools: Not on the first page. Clicking 'Go to First Page'."
        );
        firstPageButton.click();
        await sleep(3000);
      } else if (
        firstPageNumberDiv &&
        firstPageNumberDiv.classList.contains("ghqlVx")
      ) {
        console.log("LCR Tools: Already on the first page.");
      } else {
        // Fallback if page number state is unclear but button exists
        console.log(
          "LCR Tools: Could not definitively determine if on first page, but 'Go to First Page' button exists. Clicking it."
        );
        firstPageButton.click();
        await sleep(3000);
      }
    } else {
      console.log(
        "LCR Tools: 'Go to First Page' button not found or not visible. Assuming already on first page or no pagination."
      );
    }

    let allRowsData = [];
    let csvHeaders = [];
    let isFirstPageForScraping = true;
    let hasMorePages = true;
    let consecutiveEmptyPageScrapes = 0; // Counter for empty scrapes

    while (hasMorePages) {
      console.log(
        `LCR Tools: Scraping page... (First scrape: ${isFirstPageForScraping})`
      );
      const { headers, pageRowsData } = scrapeCurrentPageData(
        isFirstPageForScraping
      );

      if (isFirstPageForScraping && headers.length > 0) {
        csvHeaders = headers;
      }

      if (pageRowsData.length > 0) {
        allRowsData = allRowsData.concat(pageRowsData);
        consecutiveEmptyPageScrapes = 0; // Reset counter if data is found
      } else if (!isFirstPageForScraping) {
        // Only count empty for subsequent pages
        consecutiveEmptyPageScrapes++;
        console.log(
          `LCR Tools: No data rows found on this subsequent page. Empty scrapes: ${consecutiveEmptyPageScrapes}`
        );
        if (consecutiveEmptyPageScrapes >= 2) {
          // If 2 consecutive empty pages, assume end
          console.log(
            "LCR Tools: Two consecutive empty pages scraped. Assuming end of data."
          );
          hasMorePages = false;
          continue; // Exit loop
        }
      }

      isFirstPageForScraping = false;

      // Determine if we are on the last page or if there's a next page
      const nextPageButton = document.querySelector("div.sc-b87b8e2-0.cLfglj"); // Next page arrow
      let onLastPage = false;

      if (!nextPageButton || nextPageButton.offsetParent === null) {
        onLastPage = true;
        console.log(
          "LCR Tools: 'Next Page' button not found or hidden. Assuming end of pages."
        );
      } else {
        // Check 1: Last Page button is hidden (strong indicator)
        const lastPageButton = document.querySelector(
          "div.sc-cb69f8b7-0.cXraMi"
        ); // Double right arrow
        if (lastPageButton && lastPageButton.offsetParent === null) {
          onLastPage = true;
          console.log(
            "LCR Tools: 'Go to Last Page' button is hidden. Assuming on last page."
          );
        }

        // Check 2: Page indicator text (e.g., "50/50" or "51-53/53")
        if (!onLastPage) {
          // More specific selector for the "1-50/259" text div
          const pageIndicatorTextElement = document.querySelector(
            "div.sc-lf3bj0-0.biBXLT > div:last-of-type:not([class^='sc-'])"
          );
          if (
            pageIndicatorTextElement &&
            pageIndicatorTextElement.textContent.includes("/")
          ) {
            const parts = pageIndicatorTextElement.textContent.split("/");
            if (parts.length === 2) {
              const currentRange = parts[0];
              const totalItems = parseInt(parts[1], 10);
              const currentMaxShown = parseInt(
                currentRange.split("-").pop(),
                10
              );
              if (
                !isNaN(totalItems) &&
                !isNaN(currentMaxShown) &&
                currentMaxShown >= totalItems
              ) {
                onLastPage = true;
                console.log(
                  "LCR Tools: Page indicator shows all items are displayed."
                );
              }
            }
          } else {
            // Fallback if main pagination indicators are missing
            const pageNumbersContainer = document.querySelector(
              ".sc-9d92d0db-0.lnnvp"
            );
            if (
              !pageIndicatorTextElement &&
              (!pageNumbersContainer ||
                pageNumbersContainer.querySelectorAll(".sc-66e0b3ee-0")
                  .length === 0)
            ) {
              console.log(
                "LCR Tools: Page indicator and page numbers not found. If Next button also disappears, will stop."
              );
              // If next button is still present, it will try one more time. If next button also gone, loop terminates.
            }
          }
        }
      }

      if (onLastPage) {
        console.log(
          "LCR Tools: Determined to be on the last page. Ending pagination."
        );
        hasMorePages = false;
      } else {
        // This 'else' implies nextPageButton was found and visible, and not determined to be the last page
        console.log("LCR Tools: Clicking 'Next Page'.");
        nextPageButton.click();
        await sleep(3000);
      }
    }

    if (csvHeaders.length === 0 && allRowsData.length === 0) {
      alert("LCR Tools: No data found in the report across all pages.");
      return { result: { error: "No data found in report." } };
    }

    let csvContent = "";
    if (csvHeaders.length > 0) {
      csvContent += csvHeaders.join(",") + "\n";
    }
    csvContent += allRowsData.join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = "lcr_report_data.csv";
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("LCR Tools: CSV download initiated for all pages.");
    return { result: "success" };
  } catch (error) {
    console.error("Error in downloadReportData.js (Updated):", error);
    alert(
      `LCR Tools: An error occurred while trying to download report data: ${error.message}`
    );
    return { result: { error: error.message } };
  } finally {
    hideLoadingIndicator(); // Hide loader when done or if an error occurs
  }
})();
