/**
 * Unit tests for tripMap.js
 */

// CRITICAL: Restore real querySelector/querySelectorAll for this test suite
const realQuerySelector = Document.prototype.querySelector;
const realQuerySelectorAll = Document.prototype.querySelectorAll;
document.querySelector = realQuerySelector.bind(document);
document.querySelectorAll = realQuerySelectorAll.bind(document);

// Mock Leaflet before loading the module
const mockMap = {
  setView: jest.fn().mockReturnThis(),
  fitBounds: jest.fn(),
};

const mockLayer = {
  addTo: jest.fn().mockReturnThis(),
  clearLayers: jest.fn(),
  addLayer: jest.fn(),
};

const mockMarker = {
  bindPopup: jest.fn().mockReturnThis(),
  addTo: jest.fn().mockReturnThis(),
};

global.L = {
  map: jest.fn(() => mockMap),
  tileLayer: jest.fn(() => ({ addTo: jest.fn() })),
  layerGroup: jest.fn(() => ({ ...mockLayer })),
  circleMarker: jest.fn(() => ({ ...mockMarker })),
  marker: jest.fn(() => ({ ...mockMarker })),
  polyline: jest.fn(() => ({ ...mockMarker })),
  divIcon: jest.fn((options) => options),
};

// Mock Turf.js
global.turf = {
  lineString: jest.fn((coords) => ({ type: "LineString", coordinates: coords })),
  length: jest.fn(() => 5.5), // Mock distance in miles
};

require("../../../js/actions/tripPlanning/tripMap.js");

