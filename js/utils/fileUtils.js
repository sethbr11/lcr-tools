/**
 * Utility file for handling file downloads and formatting in the LCR extension.
 * Supports downloading CSV files, ZIP archives of multiple CSVs, and generating
 * descriptive filenames based on page content. Ensures proper CSV formatting
 * for data integrity.
 */
(() => {
  utils.returnIfLoaded("fileUtils");

  /**
   * Downloads content as a file
   * @param {string|Blob} content - Content to download
   * @param {string} filename - Name of the file
   * @param {string} contentType - MIME type of the content
   * @param {boolean} showNotification - Whether to show a success toast (default: true)
   */
  function downloadFile(content, filename, contentType, showNotification = true) {
    // Create a Blob object with the CSV content and specify the MIME type
    const blob =
      content instanceof Blob
        ? content
        : new Blob([content], { type: contentType });

    // Generate a temporary URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element for triggering the download
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    // Append the anchor to the document, trigger the click, and remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke the temporary URL to free up resources
    URL.revokeObjectURL(url);
    console.log(`LCR Tools: File download initiated as ${filename}.`);

    // Show success toast notification if uiUtils is available and not disabled
    if (showNotification && utils.checkIfLoaded("uiUtils")) {
      uiUtils.showToast(`Downloaded: ${filename}`, {
        type: "success",
        duration: 3000,
      });
    }
  }

  /**
   * Downloads CSV content as a file
   * @param {string} csvContent - The CSV content to download
   * @param {string} filename - The filename for the download
   * @param {boolean} showNotification - Whether to show a success toast (default: true)
   */
  function downloadCsv(csvContent, filename, showNotification = true) {
    downloadFile(csvContent, filename, "text/csv;charset=utf-8;", showNotification);
  }

  /**
   * Downloads multiple CSV files as a zip file
   * @param {Array<{filename: string, csvContent: string}>} files - Array of file objects
   * @param {string} zipName - Name of the ZIP file
   * @param {boolean} showNotification - Whether to show a success toast (default: true)
   */
  async function downloadCsvZip(files, zipName = "lcr_reports.zip", showNotification = true) {
    if (!Array.isArray(files) || files.length === 0) {
      alert("No files to zip.");
      return;
    }
    utils.ensureLoaded("JSZip");
    const zip = new JSZip();
    // Ensure each file has a unique filename in the zip
    const usedNames = new Set();
    for (const file of files) {
      let name = file.filename || "file.csv";
      let base = name,
        counter = 2;
      while (usedNames.has(name)) {
        // Add a numeric suffix if duplicate
        const dot = base.lastIndexOf(".");
        if (dot !== -1) {
          name = base.slice(0, dot) + `_${counter}` + base.slice(dot);
        } else {
          name = base + `_${counter}`;
        }
        counter++;
      }
      usedNames.add(name);
      zip.file(name, file.csvContent);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    downloadFile(blob, zipName, "application/zip", showNotification);
  }

  /**
   * Generates a descriptive filename
   * @param {string} extension - File extension (without dot), defaults to 'csv'
   * @param {string} suffixString - Any text to append at the end of the filename
   * @returns {string} - Generated filename
   */
  function generateFilename(extension = "csv", suffixString = "") {
    // Form the suffix string first
    let suffix = "";
    if (suffixString && suffixString.length > 0) {
      let cleanSuffix = suffixString.toLowerCase().replace(/\s+/g, "_");
      // Filter out unwanted words like "print"
      const unwantedWords = ["print"];
      const parts = cleanSuffix
        .split("_")
        .filter((part) => !unwantedWords.includes(part));
      cleanSuffix = parts.join("_");
      suffix = cleanSuffix
        ? cleanSuffix[0] === "_"
          ? cleanSuffix
          : "_" + cleanSuffix
        : "";
    }

    // Check for custom report title first
    const isCustomReport = window.location.pathname.includes('custom-reports-details');
    let base = "";

    if (isCustomReport) {
      // Custom reports have a unique structure with the title
      // Try multiple selectors to find the report title
      let customReportTitle =
        document.querySelector('svg[aria-label*="Edit Report enter a report title"]')?.closest('div')?.previousElementSibling ||
        document.querySelector('.sc-8dc704eb-74') ||
        document.querySelector('.sc-8dc704eb-70 span');

      if (customReportTitle && customReportTitle.textContent.trim()) {
        base = customReportTitle.textContent.trim().replace(/\s+/g, "_").toLowerCase();
      }

      // For custom reports, ignore the suffix to avoid duplication
      if (base) {
        suffix = "";
      }
    }

    // Check for page title (updated selector to handle h1 or h2 structures)
    if (!base) {
      const pageTitle = document.querySelector(
        "h1.pageTitle #pageTitleText, h2.pageTitle .ng-binding"
      );
      if (pageTitle && pageTitle.textContent.trim()) {
        base = pageTitle.textContent.trim().replace(/\s+/g, "_").toLowerCase();
      }
    }

    // If no page title, fall back to URL segment
    if (!base) {
      const path = window.location.pathname;
      const segments = path.split("/").filter(Boolean);
      if (segments.length > 0) {
        const longestSegment = segments.reduce((a, b) =>
          a.length > b.length ? a : b
        );
        base = longestSegment.replace(/-/g, "_");
      }
    }

    // Safeguard: Remove any internal duplication in the base
    if (base) {
      const baseParts = base.split("_");
      const uniqueParts = [];
      for (const part of baseParts) {
        if (!uniqueParts.includes(part)) uniqueParts.push(part);
      }
      base = uniqueParts.join("_");
    }

    // If suffix is provided, check if suffix starts with base to avoid duplication
    if (suffix && base && suffix.slice(1).startsWith(base)) {
      return `${base}.${extension}`;
    }

    // If no base, default to lcr_report
    if (!base) return `lcr_report${suffix}.${extension}`;

    // Return the formatted filename
    return `${base}${suffix}.${extension}`;
  }

  /**
   * Formats a cell value for CSV output, handling quotes and commas
   * @param {string} text - The text to format
   * @returns {string} - Formatted CSV cell
   */
  function formatCsvCell(text) {
    // Trim whitespace and convert to string if not already
    let formattedText = String(text || "").trim();

    // Return empty string for truly empty content
    if (!formattedText) return "";

    // If text contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (
      formattedText.includes(",") ||
      formattedText.includes("\n") ||
      formattedText.includes('"')
    ) {
      formattedText = '"' + formattedText.replace(/"/g, '""') + '"';
    }

    return formattedText;
  }

  window.fileUtils = {
    downloadFile,
    downloadCsv,
    downloadCsvZip,
    generateFilename,
    formatCsvCell,
  };
})();
