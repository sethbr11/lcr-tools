/**
 * Utility file specifically for the noPhotoList action.
 * Handles the data extraction required to generate a report of
 * individuals without photos from the Member Directory page.
 * Caches results to improve performance on subsequent runs.
 *
 * Integrates with navigationUtils for page navigation and fileUtils for CSV generation.
 */
(() => {
  if (utils.returnIfLoaded("noPhotoUtils")) return;
  utils.ensureLoaded(
    "navigationUtils",
    "uiUtils",
    "fileUtils",
    "storageUtils",
    "lcrApiUtils",
  );

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

    // Find all rows in the table
    const allRows = Array.from(document.querySelectorAll('tr[id][role="row"]'));
    const membersToFetch = [];

    for (let i = 0; i < allRows.length; i++) {
      const memberInfo = lcrApiUtils.getMemberInfoFromRow(allRows[i]);
      if (!memberInfo) continue;

      const { memberId, firstName, lastName } = memberInfo;

      // Check cache first
      if (cacheSettings.enabled && currentCache[memberId]) {
        const cached = currentCache[memberId];
        if (cached.hasPhoto === false) {
          // Guaranteed to have firstName and lastName from either cache or fallback logic
          membersWithoutPhotos.push({
            firstName: cached.firstName || firstName,
            lastName: cached.lastName || lastName,
          });
          continue;
        } else if (cached.hasPhoto === true) {
          continue;
        }
      }

      membersToFetch.push(memberInfo);
    }

    await lcrApiUtils.processInBatches(
      membersToFetch,
      10,
      async (memberInfo) => {
        const cardData = await lcrApiUtils.fetchMemberCard(memberInfo.memberId);

        let hasPhoto = false;
        let photoUrl = null;

        if (
          cardData &&
          cardData.photoMetadata &&
          cardData.photoMetadata.tokenUrl
        ) {
          photoUrl = `${cardData.photoMetadata.tokenUrl}/MEDIUM`;
          hasPhoto = true;
        }

        if (!hasPhoto) {
          membersWithoutPhotos.push({ 
            firstName: memberInfo.firstName, 
            lastName: memberInfo.lastName 
          });
          newCacheEntries[memberInfo.memberId] = {
            ...memberInfo,
            hasPhoto: false,
            timestamp: Date.now(),
          };
        } else {
          newCacheEntries[memberInfo.memberId] = {
            ...memberInfo,
            hasPhoto: true,
            photoUrl,
            timestamp: Date.now(),
          };
        }
      },
      (start, end, total) => {
        uiUtils.showLoadingIndicator(
          `Checking member photos (processing ${start + 1}-${end} / ${total})...`,
        );
      },
    );

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

    const csvHeader = `Last Name,First Name\n`;
    const csvRows = names
      .map((n) => {
        const ln = fileUtils.formatCsvCell(n.lastName || "");
        const fn = fileUtils.formatCsvCell(n.firstName || "");
        return `${ln},${fn}`;
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
