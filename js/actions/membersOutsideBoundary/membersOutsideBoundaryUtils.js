(() => {
  utils.returnIfLoaded("membersOutsideBoundaryUtils");

  const templates = window.membersOutsideBoundaryTemplates || {};

  /**
   * Prompts the user to start the audit by reloading the page.
   */
  async function triggerAudit() {
    // Prevent double-triggering on reload
    if (sessionStorage.getItem("LCR_AUDIT_PENDING")) {
      console.log("⚠️ Audit is already in progress. Skipping trigger.");
      return;
    }

    // Check if we already have uiUtils available to show a nicer confirmation
    let proceed = false;
    if (window.uiUtils) {
      proceed = await uiUtils.showConfirmationModal(
        "To capture the most recent member data, the page needs to reload. Proceed?",
        { confirmText: "Reload & Audit", cancelText: "Cancel" },
      );
    } else {
      proceed = confirm(
        "To capture the most recent member data, the page needs to reload.\n\nProceed?",
      );
    }

    if (proceed) {
      sessionStorage.setItem("LCR_AUDIT_PENDING", "true");
      window.location.reload();
    }
  }

  /**
   * Initializes the audit process if pending.
   */
  function init() {
    const isAuditPending = sessionStorage.getItem("LCR_AUDIT_PENDING");

    if (!isAuditPending) {
      console.log("🕵️ LCR Tools: membersOutsideBoundaryUtils ready.");
      return;
    }

    console.log("🕵️ LCR Tools: Waking up for Audit...");

    // Start the interception and audit process
    setupNetworkInterceptor();
  }

  let capturedMembers = [];
  let capturedUnitId = null;

  function setupNetworkInterceptor() {
    // Show loading indicator early if possible, but wait for DOM
    if (window.uiUtils) {
      if (document.body) {
        uiUtils.showLoadingIndicator(
          "Waiting for map data...",
          "Please wait while we capture member locations",
        );
      } else {
        window.addEventListener("DOMContentLoaded", () => {
          uiUtils.showLoadingIndicator(
            "Waiting for map data...",
            "Please wait while we capture member locations",
          );
        });
      }
    }

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [resource] = args;
      const url = resource && resource.url ? resource.url : resource;

      if (
        typeof url === "string" &&
        (url.includes("member-list") || url.includes("households"))
      ) {
        try {
          const response = await originalFetch(...args);
          const clone = response.clone();
          clone
            .json()
            .then((data) => {
              const list = Array.isArray(data) ? data : data.households || [];
              if (list.length > 0) {
                capturedMembers = list;
                console.log(`✅ Captured ${list.length} households.`);

                // Try to find Unit ID in metadata
                if (data.unit && data.unit.unitNo)
                  capturedUnitId = data.unit.unitNo;

                // Once we have data, wait for map service then run audit
                waitForMapAndRun();
              }
            })
            .catch(() => {});
          return response;
        } catch (e) {}
      }
      return originalFetch(...args);
    };
  }

  function waitForMapAndRun() {
    if (window.uiUtils) {
      if (document.body) {
        uiUtils.showLoadingIndicator(
          "Processing boundary data...",
          "Analyzing locations against ward boundaries",
        );
      } else {
        window.addEventListener("DOMContentLoaded", () => {
          uiUtils.showLoadingIndicator(
            "Processing boundary data...",
            "Analyzing locations against ward boundaries",
          );
        });
      }
    }
    const check = setInterval(() => {
      if (window.MapsService && capturedMembers.length > 0) {
        clearInterval(check);
        runAuditLogic();
      }
    }, 500);
  }

  async function runAuditLogic() {
    try {
      // Clean up the flag so we don't loop forever
      sessionStorage.removeItem("LCR_AUDIT_PENDING");

      console.log("⚡ Starting Analysis...");

      // Get Unit ID (Fallback to URL if not in JSON)
      if (!capturedUnitId) {
        const match = window.location.pathname.match(/(\d{5,})/);
        capturedUnitId = match ? match[1] : prompt("Enter Unit ID:");
      }

      // Get Ward Metadata & Boundary
      const meta = await window.MapsService.getLocation(capturedUnitId);
      const FULL_ID = `${meta.type}:${capturedUnitId}`;
      const rawExtent = await window.MapsService.getLocationExtent(FULL_ID);
      const extent = parseExtent(rawExtent);

      // Calculate Aspect Ratio
      const rad = (d) => (d * Math.PI) / 180;
      const mercY = (lat) =>
        (1 - Math.log(Math.tan(rad(lat)) + 1 / Math.cos(rad(lat))) / Math.PI) /
        2;
      const mercX = (lon) => (lon + 180) / 360;

      const top = mercY(extent.north);
      const bottom = mercY(extent.south);
      const left = mercX(extent.west);
      const right = mercX(extent.east);

      const geoHeight = Math.abs(bottom - top);
      const geoWidth = Math.abs(right - left);
      const ratio = geoWidth / geoHeight;

      const MAX_SIZE = 2000;
      let imgWidth = MAX_SIZE,
        imgHeight = MAX_SIZE;
      if (geoWidth > geoHeight) imgHeight = Math.round(MAX_SIZE / ratio);
      else imgWidth = Math.round(MAX_SIZE * ratio);

      // Fetch Image
      const blobUrl = await window.MapsService.getLocationsOverlay(rawExtent, {
        size: { width: imgWidth, height: imgHeight },
        zoom: 15,
        layers: meta.type,
        ids: FULL_ID,
        styles: [{ type: "POLYGON", fill: "black", stroke: "black" }],
      });

      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = blobUrl;
      await new Promise((r) => (img.onload = r));

      const canvas = document.createElement("canvas");
      canvas.width = imgWidth;
      canvas.height = imgHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

      // Check Members
      const results = [];
      capturedMembers.forEach((m) => {
        const lat = m.latitude || m.coordinates?.latitude;
        const lng = m.longitude || m.coordinates?.longitude;
        const name = m.name || m.householdName || "Unknown";
        const address = m.address?.street1 || m.address || "";

        if (!lat || !lng) {
          results.push({
            name,
            status: "Unknown",
            reason: "No Coordinates",
            address,
            lat: "",
            lng: "",
          });
          return;
        }

        const pctX = (mercX(lng) - left) / (right - left);
        const pctY = (mercY(lat) - top) / (bottom - top);
        const pixelX = Math.floor(pctX * imgWidth);
        const pixelY = Math.floor(pctY * imgHeight);

        if (
          pixelX < 0 ||
          pixelX >= imgWidth ||
          pixelY < 0 ||
          pixelY >= imgHeight
        ) {
          results.push({
            name,
            status: "Outside",
            reason: "Outside Map View",
            address,
            lat,
            lng,
          });
          return;
        }

        const pixel = ctx.getImageData(pixelX, pixelY, 1, 1).data;
        if (pixel[3] > 50) {
          results.push({
            name,
            status: "Inside",
            reason: "",
            address,
            lat,
            lng,
          });
        } else {
          results.push({
            name,
            status: "Outside",
            reason: "Outside Boundary",
            address,
            lat,
            lng,
          });
        }
      });

      if (window.uiUtils) uiUtils.hideLoadingIndicator();
      displayResults(results);
    } catch (e) {
      console.error("Audit Error:", e);
      if (window.uiUtils) uiUtils.hideLoadingIndicator();
      alert("An error occurred during the audit. Please check the console.");
      sessionStorage.removeItem("LCR_AUDIT_PENDING"); // Safety cleanup
    }
  }

  function displayResults(results) {
    if (!window.modalUtils) {
      alert("ModalUtils not loaded. Check console for results.");
      console.table(results);
      return;
    }

    const insideCount = results.filter((r) => r.status === "Inside").length;
    const outsideCount = results.filter((r) => r.status === "Outside").length;

    const content = utils.replaceTemplate(templates.resultsModalStructure, {
      insideCount,
      outsideCount,
      totalHouseholds: results.length,
      memberListHTML: renderListHTML(results),
    });

    modalUtils.createStandardModal({
      id: "boundary-audit-modal",
      title: "Boundary Check Results",
      content: content,
      modalOptions: { maxWidth: "800px" },
    });

    // Event Listeners
    setTimeout(() => {
      const radios = document.querySelectorAll('input[name="view-filter"]');
      radios.forEach((radio) => {
        radio.addEventListener("change", (e) => {
          const filter = e.target.value;
          const container = document.getElementById("member-list-container");
          if (container) {
            container.innerHTML = renderListHTML(results, filter);
          }
        });
      });

      const dlBtn = document.getElementById("download-csv-btn");
      if (dlBtn) {
        dlBtn.addEventListener("click", () => {
          exportCsv(results);
        });
      }
    }, 100);
  }

  function renderListHTML(results, filter = "all") {
    const filtered = results.filter(
      (r) => filter === "all" || r.status.toLowerCase() === filter,
    );

    if (filtered.length === 0) {
      return utils.replaceTemplate(templates.emptyState, { filter });
    }

    return filtered
      .map((r) => {
        const isOutside = r.status === "Outside";
        return utils.replaceTemplate(templates.listItem, {
          backgroundColor: isOutside ? "#fff5f5" : "#fff",
          name: r.name,
          address: r.address || "No Address",
          reasonBadge: r.reason
            ? utils.replaceTemplate(templates.reasonBadge, { reason: r.reason })
            : "",
          statusColor: isOutside ? "#721c24" : "#155724",
          statusBackground: isOutside ? "#f8d7da" : "#d4edda",
          status: r.status,
        });
      })
      .join("");
  }

  function exportCsv(results) {
    if (!window.fileUtils) {
      alert("FileUtils not loaded.");
      return;
    }

    const headers = [
      "Name",
      "Status",
      "Reason",
      "Address",
      "Latitude",
      "Longitude",
    ];
    const rows = results.map((r) => [
      r.name,
      r.status,
      r.reason || "",
      r.address,
      r.lat,
      r.lng,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => window.fileUtils.formatCsvCell(cell)).join(","),
      ),
    ].join("\n");

    window.fileUtils.downloadCsv(csvContent, "boundary_audit_results.csv");
  }

  function parseExtent(extent) {
    try {
      if (extent.getNorthEast) {
        const ne = extent.getNorthEast(),
          sw = extent.getSouthWest();
        return {
          north: ne.lat(),
          south: sw.lat(),
          east: ne.lng(),
          west: sw.lng(),
        };
      }
      let latObj = null,
        lngObj = null;
      for (const key in extent) {
        const val = extent[key];
        if (val && typeof val === "object" && "lo" in val) {
          if (val.lo > 0) latObj = val;
          if (val.lo < 0) lngObj = val;
        }
      }
      return {
        north: latObj.hi,
        south: latObj.lo,
        east: lngObj.hi,
        west: lngObj.lo,
      };
    } catch (e) {
      return null;
    }
  }

  // Export
  window.membersOutsideBoundaryUtils = {
    triggerAudit,
    init,
  };

  // Run init immediately to catch the reload state
  init();
})();
