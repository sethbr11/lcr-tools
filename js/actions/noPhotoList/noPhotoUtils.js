/**
 * Utility file specifically for the noPhotoList action.
 * Handles the navigation, filtering, and data extraction required to generate
 * a report of individuals without photos. This includes:
 * - Navigating to the "Manage" tab on the photo management page.
 * - Applying filters such as "Subject Type" and "Photo Filter."
 * - Scrolling through the page to load all relevant data.
 * - Extracting names of individuals without photos and exporting them as a CSV.
 *
 * Integrates with navigationUtils for page navigation and fileUtils for CSV generation.
 */
(() => {
  utils.returnIfLoaded("noPhotoUtils");
  utils.ensureLoaded("navigationUtils", "uiUtils", "fileUtils");

  /**
   * Navigates to the "Manage" tab on the photo management page.
   * @returns {Promise<boolean>} - True if navigation succeeded, false otherwise.
   */
  async function navigateToManageTab() {
    return navigationUtils.navigateToTab({
      tabSelector: "li[ng-class*=\"mp.tab == 'manage'\"]",
      linkSelector: "a[ng-click=\"mp.switchTab('manage')\"]",
      tabName: "Manage",
      delay: 1500,
    });
  }

  /**
   * Sets the "Subject Type" filter to "Individual" if not already set.
   * @returns {Promise<boolean>} - True if the filter was successfully set, false otherwise.
   */
  async function setSubjectTypeToIndividual() {
    return uiUtils.changeDropdown({
      dropdownSelector: "select[ng-model='mp.subjectTypeFilter']",
      value: "INDIVIDUAL",
      dropdownName: "Subject Type",
    });
  }

  /**
   * Sets the "Photo Filter" filter to "Members Without Photo" if not already set.
   * @returns {Promise<boolean>} - True if the filter was successfully set, false otherwise.
   */
  async function setPhotoFilterToMembersWithoutPhoto() {
    return uiUtils.changeDropdown({
      dropdownSelector: "select[ng-model='mp.photoFilter']",
      value: "MEMBERS_WITHOUT_PHOTO",
      dropdownName: "Photo Filter",
    });
  }

  /**
   * Downloads a report of individuals without photos.
   * @returns {Promise<void>}
   */
  async function downloadReportData() {
    const collectedNames = await navigationUtils.collectDataWithNavigation({
      needs: ["scroll"],
      onPageData: async () => {
        const divs = document.querySelectorAll(
          ".manage-photo-thumbnail-container"
        );
        const visibleDivs = Array.from(divs).filter(
          (div) => !div.classList.contains("ng-hide")
        );

        const processedNames = visibleDivs
          .map((div) => {
            const nameElement = div.querySelector("h5.manage-photo-name");
            if (!nameElement) return null;

            const fullName = nameElement.textContent.trim();
            if (!fullName) return null;

            let firstName = "";
            let lastName = "";

            const commaIndex = fullName.indexOf(",");
            if (commaIndex !== -1) {
              lastName = fullName.substring(0, commaIndex).trim();
              firstName = fullName.substring(commaIndex + 1).trim();
            } else {
              const parts = fullName.split(" ").filter((p) => p);
              if (parts.length > 1) {
                lastName = parts.pop();
                firstName = parts.join(" ");
              } else if (parts.length === 1) {
                lastName = parts[0];
              }
            }
            return lastName || firstName ? { firstName, lastName } : null;
          })
          .filter((nameObj) => nameObj !== null);

        return processedNames;
      },
    });

    if (!collectedNames || collectedNames.length === 0) {
      alert(
        "LCR Tools: No names found to export after applying filters and scrolling. Check if the filters are correct or if there are any individuals without photos."
      );
      return;
    }

    // Flatten the collectedNames array and convert to CSV
    const flattenedNames = collectedNames.flat();
    const csvHeader = `"First Names","Last Name"\n`;
    const csvRows = flattenedNames
      .map((n) => {
        if (!n.firstName && !n.lastName) return null;
        const formattedFirstName = fileUtils.formatCsvCell(n.firstName || "");
        const formattedLastName = fileUtils.formatCsvCell(n.lastName || "");
        return `"${formattedFirstName}","${formattedLastName}"`;
      })
      .filter((row) => row !== null)
      .join("\n");

    if (!csvRows) {
      alert("LCR Tools: No valid data to export as CSV.");
      return;
    }

    const csvContent = csvHeader + csvRows;
    fileUtils.downloadCsv(csvContent, "individuals_without_photos.csv");
  }

  window.noPhotoUtils = {
    navigateToManageTab,
    setSubjectTypeToIndividual,
    setPhotoFilterToMembersWithoutPhoto,
    downloadReportData,
  };
})();
