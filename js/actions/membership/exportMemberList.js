(async function () {
  if (
    typeof showLoadingIndicator !== "function" ||
    typeof hideLoadingIndicator !== "function"
  ) {
    console.error("LCR Tools: Loading indicator functions are not available.");
    alert("LCR Tools: Essential UI functions are missing. Cannot proceed.");
    return;
  }

  showLoadingIndicator("Starting process...");

  try {
    // --- Wait for scrolling to complete ---
    await new Promise((resolve, reject) => {
      showLoadingIndicator("Scrolling page to load all content...");
      const scrollInterval = setInterval(() => {
        const currentScroll = window.scrollY;
        const maxScroll = document.body.scrollHeight - window.innerHeight;

        if (currentScroll >= maxScroll - 10) {
          // Added a small buffer
          clearInterval(scrollInterval);
          console.log("Page scrolled to bottom.");
          resolve();
        } else {
          window.scrollBy(0, 300);
        }
      }, 75); // Adjusted interval slightly
    });

    // --- Wait briefly and scroll to top ---
    showLoadingIndicator("Finalizing content loading & returning to top...");
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Wait for dynamic content

    console.log("Page fully loaded, navigating back to the top...");
    window.scrollTo({ top: 0, behavior: "smooth" });

    await new Promise((resolve) => setTimeout(resolve, 1500)); // Wait for scroll to top

    // --- Trigger CSV Export ---
    showLoadingIndicator("Exporting data to CSV...");
    console.log("Back at the top, starting CSV export...");
    tableToCSV();
  } catch (error) {
    console.error("Error during the process:", error);
    alert("An error occurred. Please check the console for details.");
  } finally {
    hideLoadingIndicator();
  }
})();

// Your tableToCSV function (ensure it's defined in the same scope or globally accessible)
function tableToCSV() {
  const headers = document.querySelectorAll("thead th");
  const headerRow = Array.from(headers)
    .filter((header) => header.innerText.trim() !== "")
    .map((header) => `"${header.innerText.replace(/"/g, '""')}"`)
    .join(",");

  const rows = document.querySelectorAll("tbody tr");
  const bodyRows = Array.from(rows)
    .map((row) =>
      Array.from(row.cells)
        .filter((cell) => cell.innerText.trim() !== "")
        .map((cell) => `"${cell.innerText.replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const csv = [headerRow, bodyRows].filter(Boolean).join("\n");

  if (!csv || (headerRow.length === 0 && bodyRows.length === 0)) {
    // Check if both are effectively empty
    alert("No data found to export.");
    console.error("No data found to export.");
    // Even if no data, we should proceed to hide the indicator in the finally block.
    return;
  }

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "membership_directory.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url); // Clean up
  console.log("CSV download triggered successfully.");
}
