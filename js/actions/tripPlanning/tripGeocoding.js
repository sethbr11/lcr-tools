(() => {
  async function geocodeAddressMulti(addr, provider, apiKey) {
    const cache = JSON.parse(localStorage.getItem("geocode_cache") || "{}");
    if (cache[addr]) return cache[addr];

    const { variants } = tripUtils.advancedNormalizeAddress(addr);
    for (const attempt of variants) {
      let url;
      if (provider === "nominatim") {
        url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          attempt
        )}&limit=1`;
      } else if (provider === "locationiq") {
        url = `https://us1.locationiq.com/v1/search.php?key=${apiKey}&q=${encodeURIComponent(
          attempt
        )}&format=json&limit=1`;
      } else if (provider === "mapbox") {
        url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          attempt
        )}.json?access_token=${apiKey}&limit=1`;
      } else {
        continue; // Unknown provider
      }
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "AddressClusterTool/1.0" },
        });
        const data = await res.json();
        let lat, lon;
        if (provider === "mapbox") {
          if (!data.features || data.features.length === 0) continue;
          lon = data.features[0].center[0];
          lat = data.features[0].center[1];
        } else {
          if (!Array.isArray(data) || data.length === 0) continue;
          lat = parseFloat(data[0].lat);
          lon = parseFloat(data[0].lon);
        }
        const result = { lat, lon, usedVariant: attempt || "original" };
        cache[addr] = result;
        localStorage.setItem("geocode_cache", JSON.stringify(cache));
        return result;
      } catch {
        continue;
      }
    }
    return null;
  }

  async function geocodeRecords() {
    const provider = document.getElementById("geocodeProvider").value;
    const apiKey = document.getElementById("apiKey").value.trim();
    if ((provider === "locationiq" || provider === "mapbox") && !apiKey) {
      alert("Please enter an API key for " + provider);
      return;
    }
    if (!records.length) {
      tripUtils.log("❌ No records loaded.");
      return;
    }

    tripUtils.log(`🌐 Starting geocoding with ${provider}...`);
    failedGeocodes = [];
    geocoded = [];
    document.getElementById("geocodeBtn").disabled = true;

    const progressContainer = document.getElementById(
      "geocodeProgressContainer"
    );
    const progressFill = document.getElementById("geocodeProgressFill");
    const progressPercent = document.getElementById(
      "geocodeProgressPercent"
    );
    progressContainer.style.display = "block";
    progressFill.style.width = "0%";
    progressPercent.textContent = "0%";

    let firstSuccess = false;
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const addr = row.address; // Use 'address' from our extracted data
      if (!addr) {
        failedGeocodes.push({
          Name: row.name || "(Unknown)",
          Address: addr,
          Reason: "No address",
        });
        continue;
      }
      tripUtils.log(`  ${i + 1}/${records.length}: ${addr}`);
      const geo = await geocodeAddressMulti(addr, provider, apiKey);

      if (geo) {
        geocoded.push({
          ...row,
          lat: geo.lat,
          lon: geo.lon,
        });
        if (!firstSuccess) {
          firstSuccess = true;
          tripMap.recenterToPoints([{ lat: geo.lat, lon: geo.lon }]);
        }
        tripUtils.log(
          `    ✓ [${geo.lat.toFixed(6)}, ${geo.lon.toFixed(6)}] via "${
            geo.usedVariant
          }"`
        );
      } else {
        const reason = classifyFailure(addr);
        failedGeocodes.push({
          Name: row.name || "(Unknown)",
          Address: addr,
          Reason: reason,
        });
        tripUtils.log(`    ✗ Failed (${reason})`);
      }

      const pct = Math.round(((i + 1) / records.length) * 100);
      progressFill.style.width = pct + "%";
      progressPercent.textContent = pct + "%";

      await tripUtils.sleep(provider === "nominatim" ? 1100 : 300);
    }

    // Summary of failures by reason
    if (failedGeocodes.length) {
      const summary = failedGeocodes.reduce((acc, f) => {
        acc[f.Reason] = (acc[f.Reason] || 0) + 1;
        return acc;
      }, {});
      tripUtils.log(
        `❗ Failure Summary: ${Object.entries(summary)
          .map(([r, c]) => `${r}: ${c}`)
          .join(" | ")}`
      );
    }

    tripUtils.log(
      `✅ Geocoding complete: ${geocoded.length}/${records.length} succeeded`
    );
    tripUtils.updateStats();
    tripMap.drawMarkers(geocoded);
    displayFailedGeocodes(); // New call
    document.getElementById("clusterBtn").disabled = geocoded.length === 0;
    document.getElementById("exportCsvBtn").disabled = false;
    document.getElementById("exportPdfBtn").disabled = false;
  }

  function classifyFailure(address) {
    if (!address || address.trim() === "") return "Empty";
    if (!/^\d+/.test(address.trim())) return "No leading number";
    if (/^\d+\s*$/.test(address.trim())) return "Incomplete street";
    const hasStateLike = /\b[A-Z]{2}\b/.test(address);
    if (!hasStateLike) return "Missing state";
    const zipPresent = /\b\d{5}(-\d{4})?\b/.test(address);
    const zipRatio =
      records.length > 0
        ? records.filter((r) =>
            /\b\d{5}(-\d{4})?\b/.test(r.address || "")
          ).length / records.length
        : 0;
    if (!zipPresent && zipRatio > 0.6) return "Missing zip";
    return "Not found";
  }

  function displayFailedGeocodes() {
    const container = document.getElementById("failureFixerContainer");
    const listEl = document.getElementById("failureList");
    listEl.innerHTML = "";

    if (failedGeocodes.length === 0) {
      container.style.display = "none";
      return;
    }
    container.style.display = "block";

    failedGeocodes.forEach((failure, index) => {
      const item = document.createElement("div");
      item.className = "failure-item";
      item.id = `failure-item-${index}`;

      item.innerHTML = `
      <div class="failure-name">${failure.Name}</div>
      <input type="text" class="failure-address-input" id="fix-addr-${index}" value="${
        failure.Address || ""
      }">
      <input type="number" class="failure-coord-input" id="fix-lat-${index}" placeholder="Latitude" style="grid-area: lat;">
      <input type="number" class="failure-coord-input" id="fix-lon-${index}" placeholder="Longitude" style="grid-area: lon;">
      <button id="fix-btn-${index}" class="failure-button">Fix</button>
    `;

      listEl.appendChild(item);

      document
        .getElementById(`fix-btn-${index}`)
        .addEventListener("click", async () => {
          const button = document.getElementById(`fix-btn-${index}`);
          button.textContent = "Fixing...";
          button.disabled = true;

          const latInput = document.getElementById(
            `fix-lat-${index}`
          ).value;
          const lonInput = document.getElementById(
            `fix-lon-${index}`
          ).value;
          const newAddress = document.getElementById(
            `fix-addr-${index}`
          ).value;

          let geo = null;

          if (
            latInput &&
            lonInput &&
            !isNaN(latInput) &&
            !isNaN(lonInput)
          ) {
            tripUtils.log(` manual override for ${failure.Name}.`);
            geo = {
              lat: parseFloat(latInput),
              lon: parseFloat(lonInput),
              usedVariant: "manual",
            };
          } else {
            const provider =
              document.getElementById("geocodeProvider").value;
            const apiKey = document.getElementById("apiKey").value.trim();
            geo = await geocodeAddressMulti(newAddress, provider, apiKey);
          }

          if (geo) {
            tripUtils.log(`✅ Fixed ${failure.Name} successfully.`);
            // Find original record data
            const originalRecord = records.find(
              (r) => r.name === failure.Name
            );

            // Add to geocoded array
            const newRecord = {
              ...originalRecord,
              lat: geo.lat,
              lon: geo.lon,
              address: newAddress,
            };
            geocoded.push(newRecord);

            // Remove from failedGeocodes
            const failureIndex = failedGeocodes.findIndex(
              (f) => f.Name === failure.Name
            );
            if (failureIndex > -1) {
              failedGeocodes.splice(failureIndex, 1);
            }

            // Update UI
            document.getElementById(`failure-item-${index}`).remove();
            if (failedGeocodes.length === 0) {
              container.style.display = "none";
            }
            tripUtils.updateStats();
            tripMap.drawMarkers(geocoded, false); // Redraw all markers
          } else {
            tripUtils.log(
              `✗ Failed to fix ${failure.Name}. Please try a different address or enter coordinates.`
            );
            alert(`Could not find coordinates for "${newAddress}".`);
            button.textContent = "Fix";
            button.disabled = false;
          }
        });
    });
  }

  // Expose for testing and module usage
  window.tripGeocoding = {
    geocodeAddressMulti,
    geocodeRecords,
    classifyFailure,
    displayFailedGeocodes,
  };
})();
