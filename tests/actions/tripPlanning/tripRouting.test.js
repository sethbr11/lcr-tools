/**
 * Unit tests for tripRouting.js
 */

// CRITICAL: Restore real querySelector/querySelectorAll for this test suite
const realQuerySelector = Document.prototype.querySelector;
const realQuerySelectorAll = Document.prototype.querySelectorAll;
document.querySelector = realQuerySelector.bind(document);
document.querySelectorAll = realQuerySelectorAll.bind(document);

// Mock Turf.js
const mockTurf = {
  point: jest.fn((coords) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: coords },
  })),
  featureCollection: jest.fn((features) => ({ type: 'FeatureCollection', features })),
  centroid: jest.fn((collection) => {
    const coords = collection.features.map(f => f.geometry.coordinates);
    const avgLon = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
    const avgLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [avgLon, avgLat] },
    };
  }),
  distance: jest.fn((p1, p2, options) => {
    const [lon1, lat1] = p1.geometry.coordinates;
    const [lon2, lat2] = p2.geometry.coordinates;
    const dx = lon2 - lon1;
    const dy = lat2 - lat1;
    return Math.sqrt(dx * dx + dy * dy);
  }),
};

global.turf = mockTurf;

// Mock tripUtils functions and state
// Mock tripUtils functions and state
window.tripUtils = {
  log: jest.fn(),
  updateStats: jest.fn(),
  sleep: jest.fn(),
};

window.tripMap = {
  drawRoutes: jest.fn(),
};

window.tripGeocoding = {
  geocodeAddressMulti: jest.fn(),
};

// Mock global state
global.clustered = [];
global.optimized = [];

require("../../../js/actions/tripPlanning/tripRouting.js");

