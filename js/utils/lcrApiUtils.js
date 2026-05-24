/**
 * Utility file for interacting with internal LCR and Church APIs.
 * Centralizes common API requests and handles batching/concurrency.
 */
(() => {
  utils.returnIfLoaded("lcrApiUtils");
  utils.ensureLoaded("uiUtils");

  /**
   * Fetches card data for a specific member
   * @param {string} uuid - Member UUID
   * @returns {Promise<Object|null>} - Card data or null if failed
   */
  async function fetchMemberCard(uuid) {
    try {
      const response = await fetch(
        `https://mltp-api.churchofjesuschrist.org/api/member/${uuid}/card`,
        { credentials: "include" },
      );
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.warn(
        `LCR Tools: Failed to fetch card data for member ${uuid}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Processes a list of items in parallel batches
   * @param {Array} items - Items to process
   * @param {number} batchSize - Number of items per batch
   * @param {Function} taskFn - Async function to run for each item
   * @param {Function} [onBatchProgress] - Optional callback for progress updates
   * @returns {Promise<void>}
   */
  async function processInBatches(items, batchSize, taskFn, onBatchProgress) {
    for (let i = 0; i < items.length; i += batchSize) {
      if (uiUtils.isAborted()) break;

      const batch = items.slice(i, i + batchSize);

      if (onBatchProgress) {
        onBatchProgress(i, Math.min(i + batchSize, items.length), items.length);
      }

      await Promise.all(batch.map(taskFn));

      // Small delay between batches to be nice to the server
      await utils.sleep(100);
    }
  }

  /**
   * Extracts the member UUID and name components from a directory table row
   * @param {HTMLTableRowElement} row - The table row
   * @returns {Object|null} - { memberId, firstName, lastName, fullName, directoryName, originalName }
   */
  function getMemberInfoFromRow(row) {
    const nameButton = row.querySelector("button.member-card__styled-ghost");
    if (!nameButton) return null;

    let memberId = row.id;
    if (!memberId || memberId === "") {
      const href = nameButton.getAttribute("href") || "";
      const uuidMatch = href.match(/member-profile\/([a-f0-9-]+)/);
      if (uuidMatch) {
        memberId = uuidMatch[1];
      } else {
        return null;
      }
    }

    const directoryNameWithAge = nameButton.textContent.trim();
    const directoryName = directoryNameWithAge.replace(/\s*\(\d+\)$/, "");

    // Parse name parts
    let lastName = "";
    let firstName = "";
    const commaIdx = directoryName.indexOf(",");
    if (commaIdx !== -1) {
      lastName = directoryName.substring(0, commaIdx).trim();
      firstName = directoryName.substring(commaIdx + 1).trim();
    } else {
      // Fallback if no comma
      const parts = directoryName.split(" ").filter((p) => p);
      if (parts.length > 1) {
        lastName = parts.pop();
        firstName = parts.join(" ");
      } else {
        lastName = directoryName;
      }
    }

    return {
      memberId,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      directoryName,
      originalName: directoryNameWithAge,
    };
  }

  window.lcrApiUtils = {
    fetchMemberCard,
    processInBatches,
    getMemberInfoFromRow,
  };
})();
