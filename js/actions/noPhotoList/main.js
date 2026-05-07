/**
 * ACTION: DOWNLOAD LIST OF MEMBERS WITH NO PHOTO
 * Scrapes the Member Directory page to find individuals without profile photos.
 *
 * See noPhotoUtils.js for in-depth implementation.
 */
(async function () {
  utils.ensureLoaded("noPhotoUtils", "uiUtils", "modalUtils", "storageUtils");
  uiUtils.resetAborted();

  // Show confirmation warning and photo cache settings
  const { proceed } = await storageUtils.showPhotoActionConfirmationModal({
    title: "Missing Photos Report",
    description: "<strong>Note:</strong> Generating this report on the Member Directory page is slower because it needs to click each member's name to check for a photo. Enabling the photo cache will make subsequent runs much faster."
  });

  if (!proceed) {
    console.log("LCR Tools: User cancelled missing photos report");
    return;
  }

  uiUtils.showLoadingIndicator("Checking for missing photos...");
  const names = await noPhotoUtils.collectNoPhotoDataFromDirectory();

  if (names && names.length > 0) {
    uiUtils.showLoadingIndicator("Generating report...");
    await noPhotoUtils.downloadReportData(names);
  } else if (!uiUtils.isAborted()) {
    alert("LCR Tools: All members in the current view have photos!");
  }

  uiUtils.hideLoadingIndicator();
})();
