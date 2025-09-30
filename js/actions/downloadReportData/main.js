/**
 * ACTION: DOWNLOAD REPORT DATA
 * A flexible action that works on most LCR pages to download any table(s)
 * on the page and export into a CSV (or ZIP if multiple).
 *
 * See downloadUtils.js for in-depth implementation—this file acts as a
 * high level overview of everything that is happening.
 */

(async function () {
  utils.ensureLoaded("downloadUtils", "navigationUtils", "tableUtils");
  uiUtils.resetAborted();

  // Collect navigation needs and tables on the page
  const navNeeds = navigationUtils.getNeeds();
  const pageTables = tableUtils.getPageTables();

  // Allow user to select which tables they want to download
  let selectedTables;
  if (pageTables.count > 1) {
    selectedTables = await tableUtils.requestTables(pageTables, true); // Allow multiple selection
    if (!selectedTables) {
      console.log("LCR Tools: Download cancelled by user.");
      return;
    }
  } else {
    selectedTables = pageTables.tables;
  }

  // Perform process for downloading the page report(s)
  await downloadUtils.downloadReportData({
    selectedTables,
    navNeeds,
    onAbort: () => {
      if (uiUtils.isAborted()) {
        console.log("LCR Tools: Process aborted.");
        return true;
      }
      return false;
    },
  });
})();
