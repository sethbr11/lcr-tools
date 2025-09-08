/**
 * Utility file specifically for the findMultipleCallings action.
 */

(() => {
  utils.returnIfLoaded("findMultipleCallingsUtils");
  utils.ensureLoaded(
    "uiUtils",
    "tableUtils",
    "fileUtils",
    "modalUtils",
    "findMultipleCallingsTemplates"
  );

  /**
   * Simple template replacement function
   * @param {string} template - The template string
   * @param {Object} replacements - Object with key-value pairs for replacement
   * @returns {string} - Template with replacements applied
   */
  function replaceTemplate(template, replacements) {
    let result = template;
    Object.keys(replacements).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      result = result.replace(regex, replacements[key]);
    });
    return result;
  }

  /**
   * Navigates to the "With Callings" tab on the Member Callings page.
   */
  async function navigateToWithCallingsTab() {
    uiUtils.clickButton(
      'button#tab-withCallings[role="tab"]',
      "With Callings tab button"
    );
  }

  /**
   * Navigate to the "All Organization" designation on the Callings by Organization page.
   */
  async function navigateToAllOrganizations() {
    const ignoreNotPresent = true;
    uiUtils.clickButton(
      'a[ng-click="selectAllOrgs()"]',
      "All Organizations link",
      ignoreNotPresent
    );
  }

  /**
   * Analyzes the page to find members with multiple callings.
   * @param {string} page - The page type ("callings-by-organization" or "member-callings").
   * @returns {Array<Object>} - List of members with multiple callings.
   */
  function getList(page) {
    const isOrgsPage = page === "callings-by-organization";
    const pageTables = isOrgsPage
      ? tableUtils.getPageTables().tables
      : [{ id: null }];
    if (!pageTables || (isOrgsPage && pageTables.count === 0)) return [];

    const membersWithMultipleCallings = [];
    const memberCallingsMap = new Map();

    pageTables.forEach((table) => {
      const tableData = isOrgsPage
        ? tableUtils.tableToCSV(table.id, table.label, table.type)
        : tableUtils.tableToCSV();
      if (!tableData || !tableData.csvContent) return;

      const rows = tableData.csvContent.split("\r\n");
      const headers = rows[0].split(","); // Extract headers
      const dataRows = rows.slice(1); // Skip header row

      dataRows.forEach((row) => {
        const columns = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        if (!columns || columns.length < headers.length) return;

        const name = isOrgsPage
          ? columns[1]?.replace(/"/g, "").trim()
          : columns[0]?.replace(/"/g, "").trim();
        const calling = isOrgsPage
          ? columns[0]?.replace(/"/g, "").trim()
          : columns[6]?.replace(/"/g, "").trim();
        const organization = isOrgsPage
          ? table.label || "N/A"
          : columns[5]?.replace(/"/g, "").trim();

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
      if (callings.length > 1) {
        membersWithMultipleCallings.push({
          name: memberName,
          callings: callings,
          count: callings.length,
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
      "orgs/callings-by-organization"
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
      const content = replaceTemplate(templates.noIssues, { scopeText });

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
            replaceTemplate(templates.callingItem, {
              calling: calling.calling,
              organization: calling.organization || "N/A",
            })
          )
          .join("");

        return replaceTemplate(templates.memberItem, {
          index,
          memberNameEscaped: member.name.replace(/"/g, "&quot;"),
          memberName: member.name,
          callingsList,
        });
      })
      .join("");

    // Generate the main content
    const content = replaceTemplate(templates.multipleCallings, {
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
      isError
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
        selectedItems.has(member.name)
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
          '""'
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
      false
    );
  }

  window.findMultipleCallingsUtils = {
    navigateToWithCallingsTab,
    navigateToAllOrganizations,
    getList,
    createUI,
  };
})();
