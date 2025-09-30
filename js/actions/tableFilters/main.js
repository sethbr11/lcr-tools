/**
 * ACTION: TABLE FILTERS
 * A flexible action that adds filtering capabilities to tables on LCR pages.
 * Allows users to filter table data by various criteria like gender, age, etc.
 *
 * See filterUtils.js for in-depth implementation—this file acts as a
 * high level overview of everything that is happening.
 */

(async function () {
  utils.ensureLoaded(
    "filterUtils",
    "tableUtils",
    "uiUtils",
    "modalUtils",
    "navigationUtils"
  );
  uiUtils.resetAborted();

  // Get all tables on the page
  const pageTables = tableUtils.getPageTables();

  if (pageTables.count === 0) {
    alert("No tables found on this page to filter.");
    return;
  }

  // Check if page needs scrolling to load all data
  const pageNeeds = navigationUtils.getNeeds();
  const needsScrolling = pageNeeds.includes("scroll");

  // Show the table filter side modal with navigation option if needed
  filterUtils.showTableFilterModal(pageTables, needsScrolling);
})();
