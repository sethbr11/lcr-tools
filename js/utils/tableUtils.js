/**
 * Utility file for extracting and processing table data from LCR pages.
 * Handles various table types (e.g., summary, data-table, emphasize, labeled-table) and converts
 * them to CSV format. Supports filtering visible content, handling icons, and
 * generating filenames for downloads.
 */
(() => {
  utils.returnIfLoaded("tableUtils");

  // ==================== HELPER FUNCTIONS ====================
  /**
   * Helper: Check if an element is visible
   * @param {HTMLElement} el - The element to check
   * @returns {boolean} - True if visible
   */
  const isVisible = (el) => {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  };

  /**
   * Helper: Get all visible rows from a table's tbody
   * @param {HTMLTableElement} table - The table element
   * @returns {HTMLTableRowElement[]} - Array of visible row elements
   */
  const getVisibleRows = (table) => {
    return Array.from(table.querySelectorAll("tbody tr")).filter(
      (row) => row.offsetParent !== null
    );
  };

  /**
   * Helper: Format a value for CSV using fileUtils
   * @param {string} value - The value to format
   * @returns {string} - Formatted CSV value
   */
  const formatCsvValue = (value) => {
    return utils.safeCall("fileUtils", (fu) => fu.formatCsvCell(value), value);
  };

  /**
   * Helper: Check if a table is a labeled table
   * @param {HTMLTableElement} table - The table element
   * @returns {boolean} - True if labeled table
   */
  const isLabeledTable = (table) => {
    const theadThs = table.querySelectorAll("thead th");
    if (theadThs.length === 0) {
      const firstRow = table.querySelector("tbody tr");
      if (firstRow) {
        const cells = Array.from(firstRow.querySelectorAll("td"));
        if (cells.length > 0) {
          const firstCellText = (
            cells[0].innerText ||
            cells[0].textContent ||
            ""
          ).trim();
          const hasNamePattern =
            /\w+,\s*\w+/.test(firstCellText) || cells[0].querySelector("a");
          const hasLabelStructure = cells.slice(1).every((cell) => {
            const divs = cell.querySelectorAll("div");
            return (
              divs.length >= 2 &&
              divs[0].textContent.trim() &&
              divs[1].textContent.trim()
            );
          });
          return hasNamePattern && hasLabelStructure;
        }
      }
    }
    return false;
  };

  /**
   * Helper: Check if an element is a finance table
   * @param {HTMLElement} element - The element to check (could be table or other structure)
   * @returns {boolean} - True if finance table
   */
  const isFinanceTable = (element) => {
    // Check for the specific finance table structure
    if (
      element.matches('article[data-qa="bloTable"]') ||
      element.querySelector('article[data-qa="bloTable"]')
    ) {
      const bloTable = element.matches('article[data-qa="bloTable"]')
        ? element
        : element.querySelector('article[data-qa="bloTable"]');

      // Check for finance-specific headers
      const headers = bloTable.querySelector('[data-qa="headers"]');
      if (headers) {
        const headerText = headers.innerText || headers.textContent || "";

        const hasFinanceHeaders =
          (headerText.includes("Category") ||
            headerText.includes("CATEGORY")) &&
          (headerText.includes("Budget") || headerText.includes("BUDGET")) &&
          (headerText.includes("Balance") || headerText.includes("BALANCE")) &&
          (headerText.includes("% spent") || headerText.includes("% SPENT"));

        // Check for finance-specific data structure
        const hasAmountCells =
          bloTable.querySelectorAll('[data-qa="amount"]').length > 0;
        const hasTransactionLinks =
          bloTable.querySelectorAll('a[href*="budget/transaction-details"]')
            .length > 0;

        const isFinance =
          hasFinanceHeaders && (hasAmountCells || hasTransactionLinks);
        return isFinance;
      }
    }
    return false;
  };

  /**
   * Helper: Get table label from thead/th
   * @param {HTMLTableElement} table - The table element
   * @returns {string|null} - Label or null
   */
  const getLabelFromTh = (table) => {
    let th = table.querySelector("thead th");
    if (th) {
      let h = th.querySelector("h2,h4");
      if (h && h.textContent.trim()) {
        const text = h.textContent.trim();
        if (text.length > 35) return null;
        return text;
      }
      let thText = th.textContent.trim();
      if (
        thText &&
        thText.length <= 35 &&
        ![
          "name",
          "birth date",
          "move date",
          "new unit",
          "prior unit",
          "preferred name",
        ].includes(thText.toLowerCase())
      ) {
        return thText;
      }
    }
    return null;
  };

  /**
   * Helper: Get table label from organizational container
   * @param {HTMLTableElement} table - The table element
   * @returns {string|null} - Label or null
   */
  const getLabelFromContainer = (table) => {
    let container = table.closest(".callings-group, sub-org, [cr-callings]");
    if (container) {
      let h2 =
        container.querySelector("h2 span.ng-binding") ||
        container.querySelector("h2");
      if (h2 && h2.textContent.trim()) return h2.textContent.trim();
    }
    return null;
  };

  /**
   * Helper: Get table label by walking up DOM
   * @param {HTMLTableElement} table - The table element
   * @returns {string|null} - Label or null
   */
  const getLabelFromDomTraversal = (table) => {
    let current = table.parentElement;
    while (current && !current.classList.contains("pageTitle")) {
      let h2 = current.querySelector("h2");
      if (h2 && h2.textContent.trim()) return h2.textContent.trim();
      // First, check for h2 elements in the current container and its previous siblings
      let prev = current;
      while (prev) {
        let h2 = prev.querySelector && prev.querySelector("h2");
        if (h2 && h2.textContent.trim()) return h2.textContent.trim();
        prev = prev.previousElementSibling;
      }
      // If no h2 found, check for h1 elements in the current container and its previous siblings
      prev = current;
      while (prev) {
        let h1 = prev.querySelector && prev.querySelector("h1");
        if (h1 && h1.textContent.trim()) return h1.textContent.trim();
        prev = prev.previousElementSibling;
      }
      current = current.parentElement;
    }
    return null;
  };

  /**
   * Get the type of table that is on the page (helper function)
   * @param {HTMLTableElement|HTMLElement} table - The table element (can be table or other structure)
   * @returns {string} - Table type (e.g., 'summary', 'data-table', 'labeled-table', 'finance-table')
   */
  const getTableType = (table) => {
    if (isFinanceTable(table)) return "finance-table";
    if (table.classList && table.classList.contains("data-table"))
      return "data-table";
    if (table.classList && table.classList.contains("emphasize"))
      return "emphasize";
    if (table.classList && table.classList.contains("sc-1i12zlh-0")) {
      const firstTh = table.querySelector("thead th:first-child");
      if (firstTh && firstTh.querySelector("h4")) return "summary";
    }
    if (isLabeledTable(table)) return "labeled-table";
    return "general-table";
  };

  /**
   * Helper: Extract table name from header structure (for summary tables)
   * @param {HTMLTableElement} table - The table element
   * @returns {string|null} - Extracted table name or null
   */
  const getLabelFromHeader = (table) => {
    const firstTh = table.querySelector("thead th:first-child");
    if (firstTh) {
      const h4 = firstTh.querySelector("h4");
      if (h4 && h4.textContent.trim()) {
        return h4.textContent.trim();
      }
    }
    return null;
  };

  /**
   * Get the label for the table (helper function)
   * @param {HTMLTableElement} table - The table element
   * @returns {string|null} - Table label or null
   */
  const getTableLabel = (table) => {
    return (
      getLabelFromHeader(table) ||
      getLabelFromTh(table) ||
      getLabelFromContainer(table) ||
      getLabelFromDomTraversal(table)
    );
  };

  /**
   * Helper: Get visible, non-checkbox header cells from a table (renamed and refactored for dynamic filtering)
   * @param {HTMLTableElement} table - The table element
   * @returns {Object} - Object with headers array and indices array
   */
  function getRelevantHeaderCells(table) {
    const firstThead = table.querySelector("thead");
    if (!firstThead) return { headers: [], indices: [] };
    const allHeaders = Array.from(firstThead.querySelectorAll("th"));
    const headersWithText = allHeaders.map((th, index) => {
      const button = th.querySelector("button");
      let headerText = "";
      if (button) {
        headerText = button.innerText.replace(/\s+/g, " ").trim();
      } else {
        headerText = (th.innerText || th.textContent || "").trim();
      }
      return { th, headerText, index };
    });
    const filtered = headersWithText.filter(
      ({ th, headerText }) =>
        th.offsetParent !== null &&
        !th.classList.contains("checkbox-col") &&
        !th.classList.contains("actions-cell") &&
        !th.classList.contains("hidden-print") &&
        headerText !== "" &&
        headerText.toLowerCase() !== "actions" &&
        headerText.toLowerCase() !== "edit"
    );
    const headers = filtered.map(({ headerText }) =>
      formatCsvValue(headerText)
    );
    const indices = filtered.map(({ index }) => index);
    return { headers, indices };
  }

  /**
   * Helper: Get visible, non-checkbox data cells from a row, flattening multiline text
   * @param {HTMLTableRowElement} row - The table row element
   * @returns {string[]} - Array of cell values
   */
  function getRelevantRowCells(row) {
    return Array.from(row.querySelectorAll("td"))
      .filter(
        (td) =>
          td.offsetParent !== null && !td.classList.contains("checkbox-col")
      )
      .map((td) => formatCsvValue(getCellValue(td)));
  }

  /**
   * Helper: Check if a cell has a known icon and return the corresponding value
   * @param {HTMLTableCellElement} cell - The table cell element
   * @returns {string|null} - Icon value or null
   */
  function hasKnownIcon(cell) {
    // Check for checkmark icons indicating "Yes"
    let icon = cell.querySelector(
      '.lds.icon-check-open, .lds.icon-check-open-small, .lds.icon-checkmark, img[alt*="checkmark"], svg path[d*="M7.453 17.542"]'
    );
    if (icon && icon.offsetParent !== null) return "Yes";

    // Check for the specific SVG checkmark that should show as "x"
    icon = cell.querySelector('div.sc-5ba12d08-0 svg path[d*="M12 22c5.523"]');
    if (icon && icon.offsetParent !== null) return "x";

    // Check for another SVG checkmark indicating "Yes"
    icon = cell.querySelector('svg path[d*="M7.453 17.542"]');
    if (icon && icon.offsetParent !== null) return "Yes";

    return null;
  }

  /**
   * Helper: Check if a cell has a known value based on text patterns and return the corresponding value
   * @param {HTMLTableCellElement} cell - The table cell element
   * @returns {string|null} - Known value or null
   */
  function hasKnownValue(cell) {
    const text = (cell.innerText || cell.textContent || "").trim();

    // Check for known labels to return blank
    const knownLabels = ["Sustained", "Add A Date"];
    for (const label of knownLabels) {
      if (text.startsWith(label)) return "";
    }

    // Handle boolean columns (Yes/No with checkmarks or spans)
    const booleanValue = detectBooleanValue(cell);
    if (booleanValue !== null) {
      return booleanValue;
    }

    return null; // No known value found
  }

  /**
   * Detects boolean values (Yes/No) in a cell, handling various patterns
   * @param {HTMLTableCellElement} cell - The table cell element
   * @returns {string|null} - "Yes", "No", or null if not a boolean column
   */
  function detectBooleanValue(cell) {
    const text = (cell.innerText || cell.textContent || "").trim();

    // Handle "Set Apart" column specifically
    if (text.startsWith("Set Apart")) {
      // Check if this is a vacant calling by looking at the "Name" column in the same row
      const row = cell.closest("tr");
      if (row) {
        const nameCell = row.querySelector("td:nth-child(3)"); // Assuming "Name" is the 3rd column (adjust index if needed based on table structure)
        if (
          nameCell &&
          (nameCell.innerText || nameCell.textContent || "").includes(
            "Calling Vacant"
          )
        ) {
          return ""; // Vacant calling: return blank
        }
      }
      // Non-vacant: Check for visible Yes/No spans
      const yesSpan = cell.querySelector("span.callings-mobile:not(.ng-hide)");
      if (yesSpan) {
        const spanText = (
          yesSpan.innerText ||
          yesSpan.textContent ||
          ""
        ).trim();
        if (spanText === "Yes") return "Yes";
        if (spanText === "No") return "No";
      }
      return "No"; // Default for Set Apart if no clear Yes/No span found
    }

    // Check for checkmark icons
    const checkIcons = [
      "i.lds.icon-check-open-small",
      "i.icon-check-open-small",
      "i.lds.icon-check",
      "i.icon-check",
      "img[src*='checkmark']",
      "img[src*='check']",
    ];

    for (const selector of checkIcons) {
      const icon = cell.querySelector(selector);
      if (icon && !icon.classList.contains("ng-hide") && isVisible(icon)) {
        return "Yes";
      }
    }

    // Check for Yes/No spans (both visible and hidden)
    const spans = cell.querySelectorAll("span");
    for (const span of spans) {
      const spanText = (span.innerText || span.textContent || "").trim();
      const isHidden = span.classList.contains("ng-hide");

      if ((spanText === "Yes" || spanText === "No") && !isHidden) {
        return spanText;
      }
    }

    // Check for direct Yes/No text
    const cleanText = text.replace(/\s+/g, " ").trim();
    if (cleanText === "Yes" || cleanText === "No") {
      return cleanText;
    }

    // Check for Unicode symbols
    if (text.includes("✓") || text.includes("✔") || text.includes("☑")) {
      return "Yes";
    }
    if (text.includes("✗") || text.includes("✘") || text.includes("☐")) {
      return "No";
    }

    return null;
  }

  /**
   * Helper: Get the appropriate value for a cell, handling icons and text
   * @param {HTMLTableCellElement} cell - The table cell element
   * @returns {string} - Cell value
   */
  function getCellValue(cell) {
    // Check for known icons
    const iconValue = hasKnownIcon(cell);
    if (iconValue != null) return iconValue;

    // Check for known values
    const knownValue = hasKnownValue(cell);
    if (knownValue !== null) return knownValue;

    const text = (cell.innerText || cell.textContent || "").trim();
    return text
      .replace(/\s*\n\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // ==================== TABLE PROCESSING FUNCTIONS ====================
  /**
   * Processes a finance table into CSV
   * @param {HTMLElement} financeTable - The finance table element
   * @returns {string} - CSV content
   */
  function processFinanceTable(financeTable) {
    console.log("LCR Tools: Processing a Finance Table");
    const csvRows = ["Category,Budget,Balance,% Spent"];

    // Get all data rows
    const dataRows = financeTable.querySelectorAll('[data-qa="row"]');

    for (const row of dataRows) {
      const cells = row.querySelectorAll('[data-qa="cell"]');

      if (cells.length >= 4) {
        // Extract category name from the link
        const categoryCell = cells[1]; // Second cell contains category
        const categoryLink = categoryCell.querySelector("a");
        const category = categoryLink
          ? (categoryLink.innerText || categoryLink.textContent || "").trim()
          : (categoryCell.innerText || categoryCell.textContent || "").trim();

        // Extract budget amount
        const budgetCell = cells[2]; // Third cell contains budget
        const budgetAmountDiv = budgetCell.querySelector('[data-qa="amount"]');
        const budget = budgetAmountDiv
          ? budgetAmountDiv.getAttribute("amount") ||
            (
              budgetAmountDiv.innerText ||
              budgetAmountDiv.textContent ||
              ""
            ).trim()
          : "";

        // Extract balance amount
        const balanceCell = cells[3]; // Fourth cell contains balance
        const balanceAmountDiv =
          balanceCell.querySelector('[data-qa="amount"]');
        const balance = balanceAmountDiv
          ? balanceAmountDiv.getAttribute("amount") ||
            (
              balanceAmountDiv.innerText ||
              balanceAmountDiv.textContent ||
              ""
            ).trim()
          : "";

        // Extract percentage spent
        const percentageCell = cells[4]; // Fifth cell contains percentage
        const percentageDiv = percentageCell.querySelector(".sc-1gsg215-0");
        const percentage = percentageDiv
          ? (percentageDiv.innerText || percentageDiv.textContent || "").trim()
          : "";

        // Only add row if it has meaningful data
        if (category || budget || balance || percentage) {
          csvRows.push(
            [
              formatCsvValue(category),
              formatCsvValue(budget),
              formatCsvValue(balance),
              formatCsvValue(percentage),
            ].join(",")
          );
        }
      }
    }

    return csvRows.join("\r\n");
  }

  /**
   * Processes a summary table into CSV
   * @param {HTMLTableElement} table - The table element
   * @returns {string} - CSV content
   */
  function processSummaryTable(table) {
    const firstTh = table.querySelector("thead th:first-child");
    if (!firstTh || !firstTh.querySelector("h4"))
      return processGeneralTable(table);
    console.log("LCR Tools: Processing a Summary Table");
    let csvRows = ["Category,Count"];
    const totalCount =
      table
        .querySelector("thead tr th:nth-child(2) span.sc-7a482c85-5")
        ?.textContent.trim() || "";
    for (const row of getVisibleRows(table)) {
      const cells = Array.from(row.querySelectorAll("td"));
      if (cells.length >= 2) {
        const category = getCellValue(cells[0]);
        const count = getCellValue(cells[1]);
        csvRows.push(`${formatCsvValue(category)},${formatCsvValue(count)}`);
      }
    }
    if (totalCount) csvRows.push(`Total,${formatCsvValue(totalCount)}`);
    return csvRows.join("\r\n");
  }

  /**
   * Processes a standard data-table into CSV
   * @param {HTMLTableElement} table - The table element
   * @returns {string} - CSV content
   */
  function processDataTable(table) {
    console.log("LCR Tools: Processing a Data Table");
    const { headers, indices } = getRelevantHeaderCells(table);
    const csvRows = [];
    const allRows = Array.from(table.querySelectorAll("tr")).filter(
      (row) => row.offsetParent !== null
    );
    for (const [i, row] of allRows.entries()) {
      const cells = Array.from(row.querySelectorAll("td"));
      const rowData =
        i === 0
          ? headers
          : indices.map((index) =>
              cells[index] ? formatCsvValue(getCellValue(cells[index])) : ""
            );
      csvRows.push(rowData.join(","));
    }
    return csvRows.join("\r\n");
  }

  /**
   * Processes a table of type "emphasize" into CSV
   * @param {HTMLTableElement} table - The table element
   * @returns {string} - CSV content
   */
  function processEmphasizeTable(table) {
    console.log("LCR Tools: Processing an Emphasize Table");
    const { headers: headerCells } = getRelevantHeaderCells(table);
    const csvRows = [headerCells.join(",")];
    for (const row of getVisibleRows(table)) {
      const cells = getRelevantRowCells(row);
      if (cells.length === headerCells.length && cells.some((c) => c !== ""))
        csvRows.push(cells.join(","));
    }
    return csvRows.join("\r\n");
  }

  /**
   * Processes a labeled table (e.g., with inline labels in rows) into CSV
   * @param {HTMLTableElement} table - The table element
   * @returns {string} - CSV content
   */
  function processLabeledTable(table) {
    console.log("LCR Tools: Processing a Labeled Table");
    const rows = getVisibleRows(table);
    if (rows.length === 0) return "";
    const firstRowCells = Array.from(rows[0].querySelectorAll("td"));
    const headers = firstRowCells.map((cell, index) => {
      const text = (cell.innerText || cell.textContent || "").trim();
      const hasNamePattern =
        /\w+,\s*\w+/.test(text) || !!cell.querySelector("a");
      if (hasNamePattern) return "Name";
      const labelDiv = cell.querySelector("div > div:first-child");
      return labelDiv ? labelDiv.textContent.trim() : `Column ${index + 1}`;
    });
    const csvRows = [headers.map((h) => formatCsvValue(h)).join(",")];
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll("td"));
      const rowData = cells.map((cell, index) => {
        const link = cell.querySelector("a");
        if (link)
          return formatCsvValue(
            (link.innerText || link.textContent || "").trim()
          );
        const divs = cell.querySelectorAll("div");
        if (divs.length >= 3)
          return formatCsvValue(
            (divs[2].innerText || divs[2].textContent || "").trim()
          );
        return formatCsvValue(getCellValue(cell));
      });
      if (rowData.some((d) => d !== "")) csvRows.push(rowData.join(","));
    }
    return csvRows.join("\r\n");
  }

  /**
   * Processes a general table into CSV
   * @param {HTMLTableElement} table - The table element
   * @returns {string} - CSV content
   */
  function processGeneralTable(table) {
    const headerRow = table.querySelector("thead tr");
    if (!headerRow) return "";
    const { headers: visibleHeaders, indices: visibleColumnIndices } =
      getRelevantHeaderCells(table);
    const csvRows = visibleHeaders.length > 0 ? [visibleHeaders.join(",")] : [];
    for (const row of getVisibleRows(table)) {
      const allCells = Array.from(row.querySelectorAll("td"));
      const visibleCells = visibleColumnIndices.map((index) =>
        allCells[index] ? formatCsvValue(getCellValue(allCells[index])) : ""
      );
      if (visibleCells.length > 0 && visibleCells.some((c) => c !== ""))
        csvRows.push(visibleCells.join(","));
    }
    return csvRows.join("\r\n");
  }

  // ==================== EXPORTED FUNCTIONS ====================
  /**
   * Return the number of tables on the page and their info
   * @returns {Object} - Object with count and tables array
   */
  const getPageTables = () => {
    let tables = [];

    // Get traditional table elements
    let allTables = Array.from(document.querySelectorAll("table"));
    for (const table of allTables) {
      if (!isVisible(table)) continue;
      let type = getTableType(table);
      let label = getTableLabel(table);
      // Use a machine identifier: e.g., a selector or index
      let identifier = table.getAttribute("data-table-id");
      if (!identifier) {
        // Assign a unique id if not present
        identifier = "table-" + Math.random().toString(36).substr(2, 9);
        table.setAttribute("data-table-id", identifier);
      }
      tables.push({
        id: identifier,
        type: type,
        label: label,
        element: table,
      });
    }

    // Also look for finance tables (non-table elements)
    let allFinanceTables = Array.from(
      document.querySelectorAll('article[data-qa="bloTable"]')
    );

    for (const financeTable of allFinanceTables) {
      if (!isVisible(financeTable)) continue;
      let type = getTableType(financeTable);
      let label = getTableLabel(financeTable) || "Finance Table";

      // Use a machine identifier
      let identifier = financeTable.getAttribute("data-table-id");
      if (!identifier) {
        // Assign a unique id if not present
        identifier = "finance-table-" + Math.random().toString(36).substr(2, 9);
        financeTable.setAttribute("data-table-id", identifier);
      }
      tables.push({
        id: identifier,
        type: type,
        label: label,
        element: financeTable,
      });
    }

    return {
      count: tables.length,
      tables,
    };
  };

  /**
   * Display a UI that allows users to select which table(s) they want to work with on the page
   * @param {Object} pageTables - Page tables object from getPageTables
   * @param {boolean} allowMultiple - Whether to allow multiple table selection (default: true)
   * @returns {Promise<Array|Object|null>} - Selected tables array, single table object, or null if cancelled
   */
  const requestTables = (pageTables, allowMultiple = true) => {
    return new Promise((resolve) => {
      // If only one table, return it directly
      if (pageTables.tables.length === 1) {
        resolve(allowMultiple ? pageTables.tables : pageTables.tables[0]);
        return;
      }

      // Create table selection templates
      const tableSelectionModal = `
        <div style="margin-bottom: 15px;">
          <p>${
            allowMultiple
              ? "Multiple tables found on this page. Please select which table(s) you'd like to work with:"
              : "Multiple tables found on this page. Please select which table you'd like to work with:"
          }</p>
        </div>
        <div id="lcr-tools-table-selection" style="max-height: 300px; overflow-y: auto; margin-bottom: 20px;">
          {{tableOptions}}
        </div>
        ${
          allowMultiple
            ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <button id="lcr-tools-select-all-tables" style="padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Select All</button>
            <button id="lcr-tools-deselect-all-tables" style="padding: 8px 16px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Deselect All</button>
          </div>
        `
            : ""
        }
      `;

      const tableOption = allowMultiple
        ? `
        <label style="display: flex; align-items: center; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px; cursor: pointer; background-color: #f9f9f9;">
          <input type="checkbox" name="lcr-tools-table-select" value="{{index}}" data-table-id="{{id}}" style="margin-right: 10px;">
          <div>
            <strong style="display: block;">{{label}}</strong>
            <span style="font-size: 0.85em; color: #666;">Type: {{type}} | ID: {{id}}</span>
          </div>
        </label>
      `
        : `
        <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;" 
             data-table-index="{{index}}" class="lcr-tools-table-option">
          <strong>{{label}}</strong>
          <div style="font-size: 12px; color: #666; margin-top: 5px;">
            Type: {{type}} | ID: {{id}}
          </div>
        </div>
      `;

      const tableOptions = pageTables.tables
        .map((table, index) =>
          utils.replaceTemplate(tableOption, {
            index,
            label: table.label || `Table ${index + 1}`,
            type: table.type,
            id: table.id,
          })
        )
        .join("");

      const content = tableSelectionModal.replace(
        "{{tableOptions}}",
        tableOptions
      );

      // Create modal
      utils.safeCall(
        "modalUtils",
        (modalUtils) => {
          modalUtils.createStandardModal({
            id: "lcr-tools-table-selection-modal",
            title: allowMultiple
              ? "Select Tables to Work With"
              : "Select Table to Work With",
            content,
            buttons: allowMultiple
              ? [
                  {
                    text: "Cancel",
                    onClick: () => {
                      modalUtils.closeModal("lcr-tools-table-selection-modal");
                      resolve(null);
                    },
                  },
                  {
                    text: "Download Selected",
                    options: { variant: "success" },
                    onClick: () => {
                      const selectedCheckboxes = document.querySelectorAll(
                        'input[name="lcr-tools-table-select"]:checked'
                      );
                      const selectedTables = Array.from(selectedCheckboxes).map(
                        (checkbox) =>
                          pageTables.tables[parseInt(checkbox.value)]
                      );
                      modalUtils.closeModal("lcr-tools-table-selection-modal");
                      resolve(
                        selectedTables.length > 0 ? selectedTables : null
                      );
                    },
                  },
                ]
              : [
                  {
                    text: "Cancel",
                    onClick: () => {
                      modalUtils.closeModal("lcr-tools-table-selection-modal");
                      resolve(null);
                    },
                  },
                ],
          });

          if (allowMultiple) {
            // Add event handlers for multi-selection mode
            const selectAllBtn = document.getElementById(
              "lcr-tools-select-all-tables"
            );
            const deselectAllBtn = document.getElementById(
              "lcr-tools-deselect-all-tables"
            );

            if (selectAllBtn) {
              selectAllBtn.addEventListener("click", () => {
                document
                  .querySelectorAll('input[name="lcr-tools-table-select"]')
                  .forEach((checkbox) => {
                    checkbox.checked = true;
                  });
              });
            }

            if (deselectAllBtn) {
              deselectAllBtn.addEventListener("click", () => {
                document
                  .querySelectorAll('input[name="lcr-tools-table-select"]')
                  .forEach((checkbox) => {
                    checkbox.checked = false;
                  });
              });
            }
          } else {
            // Add click handlers for single selection mode
            document
              .querySelectorAll(".lcr-tools-table-option")
              .forEach((option) => {
                option.addEventListener("click", () => {
                  const tableIndex = parseInt(option.dataset.tableIndex);
                  modalUtils.closeModal("lcr-tools-table-selection-modal");
                  resolve(pageTables.tables[tableIndex]);
                });

                // Add hover effects
                option.addEventListener("mouseenter", () => {
                  option.style.backgroundColor = "#f8f9fa";
                });
                option.addEventListener("mouseleave", () => {
                  option.style.backgroundColor = "";
                });
              });
          }
        },
        () => {
          // Fallback if modalUtils not available
          console.warn("modalUtils not available, returning all tables");
          resolve(allowMultiple ? pageTables.tables : pageTables.tables[0]);
        }
      );
    });
  };

  /**
   * Returns {csvContent, filename} for a table, does not download
   * @param {string} tag - Table tag/ID
   * @param {string} name - Table name
   * @param {string} type - Table type
   * @param {string} dfilename - Default filename
   * @returns {Object|null} - Object with csvContent and filename, or null
   */
  const tableToCSV = (tag = "", name = "", type = "", dfilename = "") => {
    let filename = dfilename;
    // Step 1: Find the table on the page
    let table;
    if (tag) {
      // Try to find by data-table-id attribute (works for both regular tables and finance tables)
      table = document.querySelector(`[data-table-id="${tag}"]`);
      console.log("LCR Tools: Found table by tag:", table);
    } else {
      console.log("LCR Tools: No tag provided, looking for default tables");
      // Default: first visible table (regular table element)
      table = Array.from(document.querySelectorAll("table")).find(isVisible);
      // If no regular table, try finance table
      if (!table) {
        table = Array.from(
          document.querySelectorAll('article[data-qa="bloTable"]')
        ).find(isVisible);
        console.log("LCR Tools: Found finance table:", table);
      }
    }
    if (!table) {
      console.log("LCR Tools: No table found to export");
      alert("No table found to export.");
      return null;
    }

    // Step 2: Determine type if not provided
    if (!type) type = getTableType(table);

    // Step 3: Prepare to process table
    let csvContent = "";
    const processors = {
      summary: processSummaryTable,
      "data-table": processDataTable,
      emphasize: processEmphasizeTable,
      "general-table": processGeneralTable,
      "labeled-table": processLabeledTable,
      "finance-table": processFinanceTable,
    };
    const processor = processors[type];
    if (processor) csvContent = processor(table);
    else {
      console.log("LCR Tools: No processor found for type:", type);
      alert("No processing function for table type: " + type);
      return null;
    }
    if (!csvContent) {
      console.log("LCR Tools: No CSV content generated");
      return false;
    }

    // Step 4: Generate the filename
    if (dfilename === "") {
      filename = utils.safeCall(
        "fileUtils",
        (fu) =>
          fu.generateFilename("csv", name ? name.replace(/\s+/g, "_") : ""),
        "lcr_table.csv"
      );
    }
    return { csvContent, filename };
  };

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
   * Gets relevant header cells from a table (extracts headers and indices)
   * @param {HTMLTableElement} table - The table element
   * @returns {Object} - Object with headers array and indices array
   */
  function getRelevantHeaderCells(table) {
    const firstThead = table.querySelector("thead");
    if (!firstThead) return { headers: [], indices: [] };
    const allHeaders = Array.from(firstThead.querySelectorAll("th"));
    const headersWithText = allHeaders.map((th, index) => {
      const button = th.querySelector("button");
      let headerText = "";
      if (button) {
        headerText = button.innerText.replace(/\s+/g, " ").trim();
      } else {
        headerText = (th.innerText || th.textContent || "").trim();
      }
      return { th, headerText, index };
    });
    const filtered = headersWithText.filter(
      ({ th, headerText }) =>
        th.offsetParent !== null &&
        !th.classList.contains("checkbox-col") &&
        !th.classList.contains("actions-cell") &&
        !th.classList.contains("hidden-print") &&
        headerText !== "" &&
        headerText.toLowerCase() !== "actions" &&
        headerText.toLowerCase() !== "edit"
    );
    const headers = filtered.map(({ headerText }) => headerText);
    const indices = filtered.map(({ index }) => index);
    return { headers, indices };
  }

  /**
   * Gets unique values from a table column
   * @param {HTMLTableElement} table - The table element
   * @param {number} columnIndex - The column index
   * @returns {Array} - Array of unique values
   */
  function getUniqueValues(table, columnIndex) {
    const values = new Set();
    const rows = Array.from(table.querySelectorAll("tbody tr")).filter(
      (row) => row.offsetParent !== null
    );

    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll("td"));
      if (cells[columnIndex]) {
        const value = getCellValue(cells[columnIndex]).trim();
        if (value) {
          values.add(value);
        }
      }
    });

    return Array.from(values).sort();
  }

  window.tableUtils = {
    getPageTables,
    requestTables,
    tableToCSV,
    parseHeaderDate,
    getRelevantHeaderCells,
    getCellValue,
    getUniqueValues,
  };
})();
