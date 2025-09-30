/**
 * Utility file specifically for the downloadReportData action.
 * Handles the processing and downloading of report data from tables on LCR pages,
 * including support for pagination, scrolling, and generating CSV or ZIP files.
 * Integrates with other utilities like navigationUtils, tableUtils, and fileUtils
 * to collect data across multiple pages and export it efficiently.
 */
(() => {
  utils.returnIfLoaded("downloadUtils");
  utils.ensureLoaded("fileUtils", "navigationUtils", "tableUtils", "uiUtils");

  /**
   * Processes tables and downloads CSV/ZIP files
   * @param {Object} options - Configuration options
   * @param {Array} options.selectedTables - Tables to process
   * @param {string[]} options.navNeeds - Navigation needs
   * @param {Function} options.onAbort - Callback for abort handling
   */
  async function downloadReportData(options = {}) {
    const { selectedTables, navNeeds, onAbort } = options;

    const csvFiles = [];
    for (const table of selectedTables) {
      let combinedCsvRows = [];
      let hasHeaders = false;

      await navigationUtils.collectDataWithNavigation({
        needs: navNeeds,
        onPageData: async () => {
          let params = [table.id, table.label, table.type, ""];
          if (selectedTables.length > 1) {
            const sanitizedLabel = table.label
              .replace(/\s+/g, "_")
              .toLowerCase();
            params = [
              table.id,
              table.label,
              table.type,
              `${sanitizedLabel}.csv`,
            ];
          }
          const result = tableUtils.tableToCSV(...params);
          if (!result) return null;

          const rows = result.csvContent.split("\r\n");
          if (!hasHeaders) {
            combinedCsvRows.push(...rows);
            hasHeaders = true;
          } else {
            combinedCsvRows.push(...rows.slice(1));
          }
          return rows;
        },
      });

      if (combinedCsvRows.length > 0) {
        const combinedCsvContent = combinedCsvRows.join("\r\n");
        const filename =
          selectedTables.length > 1
            ? `${table.label.replace(/\s+/g, "_").toLowerCase()}.csv`
            : fileUtils.generateFilename(
                "csv",
                table.label ? table.label.replace(/\s+/g, "_") : ""
              );
        csvFiles.push({ csvContent: combinedCsvContent, filename });
      }

      if (onAbort && onAbort()) break;
    }

    if (onAbort && onAbort()) return;

    if (csvFiles.length === 1) {
      fileUtils.downloadCsv(csvFiles[0].csvContent, csvFiles[0].filename);
    } else if (csvFiles.length > 1) {
      const zipFilename = fileUtils.generateFilename("zip");
      await fileUtils.downloadCsvZip(csvFiles, zipFilename);
    } else {
      alert("Unable to extract table data from the page.");
    }

    uiUtils.hideLoadingIndicator();
  }

  window.downloadUtils = {
    downloadReportData,
  };
})();
