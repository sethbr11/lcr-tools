/**
 * ACTION: FIND MEMBERS WITH MORE THAN ONE CALLING
 * A comprehensive action that analyzes member calling assignments across
 * different LCR pages to identify members who hold multiple callings.
 *
 * See findMultipleCallingsUtils.js for in-depth implementation—this file acts as a
 * high-level overview of everything that is happening.
 */

(async function () {
  // Ensure utility functions are loaded
  utils.ensureLoaded("findMultipleCallingsUtils");

  const page = window.location.href.includes("member-callings")
    ? "member-callings"
    : window.location.href.includes("callings-by-organization")
    ? "callings-by-organization"
    : null;

  // Do URL-specific actions to prepare page for processing
  if (page === "member-callings")
    await findMultipleCallingsUtils.navigateToWithCallingsTab();
  if (page === "callings-by-organization")
    await findMultipleCallingsUtils.navigateToAllOrganizations();
  await new Promise((resolve) => setTimeout(resolve, 250));

  // Analyze the page to find members with multiple callings
  const data = findMultipleCallingsUtils.getList(page);

  // Create and display the UI for the results
  // TODO: Filter out Bishop (with priest calling), temple workers, etc.
  findMultipleCallingsUtils.createUI(data);
})();
