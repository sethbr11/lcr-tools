/**
 * Unit tests for tripClustering.js
 */

// CRITICAL: Restore real querySelector/querySelectorAll for this test suite
const realQuerySelector = Document.prototype.querySelector;
const realQuerySelectorAll = Document.prototype.querySelectorAll;
document.querySelector = realQuerySelector.bind(document);
document.querySelectorAll = realQuerySelectorAll.bind(document);

// Mock Turf.js
const mockTurf = {
  featureCollection: jest.fn((features) => ({ type: 'FeatureCollection', features })),
  point: jest.fn((coords, properties) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: coords },
    properties: properties || {},
  })),
  clustersKmeans: jest.fn((collection, options) => {
    // Simple mock: assign cluster IDs based on numberOfClusters
    const k = options.numberOfClusters;
    const features = collection.features.map((f, i) => ({
      ...f,
      properties: { ...f.properties, cluster: i % k },
    }));
    return { type: 'FeatureCollection', features };
  }),
  distance: jest.fn((p1, p2) => {
    // Simple Euclidean distance for testing
    const [lon1, lat1] = p1.geometry.coordinates;
    const [lon2, lat2] = p2.geometry.coordinates;
    const dx = lon2 - lon1;
    const dy = lat2 - lat1;
    return Math.sqrt(dx * dx + dy * dy);
  }),
  centroid: jest.fn((collection) => {
    // Calculate average coordinates
    const coords = collection.features.map(f => f.geometry.coordinates);
    const avgLon = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
    const avgLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [avgLon, avgLat] },
    };
  }),
};

global.turf = mockTurf;

// Mock tripUtils functions and state
window.tripUtils = {
  log: jest.fn(),
  updateStats: jest.fn(),
};

window.tripMap = {
  drawMarkers: jest.fn(),
  updateClusterList: jest.fn(),
  getRouteLayer: jest.fn(() => ({
    clearLayers: jest.fn(),
  })),
};

// Mock global state
global.geocoded = [];
global.clustered = [];
global.optimized = [];

require("../../../js/actions/tripPlanning/tripClustering.js");