describe("Trip Routing Utilities", () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <input type="radio" name="distanceMetric" value="straight" checked />
      <input type="radio" name="distanceMetric" value="mapbox" />
      <input id="apiKey" value="" />
      <input id="startingAddressInput" value="" />
      <select id="geocodeProvider"><option value="nominatim">Nominatim</option></select>
      <button id="optimizeBtn">Optimize</button>
      <button id="exportCsvBtn" disabled>Export CSV</button>
      <button id="exportPdfBtn" disabled>Export PDF</button>
    `;

    // Reset global state
    global.clustered = [];
    global.optimized = [];

    // Clear all mocks
    // Clear all mocks
    window.tripUtils.log.mockClear();
    window.tripUtils.updateStats.mockClear();
    window.tripMap.drawRoutes.mockClear();
    window.tripGeocoding.geocodeAddressMulti.mockClear();
    global.fetch = jest.fn();
    mockTurf.point.mockClear();
    mockTurf.featureCollection.mockClear();
    mockTurf.centroid.mockClear();
    mockTurf.distance.mockClear();
  });

  describe("getMapboxTravelMatrix", () => {
    it("should return empty matrix for 0 points", async () => {
      const matrix = await window.tripRouting.getMapboxTravelMatrix([], "test-key");
      expect(matrix).toEqual([]);
    });

    it("should return 1x1 matrix for single point", async () => {
      const points = [{ lat: 37.7749, lon: -122.4194 }];
      const matrix = await window.tripRouting.getMapboxTravelMatrix(points, "test-key");
      
      expect(matrix).toEqual([[0]]);
    });

    it("should fetch travel matrix from Mapbox API", async () => {
      const points = [
        { lat: 37.7749, lon: -122.4194 },
        { lat: 37.7849, lon: -122.4094 },
      ];

      global.fetch.mockResolvedValueOnce({
        json: async () => ({
          code: "Ok",
          durations: [[0, 300], [300, 0]],
        }),
      });

      const matrix = await window.tripRouting.getMapboxTravelMatrix(points, "test-key");

      expect(global.fetch).toHaveBeenCalled();
      expect(matrix).toHaveLength(2);
      expect(matrix[0]).toHaveLength(2);
    });

    it("should handle API errors gracefully", async () => {
      const points = [
        { lat: 37.7749, lon: -122.4194 },
        { lat: 37.7849, lon: -122.4094 },
      ];

      global.fetch.mockResolvedValueOnce({
        json: async () => ({
          code: "Error",
          message: "Invalid request",
        }),
      });

      const matrix = await window.tripRouting.getMapboxTravelMatrix(points, "test-key");

      expect(matrix).toHaveLength(2);
      // Should have initialized matrix with zeros
      expect(matrix[0][0]).toBe(0);
    });

    it("should handle network errors", async () => {
      const points = [
        { lat: 37.7749, lon: -122.4194 },
        { lat: 37.7849, lon: -122.4094 },
      ];

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const matrix = await window.tripRouting.getMapboxTravelMatrix(points, "test-key");

      expect(matrix).toHaveLength(2);
    });
  });

  describe("solveTspWithMatrix", () => {
    it("should return points unchanged for less than 2 points", () => {
      const points = [{ name: "P1", lat: 0, lon: 0 }];
      const matrix = [[0]];

      const result = window.tripRouting.solveTspWithMatrix(matrix, points);

      expect(result.orderedPoints).toEqual(points);
      expect(result.totalDistance).toBe(0);
    });

    it("should solve TSP using nearest neighbor with matrix", () => {
      const points = [
        { name: "P1", lat: 0, lon: 0 },
        { name: "P2", lat: 1, lon: 1 },
        { name: "P3", lat: 2, lon: 2 },
      ];
      const matrix = [
        [0, 100, 200],
        [100, 0, 150],
        [200, 150, 0],
      ];

      const result = window.tripRouting.solveTspWithMatrix(matrix, points);

      expect(result.orderedPoints).toHaveLength(3);
      expect(result.totalDistance).toBeGreaterThan(0);
    });

    it("should respect starting point", () => {
      const points = [
        { name: "P1", lat: 0, lon: 0 },
        { name: "P2", lat: 1, lon: 1 },
        { name: "P3", lat: 2, lon: 2 },
      ];
      const matrix = [
        [0, 100, 200],
        [100, 0, 150],
        [200, 150, 0],
      ];
      const startPoint = points[1]; // Start from P2

      const result = window.tripRouting.solveTspWithMatrix(matrix, points, startPoint);

      expect(result.orderedPoints[0]).toEqual(startPoint);
    });

    it("should convert duration from seconds to minutes", () => {
      const points = [
        { name: "P1", lat: 0, lon: 0 },
        { name: "P2", lat: 1, lon: 1 },
      ];
      const matrix = [
        [0, 600], // 600 seconds = 10 minutes
        [600, 0],
      ];

      const result = window.tripRouting.solveTspWithMatrix(matrix, points);

      expect(result.totalDistance).toBe(10); // Should be in minutes
    });
  });

  describe("getDistance", () => {
    it("should calculate straight-line distance using Turf", async () => {
      const p1 = { lat: 37.7749, lon: -122.4194 };
      const p2 = { lat: 37.7849, lon: -122.4094 };

      const distance = await window.tripRouting.getDistance(p1, p2, "straight", null);

      expect(mockTurf.distance).toHaveBeenCalled();
      expect(distance).toBeGreaterThan(0);
    });

    it("should fetch distance from Mapbox API when metric is mapbox", async () => {
      const p1 = { lat: 37.7749, lon: -122.4194 };
      const p2 = { lat: 37.7849, lon: -122.4094 };

      global.fetch.mockResolvedValueOnce({
        json: async () => ({
          routes: [{ duration: 600 }], // 600 seconds = 10 minutes
        }),
      });

      const distance = await window.tripRouting.getDistance(p1, p2, "mapbox", "test-key");

      expect(global.fetch).toHaveBeenCalled();
      expect(distance).toBe(10); // Should be in minutes
    });

    it("should return Infinity when Mapbox API fails", async () => {
      const p1 = { lat: 37.7749, lon: -122.4194 };
      const p2 = { lat: 37.7849, lon: -122.4094 };

      global.fetch.mockResolvedValueOnce({
        json: async () => ({
          routes: [],
        }),
      });

      const distance = await window.tripRouting.getDistance(p1, p2, "mapbox", "test-key");

      expect(distance).toBe(Infinity);
    });
  });

  describe("solveTspNearestNeighbor", () => {
    it("should return empty array for no points", async () => {
      const route = await window.tripRouting.solveTspNearestNeighbor([]);
      expect(route).toEqual([]);
    });

    it("should return single point for one point", async () => {
      const points = [{ lat: 0, lon: 0, name: "P1" }];
      const route = await window.tripRouting.solveTspNearestNeighbor(points);
      
      expect(route).toHaveLength(1);
      expect(route[0]).toEqual(points[0]);
    });

    it("should solve TSP using nearest neighbor heuristic", async () => {
      const points = [
        { lat: 0, lon: 0, name: "P1" },
        { lat: 1, lon: 1, name: "P2" },
        { lat: 2, lon: 2, name: "P3" },
      ];

      const route = await window.tripRouting.solveTspNearestNeighbor(points);

      expect(route).toHaveLength(3);
      expect(route).toContain(points[0]);
      expect(route).toContain(points[1]);
      expect(route).toContain(points[2]);
    });

    it("should respect starting point", async () => {
      const points = [
        { lat: 0, lon: 0, name: "P1" },
        { lat: 1, lon: 1, name: "P2" },
        { lat: 2, lon: 2, name: "P3" },
      ];
      const startPoint = points[1];

      const route = await window.tripRouting.solveTspNearestNeighbor(points, startPoint);

      expect(route[0]).toEqual(startPoint);
    });

    it("should handle external starting point", async () => {
      const points = [
        { lat: 0, lon: 0, name: "P1" },
        { lat: 1, lon: 1, name: "P2" },
      ];
      const startPoint = { lat: 5, lon: 5, name: "External" };

      const route = await window.tripRouting.solveTspNearestNeighbor(points, startPoint);

      expect(route[0]).toEqual(startPoint);
    });

    it("should reserve exit node when target end point is provided", async () => {
      const points = [
        { lat: 0, lon: 0, name: "P1" },
        { lat: 1, lon: 1, name: "P2" },
        { lat: 2, lon: 2, name: "P3" },
      ];
      const targetEndPoint = { lat: 2.1, lon: 2.1 }; // Close to P3

      const route = await window.tripRouting.solveTspNearestNeighbor(points, null, targetEndPoint);

      // P3 should be last since it's closest to targetEndPoint
      expect(route[route.length - 1].name).toBe("P3");
    });
  });

  describe("findBestInternalRoute", () => {
    it("should find route for cluster points", async () => {
      const points = [
        { lat: 0, lon: 0, name: "P1", cluster: 0 },
        { lat: 1, lon: 1, name: "P2", cluster: 0 },
      ];

      const result = await window.tripRouting.findBestInternalRoute(points, "straight", null);

      expect(result.cluster).toBe(0);
      expect(result.points).toHaveLength(2);
      expect(result.distance).toBeGreaterThanOrEqual(0);
    });

    it("should respect starting point", async () => {
      const points = [
        { lat: 0, lon: 0, name: "P1", cluster: 0 },
        { lat: 1, lon: 1, name: "P2", cluster: 0 },
      ];
      const startingPoint = { lat: -1, lon: -1, name: "Start" };

      const result = await window.tripRouting.findBestInternalRoute(
        points,
        "straight",
        null,
        startingPoint
      );

      // Starting point should not be in final route (external point)
      expect(result.points.every(p => p.name !== "Start")).toBe(true);
    });

    it("should handle target end point", async () => {
      const points = [
        { lat: 0, lon: 0, name: "P1", cluster: 0 },
        { lat: 1, lon: 1, name: "P2", cluster: 0 },
        { lat: 2, lon: 2, name: "P3", cluster: 0 },
      ];
      const targetEndPoint = { lat: 2.1, lon: 2.1 };

      const result = await window.tripRouting.findBestInternalRoute(
        points,
        "straight",
        null,
        null,
        targetEndPoint
      );

      // Last point should be closest to target
      expect(result.points[result.points.length - 1].name).toBe("P3");
    });

    it("should calculate total distance", async () => {
      const points = [
        { lat: 0, lon: 0, name: "P1", cluster: 0 },
        { lat: 1, lon: 1, name: "P2", cluster: 0 },
      ];

      const result = await window.tripRouting.findBestInternalRoute(points, "straight", null);

      expect(result.distance).toBeGreaterThan(0);
    });
  });

  describe("optimizeRoutes", () => {
    beforeEach(() => {
      global.clustered = [
        { lat: 37.7749, lon: -122.4194, name: "P1", cluster: 0 },
        { lat: 37.7849, lon: -122.4094, name: "P2", cluster: 0 },
        { lat: 37.7949, lon: -122.3994, name: "P3", cluster: 1 },
      ];
    });

    it("should handle empty clustered array", async () => {
      global.clustered = [];

      await window.tripRouting.optimizeRoutes();

      expect(window.tripUtils.log).toHaveBeenCalledWith("❌ No clustered points to optimize.");
    });

    it("should disable optimize button during optimization", async () => {
      const optimizeBtn = document.getElementById("optimizeBtn");

      // Start optimization (don't await to check intermediate state)
      const promise = window.tripRouting.optimizeRoutes();

      // Check button is disabled immediately
      expect(optimizeBtn.disabled).toBe(true);
      expect(optimizeBtn.textContent).toBe("Optimizing...");

      await promise;
    });

    it("should enable export buttons after optimization", async () => {
      await window.tripRouting.optimizeRoutes();

      expect(document.getElementById("exportCsvBtn").disabled).toBe(false);
      expect(document.getElementById("exportPdfBtn").disabled).toBe(false);
    });

    it("should update global optimized state", async () => {
      await window.tripRouting.optimizeRoutes();

      expect(global.optimized.length).toBeGreaterThan(0);
    });

    it("should call drawRoutes with optimized data", async () => {
      await window.tripRouting.optimizeRoutes();

      expect(window.tripMap.drawRoutes).toHaveBeenCalledWith(expect.any(Array));
    });

    it("should call updateStats after optimization", async () => {
      await window.tripRouting.optimizeRoutes();

      expect(window.tripUtils.updateStats).toHaveBeenCalled();
    });

    it("should handle starting address geocoding", async () => {
      document.getElementById("startingAddressInput").value = "123 Main St";
      window.tripGeocoding.geocodeAddressMulti.mockResolvedValueOnce({
        lat: 37.7649,
        lon: -122.4294,
      });

      await window.tripRouting.optimizeRoutes();

      expect(window.tripGeocoding.geocodeAddressMulti).toHaveBeenCalledWith(
        "123 Main St",
        "nominatim",
        ""
      );
    });

    it("should handle failed starting address geocoding", async () => {
      document.getElementById("startingAddressInput").value = "Invalid Address";
      window.tripGeocoding.geocodeAddressMulti.mockResolvedValueOnce(null);

      await window.tripRouting.optimizeRoutes();

      expect(window.tripUtils.log).toHaveBeenCalledWith(
        expect.stringContaining("❌ Could not geocode starting address")
      );
    });

    it("should require API key for mapbox metric", async () => {
      document.querySelector('input[name="distanceMetric"][value="mapbox"]').checked = true;
      document.getElementById("apiKey").value = "";

      await window.tripRouting.optimizeRoutes();

      expect(window.tripUtils.log).toHaveBeenCalledWith(
        "❌ Road Network metric requires a Mapbox API key."
      );
    });

    it("should skip outliers (cluster -1)", async () => {
      global.clustered = [
        { lat: 37.7749, lon: -122.4194, name: "P1", cluster: 0 },
        { lat: 37.7849, lon: -122.4094, name: "Outlier", cluster: -1 },
      ];

      await window.tripRouting.optimizeRoutes();

      // Should only have 1 cluster (cluster 0)
      expect(global.optimized.length).toBe(1);
    });

    it("should log completion message", async () => {
      await window.tripRouting.optimizeRoutes();

      expect(window.tripUtils.log).toHaveBeenCalledWith("✅ Route optimization complete.");
    });
  });
});
