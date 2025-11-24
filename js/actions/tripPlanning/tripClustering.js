(() => {
  async function clusterAddresses() {
    // Clear previous routes and optimization data
    tripMap.getRouteLayer().clearLayers();
    optimized = [];
    document.getElementById("statDistance").textContent = "-";

    if (geocoded.length === 0) {
      tripUtils.log("❌ No geocoded points to cluster.");
      return;
    }

    const points = turf.featureCollection(
      geocoded.map((r) => turf.point([r.lon, r.lat], { ...r }))
    );

    const strategy = document.querySelector(
      'input[name="clusterStrategy"]:checked'
    ).value;
    tripUtils.log(`🔍 Clustering with strategy: ${strategy}...`);

    let clusteredFeatures;
    if (strategy === "byCount") {
      const k = parseInt(document.getElementById("clusterCount").value);
      if (isNaN(k) || k < 1) {
        tripUtils.log("❌ Invalid number of clusters.");
        return;
      }
      tripUtils.log(`Aiming for ${k} clusters.`);
      clusteredFeatures = turf.clustersKmeans(points, {
        numberOfClusters: k,
      }).features;
    } else {
      // bySize
      clusteredFeatures = clusterBySize(points);
    }

    // ALWAYS renumber clusters geographically for consistent IDs 0..N-1
    const finalFeatures = getGeographicallySortedClusters(clusteredFeatures);

    // Final mapping of properties
    clustered = finalFeatures.map((f) => f.properties);

    const finalClusterCount = new Set(
      clustered.map((c) => c.cluster).filter((c) => c !== undefined && c !== -1)
    ).size;
    tripUtils.log(`✅ Clustering complete. Found ${finalClusterCount} clusters.`);

    tripUtils.updateStats();
    tripMap.drawMarkers(clustered, true);
    tripMap.updateClusterList(clustered);
    const optimizeBtn = document.getElementById("optimizeBtn");
    optimizeBtn.disabled = false;
    optimizeBtn.title = ""; // Remove tooltip when enabled
  }

  function clusterBySize(points) {
    const minSize = parseInt(
      document.getElementById("minClusterSize").value
    );
    const maxSize = parseInt(
      document.getElementById("maxClusterSize").value
    );

    if (
      isNaN(minSize) ||
      isNaN(maxSize) ||
      minSize > maxSize ||
      minSize < 1
    ) {
      tripUtils.log("❌ Invalid min/max cluster size.");
      return points.features;
    }

    const initialK = Math.max(
      1,
      Math.round(points.features.length / ((minSize + maxSize) / 2))
    );
    tripUtils.log(`Initial guess: ${initialK} clusters.`);

    let features = turf.clustersKmeans(points, {
      numberOfClusters: initialK,
    }).features;
    let iteration = 0;
    const MAX_ITERATIONS = 30; // Increased iterations for finer adjustments

    while (iteration < MAX_ITERATIONS) {
      iteration++;
      let changesMade = false;

      let clusterMap = getClusterMap(features);
      const centroids = getClusterCentroids(clusterMap);

      const sortedClusters = Object.keys(clusterMap).sort(
        (a, b) => clusterMap[a].length - clusterMap[b].length
      );

      // --- Pass 1: Fix undersized clusters ---
      for (const clusterId of sortedClusters) {
        const cluster = clusterMap[clusterId];
        if (cluster && cluster.length < minSize) {
          // Find the absolute nearest point from any *other* cluster
          let bestCandidate = null;
          let bestDist = Infinity;
          let sourceClusterId = null;

          for (const otherId in clusterMap) {
            if (otherId === clusterId) continue;
            // Don't steal from a cluster that is already at min size
            if (clusterMap[otherId].length <= minSize) continue;

            for (const p1 of cluster) {
              for (const p2 of clusterMap[otherId]) {
                const d = turf.distance(p1, p2);
                if (d < bestDist) {
                  bestDist = d;
                  bestCandidate = p2;
                  sourceClusterId = otherId;
                }
              }
            }
          }

          if (bestCandidate) {
            tripUtils.log(
              `Stealing point "${bestCandidate.properties.name}" from cluster ${sourceClusterId} for undersized cluster ${clusterId}`
            );
            // Reassign the cluster property
            bestCandidate.properties.cluster = parseInt(clusterId);
            changesMade = true;
            // Re-build map for next iteration in this pass
            clusterMap = getClusterMap(features);
          }
        }
      }

      // --- Pass 2: Fix oversized clusters ---
      const reverseSortedClusters = Object.keys(clusterMap).sort(
        (a, b) => clusterMap[b].length - clusterMap[a].length
      );

      for (const clusterId of reverseSortedClusters) {
        const cluster = clusterMap[clusterId];
        if (cluster && cluster.length > maxSize) {
          // Find the point in this cluster that is farthest from its own centroid
          const centroid = centroids[clusterId];
          let farthestPoint = null;
          let maxDist = -1;
          for (const point of cluster) {
            const d = turf.distance(point, centroid);
            if (d > maxDist) {
              maxDist = d;
              farthestPoint = point;
            }
          }

          if (farthestPoint) {
            // Now find the nearest *other* cluster for this point
            let nearestClusterId = null;
            let minClusterDist = Infinity;
            for (const otherId in centroids) {
              if (otherId === clusterId) continue;
              // Don't move to a cluster that is already at max size
              if (clusterMap[otherId].length >= maxSize) continue;

              const d = turf.distance(farthestPoint, centroids[otherId]);
              if (d < minClusterDist) {
                minClusterDist = d;
                nearestClusterId = otherId;
              }
            }

            if (nearestClusterId) {
              tripUtils.log(
                `Shedding point "${farthestPoint.properties.name}" from oversized cluster ${clusterId} to cluster ${nearestClusterId}`
              );
              farthestPoint.properties.cluster = parseInt(nearestClusterId);
              changesMade = true;
              // Re-build map and centroids for next check
              clusterMap = getClusterMap(features);
              Object.assign(centroids, getClusterCentroids(clusterMap));
            }
          }
        }
      }

      if (!changesMade) {
        tripUtils.log(
          `✅ Clusters are stable after ${iteration} iterations. Exiting.`
        );
        break;
      }
    }

    if (iteration >= MAX_ITERATIONS) {
      tripUtils.log("⚠️ Reached max iterations. Sizes may not be perfect.");
    }

    // Final check on cluster sizes
    const finalClusterMap = getClusterMap(features);
    for (const id in finalClusterMap) {
      const size = finalClusterMap[id].length;
      if (size < minSize || size > maxSize) {
        tripUtils.log(
          `   - Warning: Final size for cluster ${id} is ${size} (Constraints: ${minSize}-${maxSize})`
        );
      }
    }

    return features;
  }

  function getClusterMap(features) {
    const map = {};
    features.forEach((f) => {
      const id = f.properties.cluster;
      if (!map[id]) map[id] = [];
      map[id].push(f);
    });
    return map;
  }

  function getClusterCentroids(clusterMap) {
    const centroids = {};
    for (const id in clusterMap) {
      if (clusterMap[id] && clusterMap[id].length > 0) {
        centroids[id] = turf.centroid(
          turf.featureCollection(clusterMap[id])
        );
      }
    }
    return centroids;
  }

  function getGeographicallySortedClusters(features) {
    tripUtils.log("🔢 Renumbering clusters based on geographic location...");
    let finalMap = {};
    features.forEach((f) => {
      const id = f.properties.cluster;
      if (!finalMap[id]) finalMap[id] = [];
      finalMap[id].push(f);
    });

    if (Object.keys(finalMap).length === 0) return [];

    const centroids = getClusterCentroids(finalMap);

    // Start with the northernmost cluster
    let sortedCentroidIds = Object.keys(centroids).sort((a, b) => {
      return (
        centroids[b].geometry.coordinates[1] -
        centroids[a].geometry.coordinates[1]
      );
    });

    let unvisited = new Set(sortedCentroidIds);
    let orderedClusterIds = [];
    let currentId = sortedCentroidIds[0];

    if (currentId) {
      orderedClusterIds.push(currentId);
      unvisited.delete(currentId);
    }

    while (unvisited.size > 0) {
      let nearest = { id: null, distance: Infinity };
      unvisited.forEach((unvisitedId) => {
        const dist = turf.distance(
          centroids[currentId],
          centroids[unvisitedId]
        );
        if (dist < nearest.distance) {
          nearest = { id: unvisitedId, distance: dist };
        }
      });
      if (nearest.id) {
        currentId = nearest.id;
        orderedClusterIds.push(currentId);
        unvisited.delete(currentId);
      } else {
        // Should not happen, but as a fallback, just add the rest
        orderedClusterIds.push(...Array.from(unvisited));
        break;
      }
    }

    const idMap = {};
    orderedClusterIds.forEach((oldId, newId) => {
      idMap[oldId] = newId;
    });

    let finalFeatures = [];
    features.forEach((f) => {
      const oldId = f.properties.cluster;
      if (idMap[oldId] !== undefined) {
        f.properties.cluster = idMap[oldId];
        finalFeatures.push(f);
      }
    });
    tripUtils.log("✅ Geographic renumbering complete.");
    return finalFeatures;
  }

  // Expose functions for testing
  if (typeof window !== "undefined") {
    window.tripClustering = {
      clusterAddresses,
      clusterBySize,
      getClusterMap,
      getClusterCentroids,
      getGeographicallySortedClusters,
    };
  }
})();
