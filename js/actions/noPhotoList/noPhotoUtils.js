/**
 * Utility file specifically for the noPhotoList action.
 * Handles the data extraction required to generate a report of
 * individuals without photos from the Member Directory page.
 * Caches results to improve performance on subsequent runs.
 *
 * Integrates with navigationUtils for page navigation and fileUtils for CSV generation.
 */
(() => {
  utils.returnIfLoaded("noPhotoUtils");
  utils.ensureLoaded("navigationUtils", "uiUtils", "fileUtils", "storageUtils");

  /**
   * Waits for a popover to appear and be fully loaded
   * @param {number} maxWaitMs - Maximum time to wait in milliseconds
   * @returns {Promise<Element|null>} - The popover element or null
   */
  async function waitForPopover(maxWaitMs = 1500) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const popover = document.querySelector(
        'dialog[data-testid="popover"][open].member-card__styled-member-card-popover',
      );

      if (popover) {
        const nameDiv = popover.querySelector(".member-card__styled-div");
        if (nameDiv) {
          // Give it a tiny bit more time for content to settle
          await utils.sleep(150);
          return popover;
        }
      }

      await utils.sleep(50);
    }

    return null;
  }

  /**
   * Collects data of members without photos from the member directory page
   * @returns {Promise<Array>} - Array of member name objects
   */
  async function collectNoPhotoDataFromDirectory() {
    const membersWithoutPhotos = [];
    const newCacheEntries = {};

    // Get cache settings and current cache
    const cacheSettings = await storageUtils.getCacheSettings();
    const currentCache = cacheSettings.enabled
      ? await storageUtils.getPhotoCache()
      : {};

    // Find all rows in the table that have an ID
    const allRows = Array.from(document.querySelectorAll('tr[id][role="row"]'));

    const totalCount = allRows.length;

    for (let i = 0; i < allRows.length; i++) {
      if (uiUtils.isAborted()) {
        break;
      }

      const row = allRows[i];
      const rowId = row.id;

      // Extract name from the row itself as a fallback
      const nameCell = row.querySelector("td.member-card__styled-td-name");
      const nameFromRow = nameCell ? nameCell.textContent.trim() : "";

      // Check cache first
      if (cacheSettings.enabled && currentCache[rowId]) {
        const cached = currentCache[rowId];
        if (cached.hasPhoto === false) {
          // Prefer fullName, then reconstruct if only parts exist, then fallback to row
          let fullName = cached.fullName;
          if (!fullName && (cached.firstName || cached.lastName)) {
            fullName = `${cached.firstName} ${cached.lastName}`.trim();
          }
          if (!fullName) fullName = nameFromRow;

          if (fullName) {
            membersWithoutPhotos.push({ fullName });
          }
          continue;
        } else if (cached.hasPhoto === true) {
          continue;
        }
      }

      try {
        // ... (rest of the try block)
        link.click();
        const popover = await waitForPopover();

        if (popover) {
          const nameDiv = popover.querySelector(".member-card__styled-div");
          const img = popover.querySelector(
            "img.eden-image.eden-avatar__image-decorator",
          );

          if (nameDiv) {
            const fullNameWithAge = nameDiv.textContent.trim();
            const fullName = fullNameWithAge.replace(/\s*\(\d+\)$/, "");

            // ... (photo detection logic remains same)
            let hasNoPhoto = !img || !img.src;
            let photoUrl = null;
            if (img && img.src) {
              photoUrl = img.src;
              if (
                photoUrl.includes("placeholder") ||
                photoUrl.includes("default") ||
                photoUrl.includes("no-image") ||
                photoUrl.includes("blank") ||
                photoUrl.endsWith(".gif") ||
                photoUrl.includes("data:image/svg")
              ) {
                hasNoPhoto = true;
              }
            }

            const parts = fullName.split(" ").filter((p) => p);
            let firstName = "";
            let lastName = "";
            if (parts.length > 1) {
              lastName = parts.pop();
              firstName = parts.join(" ");
            } else if (parts.length === 1) {
              lastName = parts[0];
            }

            if (hasNoPhoto) {
              const displayFullName = fullName || nameFromRow;
              if (displayFullName) {
                membersWithoutPhotos.push({ fullName: displayFullName });
              }
              newCacheEntries[rowId] = {
                firstName,
                lastName,
                fullName: displayFullName,
                hasPhoto: false,
                timestamp: Date.now(),
              };
            } else {
              newCacheEntries[rowId] = {
                firstName,
                lastName,
                fullName,
                hasPhoto: true,
                photoUrl,
                timestamp: Date.now(),
              };
            }
          }
        }
        // ... (rest of the loop)

        document.body.click();
        await utils.sleep(200);
      } catch (error) {
        console.warn(`LCR Tools: Error processing row ${rowId}:`, error);
        document.body.click();
        await utils.sleep(100);
      }
    }

    // Save new entries to cache if enabled
    if (cacheSettings.enabled && Object.keys(newCacheEntries).length > 0) {
      await storageUtils.updatePhotoCache(newCacheEntries);
    }

    return membersWithoutPhotos;
  }

  /**
   * Downloads a report of individuals without photos.
   * @param {Array} names - Array of member name objects
   */
  async function downloadReportData(names) {
    if (!names || names.length === 0) {
      alert("LCR Tools: No members without photos found.");
      return;
    }

    const csvHeader = `"Full Name"\n`;
    const csvRows = names
      .map((n) => {
        const formattedFullName = fileUtils.formatCsvCell(n.fullName || "");
        return `"${formattedFullName}"`;
      })
      .join("\n");

    const csvContent = csvHeader + csvRows;
    fileUtils.downloadCsv(csvContent, "individuals_without_photos.csv");
  }

  window.noPhotoUtils = {
    collectNoPhotoDataFromDirectory,
    downloadReportData,
  };
})();
