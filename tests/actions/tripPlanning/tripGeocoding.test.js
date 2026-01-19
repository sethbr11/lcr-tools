/**
 * Unit tests for tripGeocoding.js
 */

// CRITICAL: Restore real querySelector/querySelectorAll for this test suite
const realQuerySelector = Document.prototype.querySelector;
const realQuerySelectorAll = Document.prototype.querySelectorAll;
document.querySelector = realQuerySelector.bind(document);
document.querySelectorAll = realQuerySelectorAll.bind(document);

// Mock fetch
global.fetch = jest.fn();

// Mock tripUtils functions
// Mock tripUtils functions
window.tripUtils = {
  advancedNormalizeAddress: jest.fn((addr) => ({
    variants: [addr, `${addr} variant`],
  })),
  log: jest.fn(),
  sleep: jest.fn(() => Promise.resolve()),
  updateStats: jest.fn(),
};

window.tripMap = {
  recenterToPoints: jest.fn(),
  drawMarkers: jest.fn(),
};

// Mock global state
global.records = [];
global.geocoded = [];
global.failedGeocodes = [];

require("../../../js/actions/tripPlanning/tripGeocoding.js");

describe("Trip Geocoding Utilities", () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <select id="geocodeProvider">
        <option value="nominatim">Nominatim</option>
        <option value="locationiq">LocationIQ</option>
        <option value="mapbox">Mapbox</option>
      </select>
      <input id="apiKey" value="" />
      <button id="geocodeBtn">Geocode</button>
      <button id="clusterBtn">Cluster</button>
      <button id="exportCsvBtn">Export CSV</button>
      <button id="exportPdfBtn">Export PDF</button>
      <div id="geocodeProgressContainer" style="display: none;">
        <div id="geocodeProgressFill"></div>
        <div id="geocodeProgressPercent">0%</div>
      </div>
      <div id="failureFixerContainer" style="display: none;">
        <div id="failureList"></div>
      </div>
    `;

    // Reset global state
    global.records = [];
    global.geocoded = [];
    global.failedGeocodes = [];

    // Clear localStorage
    localStorage.clear();

    // Clear specific mocks manually (not localStorage)
    // Clear specific mocks manually (not localStorage)
    global.fetch.mockClear();
    window.tripUtils.log.mockClear();
    window.tripUtils.sleep.mockClear();
    window.tripUtils.updateStats.mockClear();
    window.tripMap.recenterToPoints.mockClear();
    window.tripMap.drawMarkers.mockClear();
    window.tripUtils.advancedNormalizeAddress.mockClear();

    // Reset advancedNormalizeAddress mock implementation
    window.tripUtils.advancedNormalizeAddress.mockImplementation((addr) => ({
      variants: [addr],
    }));
  });

  describe("geocodeAddressMulti", () => {
    it("should return cached result if available", async () => {
      const cachedResult = { lat: 37.7749, lon: -122.4194, usedVariant: "cached" };
      const cacheKey = "100 Cached St";
      
      // Mock localStorage.getItem to return our cached value
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
        if (key === "geocode_cache") {
          return JSON.stringify({ [cacheKey]: cachedResult });
        }
        return null;
      });

      const result = await window.tripGeocoding.geocodeAddressMulti(
        cacheKey,
        "nominatim",
        ""
      );

      expect(result).toEqual(cachedResult);
      expect(fetch).not.toHaveBeenCalled();
      
      getItemSpy.mockRestore();
    });

    it("should geocode with Nominatim provider", async () => {
      fetch.mockResolvedValueOnce({
        json: async () => [{ lat: "37.7749", lon: "-122.4194" }],
      });

      const result = await window.tripGeocoding.geocodeAddressMulti(
        "111 Nominatim St",
        "nominatim",
        ""
      );

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("nominatim.openstreetmap.org"),
        expect.any(Object)
      );
      expect(result).toEqual({
        lat: 37.7749,
        lon: -122.4194,
        usedVariant: "111 Nominatim St",
      });
    });

    it("should geocode with LocationIQ provider", async () => {
      fetch.mockResolvedValueOnce({
        json: async () => [{ lat: "37.7749", lon: "-122.4194" }],
      });

      const result = await window.tripGeocoding.geocodeAddressMulti(
        "222 LocationIQ Ave",
        "locationiq",
        "test-api-key"
      );

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("locationiq.com"),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("key=test-api-key"),
        expect.any(Object)
      );
      expect(result).toEqual({
        lat: 37.7749,
        lon: -122.4194,
        usedVariant: "222 LocationIQ Ave",
      });
    });

    it("should geocode with Mapbox provider", async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          features: [{ center: [-122.4194, 37.7749] }],
        }),
      });

      const result = await window.tripGeocoding.geocodeAddressMulti(
        "333 Mapbox Blvd",
        "mapbox",
        "test-token"
      );

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api.mapbox.com"),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("access_token=test-token"),
        expect.any(Object)
      );
      expect(result).toEqual({
        lat: 37.7749,
        lon: -122.4194,
        usedVariant: "333 Mapbox Blvd",
      });
    });

    it("should try multiple variants on failure", async () => {
      const uniqueAddress = "444 Variant Test St";
      window.tripUtils.advancedNormalizeAddress.mockReturnValueOnce({
        variants: [`${uniqueAddress}`, `${uniqueAddress} variant1`, `${uniqueAddress} variant2`],
      });

      // First two fail, third succeeds
      fetch
        .mockResolvedValueOnce({ json: async () => [] })
        .mockResolvedValueOnce({ json: async () => [] })
        .mockResolvedValueOnce({
          json: async () => [{ lat: "37.7749", lon: "-122.4194" }],
        });

      const result = await window.tripGeocoding.geocodeAddressMulti(
        uniqueAddress,
        "nominatim",
        ""
      );

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result.usedVariant).toBe(`${uniqueAddress} variant2`);
    });

    it("should return null if all variants fail", async () => {
      fetch.mockResolvedValue({ json: async () => [] });

      const result = await window.tripGeocoding.geocodeAddressMulti(
        "555 Invalid Address",
        "nominatim",
        ""
      );

      expect(result).toBeNull();
    });

    it("should cache successful results", async () => {
      fetch.mockResolvedValueOnce({
        json: async () => [{ lat: "40.7128", lon: "-74.0060" }],
      });

      const uniqueAddress = "666 Cache Test Rd";
      const result = await window.tripGeocoding.geocodeAddressMulti(
        uniqueAddress,
        "nominatim",
        ""
      );

      // Verify the geocoding succeeded
      expect(result).toBeDefined();
      expect(result.lat).toBe(40.7128);
      
      // Call again - should return cached result without fetching
      fetch.mockClear();
      const cachedResult = await window.tripGeocoding.geocodeAddressMulti(
        uniqueAddress,
        "nominatim",
        ""
      );
      
      expect(cachedResult).toEqual(result);
      expect(fetch).not.toHaveBeenCalled(); // Should use cache
    });

    it("should handle fetch errors gracefully", async () => {
      fetch.mockRejectedValue(new Error("Network error"));

      const result = await window.tripGeocoding.geocodeAddressMulti(
        "999 Error St",
        "nominatim",
        ""
      );

      expect(result).toBeNull();
    });

    it("should skip unknown providers", async () => {
      const result = await window.tripGeocoding.geocodeAddressMulti(
        "888 Unknown Ave",
        "unknown-provider",
        ""
      );

      expect(fetch).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("should handle Mapbox empty features", async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ features: [] }),
      });

      const result = await window.tripGeocoding.geocodeAddressMulti(
        "777 Empty Blvd",
        "mapbox",
        "test-token"
      );

      expect(result).toBeNull();
    });

    it("should include correct User-Agent with version from manifest", async () => {
      // Mock chrome.runtime.getManifest to return specific version
      global.chrome.runtime.getManifest.mockReturnValue({ version: "9.9.9" });
      
      fetch.mockResolvedValueOnce({
        json: async () => [{ lat: "1", lon: "1" }],
      });

      await window.tripGeocoding.geocodeAddressMulti("123 Main St", "nominatim", "");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("nominatim"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": expect.stringContaining("LCR-Tools-Extension/9.9.9"),
          }),
        })
      );
    });
  });

  describe("classifyFailure", () => {
    beforeEach(() => {
      global.records = [
        { address: "123 Main St, City, CA 12345" },
        { address: "456 Oak Ave, Town, TX 67890" },
        { address: "789 Elm St, Village, NY 11111" },
      ];
    });

    it("should classify empty addresses", () => {
      expect(window.tripGeocoding.classifyFailure("")).toBe("Empty");
      expect(window.tripGeocoding.classifyFailure("   ")).toBe("Empty");
      expect(window.tripGeocoding.classifyFailure(null)).toBe("Empty");
    });

    it("should classify addresses without leading number", () => {
      expect(window.tripGeocoding.classifyFailure("Main Street")).toBe(
        "No leading number"
      );
      expect(window.tripGeocoding.classifyFailure("Oak Avenue")).toBe(
        "No leading number"
      );
    });

    it("should classify incomplete street addresses", () => {
      expect(window.tripGeocoding.classifyFailure("123")).toBe(
        "Incomplete street"
      );
      expect(window.tripGeocoding.classifyFailure("456 ")).toBe(
        "Incomplete street"
      );
    });

    it("should classify addresses missing state", () => {
      expect(window.tripGeocoding.classifyFailure("123 Main St")).toBe(
        "Missing state"
      );
      expect(window.tripGeocoding.classifyFailure("456 Oak Ave, City")).toBe(
        "Missing state"
      );
    });

    it("should classify addresses missing zip when most have zip", () => {
      expect(
        window.tripGeocoding.classifyFailure("123 Main St, City, CA")
      ).toBe("Missing zip");
    });

    it("should not require zip when few records have zip", () => {
      global.records = [
        { address: "123 Main St, City, CA" },
        { address: "456 Oak Ave, Town, TX" },
      ];

      expect(
        window.tripGeocoding.classifyFailure("789 Elm St, Village, NY")
      ).toBe("Not found");
    });

    it("should return 'Not found' for otherwise valid addresses", () => {
      expect(
        window.tripGeocoding.classifyFailure("999 Unknown St, City, CA 12345")
      ).toBe("Not found");
    });

    it("should handle ZIP+4 format", () => {
      global.records = [{ address: "123 Main St, City, CA 12345-6789" }];

      expect(
        window.tripGeocoding.classifyFailure("456 Oak Ave, Town, TX 67890-1234")
      ).toBe("Not found");
    });
  });

  describe("displayFailedGeocodes", () => {
    it("should hide container when no failures", () => {
      global.failedGeocodes = [];

      window.tripGeocoding.displayFailedGeocodes();

      const container = document.getElementById("failureFixerContainer");
      expect(container.style.display).toBe("none");
    });

    it("should show container when failures exist", () => {
      global.failedGeocodes = [
        { Name: "Test Person", Address: "123 Main St", Reason: "Not found" },
      ];

      window.tripGeocoding.displayFailedGeocodes();

      const container = document.getElementById("failureFixerContainer");
      expect(container.style.display).toBe("block");
    });

    it("should create failure items for each failed geocode", () => {
      global.failedGeocodes = [
        { Name: "Person 1", Address: "123 Main St", Reason: "Not found" },
        { Name: "Person 2", Address: "456 Oak Ave", Reason: "Missing zip" },
      ];

      window.tripGeocoding.displayFailedGeocodes();

      const listEl = document.getElementById("failureList");
      expect(listEl.children.length).toBe(2);
      expect(listEl.children[0].id).toBe("failure-item-0");
      expect(listEl.children[1].id).toBe("failure-item-1");
    });

    it("should populate input fields with failure data", () => {
      global.failedGeocodes = [
        { Name: "Test Person", Address: "123 Main St", Reason: "Not found" },
      ];

      window.tripGeocoding.displayFailedGeocodes();

      const addressInput = document.getElementById("fix-addr-0");
      expect(addressInput.value).toBe("123 Main St");
    });

    it("should handle empty address in failure", () => {
      global.failedGeocodes = [
        { Name: "Test Person", Address: null, Reason: "Empty" },
      ];

      window.tripGeocoding.displayFailedGeocodes();

      const addressInput = document.getElementById("fix-addr-0");
      expect(addressInput.value).toBe("");
    });

    it("should clear previous failure list", () => {
      const listEl = document.getElementById("failureList");
      listEl.innerHTML = "<div>Old content</div>";

      global.failedGeocodes = [
        { Name: "New Person", Address: "123 Main St", Reason: "Not found" },
      ];

      window.tripGeocoding.displayFailedGeocodes();

      expect(listEl.innerHTML).not.toContain("Old content");
      expect(listEl.children.length).toBe(1);
    });
  });
});
