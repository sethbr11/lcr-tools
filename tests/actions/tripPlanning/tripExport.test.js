/**
 * Unit tests for tripExport.js
 * 
 * Note: These tests focus on CSV export functionality.
 * PDF export is complex with many external dependencies (jsPDF, html2canvas, Leaflet)
 * and is better tested through integration/E2E tests.
 */

// CRITICAL: Restore real querySelector/querySelectorAll for this test suite
const realQuerySelector = Document.prototype.querySelector;
const realQuerySelectorAll = Document.prototype.querySelectorAll;
document.querySelector = realQuerySelector.bind(document);
document.querySelectorAll = realQuerySelectorAll.bind(document);

// Mock Papa Parse
global.Papa = {
  unparse: jest.fn((data) => {
    // Simple CSV mock - just return a string representation
    if (!data || data.length === 0) return "";
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) => Object.values(row).join(",")).join("\n");
    return `${headers}\n${rows}`;
  }),
};

// Mock URL and Blob APIs
global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = jest.fn();
global.Blob = jest.fn((content, options) => ({ content, options }));

// Mock Leaflet
global.L = {
  polyline: jest.fn(() => ({})),
};

// Mock tripUtils state
global.optimized = [];
global.clustered = [];
global.geocoded = [];
global.failedGeocodes = [];
global.records = [];

window.tripUtils = {
  log: jest.fn(),
  sleep: jest.fn(() => Promise.resolve()),
};

window.tripMap = {
  getRouteLayer: jest.fn(() => ({
    clearLayers: jest.fn(),
    addLayer: jest.fn(),
  })),
  getMarkerLayer: jest.fn(() => ({
    clearLayers: jest.fn(),
    addLayer: jest.fn(),
  })),
  drawMarkers: jest.fn(),
  drawRoutes: jest.fn(),
  drawNumberedMarkers: jest.fn(),
  recenterToPoints: jest.fn(),
  CLUSTER_COLORS: ["red", "blue"],
};

// Mock jsPDF and html2canvas
window.jspdf = {
  jsPDF: jest.fn(() => ({
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
    setFontSize: jest.fn(),
    text: jest.fn(),
    setTextColor: jest.fn(),
    setLineWidth: jest.fn(),
    line: jest.fn(),
    rect: jest.fn(),
    setDrawColor: jest.fn(),
    addImage: jest.fn(),
    addPage: jest.fn(),
    save: jest.fn(),
  })),
};

global.html2canvas = jest.fn(() => Promise.resolve({
  toDataURL: () => "data:image/png;base64,mock",
}));

require("../../../js/actions/tripPlanning/tripExport.js");

