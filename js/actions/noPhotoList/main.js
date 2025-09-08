/**
 * ACTION: DOWNLOAD LIST OF MEMBERS WITH NO PHOTO
 * A simple action that navigates the manage photos page to download a list of
 * everyone in the ward without a photo in tools as a CSV.
 *
 * See noPhotoUtils.js for in-depth implementation—this file acts as a
 * high level overview of everything that is happening.
 */
(async function () {
  utils.ensureLoaded("noPhotoUtils", "uiUtils");
  uiUtils.resetAborted();

  // Apply filters to the table
  uiUtils.showLoadingIndicator("Applying filters...");
  await noPhotoUtils.navigateToManageTab();
  await noPhotoUtils.setSubjectTypeToIndividual();
  await noPhotoUtils.setPhotoFilterToMembersWithoutPhoto();

  // Scroll page and scrape data
  uiUtils.showLoadingIndicator("Scrolling page to load all names...");
  await noPhotoUtils.downloadReportData();

  uiUtils.hideLoadingIndicator();
})();
