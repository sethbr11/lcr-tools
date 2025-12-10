(() => {
  // Shared State - Exposed globally for cross-module access
  window.records = [];
  window.geocoded = [];
  window.clustered = [];
  window.optimized = [];
  window.failedGeocodes = [];
  window.commonLocality = "";
  window.originalHeaders = [];

  // Utility Functions
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  const log = (msg) => {
    const statusEl = document.getElementById("status");
    if (statusEl) {
      statusEl.textContent += msg + "\n";
      statusEl.parentElement.scrollTop = statusEl.parentElement.scrollHeight;
    } else {
      console.log(msg);
    }
  };

  function updateStats() {
    const statTotal = document.getElementById("statTotal");
    const statGeocoded = document.getElementById("statGeocoded");
    const statClusters = document.getElementById("statClusters");
    const statDistance = document.getElementById("statDistance");

    if (statTotal) statTotal.textContent = records.length;
    if (statGeocoded) statGeocoded.textContent = geocoded.length;

    if (statClusters) {
      if (clustered.length > 0) {
        const uniqueClusters = new Set(
          clustered
            .map((c) => c.cluster)
            .filter((c) => c !== undefined && c !== -1)
        ).size;
        statClusters.textContent = uniqueClusters;
      } else {
        statClusters.textContent = "-";
      }
    }

    if (statDistance) {
      if (optimized.length > 0) {
        const totalDist = optimized.reduce(
          (acc, curr) => acc + (curr.displayDistance || 0),
          0
        );
        statDistance.textContent = `${totalDist.toFixed(1)} miles`;
      } else {
        statDistance.textContent = "-";
      }
    }
  }

  function advancedNormalizeAddress(raw) {
    if (!raw) return { original: raw, variants: [] };
    let base = raw
      .trim()
      .replace(/\s+/g, " ")
      .replace(/^"+|"+$/g, "");

    const hasStateCode = /\b[A-Z]{2}\b/.test(base);
    if (!hasStateCode && commonLocality) {
      base = `${base} ${commonLocality}`.replace(/\s+/g, " ").trim();
    }

    // Helpers
    const shortenZip4 = (s) => s.replace(/\b(\d{5})-\d{4}\b/g, "$1");
    const stripZip = (s) =>
      s
        .replace(/\b\d{5}(-\d{4})?\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const noUnit = base
      .replace(/\b(?:APT|APARTMENT|UNIT|STE|SUITE|#)\s*[A-Z0-9\-]+\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    const noCommas = base.replace(/,/g, " ").replace(/\s+/g, " ").trim();
    const compact = noUnit.replace(/,/g, " ").replace(/\s+/g, " ").trim();
    const streetCityState = base
      .replace(/,\s*/g, " ")
      .replace(/\b\d{5}(-\d{4})?\b/g, "")
      .trim();
    const numberStreetOnly = (() => {
      const m = base.match(/^(\d+\s+[^\d,]+?)(?:\s+[A-Z]{2}\b.*)?$/);
      return m ? m[1].trim() : base;
    })();

    const variants = [
      base,
      shortenZip4(base),
      stripZip(base),
      noUnit,
      noCommas,
      compact,
      streetCityState,
      numberStreetOnly,
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    return { original: raw, variants };
  }

  // State getters and setters for testing
  function getState() {
    return {
      records: [...records],
      geocoded: [...geocoded],
      clustered: [...clustered],
      optimized: [...optimized],
      failedGeocodes: [...failedGeocodes],
      commonLocality,
    };
  }

  function setState(newState) {
    if (newState.records !== undefined) records = [...newState.records];
    if (newState.geocoded !== undefined) geocoded = [...newState.geocoded];
    if (newState.clustered !== undefined) clustered = [...newState.clustered];
    if (newState.optimized !== undefined) optimized = [...newState.optimized];
    if (newState.failedGeocodes !== undefined)
      failedGeocodes = [...newState.failedGeocodes];
    if (newState.commonLocality !== undefined)
      commonLocality = newState.commonLocality;
  }

  function resetState() {
    records = [];
    geocoded = [];
    clustered = [];
    optimized = [];
    failedGeocodes = [];
    commonLocality = "";
  }

  // Expose for testing and module usage
  window.tripUtils = {
    sleep,
    log,
    updateStats,
    advancedNormalizeAddress,
    getState,
    setState,
    resetState,
  };
})();