describe("Trip Export Utilities", () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <input type="radio" name="distanceMetric" value="haversine" checked />
      <input type="radio" name="distanceMetric" value="mapbox" />
      <button id="exportPdfBtn">Export PDF</button>
      <div id="map"></div>
    `;

    // Reset global state
    global.optimized = [];
    global.clustered = [];
    global.geocoded = [];
    global.failedGeocodes = [];
    global.records = [];

    // Clear all mocks
    jest.clearAllMocks();

    // Mock document.createElement to track anchor creation
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = jest.fn((tag) => {
      const element = originalCreateElement(tag);
      if (tag === "a") {
        element.click = jest.fn();
      }
      return element;
    });
  });

  describe("exportCsv", () => {
    it("should export optimized routes with route order", () => {
      global.optimized = [
        {
          cluster: 0,
          distance: 10.5,
          points: [
            {
              name: "Point 1",
              address: "123 Main St",
              lat: 37.7749,
              lon: -122.4194,
            },
            {
              name: "Point 2",
              address: "456 Oak Ave",
              lat: 37.7849,
              lon: -122.4094,
            },
          ],
        },
      ];

      window.tripExport.exportCsv();

      expect(Papa.unparse).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            Name: "Point 1",
            "Street Address": "123 Main St",
            Cluster: 1,
            RouteOrder: 1,
          }),
          expect.objectContaining({
            Name: "Point 2",
            "Street Address": "456 Oak Ave",
            Cluster: 1,
            RouteOrder: 2,
          }),
        ])
      );
    });

    it("should export clustered data when no optimized routes", () => {
      global.clustered = [
        {
          name: "Point 1",
          address: "123 Main St",
          lat: 37.7749,
          lon: -122.4194,
          cluster: 0,
        },
        {
          name: "Point 2",
          address: "456 Oak Ave",
          lat: 37.7849,
          lon: -122.4094,
          cluster: 1,
        },
      ];

      window.tripExport.exportCsv();

      expect(Papa.unparse).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            Name: "Point 1",
            Cluster: 1,
          }),
          expect.objectContaining({
            Name: "Point 2",
            Cluster: 2,
          }),
        ])
      );
    });

    it("should mark outliers correctly in clustered data", () => {
      global.clustered = [
        {
          name: "Outlier Point",
          address: "789 Elm St",
          lat: 37.7949,
          lon: -122.3994,
          cluster: -1,
        },
      ];

      window.tripExport.exportCsv();

      expect(Papa.unparse).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            Name: "Outlier Point",
            Cluster: "Outlier",
          }),
        ])
      );
    });

    it("should export geocoded data when no clusters", () => {
      global.geocoded = [
        {
          name: "Point 1",
          address: "123 Main St",
          lat: 37.7749,
          lon: -122.4194,
        },
      ];

      window.tripExport.exportCsv();

      expect(Papa.unparse).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            Name: "Point 1",
            Cluster: "N/A",
          }),
        ])
      );
    });

    it("should include failed geocodes in export", () => {
      global.geocoded = [
        {
          name: "Success Point",
          address: "123 Main St",
          lat: 37.7749,
          lon: -122.4194,
        },
      ];
      global.failedGeocodes = [
        {
          Name: "Failed Point",
          Address: "Invalid Address",
          Reason: "Address not found",
        },
      ];

      window.tripExport.exportCsv();

      const callArg = Papa.unparse.mock.calls[0][0];
      expect(callArg).toContainEqual(
        expect.objectContaining({
          Name: "Failed Point",
          Cluster: "Failed",
          FailureReason: "Address not found",
        })
      );
    });

    it("should handle empty names and addresses", () => {
      global.geocoded = [
        {
          name: null,
          address: null,
          lat: 37.7749,
          lon: -122.4194,
        },
      ];

      window.tripExport.exportCsv();

      expect(Papa.unparse).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            Name: "",
            "Street Address": "",
          }),
        ])
      );
    });

    it("should trigger CSV download", () => {
      global.geocoded = [
        {
          name: "Point 1",
          address: "123 Main St",
          lat: 37.7749,
          lon: -122.4194,
        },
      ];

      window.tripExport.exportCsv();

      expect(Blob).toHaveBeenCalledWith(
        [expect.any(String)],
        { type: "text/csv" }
      );
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(document.createElement).toHaveBeenCalledWith("a");
    });

    it("should set correct filename", () => {
      global.geocoded = [
        {
          name: "Point 1",
          address: "123 Main St",
          lat: 37.7749,
          lon: -122.4194,
        },
      ];

      window.tripExport.exportCsv();

      const anchorElements = document.createElement.mock.results
        .filter((result) => result.value.tagName === "A")
        .map((result) => result.value);

      expect(anchorElements[0].download).toBe("route_report.csv");
    });

    it("should revoke object URL after download", () => {
      global.geocoded = [
        {
          name: "Point 1",
          address: "123 Main St",
          lat: 37.7749,
          lon: -122.4194,
        },
      ];

      window.tripExport.exportCsv();

      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    it("should log success message", () => {
      global.geocoded = [
        {
          name: "Point 1",
          address: "123 Main St",
          lat: 37.7749,
          lon: -122.4194,
        },
      ];

      window.tripExport.exportCsv();

      expect(window.tripUtils.log).toHaveBeenCalledWith("📄 CSV downloaded successfully");
    });

    it("should sort clustered data by cluster then name", () => {
      global.clustered = [
        { name: "Charlie", address: "C St", lat: 1, lon: 1, cluster: 1 },
        { name: "Alice", address: "A St", lat: 2, lon: 2, cluster: 0 },
        { name: "Bob", address: "B St", lat: 3, lon: 3, cluster: 0 },
      ];

      window.tripExport.exportCsv();

      const callArg = Papa.unparse.mock.calls[0][0];
      // Should be sorted: Alice (cluster 0), Bob (cluster 0), Charlie (cluster 1)
      expect(callArg[0].Name).toBe("Alice");
      expect(callArg[1].Name).toBe("Bob");
      expect(callArg[2].Name).toBe("Charlie");
    });
  });

  describe("exportPdf", () => {
    it("should clear marker layer and restore routes after export", async () => {
      global.optimized = [
        {
          cluster: 0,
          distance: 10,
          points: [
            { lat: 1, lon: 1, name: "P1", address: "A1" },
            { lat: 2, lon: 2, name: "P2", address: "A2" },
          ],
        },
      ];

      await window.tripExport.exportPdf();

      // Verify cleanup
      expect(window.tripMap.getMarkerLayer).toHaveBeenCalled();
      // We can't easily check the order of calls on different objects without a spy, 
      // but we can check that clearLayers was called on the marker layer object
      const markerLayer = window.tripMap.getMarkerLayer.mock.results[0].value;
      expect(markerLayer.clearLayers).toHaveBeenCalled();
      
      expect(window.tripMap.drawRoutes).toHaveBeenCalledWith(global.optimized);
      expect(window.tripUtils.log).toHaveBeenCalledWith("✅ PDF generated successfully.");
    });
  });
});
