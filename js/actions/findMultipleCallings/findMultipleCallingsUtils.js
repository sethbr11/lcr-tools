/**
 * Utility file specifically for the findMultipleCallings action.
 */

(() => {
  if (utils.returnIfLoaded("findMultipleCallingsUtils")) return;
  utils.ensureLoaded(
    "uiUtils",
    "tableUtils",
    "fileUtils",
    "modalUtils",
    "findMultipleCallingsTemplates",
  );

  /**
   * Navigates to the "With Callings" tab on the Member Callings page.
   */
  async function navigateToWithCallingsTab() {
    uiUtils.clickButton(
      'button#tab-withCallings[role="tab"]',
      "With Callings tab button",
    );
  }

  /**
   * Navigate to the "All Organization" designation on the Callings by Organization page.
   */
  async function navigateToAllOrganizations() {
    // In the new React UI, we look for the Organizations multi-select dropdown
    const orgsDropdown = document.querySelector(
      'button[aria-haspopup="listbox"], button.multi-select__styled-secondary',
    );
    if (orgsDropdown) {
      orgsDropdown.click();
      await utils.sleep(300);

      const allOrgsCheckbox = document.querySelector(
        'input[value*="all-organizations"]',
      );
      if (allOrgsCheckbox && !allOrgsCheckbox.checked) {
        allOrgsCheckbox.click();
        await utils.sleep(500);
      }

      // Close dropdown
      orgsDropdown.click();
      await utils.sleep(200);
    }
  }

  /**
   * Analyzes the page to find members with multiple callings.
   * @param {string} page - The page type ("callings-by-organization" or "member-callings").
   * @returns {Array<Object>} - List of members with multiple callings.
   */
  function getList(page) {
    // Robust detection for the overhauled organizations page
    const isOrgsPage =
      page === "callings-by-organization" ||
      !!document.querySelector(".eden-table-table");

    const pageTables = isOrgsPage
      ? tableUtils.getPageTables().tables
      : [{ id: null }];

    if (!pageTables || pageTables.length === 0) return [];

    const membersWithMultipleCallings = [];
    const memberCallingsMap = new Map();

    pageTables.forEach((table) => {
      const tableData = isOrgsPage
        ? tableUtils.tableToCSV(table.id, table.label, table.type)
        : tableUtils.tableToCSV();

      if (!tableData || !tableData.csvContent) return;

      // Handle different line endings (LCR often uses CRLF)
      const rows = tableData.csvContent
        .split(/\r?\n/)
        .filter((line) => line.trim());
      if (rows.length < 2) return;

      const headerRow = rows[0];
      const dataRows = rows.slice(1);

      // Helper function to split CSV row robustly
      const splitCsvRow = (rowStr) => {
        const columns = [];
        let col = "";
        let inQuotes = false;
        for (let i = 0; i < rowStr.length; i++) {
          const char = rowStr[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === "," && !inQuotes) {
            columns.push(col.trim().replace(/^"|"$/g, ""));
            col = "";
          } else {
            col += char;
          }
        }
        columns.push(col.trim().replace(/^"|"$/g, ""));
        return columns;
      };

      const headers = splitCsvRow(headerRow);

      // Find indices based on header names (case-insensitive)
      const nameIdx = headers.findIndex((h) => h.toLowerCase() === "name");
      const callingIdx = headers.findIndex((h) =>
        ["calling", "position"].includes(h.toLowerCase()),
      );
      const orgIdx = headers.findIndex((h) =>
        h.toLowerCase().includes("organization"),
      );

      dataRows.forEach((row) => {
        const columns = splitCsvRow(row);
        if (columns.length < 2) return;

        // Extract values using discovered indices, falling back to old logic if headers missing
        let name = "";
        let calling = "";
        let organization = "";

        if (nameIdx !== -1) {
          name = columns[nameIdx];
        } else {
          // Fallback logic
          name = isOrgsPage ? columns[1] : columns[0];
        }

        if (callingIdx !== -1) {
          calling = columns[callingIdx];
        } else {
          // Fallback logic
          calling = isOrgsPage ? columns[0] : columns[6];
        }

        if (orgIdx !== -1) {
          organization = columns[orgIdx];
        } else {
          // Fallback logic
          organization = isOrgsPage ? table.label || "N/A" : columns[5];
        }

        // Skip if we couldn't find a valid member name or if it's a vacant calling
        if (!name || name.toLowerCase().includes("vacant")) return;

        // Add calling information to the map
        const callingObj = {
          calling: calling || "N/A",
          organization: organization || "N/A",
        };
        if (memberCallingsMap.has(name)) {
          memberCallingsMap.get(name).push(callingObj);
        } else {
          memberCallingsMap.set(name, [callingObj]);
        }
      });
    });

    // Find members with multiple callings
    memberCallingsMap.forEach((callings, memberName) => {
      // 1. Deduplicate by calling name to handle redundant listings (e.g. Bishopric in two orgs)
      const uniqueCallings = [];
      const seenNames = new Set();

      callings.forEach((c) => {
        if (!seenNames.has(c.calling)) {
          uniqueCallings.push(c);
          seenNames.add(c.calling);
        }
      });

      // 2. Calculate effective count for threshold
      // Special case: Bishop is automatically the Priests Quorum President
      let effectiveCount = seenNames.size;
      if (seenNames.has("Bishop") && seenNames.has("Priests Quorum President")) {
        effectiveCount--;
      }

      // 3. Only show if they have more than one distinct calling (after accounting for expected overlaps)
      if (effectiveCount > 1) {
        membersWithMultipleCallings.push({
          name: memberName,
          callings: callings, // Show all occurrences for full context in the UI
          count: effectiveCount,
        });
      }
    });

    return membersWithMultipleCallings;
  }

  /**
   * Creates the UI to display the results of the analysis.
   * @param {Array<Object>} membersWithMultipleCallings - The analysis results.
   */
  async function createUI(membersWithMultipleCallings) {
    const templates = window.findMultipleCallingsTemplates;
    const UI_OVERLAY_ID = "lcr-tools-multiple-callings-ui-overlay";

    // Check if we're on the ward callings page to show disclaimer
    const isWardCallingsPage = window.location.href.includes(
      "orgs/callings-by-organization",
    );

    // Prepare alerts
    const alerts = [];
    if (isWardCallingsPage) {
      alerts.push({
        message: templates.wardCallingsAlert,
        type: "warning",
      });
    }

    // If no issues are found, show a success message
    if (
      !membersWithMultipleCallings ||
      membersWithMultipleCallings.length === 0
    ) {
      const scopeText = isWardCallingsPage ? "ward " : "";
      const content = utils.replaceTemplate(templates.noIssues, { scopeText });

      modalUtils.createStandardModal({
        id: UI_OVERLAY_ID,
        title: "Members with Multiple Callings",
        content,
        alerts,
      });
      return;
    }

    // Generate member items
    const membersList = membersWithMultipleCallings
      .map((member, index) => {
        const callingsList = member.callings
          .map((calling) =>
            utils.replaceTemplate(templates.callingItem, {
              calling: calling.calling,
              organization: calling.organization || "N/A",
            }),
          )
          .join("");

        return utils.replaceTemplate(templates.memberItem, {
          index,
          memberNameEscaped: member.name.replace(/"/g, "&quot;"),
          memberName: member.name,
          callingsList,
        });
      })
      .join("");

    // Generate the main content
    const content = utils.replaceTemplate(templates.multipleCallings, {
      memberCount: membersWithMultipleCallings.length,
      membersList,
    });

    // Create the modal
    modalUtils.createStandardModal({
      id: UI_OVERLAY_ID,
      title: "Members with Multiple Callings",
      content,
      alerts,
      buttons: [
        {
          text: "Download CSV Report",
          onClick: () => downloadCsv(membersWithMultipleCallings),
          options: {
            id: "lcr-tools-download-csv-btn",
            variant: "success",
          },
        },
      ],
      modalOptions: { maxWidth: "700px" },
      selectionConfig: {
        itemSelector: ".member-checkbox",
        itemNameAttribute: "memberName",
        onSelectionChange: (selectedItems, isSelectMode) => {
          updateCsvButtonState(selectedItems, isSelectMode);
        },
      },
    });
  }

  /**
   * Updates the CSV button state based on selection
   * @param {Set} selectedItems - Set of selected item names
   * @param {boolean} isSelectMode - Whether selection mode is active
   */
  function updateCsvButtonState(selectedItems, isSelectMode) {
    const csvBtn = document.getElementById("lcr-tools-download-csv-btn");
    if (!csvBtn) return;

    if (isSelectMode) {
      if (selectedItems.size === 0) {
        csvBtn.disabled = true;
        csvBtn.style.backgroundColor = "#6c757d";
        csvBtn.style.cursor = "not-allowed";
      } else {
        csvBtn.disabled = false;
        csvBtn.style.backgroundColor = "#28a745";
        csvBtn.style.cursor = "pointer";
      }
    } else {
      csvBtn.disabled = false;
      csvBtn.style.backgroundColor = "#28a745";
      csvBtn.style.cursor = "pointer";
    }
  }

  /**
   * Shows a status message in the UI
   * @param {string} message - The message to show
   * @param {boolean} isError - Whether this is an error message
   */
  function showUiStatus(message, isError = false) {
    modalUtils.showStatus(
      "lcr-tools-multiple-callings-status",
      message,
      isError,
    );
  }

  /**
   * Downloads the results as a CSV file.
   * @param {Array<Object>} membersWithMultipleCallings - The analysis results.
   */
  function downloadCsv(membersWithMultipleCallings) {
    const { isSelectMode, selectedItems } = modalUtils.getSelectionState();
    let membersToExport = membersWithMultipleCallings;

    // If in select mode, only export selected members
    if (isSelectMode) {
      if (selectedItems.size === 0) {
        showUiStatus("No members selected for export.", true);
        return;
      }
      membersToExport = membersWithMultipleCallings.filter((member) =>
        selectedItems.has(member.name),
      );
    }

    if (membersToExport.length === 0) {
      showUiStatus("No data to download.", true);
      return;
    }

    const csvHeader = `"Name","Number of Callings","Callings","Organizations"\n`;
    const csvRows = membersToExport
      .map((member) => {
        const callings = member.callings.map((c) => c.calling).join("; ");
        const organizations = member.callings
          .map((c) => c.organization || "N/A")
          .join("; ");
        return `"${member.name.replace(/"/g, '""')}","${
          member.callings.length
        }","${callings.replace(/"/g, '""')}","${organizations.replace(
          /"/g,
          '""',
        )}"`;
      })
      .join("\n");
    const csvContent = csvHeader + csvRows;

    fileUtils.downloadCsv(csvContent, `members_multiple_callings.csv`);

    const exportCount = isSelectMode
      ? selectedItems.size
      : membersWithMultipleCallings.length;
    showUiStatus(
      `CSV report with ${exportCount} members downloaded successfully.`,
      false,
    );
  }

  window.findMultipleCallingsUtils = {
    navigateToWithCallingsTab,
    navigateToAllOrganizations,
    getList,
    createUI,
  };
})();
