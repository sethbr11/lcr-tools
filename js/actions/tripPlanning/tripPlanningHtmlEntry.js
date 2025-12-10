// Logic for the trip planning page
// This file now acts as the main controller, relying on modular files for specific logic.

window.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(
    ["tripPlanningData", "tripPlanningHeaders"],
    (data) => {
      const incoming = data.tripPlanningData;
      if (incoming) {
        // Support both legacy array payloads and new structured shape
        const rows = Array.isArray(incoming)
          ? incoming
          : incoming.rows || incoming.records || [];

        const storedHeaders = data.tripPlanningHeaders || incoming.headers;
        if (Array.isArray(storedHeaders)) {
          originalHeaders = [...storedHeaders];
        } else if (rows.length && rows[0].columns) {
          originalHeaders = Object.keys(rows[0].columns);
        }

        records = rows; // Use the injected data as initial records
        initializePage();
        document.getElementById("geocodeBtn").disabled = false;
        tripUtils.log(`Loaded ${records.length} records from LCR page.`);
        tripUtils.updateStats();
      } else {
        document.body.innerHTML =
          "<h1>No data found. Please start from the LCR page.</h1>";
      }
    }
  );
});

function initializePage() {
  tripMap.initMap();

  // Attach event listeners for dynamically added elements
  document.getElementById("geocodeBtn").onclick = tripGeocoding.geocodeRecords;
  document.getElementById("clusterBtn").onclick =
    tripClustering.clusterAddresses;
  document.getElementById("optimizeBtn").onclick = tripRouting.optimizeRoutes;
  document.getElementById("exportCsvBtn").onclick = tripExport.exportCsv;
  // document.getElementById("exportPdfBtn").onclick = tripExport.exportPdf;

  document.querySelectorAll('input[name="clusterStrategy"]').forEach((elem) => {
    elem.addEventListener("change", (e) => {
      if (e.target.value === "byCount") {
        document.getElementById("byCountControls").style.display = "block";
        document.getElementById("bySizeControls").style.display = "none";
      } else {
        document.getElementById("byCountControls").style.display = "none";
        document.getElementById("bySizeControls").style.display = "block";
      }
    });
  });

  // Accordion Logic
  const accordionItems = document.querySelectorAll(".accordion-item");
  accordionItems.forEach((item) => {
    const header = item.querySelector(".accordion-header");
    header.addEventListener("click", () => {
      // If already active, do nothing (or toggle if you want to allow closing all)
      if (item.classList.contains("active")) return;

      // Close all others
      accordionItems.forEach((i) => {
        i.classList.remove("active");
        const icon = i.querySelector(".accordion-icon");
        if (icon) icon.textContent = "▶";
      });

      // Open clicked
      item.classList.add("active");
      const icon = item.querySelector(".accordion-icon");
      if (icon) icon.textContent = "▼";
    });
  });

  // Log Toggle Logic
  const logHeader = document.getElementById("logHeader");
  const logContainer = document.getElementById("logContainer");
  if (logHeader && logContainer) {
    logHeader.addEventListener("click", () => {
      logContainer.classList.toggle("collapsed");
    });
  }

  // Conditional API Key and Mapbox Road Network enablement
  const geocodeProviderSelect = document.getElementById("geocodeProvider");
  const apiKeyRow = document.getElementById("apiKeyRow");
  const metricMapboxRadio = document.getElementById("metricMapbox");

  const toggleApiSettings = () => {
    const selectedProvider = geocodeProviderSelect.value;
    if (selectedProvider === "nominatim") {
      apiKeyRow.style.display = "none";
      metricMapboxRadio.disabled = true;
      metricMapboxRadio.title =
        "Select Mapbox as geocoding provider to enable Road Network routing.";
      if (metricMapboxRadio.checked) {
        document.querySelector(
          'input[name="distanceMetric"][value="straight"]'
        ).checked = true;
      }
    } else {
      apiKeyRow.style.display = "flex";
      metricMapboxRadio.disabled = false;
      metricMapboxRadio.title = "";
    }
  };

  geocodeProviderSelect.addEventListener("change", toggleApiSettings);
  toggleApiSettings(); // Set initial state
}
