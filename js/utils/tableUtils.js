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
   * @param {HTMLTableElement} table - The table element
   * @returns {string} - Table type (e.g., 'summary', 'data-table', 'labeled-table')
   */
  const getTableType = (table) => {
    if (table.classList.contains("data-table")) return "data-table";
    if (table.classList.contains("emphasize")) return "emphasize";
    if (table.classList.contains("sc-1i12zlh-0")) {
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

    // Check for known labels to return blank
    const knownLabels = ["Sustained", "Add A Date"];
    for (const label of knownLabels) {
      if (text.startsWith(label)) return "";
    }

    return null; // No known value found
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
      });
    }
    return {
      count: tables.length,
      tables,
    };
  };

  /**
   * TODO (Optional): Display a UI that allows users to select which table(s) they want to work with on the page
   * @param {Object} pageTables - Page tables object from getPageTables
   * @returns {Array} - Selected tables
   */
  const requestTables = (pageTables) => {
    return pageTables.tables;
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
      table = document.querySelector(`table[data-table-id="${tag}"]`);
    } else {
      // Default: first visible table
      table = Array.from(document.querySelectorAll("table")).find(isVisible);
    }
    if (!table) {
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
    };
    const processor = processors[type];
    if (processor) csvContent = processor(table);
    else {
      alert("No processing function for table type: " + type);
      return null;
    }
    if (!csvContent) return false;

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

  window.tableUtils = {
    getPageTables,
    requestTables,
    tableToCSV,
    parseHeaderDate,
  };
})();
