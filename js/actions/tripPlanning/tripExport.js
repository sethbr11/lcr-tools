(() => {
  function exportCsv() {
    let successData = [];
    const metric = document.querySelector(
      'input[name="distanceMetric"]:checked'
    ).value;
    const unit = metric === "mapbox" ? "minutes" : "miles"; // Unit now "miles" for straight line

    if (optimized.length > 0) {
      tripUtils.log("📦 Preparing optimized data for export...");
      optimized.forEach((route) => {
        const routeDistance = route.distance.toFixed(2);
        route.points.forEach((p, index) => {
          successData.push({
            Name: p.name || "",
            "Street Address": p.address || "",
            Latitude: p.lat,
            Longitude: p.lon,
            Cluster: parseInt(route.cluster, 10) + 1,
            RouteOrder: index + 1,
          });
        });
      });
    } else if (clustered.length > 0) {
      tripUtils.log("📦 Preparing clustered data for export...");
      clustered.sort((a, b) => {
        if (a.cluster < b.cluster) return -1;
        if (a.cluster > b.cluster) return 1;
        return (a.name || "").localeCompare(b.name || "");
      });

      successData = clustered.map((r) => ({
        Name: r.name || "",
        "Street Address": r.address || "",
        Latitude: r.lat,
        Longitude: r.lon,
        Cluster: r.cluster === -1 ? "Outlier" : r.cluster + 1,
      }));
    } else if (geocoded.length > 0) {
      tripUtils.log("📦 Preparing geocoded data for export...");
      successData = geocoded.map((r) => ({
        Name: r.name || "",
        "Street Address": r.address || "",
        Latitude: r.lat,
        Longitude: r.lon,
        Cluster: "N/A",
      }));
    }

    const failureData = failedGeocodes.map((f) => ({
      Name: f.Name,
      "Street Address": f.Address || "",
      Latitude: "",
      Longitude: "",
      Cluster: "Failed",
      FailureReason: f.Reason,
    }));

    const combined = successData.concat(failureData);
    const csv = Papa.unparse(combined);

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = "route_report.csv";
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);

    tripUtils.log("📄 CSV downloaded successfully");
  }

  async function exportPdf() {
    tripUtils.log("📑 Generating PDF report (this may take a moment)...");
    const exportButton = document.getElementById("exportPdfBtn");
    exportButton.disabled = true;
    exportButton.textContent = "Generating...";

    // Hide map controls (zoom buttons, etc.) for the capture
    const mapControls = document.querySelector(".leaflet-control-container");
    if (mapControls) mapControls.style.display = "none";

    // Dynamic offset calculation
    // Leaflet uses CSS transforms on the .leaflet-map-pane to move the map.
    // html2canvas sometimes struggles with these transforms or nested contexts.
    // We calculate the visual offset of the map pane relative to the map container
    // and manually apply it to the overlay layers to ensure they are captured in the correct position.

    // html2canvas has issues with CSS transforms. Instead of manipulating the live DOM,
    // we'll use the onclone callback to fix positioning in the cloned DOM
    const getHtml2CanvasOptions = () => {
      return {
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          const clonedMapPane = clonedDoc.querySelector('.leaflet-map-pane');
          if (!clonedMapPane) return;
          
          // Get the transform value
          const transform = window.getComputedStyle(clonedMapPane).transform;
          let translateX = 0;
          let translateY = 0;
          
          if (transform && transform !== 'none') {
            const matrix = transform.match(/matrix.*?\((.+?)\)/);
            if (matrix) {
              const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
              // For matrix, translation is in indices 4 and 5
              // For matrix3d, translation is in indices 12 and 13
              if (values.length === 6) {
                translateX = values[4] || 0;
                translateY = values[5] || 0;
              } else if (values.length === 16) {
                translateX = values[12] || 0;
                translateY = values[13] || 0;
              }
            }
          }
          
          // Remove transform and apply translation to child panes
          clonedMapPane.style.transform = 'none';
          clonedMapPane.style.left = '0px';
          clonedMapPane.style.top = '0px';
          
          const allPanes = clonedMapPane.querySelectorAll('.leaflet-pane');
          allPanes.forEach((pane) => {
            const currentLeft = parseFloat(pane.style.left) || 0;
            const currentTop = parseFloat(pane.style.top) || 0;
            pane.style.left = `${currentLeft + translateX}px`;
            pane.style.top = `${currentTop + translateY}px`;
          });
        }
      };
    };

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF("p", "mm", "a4");
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;

      // ===== PAGE 1: OVERVIEW =====
      doc.setFontSize(24);
      doc.text("Address Clustering & Route Report", pageW / 2, 20, {
        align: "center",
      });
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageW / 2, 28, {
        align: "center",
      });
      doc.setTextColor(0);

      doc.setFontSize(14);
      doc.text("Summary Statistics", margin, 45);
      doc.setLineWidth(0.5);
      doc.line(margin, 47, pageW - margin, 47);

      const metric = document.querySelector(
        'input[name="distanceMetric"]:checked'
      ).value;
      const unit = "miles";
      let summaryY = 55;
      const summaryText = [
        `Total Records: ${records.length}`,
        `Successfully Geocoded: ${geocoded.length}`,
        `Failed Geocoding: ${failedGeocodes.length}`,
        `Clusters Found: ${
          optimized.length > 0 ? optimized.length : "N/A"
        }`,
        `Total Route Distance: ${
          optimized.length > 0
            ? optimized
                .reduce((sum, r) => sum + (r.displayDistance || 0), 0)
                .toFixed(2) + ` ${unit}`
            : "N/A"
        }`,
      ];
      doc.setFontSize(12);
      summaryText.forEach((txt) => {
        doc.text(txt, margin, summaryY);
        summaryY += 7;
      });

      // --- Full Map Overview ---
      doc.setFontSize(14);
      doc.text("Complete Route Overview Map", margin, summaryY + 15);
      doc.setLineWidth(0.5);
      doc.line(margin, summaryY + 17, pageW - margin, summaryY + 17);

      // Redraw map with all routes for the main overview image
      tripMap.drawMarkers(clustered, true);
      tripMap.drawRoutes(optimized);

      const mapEl = document.getElementById("map");

      await tripUtils.sleep(200); // Allow render

      // Capture with onclone callback to fix transforms
      const overviewCanvas = await html2canvas(mapEl, getHtml2CanvasOptions());
      const overviewImgData = overviewCanvas.toDataURL("image/png");

      const mapY = summaryY + 22;
      const mapHeight = 100;

      // Draw border for map
      doc.setDrawColor(200);
      doc.rect(margin - 1, mapY - 1, pageW - margin * 2 + 2, mapHeight + 2);

      doc.addImage(
        overviewImgData,
        "PNG",
        margin,
        mapY,
        pageW - margin * 2,
        mapHeight
      );

      // ===== SUBSEQUENT PAGES: PER CLUSTER =====
      for (const route of optimized) {
        doc.addPage();
        const clusterName = `Cluster ${parseInt(route.cluster, 10) + 1}`;
        doc.setFontSize(18);
        doc.text(`${clusterName} Details`, pageW / 2, 20, {
          align: "center",
        });

        // --- Staging and Capturing the Map ---
        tripUtils.log(`   - Capturing map for ${clusterName}...`);
        tripMap.getRouteLayer().clearLayers();
        tripMap.drawNumberedMarkers(route.points);
        tripMap.recenterToPoints(route.points);
        const routeLine = L.polyline(
          route.points.map((p) => [p.lat, p.lon]),
          {
            color: tripMap.CLUSTER_COLORS[route.cluster % tripMap.CLUSTER_COLORS.length],
            weight: 3,
          }
        );
        tripMap.getRouteLayer().addLayer(routeLine);

        await tripUtils.sleep(500); // Give map time to re-render

        await tripUtils.sleep(200);

        const clusterCanvas = await html2canvas(mapEl, getHtml2CanvasOptions());
        const clusterImgData = clusterCanvas.toDataURL("image/png");

        const clusterMapY = 30;
        const clusterMapHeight = 100;

        // Draw border for map
        doc.setDrawColor(200);
        doc.rect(
          margin - 1,
          clusterMapY - 1,
          pageW - margin * 2 + 2,
          clusterMapHeight + 2
        );

        doc.addImage(
          clusterImgData,
          "PNG",
          margin,
          clusterMapY,
          pageW - margin * 2,
          clusterMapHeight
        );

        // --- Address List ---
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Visiting Order", margin, 145);
        doc.setLineWidth(0.2);
        doc.setDrawColor(0);
        doc.line(margin, 147, pageW - margin, 147);

        let currentY = 155;
        doc.setFontSize(11);

        route.points.forEach((p, index) => {
          if (currentY + 8 > pageH - margin) {
            doc.addPage();
            currentY = margin + 10;
          }
          // Indent address slightly
          doc.text(`${index + 1}.`, margin, currentY);
          doc.text(`${p.name}, ${p.address}`, margin + 10, currentY);
          currentY += 7;
        });
      }

      doc.save("route_report.pdf");
      tripUtils.log("✅ PDF generated successfully.");
    } catch (err) {
      console.error(err);
      tripUtils.log("❌ Error generating PDF. See console.");
    } finally {
      exportButton.disabled = false;
      exportButton.textContent = "Export PDF Report";
      if (mapControls) mapControls.style.display = "";
      // Restore map state
      tripMap.getMarkerLayer().clearLayers();
      tripMap.drawRoutes(optimized);
    }
  }

  // Expose for testing and module usage
  window.tripExport = {
    exportCsv,
    exportPdf,
  };
})();
