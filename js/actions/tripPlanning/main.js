// Main logic for the Trip Planning action

(async () => {
  utils.returnIfLoaded("tripPlanning.main");
  utils.ensureLoaded("tableUtils", "uiUtils");

  if (await uiUtils.showConfirmationModal("This will open a new tab to the Trip Planner. Is that ok?", { confirmText: "Open Trip Planner" })) {
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
    
    const members = getMembersFromTable(selectedTable.element);
    chrome.storage.local.set({ tripPlanningData: members }, () => {
      window.open(chrome.runtime.getURL("html/trip_planning.html"), "_blank");
    });
  }

  function getMembersFromTable(table) {
    const members = [];
    const { headers, indices } = tableUtils.getRelevantHeaderCells(table);
    const nameIndex = headers.findIndex(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('member'));
    const addressIndex = headers.findIndex(h => h.toLowerCase().includes('address') || h.toLowerCase().includes('street') || h.toLowerCase().includes('location'));

    if (nameIndex === -1 || addressIndex === -1) {
      console.error("Could not find 'Name' and 'Address' columns in the table.");
      return [];
    }

    const rows = Array.from(table.querySelectorAll("tbody tr"));
    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll("td"));
      const name = tableUtils.getCellValue(cells[indices[nameIndex]]);
      const address = tableUtils.getCellValue(cells[indices[addressIndex]]);

      if (name && address) {
        members.push({ name, address });
      }
    });

    return members;
  }
})();
