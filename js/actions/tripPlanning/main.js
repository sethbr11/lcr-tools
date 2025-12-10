// Main logic for the Trip Planning action

(async () => {
  utils.returnIfLoaded("tripPlanning.main");
  utils.ensureLoaded("tableUtils", "uiUtils");

  if (
    await uiUtils.showConfirmationModal(
      "This will open a new tab to the Trip Planner. Is that ok?",
      { confirmText: "Open Trip Planner" }
    )
  ) {
    // Get all tables on the page
    const pageTables = tableUtils.getPageTables();
    if (pageTables.count === 0) {
      alert("No tables found on this page.");
      return;
    }

    // Have user select which table to use
    let selectedTable;
    if (pageTables.count > 1) {
      selectedTable = await tableUtils.requestTables(pageTables, false); // Allow only one table selection
      if (!selectedTable) {
        console.log("LCR Tools: Trip planning cancelled by user.");
        return;
      }
    } else {
      selectedTable = pageTables.tables[0];
    }

    const result = getMembersFromTable(selectedTable.element);
    if (!result) return; // Required columns missing, alert already shown
    const { rows: members, headers } = result;

    chrome.storage.local.set(
      {
        tripPlanningData: members,
        tripPlanningHeaders: headers,
      },
      () => {
        window.open(chrome.runtime.getURL("html/trip_planning.html"), "_blank");
      }
    );
  }

  function getMembersFromTable(table) {
    const members = [];
    const { headers, indices } = tableUtils.getRelevantHeaderCells(table);
    const nameIndex = headers.findIndex(
      (h) =>
        h.toLowerCase().includes("name") || h.toLowerCase().includes("member")
    );
    const addressIndex = headers.findIndex(
      (h) =>
        h.toLowerCase().includes("address") ||
        h.toLowerCase().includes("street") ||
        h.toLowerCase().includes("location")
    );

    if (nameIndex === -1 || addressIndex === -1) {
      alert(
        "Trip Planner needs visible Name and Address columns. Please show these columns and try again."
      );
      console.error(
        "Trip Planner aborted: required 'Name' and 'Address' columns not visible."
      );
      return null;
    }

    // Only process rows that are currently visible on the page
    const rows = Array.from(table.querySelectorAll("tbody tr")).filter(
      (row) => row.offsetParent !== null
    );
    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll("td"));
      const visibleColumns = indices.map((colIndex, i) => {
        const cell = cells[colIndex];
        const value = cell ? tableUtils.getCellValue(cell) : "";
        return { header: headers[i], value };
      });

      const name = visibleColumns[nameIndex]?.value;
      const address = visibleColumns[addressIndex]?.value;

      if (name && address) {
        members.push({
          name,
          address,
          columns: Object.fromEntries(
            visibleColumns.map(({ header, value }) => [header, value])
          ),
        });
      }
    });

    return { rows: members, headers };
  }
})();
