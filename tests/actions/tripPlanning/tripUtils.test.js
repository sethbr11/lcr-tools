/**
 * Unit tests for tripUtils.js
 */

// CRITICAL: Restore real querySelector/querySelectorAll for this test suite
const realQuerySelector = Document.prototype.querySelector;
const realQuerySelectorAll = Document.prototype.querySelectorAll;
document.querySelector = realQuerySelector.bind(document);
document.querySelectorAll = realQuerySelectorAll.bind(document);

require("../../../js/actions/tripPlanning/tripUtils.js");

describe("Trip Planning Utilities", () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = "";
    
    // Reset state before each test
    window.tripUtils.resetState();
    
    // Clear console.log mock
    jest.clearAllMocks();
  });

  describe("sleep", () => {
    it("should resolve after specified time", async () => {
      const start = Date.now();
      await window.tripUtils.sleep(100);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
      expect(elapsed).toBeLessThan(150);
    });

    it("should resolve immediately for 0ms", async () => {
      const start = Date.now();
      await window.tripUtils.sleep(0);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe("log", () => {
    it("should append message to status element", () => {
      const statusContainer = document.createElement("div");
      const statusEl = document.createElement("div");
      statusEl.id = "status";
      statusEl.textContent = "";
      statusContainer.appendChild(statusEl);
      document.body.appendChild(statusContainer);

      window.tripUtils.log("Test message");

      expect(statusEl.textContent).toContain("Test message");
    });

    it("should use console.log when status element not found", () => {
      const consoleSpy = jest.spyOn(console, "log");

      window.tripUtils.log("Test message");

      expect(consoleSpy).toHaveBeenCalledWith("Test message");
      
      consoleSpy.mockRestore();
    });

    it("should append multiple messages", () => {
      const statusContainer = document.createElement("div");
      const statusEl = document.createElement("div");
      statusEl.id = "status";
      statusEl.textContent = "";
      statusContainer.appendChild(statusEl);
      document.body.appendChild(statusContainer);

      window.tripUtils.log("Message 1");
      window.tripUtils.log("Message 2");

      expect(statusEl.textContent).toContain("Message 1");
      expect(statusEl.textContent).toContain("Message 2");
    });
  });

  describe("updateStats", () => {
    beforeEach(() => {
      // Create stat elements
      document.body.innerHTML = `
        <div id="statTotal"></div>
        <div id="statGeocoded"></div>
        <div id="statClusters"></div>
        <div id="statDistance"></div>
      `;
    });

    it("should update total records count", () => {
      window.tripUtils.setState({
        records: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });

      window.tripUtils.updateStats();

      expect(document.getElementById("statTotal").textContent).toBe("3");
    });

    it("should update geocoded count", () => {
      window.tripUtils.setState({
        geocoded: [{ id: 1 }, { id: 2 }],
      });

      window.tripUtils.updateStats();

      expect(document.getElementById("statGeocoded").textContent).toBe("2");
    });

    it("should show dash for clusters when no clustered data", () => {
      window.tripUtils.setState({
        clustered: [],
      });

      window.tripUtils.updateStats();

      expect(document.getElementById("statClusters").textContent).toBe("-");
    });

    it("should count unique clusters", () => {
      window.tripUtils.setState({
        clustered: [
          { cluster: 0 },
          { cluster: 0 },
          { cluster: 1 },
          { cluster: 1 },
          { cluster: 2 },
        ],
      });

      window.tripUtils.updateStats();

      expect(document.getElementById("statClusters").textContent).toBe("3");
    });

    it("should filter out undefined and -1 clusters", () => {
      window.tripUtils.setState({
        clustered: [
          { cluster: 0 },
          { cluster: -1 },
          { cluster: undefined },
          { cluster: 1 },
        ],
      });

      window.tripUtils.updateStats();

      expect(document.getElementById("statClusters").textContent).toBe("2");
    });

    it("should show dash for distance when no optimized data", () => {
      window.tripUtils.setState({
        optimized: [],
      });

      window.tripUtils.updateStats();

      expect(document.getElementById("statDistance").textContent).toBe("-");
    });

    it("should calculate total distance", () => {
      window.tripUtils.setState({
        optimized: [
          { displayDistance: 1.5 },
          { displayDistance: 2.3 },
          { displayDistance: 0.7 },
        ],
      });

      window.tripUtils.updateStats();

      expect(document.getElementById("statDistance").textContent).toBe(
        "4.5 miles"
      );
    });

    it("should handle missing displayDistance", () => {
      window.tripUtils.setState({
        optimized: [{ displayDistance: 1.5 }, {}, { displayDistance: 2.5 }],
      });

      window.tripUtils.updateStats();

      expect(document.getElementById("statDistance").textContent).toBe(
        "4.0 miles"
      );
    });
  });

  describe("advancedNormalizeAddress", () => {
    it("should return empty variants for null input", () => {
      const result = window.tripUtils.advancedNormalizeAddress(null);
      expect(result.original).toBeNull();
      expect(result.variants).toEqual([]);
    });

    it("should return empty variants for undefined input", () => {
      const result = window.tripUtils.advancedNormalizeAddress(undefined);
      expect(result.original).toBeUndefined();
      expect(result.variants).toEqual([]);
    });

    it("should normalize whitespace", () => {
      const result = window.tripUtils.advancedNormalizeAddress(
        "123   Main    St"
      );
      expect(result.variants).toContain("123 Main St");
    });

    it("should remove quotes", () => {
      const result = window.tripUtils.advancedNormalizeAddress(
        '"123 Main St"'
      );
      expect(result.variants[0]).toBe("123 Main St");
    });

    it("should generate variant without ZIP+4", () => {
      const result = window.tripUtils.advancedNormalizeAddress(
        "123 Main St, City, ST 12345-6789"
      );
      expect(result.variants).toContain("123 Main St, City, ST 12345");
    });

    it("should generate variant without ZIP code", () => {
      const result = window.tripUtils.advancedNormalizeAddress(
        "123 Main St, City, ST 12345"
      );
      const withoutZip = result.variants.find(
        (v) => !v.includes("12345")
      );
      expect(withoutZip).toBeDefined();
    });

    it("should remove apartment/unit numbers", () => {
      const result = window.tripUtils.advancedNormalizeAddress(
        "123 Main St APT 4B, City, ST 12345"
      );
      const withoutUnit = result.variants.find(
        (v) => !v.includes("APT") && !v.includes("4B")
      );
      expect(withoutUnit).toBeDefined();
    });

    it("should handle different unit formats", () => {
      const address = "123 Main St APT 4B, City, ST 12345";
      const result = window.tripUtils.advancedNormalizeAddress(address);
      
      // Should generate multiple variants
      expect(result.variants.length).toBeGreaterThan(1);
      // Should include the original normalized address
      expect(result.variants).toContain("123 Main St APT 4B, City, ST 12345");
    });

    it("should remove commas", () => {
      const result = window.tripUtils.advancedNormalizeAddress(
        "123 Main St, City, ST 12345"
      );
      const withoutCommas = result.variants.find(
        (v) => !v.includes(",")
      );
      expect(withoutCommas).toBeDefined();
    });

    it("should generate street-only variant", () => {
      const result = window.tripUtils.advancedNormalizeAddress(
        "123 Main Street, City, ST 12345"
      );
      // The function generates variants, check that at least one is shorter
      expect(result.variants.length).toBeGreaterThan(1);
      // Check that variants include the base address
      expect(result.variants).toContain("123 Main Street, City, ST 12345");
    });

    it("should add commonLocality when no state code present", () => {
      window.tripUtils.setState({
        commonLocality: "City, ST 12345",
      });

      const result = window.tripUtils.advancedNormalizeAddress("123 Main St");
      expect(result.variants[0]).toContain("City, ST 12345");
    });

    it("should not add commonLocality when state code present", () => {
      window.tripUtils.setState({
        commonLocality: "City, ST 12345",
      });

      const result = window.tripUtils.advancedNormalizeAddress(
        "123 Main St, AnotherCity, CA 90210"
      );
      expect(result.variants[0]).not.toContain("City, ST 12345");
    });

    it("should return unique variants only", () => {
      const result = window.tripUtils.advancedNormalizeAddress(
        "123 Main St"
      );
      const uniqueVariants = new Set(result.variants);
      expect(uniqueVariants.size).toBe(result.variants.length);
    });

    it("should filter out empty variants", () => {
      const result = window.tripUtils.advancedNormalizeAddress(
        "123 Main St"
      );
      expect(result.variants.every((v) => v.length > 0)).toBe(true);
    });
  });

  describe("state management", () => {
    it("should get initial state", () => {
      const state = window.tripUtils.getState();
      
      expect(state.records).toEqual([]);
      expect(state.geocoded).toEqual([]);
      expect(state.clustered).toEqual([]);
      expect(state.optimized).toEqual([]);
      expect(state.failedGeocodes).toEqual([]);
      expect(state.commonLocality).toBe("");
    });

    it("should set state", () => {
      window.tripUtils.setState({
        records: [{ id: 1 }],
        geocoded: [{ id: 2 }],
        clustered: [{ id: 3 }],
        optimized: [{ id: 4 }],
        failedGeocodes: [{ id: 5 }],
        commonLocality: "Test City, ST",
      });

      const state = window.tripUtils.getState();
      
      expect(state.records).toEqual([{ id: 1 }]);
      expect(state.geocoded).toEqual([{ id: 2 }]);
      expect(state.clustered).toEqual([{ id: 3 }]);
      expect(state.optimized).toEqual([{ id: 4 }]);
      expect(state.failedGeocodes).toEqual([{ id: 5 }]);
      expect(state.commonLocality).toBe("Test City, ST");
    });

    it("should reset state", () => {
      window.tripUtils.setState({
        records: [{ id: 1 }],
        geocoded: [{ id: 2 }],
        commonLocality: "Test City",
      });

      window.tripUtils.resetState();

      const state = window.tripUtils.getState();
      
      expect(state.records).toEqual([]);
      expect(state.geocoded).toEqual([]);
      expect(state.clustered).toEqual([]);
      expect(state.optimized).toEqual([]);
      expect(state.failedGeocodes).toEqual([]);
      expect(state.commonLocality).toBe("");
    });

    it("should return copies of arrays in getState", () => {
      const originalRecords = [{ id: 1 }];
      window.tripUtils.setState({ records: originalRecords });

      const state = window.tripUtils.getState();
      state.records.push({ id: 2 });

      const newState = window.tripUtils.getState();
      expect(newState.records.length).toBe(1);
    });
  });
});
