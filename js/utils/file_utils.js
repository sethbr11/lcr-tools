/**
 * Downloads content as a file
 * @param {string} content - Content to download
 * @param {string} filename - Name of the file
 * @param {string} contentType - MIME type of the content
 */
function downloadFile(content, filename, contentType) {
  // Create a Blob object with the CSV content and specify the MIME type
  const blob = new Blob([content], { type: contentType });

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
}

/**
 * Generates a descriptive filename from the current URL's path
 * @param {string} extension - File extension (without dot), defaults to 'csv'
 * @returns {string} - Generated filename
 */
function generateFilenameFromUrl(extension = "csv") {
  const path = window.location.pathname;
  const segments = path.split("/").filter(Boolean);

  // If no suitable segment is found, default to a standard filename
  if (segments.length === 0) return `lcr_report.${extension}`;

  // Find the longest segment and assign that as the new file name
  const longestSegment = segments.reduce((a, b) =>
    a.length > b.length ? a : b
  );

  // Format the url segment and return
  return `${longestSegment.replace(/-/g, "_")}.${extension}`;
}

window.fileUtils = {
  downloadFile,
  generateFilenameFromUrl,
};
