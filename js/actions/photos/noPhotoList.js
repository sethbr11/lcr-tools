// Content script to navigate photo management tabs, apply filters, auto-scroll,
// and then export names of individuals without photos, showing a loading indicator.

(async function () {
  window.lcrToolsShouldStopProcessing = false; // Reset abort flag

  // Ensure the loading indicator functions are available
  if (
    typeof showLoadingIndicator !== "function" ||
    typeof hideLoadingIndicator !== "function"
  ) {
    console.error(
      "LCR Tools: Loading indicator functions are not available. Ensure js/utils/loadingIndicator.js is injected first."
    );
    alert(
      "LCR Tools: Critical error - UI functions missing. Please report this."
    );
    return { result: { error: "Loading indicator utility not loaded." } };
  }

  showLoadingIndicator("Initializing..."); // Show loader at the very start

  try {
    showLoadingIndicator("Applying filters...");

    // --- 1. Click the "Manage" tab if not already active ---
    const manageTabLi = document.querySelector(
      "li[ng-class*=\"mp.tab == 'manage'\"]"
    );
    if (manageTabLi && !manageTabLi.classList.contains("active")) {
      const manageTabLink = manageTabLi.querySelector(
        "a[ng-click=\"mp.switchTab('manage')\"]"
      );
      if (manageTabLink) {
        console.log(
          "LCR Tools: 'Manage' tab is not active. Clicking 'Manage' tab."
        );
        manageTabLink.click();
        await scrapingUtils.sleep(1500);
      } else {
        console.error(
          "LCR Tools: 'Manage' tab link not found, though li element was present."
        );
        alert("LCR Tools: Could not find the 'Manage' tab link to click.");
        return { result: { error: "'Manage' tab link not found." } };
      }
    } else if (manageTabLi && manageTabLi.classList.contains("active")) {
      console.log("LCR Tools: 'Manage' tab is already active. Skipping click.");
    } else {
      console.error("LCR Tools: 'Manage' tab li element not found.");
      alert(
        "LCR Tools: Could not find the 'Manage' tab. Ensure you are on the correct photo management page."
      );
      return { result: { error: "'Manage' tab li element not found." } };
    }

    // --- 2. Set "Subject Type" filter to "Individual" if not already set ---
    const subjectTypeSelect = document.querySelector(
      "select[ng-model='mp.subjectTypeFilter']"
    );
    if (!subjectTypeSelect) {
      alert("LCR Tools: 'Subject Type' filter dropdown not found.");
      return { result: { error: "'Subject Type' filter dropdown not found." } };
    }
    if (subjectTypeSelect.value !== "INDIVIDUAL") {
      if (
        !scrapingUtils.setSelectValue(
          subjectTypeSelect,
          "INDIVIDUAL",
          "'Subject Type'"
        )
      ) {
        alert(
          "LCR Tools: Failed to set 'Subject Type' filter to 'Individual'."
        );
        return { result: { error: "Could not set 'Subject Type' filter." } };
      }
      await scrapingUtils.sleep(1000);
    } else {
      console.log(
        "LCR Tools: 'Subject Type' filter already set to 'INDIVIDUAL'."
      );
    }

    // --- 3. Set "Photo Filter" to "Members with No Photo" if not already set ---
    const photoFilterSelect = document.querySelector(
      "select[ng-model='mp.photoFilter']"
    );
    if (!photoFilterSelect) {
      alert("LCR Tools: 'Photo Filter' dropdown not found.");
      return { result: { error: "'Photo Filter' dropdown not found." } };
    }
    if (photoFilterSelect.value !== "MEMBERS_WITHOUT_PHOTO") {
      if (
        !scrapingUtils.setSelectValue(
          photoFilterSelect,
          "MEMBERS_WITHOUT_PHOTO",
          "'Photo Filter'"
        )
      ) {
        alert(
          "LCR Tools: Failed to set 'Photo Filter' to 'Members with No Photo'."
        );
        return { result: { error: "Could not set 'Photo Filter'." } };
      }
      await scrapingUtils.sleep(1500);
    } else {
      console.log(
        "LCR Tools: 'Photo Filter' already set to 'MEMBERS_WITHOUT_PHOTO'."
      );
    }

    // --- 4. Implement auto-scrolling ---
    showLoadingIndicator("Scrolling page to load all names...");
    console.log("LCR Tools: Starting auto-scroll to load all names.");

    await scrapingUtils.autoScrollToLoadContent({
      scrollStep: 400,
      scrollInterval: 200,
      maxConsecutiveNoChange: 5,
    });

    showLoadingIndicator("Finalizing export...");
    await scrapingUtils.sleep(2000);
    console.log(
      "LCR Tools: Page fully scrolled, attempting to navigate back to the top..."
    );

    await scrapingUtils.scrollToTop();
    console.log("LCR Tools: Back at the top, starting CSV export...");

    // --- 5. Extract names and export CSV ---
    const divs = document.querySelectorAll(".manage-photo-thumbnail-container");
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

    if (processedNames.length === 0) {
      alert(
        "LCR Tools: No names found to export after applying filters and scrolling. Check if the filters are correct or if there are any individuals without photos."
      );
      return { result: { error: "No names found to export." } };
    }

    const csvHeader = `"First Names","Last Name"\n`;
    const csvRows = processedNames
      .map(
        (n) =>
          `"${csvUtils.formatCsvCell(n.firstName)}","${csvUtils.formatCsvCell(
            n.lastName
          )}"`
      )
      .join("\n");
    const csvContent = csvHeader + csvRows;

    csvUtils.downloadCsv(csvContent, "individuals_without_photos.csv");

    console.log(
      "LCR Tools: CSV export initiated for individuals without photos."
    );
    return { result: "success" };
  } catch (error) {
    console.error("Error in exportNamesWithoutPhotos.js:", error);
    alert(`LCR Tools: An error occurred: ${error.message}`);
    return { result: { error: error.message } };
  } finally {
    window.lcrToolsShouldStopProcessing = false; // Ensure flag is reset
    hideLoadingIndicator();
  }
})();