describe("Trip Map Utilities", () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="map"></div>
      <div id="clusterListContainer" style="display: none;">
        <div id="clusterList"></div>
      </div>
    `;

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe("initMap", () => {
    it("should initialize Leaflet map", () => {
      window.tripMap.initMap();

      expect(L.map).toHaveBeenCalledWith("map");
      expect(mockMap.setView).toHaveBeenCalledWith([20, 0], 2);
    });

    it("should add tile layer", () => {
      window.tripMap.initMap();

      expect(L.tileLayer).toHaveBeenCalledWith(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        expect.objectContaining({
          maxZoom: 19,
          attribution: "© OpenStreetMap contributors",
        })
      );
    });

    it("should create marker and route layers", () => {
      window.tripMap.initMap();

      expect(L.layerGroup).toHaveBeenCalledTimes(2);
    });
  });

  describe("recenterToPoints", () => {
    beforeEach(() => {
      window.tripMap.initMap();
    });

    it("should fit map bounds to points", () => {
      const points = [
        { lat: 37.7749, lon: -122.4194 },
        { lat: 37.7849, lon: -122.4094 },
      ];

      window.tripMap.recenterToPoints(points);

      expect(mockMap.fitBounds).toHaveBeenCalledWith(
        [
          [37.7749, -122.4194],
          [37.7849, -122.4094],
        ],
        { padding: [30, 30] }
      );
    });

    it("should handle empty points array", () => {
      window.tripMap.recenterToPoints([]);

      expect(mockMap.fitBounds).not.toHaveBeenCalled();
    });

    it("should handle null points", () => {
      window.tripMap.recenterToPoints(null);

      expect(mockMap.fitBounds).not.toHaveBeenCalled();
    });

    it("should handle single point", () => {
      const points = [{ lat: 37.7749, lon: -122.4194 }];

      window.tripMap.recenterToPoints(points);

      expect(mockMap.fitBounds).toHaveBeenCalledWith(
        [[37.7749, -122.4194]],
        { padding: [30, 30] }
      );
    });
  });

  describe("drawMarkers", () => {
    beforeEach(() => {
      window.tripMap.initMap();
    });

    it("should clear previous markers", () => {
      const points = [{ lat: 37.7749, lon: -122.4194, name: "Point 1", address: "Address 1" }];

      window.tripMap.drawMarkers(points);

      expect(mockLayer.clearLayers).toHaveBeenCalled();
    });

    it("should draw markers for all points", () => {
      const points = [
        { lat: 37.7749, lon: -122.4194, name: "Point 1", address: "Address 1" },
        { lat: 37.7849, lon: -122.4094, name: "Point 2", address: "Address 2" },
      ];

      window.tripMap.drawMarkers(points);

      expect(L.circleMarker).toHaveBeenCalledTimes(2);
      expect(mockLayer.addLayer).toHaveBeenCalledTimes(2);
    });

    it("should use default color when not clustered", () => {
      const points = [{ lat: 37.7749, lon: -122.4194, name: "Point 1", address: "Address 1" }];

      window.tripMap.drawMarkers(points, false);

      expect(L.circleMarker).toHaveBeenCalledWith(
        [37.7749, -122.4194],
        expect.objectContaining({
          fillColor: "#3182ce",
        })
      );
    });

    it("should use cluster colors when clustered", () => {
      const points = [
        { lat: 37.7749, lon: -122.4194, name: "Point 1", address: "Address 1", cluster: 0 },
      ];

      window.tripMap.drawMarkers(points, true);

      expect(L.circleMarker).toHaveBeenCalledWith(
        [37.7749, -122.4194],
        expect.objectContaining({
          fillColor: window.tripMap.CLUSTER_COLORS[0],
        })
      );
    });

    it("should mark outliers with gray color", () => {
      const points = [
        { lat: 37.7749, lon: -122.4194, name: "Point 1", address: "Address 1", cluster: -1 },
      ];

      window.tripMap.drawMarkers(points, true);

      expect(L.circleMarker).toHaveBeenCalledWith(
        [37.7749, -122.4194],
        expect.objectContaining({
          fillColor: "#718096",
        })
      );
    });

    it("should handle empty points array", () => {
      window.tripMap.drawMarkers([]);

      expect(L.circleMarker).not.toHaveBeenCalled();
    });

    it("should recenter map after drawing", () => {
      const points = [{ lat: 37.7749, lon: -122.4194, name: "Point 1", address: "Address 1" }];

      window.tripMap.drawMarkers(points);

      expect(mockMap.fitBounds).toHaveBeenCalled();
    });
  });

  describe("drawNumberedMarkers", () => {
    beforeEach(() => {
      window.tripMap.initMap();
    });

    it("should clear previous markers", () => {
      const points = [{ lat: 37.7749, lon: -122.4194, name: "Point 1", address: "Address 1" }];

      window.tripMap.drawNumberedMarkers(points);

      expect(mockLayer.clearLayers).toHaveBeenCalled();
    });

    it("should create numbered icons", () => {
      const points = [
        { lat: 37.7749, lon: -122.4194, name: "Point 1", address: "Address 1" },
        { lat: 37.7849, lon: -122.4094, name: "Point 2", address: "Address 2" },
      ];

      window.tripMap.drawNumberedMarkers(points);

      expect(L.divIcon).toHaveBeenCalledWith(
        expect.objectContaining({
          className: "number-icon",
          html: "<span>1</span>",
        })
      );
      expect(L.divIcon).toHaveBeenCalledWith(
        expect.objectContaining({
          html: "<span>2</span>",
        })
      );
    });

    it("should use 1-indexed numbering", () => {
      const points = [{ lat: 37.7749, lon: -122.4194, name: "Point 1", address: "Address 1" }];

      window.tripMap.drawNumberedMarkers(points);

      expect(L.divIcon).toHaveBeenCalledWith(
        expect.objectContaining({
          html: "<span>1</span>",
        })
      );
    });

    it("should handle empty points array", () => {
      window.tripMap.drawNumberedMarkers([]);

      expect(L.divIcon).not.toHaveBeenCalled();
    });
  });

  describe("drawRoutes", () => {
    beforeEach(() => {
      window.tripMap.initMap();
    });

    it("should clear previous routes", () => {
      const routes = [
        {
          cluster: 0,
          points: [
            { lat: 37.7749, lon: -122.4194, name: "Point 1", address: "Address 1" },
            { lat: 37.7849, lon: -122.4094, name: "Point 2", address: "Address 2" },
          ],
        },
      ];

      window.tripMap.drawRoutes(routes);

      expect(mockLayer.clearLayers).toHaveBeenCalled();
    });

    it("should draw polylines for routes", () => {
      const routes = [
        {
          cluster: 0,
          points: [
            { lat: 37.7749, lon: -122.4194, name: "Point 1", address: "Address 1" },
            { lat: 37.7849, lon: -122.4094, name: "Point 2", address: "Address 2" },
          ],
        },
      ];

      window.tripMap.drawRoutes(routes);

      expect(L.polyline).toHaveBeenCalled();
      expect(mockLayer.addLayer).toHaveBeenCalled();
    });

    it("should calculate and store distance", () => {
      const routes = [
        {
          cluster: 0,
          points: [
            { lat: 37.7749, lon: -122.4194, name: "Point 1", address: "Address 1" },
            { lat: 37.7849, lon: -122.4094, name: "Point 2", address: "Address 2" },
          ],
        },
      ];

      window.tripMap.drawRoutes(routes);

      expect(turf.lineString).toHaveBeenCalled();
      expect(turf.length).toHaveBeenCalled();
      expect(routes[0].displayDistance).toBe(5.5);
    });

    it("should skip routes with less than 2 points", () => {
      const routes = [
        {
          cluster: 0,
          points: [{ lat: 37.7749, lon: -122.4194, name: "Point 1", address: "Address 1" }],
        },
      ];

      window.tripMap.drawRoutes(routes);

      expect(L.polyline).not.toHaveBeenCalled();
    });

    it("should mark start points with green", () => {
      const routes = [
        {
          cluster: 0,
          points: [
            { lat: 37.7749, lon: -122.4194, name: "Point 1", address: "Address 1" },
            { lat: 37.7849, lon: -122.4094, name: "Point 2", address: "Address 2" },
          ],
        },
      ];

      window.tripMap.drawRoutes(routes);

      expect(L.circleMarker).toHaveBeenCalledWith(
        [37.7749, -122.4194],
        expect.objectContaining({
          fillColor: "limegreen",
          radius: 8,
        })
      );
    });

    it("should mark end points with red", () => {
      const routes = [
        {
          cluster: 0,
          points: [
            { lat: 37.7749, lon: -122.4194, name: "Point 1", address: "Address 1" },
            { lat: 37.7849, lon: -122.4094, name: "Point 2", address: "Address 2" },
          ],
        },
      ];

      window.tripMap.drawRoutes(routes);

      expect(L.circleMarker).toHaveBeenCalledWith(
        [37.7849, -122.4094],
        expect.objectContaining({
          fillColor: "red",
          radius: 8,
        })
      );
    });

    it("should recenter map after drawing routes", () => {
      const routes = [
        {
          cluster: 0,
          points: [
            { lat: 37.7749, lon: -122.4194, name: "Point 1", address: "Address 1" },
            { lat: 37.7849, lon: -122.4094, name: "Point 2", address: "Address 2" },
          ],
        },
      ];

      window.tripMap.drawRoutes(routes);

      expect(mockMap.fitBounds).toHaveBeenCalled();
    });
  });

  describe("updateClusterList", () => {
    it("should display cluster list in DOM", () => {
      const points = [
        { name: "Point 1", cluster: 0 },
        { name: "Point 2", cluster: 0 },
        { name: "Point 3", cluster: 1 },
      ];

      window.tripMap.updateClusterList(points);

      const container = document.getElementById("clusterList");
      expect(container.children.length).toBe(2); // 2 clusters
    });

    it("should group points by cluster", () => {
      const points = [
        { name: "Point 1", cluster: 0 },
        { name: "Point 2", cluster: 0 },
        { name: "Point 3", cluster: 1 },
      ];

      window.tripMap.updateClusterList(points);

      const container = document.getElementById("clusterList");
      expect(container.textContent).toContain("Cluster 1 (2 members)");
      expect(container.textContent).toContain("Cluster 2 (1 members)");
    });

    it("should handle outliers separately", () => {
      const points = [
        { name: "Point 1", cluster: 0 },
        { name: "Point 2", cluster: -1 },
      ];

      window.tripMap.updateClusterList(points);

      const container = document.getElementById("clusterList");
      expect(container.textContent).toContain("Outliers");
    });

    it("should sort clusters correctly", () => {
      const points = [
        { name: "Point 1", cluster: 2 },
        { name: "Point 2", cluster: 0 },
        { name: "Point 3", cluster: -1 },
        { name: "Point 4", cluster: 1 },
      ];

      window.tripMap.updateClusterList(points);

      const container = document.getElementById("clusterList");
      const clusterItems = Array.from(container.querySelectorAll(".cluster-title"));
      const titles = clusterItems.map((el) => el.textContent);

      // Outliers should be last
      expect(titles[titles.length - 1]).toContain("Outliers");
      // Regular clusters should be sorted numerically
      expect(titles[0]).toContain("Cluster 1");
    });

    it("should show cluster list container", () => {
      const points = [{ name: "Point 1", cluster: 0 }];

      window.tripMap.updateClusterList(points);

      const container = document.getElementById("clusterListContainer");
      expect(container.style.display).toBe("block");
    });
  });
});