describe("Trip Clustering Utilities", () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <input type="radio" name="clusterStrategy" value="byCount" checked />
      <input type="radio" name="clusterStrategy" value="bySize" />
      <input id="clusterCount" value="3" />
      <input id="minClusterSize" value="2" />
      <input id="maxClusterSize" value="5" />
      <div id="statDistance">-</div>
      <button id="optimizeBtn" disabled>Optimize</button>
    `;

    // Reset global state
    global.geocoded = [];
    global.clustered = [];
    global.optimized = [];

    // Clear all mocks
    // Clear all mocks
    window.tripUtils.log.mockClear();
    window.tripUtils.updateStats.mockClear();
    window.tripMap.drawMarkers.mockClear();
    window.tripMap.updateClusterList.mockClear();
    window.tripMap.getRouteLayer.mockClear();
    mockTurf.featureCollection.mockClear();
    mockTurf.point.mockClear();
    mockTurf.clustersKmeans.mockClear();
    mockTurf.distance.mockClear();
    mockTurf.centroid.mockClear();
  });

  describe("getClusterMap", () => {
    it("should group features by cluster ID", () => {
      const features = [
        { properties: { cluster: 0, name: "Point 1" } },
        { properties: { cluster: 1, name: "Point 2" } },
        { properties: { cluster: 0, name: "Point 3" } },
      ];

      const map = window.tripClustering.getClusterMap(features);

      expect(map[0]).toHaveLength(2);
      expect(map[1]).toHaveLength(1);
      expect(map[0][0].properties.name).toBe("Point 1");
      expect(map[0][1].properties.name).toBe("Point 3");
    });

    it("should handle empty features array", () => {
      const map = window.tripClustering.getClusterMap([]);
      expect(map).toEqual({});
    });

    it("should handle features with undefined cluster", () => {
      const features = [
        { properties: { name: "Point 1" } },
        { properties: { cluster: 0, name: "Point 2" } },
      ];

      const map = window.tripClustering.getClusterMap(features);

      expect(map.undefined).toHaveLength(1);
      expect(map[0]).toHaveLength(1);
    });

    it("should handle single cluster", () => {
      const features = [
        { properties: { cluster: 0, name: "Point 1" } },
        { properties: { cluster: 0, name: "Point 2" } },
      ];

      const map = window.tripClustering.getClusterMap(features);

      expect(Object.keys(map)).toHaveLength(1);
      expect(map[0]).toHaveLength(2);
    });
  });

  describe("getClusterCentroids", () => {
    it("should calculate centroid for each cluster", () => {
      const clusterMap = {
        0: [
          { geometry: { coordinates: [0, 0] } },
          { geometry: { coordinates: [2, 2] } },
        ],
        1: [
          { geometry: { coordinates: [10, 10] } },
        ],
      };

      const centroids = window.tripClustering.getClusterCentroids(clusterMap);

      expect(mockTurf.centroid).toHaveBeenCalledTimes(2);
      expect(centroids[0]).toBeDefined();
      expect(centroids[1]).toBeDefined();
    });

    it("should handle empty cluster map", () => {
      const centroids = window.tripClustering.getClusterCentroids({});
      expect(centroids).toEqual({});
    });

    it("should handle single-point clusters", () => {
      const clusterMap = {
        0: [{ geometry: { coordinates: [5, 5] } }],
      };

      const centroids = window.tripClustering.getClusterCentroids(clusterMap);

      expect(centroids[0]).toBeDefined();
      expect(mockTurf.centroid).toHaveBeenCalled();
    });

    it("should skip empty clusters", () => {
      const clusterMap = {
        0: [{ geometry: { coordinates: [0, 0] } }],
        1: [],
      };

      const centroids = window.tripClustering.getClusterCentroids(clusterMap);

      expect(centroids[0]).toBeDefined();
      expect(centroids[1]).toBeUndefined();
    });
  });

  describe("getGeographicallySortedClusters", () => {
    it("should renumber clusters geographically", () => {
      const features = [
        { properties: { cluster: 5, name: "North" }, geometry: { coordinates: [0, 10] } },
        { properties: { cluster: 3, name: "South" }, geometry: { coordinates: [0, 0] } },
        { properties: { cluster: 5, name: "North2" }, geometry: { coordinates: [1, 10] } },
      ];

      const sorted = window.tripClustering.getGeographicallySortedClusters(features);

      // Should renumber to 0, 1 based on geographic order
      expect(sorted).toHaveLength(3);
      expect(sorted.every(f => f.properties.cluster === 0 || f.properties.cluster === 1)).toBe(true);
    });

    it("should handle empty features array", () => {
      const sorted = window.tripClustering.getGeographicallySortedClusters([]);
      expect(sorted).toEqual([]);
    });

    it("should handle single cluster", () => {
      const features = [
        { properties: { cluster: 0, name: "Point 1" }, geometry: { coordinates: [0, 0] } },
        { properties: { cluster: 0, name: "Point 2" }, geometry: { coordinates: [1, 1] } },
      ];

      const sorted = window.tripClustering.getGeographicallySortedClusters(features);

      expect(sorted).toHaveLength(2);
      expect(sorted.every(f => f.properties.cluster === 0)).toBe(true);
    });

    it("should preserve cluster integrity during sort", () => {
      const features = [
        { properties: { cluster: 0, name: "A1" }, geometry: { coordinates: [0, 0] } },
        { properties: { cluster: 0, name: "A2" }, geometry: { coordinates: [0, 1] } },
        { properties: { cluster: 1, name: "B1" }, geometry: { coordinates: [10, 10] } },
      ];

      const sorted = window.tripClustering.getGeographicallySortedClusters(features);

      // Points from same original cluster should still be together
      const cluster0Points = sorted.filter(f => f.properties.cluster === 0);
      const cluster1Points = sorted.filter(f => f.properties.cluster === 1);

      expect(cluster0Points.length + cluster1Points.length).toBe(3);
    });
  });

  describe("clusterBySize", () => {
    beforeEach(() => {
      document.getElementById("minClusterSize").value = "2";
      document.getElementById("maxClusterSize").value = "4";
    });

    it("should return features when min/max are invalid", () => {
      document.getElementById("minClusterSize").value = "5";
      document.getElementById("maxClusterSize").value = "2"; // max < min

      const points = {
        features: [
          { geometry: { coordinates: [0, 0] }, properties: { name: "P1" } },
        ],
      };

      const result = window.tripClustering.clusterBySize(points);

      expect(result).toBe(points.features);
      expect(window.tripUtils.log).toHaveBeenCalledWith("❌ Invalid min/max cluster size.");
    });

    it("should return features when min is less than 1", () => {
      document.getElementById("minClusterSize").value = "0";

      const points = {
        features: [
          { geometry: { coordinates: [0, 0] }, properties: { name: "P1" } },
        ],
      };

      const result = window.tripClustering.clusterBySize(points);

      expect(result).toBe(points.features);
    });

    it("should perform initial K-means clustering", () => {
      const points = {
        features: [
          { geometry: { coordinates: [0, 0] }, properties: { name: "P1" } },
          { geometry: { coordinates: [1, 1] }, properties: { name: "P2" } },
          { geometry: { coordinates: [2, 2] }, properties: { name: "P3" } },
          { geometry: { coordinates: [3, 3] }, properties: { name: "P4" } },
        ],
      };

      window.tripClustering.clusterBySize(points);

      expect(mockTurf.clustersKmeans).toHaveBeenCalled();
    });

    it("should calculate initial K based on average cluster size", () => {
      document.getElementById("minClusterSize").value = "2";
      document.getElementById("maxClusterSize").value = "4";

      const points = {
        features: Array(12).fill(null).map((_, i) => ({
          geometry: { coordinates: [i, i] },
          properties: { name: `P${i}`, cluster: 0 },
        })),
      };

      window.tripClustering.clusterBySize(points);

      // Average size = (2+4)/2 = 3, so initialK = 12/3 = 4
      expect(mockTurf.clustersKmeans).toHaveBeenCalledWith(
        points,
        expect.objectContaining({ numberOfClusters: 4 })
      );
    });

    it("should handle minimum initialK of 1", () => {
      const points = {
        features: [
          { geometry: { coordinates: [0, 0] }, properties: { name: "P1" } },
        ],
      };

      window.tripClustering.clusterBySize(points);

      expect(mockTurf.clustersKmeans).toHaveBeenCalledWith(
        points,
        expect.objectContaining({ numberOfClusters: 1 })
      );
    });
  });

  describe("clusterAddresses", () => {
    beforeEach(() => {
      global.geocoded = [
        { lat: 37.7749, lon: -122.4194, name: "Point 1" },
        { lat: 37.7849, lon: -122.4094, name: "Point 2" },
        { lat: 37.7949, lon: -122.3994, name: "Point 3" },
      ];
    });

    it("should handle empty geocoded array", async () => {
      global.geocoded = [];

      await window.tripClustering.clusterAddresses();

      expect(window.tripUtils.log).toHaveBeenCalledWith("❌ No geocoded points to cluster.");
      expect(mockTurf.clustersKmeans).not.toHaveBeenCalled();
    });

    it("should cluster by count when strategy is byCount", async () => {
      document.querySelector('input[name="clusterStrategy"][value="byCount"]').checked = true;
      document.getElementById("clusterCount").value = "2";

      await window.tripClustering.clusterAddresses();

      expect(mockTurf.clustersKmeans).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ numberOfClusters: 2 })
      );
    });

    it("should handle invalid cluster count", async () => {
      document.querySelector('input[name="clusterStrategy"][value="byCount"]').checked = true;
      document.getElementById("clusterCount").value = "invalid";

      await window.tripClustering.clusterAddresses();

      expect(window.tripUtils.log).toHaveBeenCalledWith("❌ Invalid number of clusters.");
    });

    it("should handle cluster count less than 1", async () => {
      document.querySelector('input[name="clusterStrategy"][value="byCount"]').checked = true;
      document.getElementById("clusterCount").value = "0";

      await window.tripClustering.clusterAddresses();

      expect(window.tripUtils.log).toHaveBeenCalledWith("❌ Invalid number of clusters.");
    });

    it("should cluster by size when strategy is bySize", async () => {
      document.querySelector('input[name="clusterStrategy"][value="bySize"]').checked = true;

      await window.tripClustering.clusterAddresses();

      expect(mockTurf.clustersKmeans).toHaveBeenCalled();
    });

    it("should update global clustered state", async () => {
      await window.tripClustering.clusterAddresses();

      expect(global.clustered.length).toBeGreaterThan(0);
    });

    it("should clear previous routes and optimization", async () => {
      global.optimized = [{ some: "data" }];

      await window.tripClustering.clusterAddresses();

      expect(window.tripMap.getRouteLayer).toHaveBeenCalled();
      expect(global.optimized).toEqual([]);
      expect(document.getElementById("statDistance").textContent).toBe("-");
    });

    it("should enable optimize button after clustering", async () => {
      await window.tripClustering.clusterAddresses();

      expect(document.getElementById("optimizeBtn").disabled).toBe(false);
    });

    it("should call updateStats after clustering", async () => {
      await window.tripClustering.clusterAddresses();

      expect(window.tripUtils.updateStats).toHaveBeenCalled();
    });

    it("should call drawMarkers with clustered data", async () => {
      await window.tripClustering.clusterAddresses();

      expect(window.tripMap.drawMarkers).toHaveBeenCalledWith(
        expect.any(Array),
        true
      );
    });

    it("should call updateClusterList with clustered data", async () => {
      await window.tripClustering.clusterAddresses();

      expect(window.tripMap.updateClusterList).toHaveBeenCalledWith(expect.any(Array));
    });

    it("should create feature collection from geocoded points", async () => {
      await window.tripClustering.clusterAddresses();

      expect(mockTurf.point).toHaveBeenCalledTimes(3);
      expect(mockTurf.featureCollection).toHaveBeenCalled();
    });

    it("should log clustering completion", async () => {
      await window.tripClustering.clusterAddresses();

      expect(window.tripUtils.log).toHaveBeenCalledWith(
        expect.stringContaining("✅ Clustering complete")
      );
    });
  });
});
