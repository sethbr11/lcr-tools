/**
 * Utility file specifically for the tableFilters action.
 * Handles the creation and management of table filters, including UI creation,
 * filter application, and data analysis for common filtering criteria.
 * Integrates with tableUtils, modalUtils, and uiUtils to provide a seamless
 * filtering experience for LCR table data.
 */
(() => {
  utils.returnIfLoaded("filterUtils");
  utils.ensureLoaded(
    "tableUtils",
    "uiUtils",
    "modalUtils",
    "dataUtils",
    "tableFilterTemplates"
  );

  // Global state for current filtering
  let currentTable = null;
  let originalTableData = null;
  let filterModalId = "lcr-tools-filter-side-modal";
  let pageTables = null;

  /**
   * Creates the common modal buttons configuration
   * @returns {Array} - Array of button configurations
   */
  function createModalButtons() {
    return [
      {
        text: "Clear Current Filters",
        options: { variant: "warning" },
        onClick: () => clearCurrentTableFilters(),
      },
      {
        text: "Clear All Filters",
        options: { variant: "danger" },
        onClick: () => clearAllFilters(),
      },
      {
        text: "Apply Filters",
        options: { variant: "success" },
        onClick: () => applyFilters(),
      },
      {
        text: "Close",
        options: { variant: "secondary" },
        onClick: () => {
          modalUtils.closeModal(filterModalId);
          resetTable();
        },
      },
    ];
  }

  /**
   * Sets up navigation button event listener if needed
   * @param {boolean} needsScrolling - Whether scrolling is needed
   */
  function setupNavigationButton(needsScrolling) {
    if (needsScrolling) {
      setTimeout(() => {
        const loadDataBtn = document.getElementById("lcr-tools-load-data-btn");
        if (loadDataBtn) {
          loadDataBtn.addEventListener("click", scrollToLoadData);
        }
      }, 100);
    }
  }

  /**
   * Creates the modal content with optional navigation button
   * @param {string} baseContent - The base content template
   * @param {boolean} needsScrolling - Whether scrolling is needed
   * @returns {string} - Complete content string
   */
  function createModalContent(baseContent, needsScrolling) {
    let content = "";
    if (needsScrolling) {
      content += tableFilterTemplates.navigationButton;
    }
    content += baseContent;
    return content;
  }

  /**
   * Shows the table filter side modal with table selection dropdown
   * @param {Object} pageTablesData - Page tables object from getPageTables
   * @param {boolean} needsScrolling - Whether the page needs scrolling to load all data
   */
  function showTableFilterModal(pageTablesData, needsScrolling = false) {
    pageTables = pageTablesData;

    // If no tables found, show error
    if (pageTables.tables.length === 0) {
      alert("No tables found on this page to filter.");
      return;
    }

    // If only one table, select it automatically and show the side modal
    if (pageTables.tables.length === 1) {
      currentTable = pageTables.tables[0];

      const content = createModalContent(
        tableFilterTemplates.singleTableModalContent.replace(
          "{{tableLabel}}",
          currentTable.label || "Table"
        ),
        needsScrolling
      );

      modalUtils.createSideModal({
        id: filterModalId,
        title: "Table Filters",
        content,
        side: "right",
        width: "450px",
        buttons: createModalButtons(),
      });

      setupNavigationButton(needsScrolling);

      // Now show the filter options (with a small delay to ensure DOM is ready)
      setTimeout(() => {
        showFilterOptions(currentTable);
      }, 100);
      return;
    }

    // Create table dropdown options
    const tableOptions = pageTables.tables
      .map(
        (table, index) =>
          `<option value="${index}">${table.label || `Table ${index + 1}`} (${
            table.type
          })</option>`
      )
      .join("");

    const content = createModalContent(
      tableFilterTemplates.multiTableModalContent.replace(
        "{{tableOptions}}",
        tableOptions
      ),
      needsScrolling
    );

    modalUtils.createSideModal({
      id: filterModalId,
      title: "Table Filters",
      content,
      side: "right",
      width: "450px",
      buttons: createModalButtons(),
    });

    setupNavigationButton(needsScrolling);

    // Add table selector change handler
    const tableSelector = document.getElementById("lcr-tools-table-selector");
    if (tableSelector) {
      tableSelector.addEventListener("change", (e) => {
        const selectedIndex = parseInt(e.target.value);
        if (!isNaN(selectedIndex) && selectedIndex >= 0) {
          const selectedTable = pageTables.tables[selectedIndex];
          currentTable = selectedTable;
          showFilterOptions(selectedTable);
        } else {
          // Hide filter options if no table selected
          const filterOptions = document.getElementById(
            "lcr-tools-filter-options"
          );
          if (filterOptions) {
            filterOptions.style.display = "none";
          }
        }
      });
    }
  }

  /**
   * Shows the filter options for the selected table in the side modal
   * @param {Object} selectedTable - The table to filter
   */
  function showFilterOptions(selectedTable) {
    currentTable = selectedTable;

    // Get the actual table element
    const tableElement = document.querySelector(
      `table[data-table-id="${selectedTable.id}"]`
    );
    if (!tableElement) {
      alert("Table not found on page. The page may have changed.");
      return;
    }

    // Analyze table structure to determine available filters
    const availableFilters = analyzeTableStructure(tableElement);

    if (availableFilters.length === 0) {
      alert("No filterable columns found in this table.");
      return;
    }

    // Store original table data for reset functionality
    originalTableData = tableElement.cloneNode(true);

    const filterOptions = availableFilters
      .map((filter) => createFilterHTML(filter))
      .join("");

    const content = tableFilterTemplates.filterOptionsContent
      .replace("{{tableLabel}}", selectedTable.label || "Table")
      .replace("{{filterOptions}}", filterOptions);

    // Update the filter options section in the side modal
    const filterOptionsContainer = document.getElementById(
      "lcr-tools-filter-options"
    );
    if (filterOptionsContainer) {
      filterOptionsContainer.innerHTML = filterOptions;
      filterOptionsContainer.style.display = "block";
    } else {
      console.warn(
        "LCR Tools: Filter options container not found. Modal may not be created yet."
      );
    }

    // Add event listeners for filter controls
    setupFilterEventListeners();
  }

  /**
   * Analyzes table structure to determine available filter options
   * @param {HTMLTableElement} table - The table element to analyze
   * @returns {Array} - Array of available filter configurations
   */
  function analyzeTableStructure(table) {
    const filters = [];
    const { headers, indices } = tableUtils.getRelevantHeaderCells(table);
    const maxUniqueValues = 20; // Skip columns with more than 20 unique values

    headers.forEach((header, index) => {
      const columnIndex = indices[index];
      const filterType = determineFilterType(table, columnIndex, header);

      if (filterType) {
        const uniqueValues = tableUtils.getUniqueValues(table, columnIndex);
        const headerLower = header.toLowerCase();

        // Skip columns with too many unique values unless they're range-based filters
        const isRangeBased = ["age", "date"].includes(filterType);
        const hasTooManyValues = uniqueValues.length > maxUniqueValues;

        // Skip columns that are likely to contain personal information
        const isPersonalInfo =
          headerLower.includes("name") ||
          headerLower.includes("phone") ||
          headerLower.includes("email") ||
          headerLower.includes("address");

        if ((!hasTooManyValues || isRangeBased) && !isPersonalInfo) {
          filters.push({
            columnIndex,
            header,
            type: filterType,
            values: uniqueValues,
          });
        } else {
          const reason = hasTooManyValues
            ? `too many unique values (${uniqueValues.length})`
            : "contains personal information";
          console.log(`LCR Tools: Skipping column "${header}" - ${reason}`);
        }
      }
    });

    return filters;
  }

  /**
   * Determines the appropriate filter type for a column
   * @param {HTMLTableElement} table - The table element
   * @param {number} columnIndex - The column index
   * @param {string} header - The column header text
   * @returns {string|null} - Filter type or null if not filterable
   */
  function determineFilterType(table, columnIndex, header) {
    const headerLower = header.toLowerCase();

    // Check if this is a boolean column (Yes/No with checkmarks)
    if (isBooleanColumn(table, columnIndex)) {
      return "boolean";
    }

    // Gender-based filters
    if (headerLower.includes("gender") || headerLower.includes("sex")) {
      return "gender";
    }

    // Date filters - check both header and data content (must come before age check)
    if (
      headerLower.includes("date") ||
      headerLower.includes("move") ||
      headerLower.includes("baptism") ||
      headerLower.includes("birth") ||
      headerLower.includes("created") ||
      headerLower.includes("updated") ||
      headerLower.includes("time")
    ) {
      return "date";
    }

    // Age-based filters (only for columns that don't contain "birth")
    if (headerLower.includes("age")) {
      return "age";
    }

    // Status-based filters
    if (
      headerLower.includes("status") ||
      headerLower.includes("active") ||
      headerLower.includes("inactive")
    ) {
      return "status";
    }

    // Calling/position filters
    if (
      headerLower.includes("calling") ||
      headerLower.includes("position") ||
      headerLower.includes("assignment")
    ) {
      return "calling";
    }

    // Organization filters
    if (
      headerLower.includes("organization") ||
      headerLower.includes("org") ||
      headerLower.includes("quorum") ||
      headerLower.includes("class")
    ) {
      return "organization";
    }

    // Check if the column contains date-like data
    if (dataUtils.isDateColumn(table, columnIndex)) {
      return "date";
    }

    // Generic text filter for other columns
    return "text";
  }

  /**
   * Checks if a column contains boolean values (Yes/No with checkmarks)
   * @param {HTMLTableElement} table - The table element
   * @param {number} columnIndex - The column index
   * @returns {boolean} - True if this is a boolean column
   */
  function isBooleanColumn(table, columnIndex) {
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    let booleanCount = 0;
    let totalRows = 0;

    // Sample first 10 rows to determine if this is a boolean column
    const sampleRows = rows.slice(0, Math.min(10, rows.length));

    for (const row of sampleRows) {
      const cells = Array.from(row.querySelectorAll("td"));
      const cell = cells[columnIndex];
      if (!cell) continue;

      totalRows++;
      const cellValue = tableUtils.getCellValue(cell);

      // Check if the cell value is "Yes" or "No"
      if (cellValue === "Yes" || cellValue === "No") {
        booleanCount++;
      }
    }

    // If more than 50% of sampled rows contain Yes/No values, consider it a boolean column
    return totalRows > 0 && booleanCount / totalRows > 0.5;
  }

  /**
   * Replaces template placeholders with actual style values
   * @param {string} template - The template string
   * @returns {string} - Template with styles replaced
   */
  function replaceStylePlaceholders(template) {
    return template
      .replaceAll("{{filterContainer}}", tableFilterTemplates.filterContainer)
      .replaceAll("{{filterLabel}}", tableFilterTemplates.filterLabel)
      .replaceAll("{{filterSelect}}", tableFilterTemplates.filterSelect)
      .replaceAll("{{filterInput}}", tableFilterTemplates.filterInput);
  }

  /**
   * Creates HTML for a filter control
   * @param {Object} filter - Filter configuration
   * @returns {string} - HTML string for the filter
   */
  function createFilterHTML(filter) {
    const { columnIndex, header, type } = filter;

    switch (type) {
      case "gender":
        return replaceStylePlaceholders(tableFilterTemplates.genderFilter)
          .replaceAll("{{columnIndex}}", columnIndex)
          .replace("{{header}}", header);

      case "status":
        return replaceStylePlaceholders(tableFilterTemplates.statusFilter)
          .replaceAll("{{columnIndex}}", columnIndex)
          .replace("{{header}}", header);

      case "boolean":
        return replaceStylePlaceholders(tableFilterTemplates.booleanFilter)
          .replaceAll("{{columnIndex}}", columnIndex)
          .replace("{{header}}", header);

      case "text":
      case "calling":
      case "organization":
        const options = filter.values
          .filter((value) => value && value.trim() !== "")
          .map((value) =>
            tableFilterTemplates.dropdownOption.replaceAll("{{value}}", value)
          )
          .join("");
        return replaceStylePlaceholders(tableFilterTemplates.dropdownFilter)
          .replaceAll("{{columnIndex}}", columnIndex)
          .replace("{{header}}", header)
          .replace("{{options}}", options);

      case "age":
        return replaceStylePlaceholders(tableFilterTemplates.ageFilter)
          .replaceAll("{{columnIndex}}", columnIndex)
          .replace("{{header}}", header);

      case "date":
        return replaceStylePlaceholders(tableFilterTemplates.dateFilter)
          .replaceAll("{{columnIndex}}", columnIndex)
          .replace("{{header}}", header);

      default:
        return replaceStylePlaceholders(tableFilterTemplates.textFilter)
          .replaceAll("{{columnIndex}}", columnIndex)
          .replace("{{header}}", header)
          .replace("{{headerLower}}", header.toLowerCase());
    }
  }

  /**
   * Sets up event listeners for filter controls
   */
  function setupFilterEventListeners() {
    // Add change listeners to all filter controls
    const filterControls = document.querySelectorAll(
      "#lcr-tools-filter-options select, #lcr-tools-filter-options input"
    );
    filterControls.forEach((control) => {
      control.addEventListener("change", updateFilterStatus);
      control.addEventListener("input", updateFilterStatus);
    });
  }

  /**
   * Updates the filter status display
   */
  function updateFilterStatus() {
    const statusElement = document.getElementById("lcr-tools-filter-status");
    if (!statusElement) return;

    const activeFilters = getActiveFilters();
    if (activeFilters.length > 0) {
      statusElement.style.display = "block";
      statusElement.style.backgroundColor = "#d1ecf1";
      statusElement.style.color = "#0c5460";
      statusElement.style.border = "1px solid #bee5eb";
      statusElement.innerHTML = tableFilterTemplates.filterStatusActive.replace(
        "{{activeFilters}}",
        activeFilters.join(", ")
      );
    } else {
      statusElement.style.display = "none";
    }
  }

  /**
   * Gets currently active filters
   * @returns {Array} - Array of active filter descriptions
   */
  function getActiveFilters() {
    const activeFilters = [];
    const filterControls = document.querySelectorAll(
      "#lcr-tools-filter-options select, #lcr-tools-filter-options input"
    );

    filterControls.forEach((control) => {
      if (control.value && control.value.trim() !== "") {
        const labelElement = control.closest("div")?.querySelector("label");
        const label = labelElement?.textContent || "Unknown";
        activeFilters.push(`${label}: ${control.value}`);
      }
    });

    return activeFilters;
  }

  /**
   * Applies the current filters to the table
   */
  function applyFilters() {
    if (!currentTable) return;

    const tableElement = document.querySelector(
      `table[data-table-id="${currentTable.id}"]`
    );
    if (!tableElement) return;

    const filters = getCurrentFilters();
    const rows = Array.from(tableElement.querySelectorAll("tbody tr"));
    let visibleCount = 0;

    rows.forEach((row) => {
      const shouldShow = evaluateRow(row, filters);
      row.style.display = shouldShow ? "" : "none";
      if (shouldShow) visibleCount++;
    });

    // Update status
    const statusElement = document.getElementById("lcr-tools-filter-status");
    if (statusElement) {
      statusElement.style.display = "block";
      statusElement.style.backgroundColor = "#d4edda";
      statusElement.style.color = "#155724";
      statusElement.style.border = "1px solid #c3e6cb";
      statusElement.innerHTML = tableFilterTemplates.filterStatusApplied
        .replace("{{visibleCount}}", visibleCount)
        .replace("{{totalCount}}", rows.length);
    }

    console.log(
      `LCR Tools: Applied filters, showing ${visibleCount} of ${rows.length} rows`
    );
  }

  /**
   * Gets current filter values from the UI
   * @returns {Object} - Object with filter values
   */
  function getCurrentFilters() {
    const filters = {};
    const filterControls = document.querySelectorAll(
      "#lcr-tools-filter-options select, #lcr-tools-filter-options input"
    );

    filterControls.forEach((control) => {
      const columnIndex = control.id
        .replace("lcr-tools-filter-", "")
        .replace(/-min|-max|-from|-to$/, "");
      const isMinMax =
        control.id.includes("-min") || control.id.includes("-max");
      const isDateRange =
        control.id.endsWith("-from") || control.id.endsWith("-to");

      if (control.value && control.value.trim() !== "") {
        if (isMinMax) {
          if (!filters[columnIndex]) filters[columnIndex] = {};
          if (control.id.includes("-min")) {
            filters[columnIndex].min = parseInt(control.value);
          } else {
            filters[columnIndex].max = parseInt(control.value);
          }
        } else if (isDateRange) {
          if (!filters[columnIndex]) filters[columnIndex] = {};
          if (control.id.includes("-from")) {
            filters[columnIndex].fromDate = control.value;
          } else {
            filters[columnIndex].toDate = control.value;
          }
        } else {
          filters[columnIndex] = control.value;
        }
      }
    });

    return filters;
  }

  /**
   * Evaluates whether a row should be shown based on filters
   * @param {HTMLTableRowElement} row - The table row
   * @param {Object} filters - The filter values
   * @returns {boolean} - True if row should be shown
   */
  function evaluateRow(row, filters) {
    const cells = Array.from(row.querySelectorAll("td"));

    for (const [columnIndex, filterValue] of Object.entries(filters)) {
      const cellIndex = parseInt(columnIndex);
      const cell = cells[cellIndex];

      if (!cell) continue;

      const cellValue = tableUtils.getCellValue(cell);

      if (typeof filterValue === "object") {
        // Min/max filter (for age)
        if (filterValue.min !== undefined) {
          const age = parseInt(cellValue);
          if (isNaN(age) || age < filterValue.min) return false;
        }
        if (filterValue.max !== undefined) {
          const age = parseInt(cellValue);
          if (isNaN(age) || age > filterValue.max) return false;
        }

        // Date range filter
        if (
          filterValue.fromDate !== undefined ||
          filterValue.toDate !== undefined
        ) {
          const cellDate = dataUtils.parseLCRDate(cellValue);
          if (cellDate === null) return false; // Skip rows with unparseable dates

          if (filterValue.fromDate !== undefined) {
            const fromDate = new Date(filterValue.fromDate);
            if (cellDate < fromDate) return false;
          }
          if (filterValue.toDate !== undefined) {
            const toDate = new Date(filterValue.toDate);
            // Add one day to include the entire "to" date
            toDate.setDate(toDate.getDate() + 1);
            if (cellDate >= toDate) return false;
          }
        }
      } else {
        // Text filter - handle boolean values specially
        if (filterValue === "Yes" || filterValue === "No") {
          // For boolean values, do exact match
          if (cellValue !== filterValue) return false;
        } else {
          // For other text filters, do contains match (case insensitive)
          const cellValueLower = cellValue.toLowerCase();
          const filterValueLower = filterValue.toLowerCase();
          if (!cellValueLower.includes(filterValueLower)) return false;
        }
      }
    }

    return true;
  }

  /**
   * Clears all filter controls in the UI
   */
  function clearFilterControls() {
    const filterControls = document.querySelectorAll(
      "#lcr-tools-filter-options select, #lcr-tools-filter-options input"
    );
    filterControls.forEach((control) => {
      control.value = "";
    });
    updateFilterStatus();
  }

  /**
   * Resets table rows to be visible
   * @param {string} tableId - The table ID to reset
   */
  function resetTableRows(tableId) {
    const tableElement = document.querySelector(
      `table[data-table-id="${tableId}"]`
    );
    if (tableElement) {
      const rows = Array.from(tableElement.querySelectorAll("tbody tr"));
      rows.forEach((row) => {
        row.style.display = "";
      });
    }
  }

  /**
   * Clears filters for the current table only
   */
  function clearCurrentTableFilters() {
    if (!currentTable) return;

    clearFilterControls();
    resetTableRows(currentTable.id);

    console.log("LCR Tools: Cleared filters for current table");
  }

  /**
   * Clears all active filters
   */
  function clearAllFilters() {
    clearFilterControls();

    // Reset all tables to show all rows
    if (pageTables) {
      pageTables.tables.forEach((table) => {
        resetTableRows(table.id);
      });
    }

    console.log("LCR Tools: Cleared all filters");
  }

  /**
   * Resets the table to its original state
   */
  function resetTable() {
    if (!currentTable || !originalTableData) return;

    const tableElement = document.querySelector(
      `table[data-table-id="${currentTable.id}"]`
    );
    if (!tableElement) return;

    // Restore original table content
    const tbody = tableElement.querySelector("tbody");
    const originalTbody = originalTableData.querySelector("tbody");
    if (tbody && originalTbody) {
      tbody.innerHTML = originalTbody.innerHTML;
    }

    // Clear all filters
    clearAllFilters();

    console.log("LCR Tools: Table reset to original state");
  }

  /**
   * Scrolls to load all data, then returns to top and refreshes filter options
   */
  async function scrollToLoadData() {
    try {
      // Show loading indicator
      uiUtils.showLoadingIndicator(
        "Loading all data...",
        "Scrolling to load content"
      );

      // Scroll to load all content
      await navigationUtils.autoScrollToLoadContent({
        scrollStep: 400,
        scrollInterval: 200,
        maxConsecutiveNoChange: 5,
        maxTotalIterations: 100,
      });

      // Scroll back to top
      await navigationUtils.scrollToTop(1000);

      // Hide loading indicator
      uiUtils.hideLoadingIndicator();

      // Refresh the current table's filter options with new data
      if (currentTable) {
        showFilterOptions(currentTable);
        console.log("LCR Tools: Filter options refreshed with all loaded data");
      }

      // Hide the navigation button after successful load
      const loadDataBtn = document.getElementById("lcr-tools-load-data-btn");
      if (loadDataBtn) {
        const navSection = loadDataBtn.closest(
          '[style*="background: linear-gradient"]'
        );
        if (navSection) {
          navSection.style.display = "none";
        }
      }
    } catch (error) {
      console.error("LCR Tools: Error during scroll to load data:", error);
      uiUtils.hideLoadingIndicator();
      alert("Error loading data. Please try again.");
    }
  }

  window.filterUtils = {
    showTableFilterModal,
    showFilterOptions,
    applyFilters,
    clearCurrentTableFilters,
    clearAllFilters,
    resetTable,
    scrollToLoadData,
  };
})();
