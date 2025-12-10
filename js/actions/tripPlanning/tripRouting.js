(() => {
  async function getMapboxTravelMatrix(points, apiKey) {
    const numPoints = points.length;
    if (numPoints < 2) {
      if (numPoints === 1) {
        return [[0]]; // A 1x1 matrix with 0 distance from itself
      }
      return []; // Empty matrix for 0 points
    }

    const MAX_COORDS_PER_REQUEST = 12; // Mapbox limits to 12 sources/destinations, 25 total coordinates (sources + destinations)
    const fullMatrix = Array(numPoints)
      .fill(null)
      .map(() => Array(numPoints).fill(0));

    for (let i = 0; i < numPoints; i += MAX_COORDS_PER_REQUEST) {
      for (let j = 0; j < numPoints; j += MAX_COORDS_PER_REQUEST) {
        const sourcesBatch = points.slice(
          i,
          Math.min(i + MAX_COORDS_PER_REQUEST, numPoints)
        );
        const destinationsBatch = points.slice(
          j,
          Math.min(j + MAX_COORDS_PER_REQUEST, numPoints)
        );

        // Mapbox requires at least 2 points for a matrix API call if sources != destinations, or a special case for sources=destinations
        // For general batching, ensure both sourcesBatch and destinationsBatch have points
        if (sourcesBatch.length < 1 || destinationsBatch.length < 1) continue;

        let url;
        let allBatchPoints = [];
        let sourceIndices = [];
        let destinationIndices = [];

        // Construct request to handle cases where sources and destinations are from the same batch or different
        if (i === j && sourcesBatch.length === destinationsBatch.length) {
          // Square sub-matrix
          allBatchPoints = sourcesBatch;
          if (allBatchPoints.length < 2) continue; // Skip if too few points for a square matrix batch
          sourceIndices = Array.from(
            { length: allBatchPoints.length },
            (_, k) => k
          );
          destinationIndices = Array.from(
            { length: allBatchPoints.length },
            (_, k) => k
          );
        } else {
          // Rectangular sub-matrix
          allBatchPoints = sourcesBatch.concat(destinationsBatch);
          if (allBatchPoints.length < 2) continue; // Skip if too few points for a rectangular matrix batch
          sourceIndices = Array.from(
            { length: sourcesBatch.length },
            (_, k) => k
          );
          destinationIndices = Array.from(
            { length: destinationsBatch.length },
            (_, k) => sourcesBatch.length + k
          );
        }

        url = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${allBatchPoints
          .map((p) => `${p.lon},${p.lat}`)
          .join(
            ";"
          )}/?access_token=${apiKey}&annotations=duration&sources=${sourceIndices.join(
          ";"
        )}&destinations=${destinationIndices.join(";")}`;

        try {
          const response = await fetch(url);
          const data = await response.json();

          if (data.code !== "Ok") {
            console.error("Mapbox Matrix API error:", data);
            continue;
          }

          const durations = data.durations;
          // Map the batch results back to the full matrix
          for (let r = 0; r < sourceIndices.length; r++) {
            for (let c = 0; c < destinationIndices.length; c++) {
              if (fullMatrix[i + r] && fullMatrix[i + r][j + c] !== undefined) {
                fullMatrix[i + r][j + c] = durations[r][c];
              }
            }
          }
        } catch (error) {
          console.error("Error fetching Mapbox matrix:", error);
        }
      }
    }
    return fullMatrix;
  }

  function solveTspWithMatrix(
    matrix,
    points,
    startPoint = null,
    targetEndPoint = null
  ) {
    if (points.length < 2) return { orderedPoints: points, totalDistance: 0 };

    const pointIndexMap = new Map(points.map((p, i) => [p.name, i]));
    let unvisitedIndices = new Set(points.map((_, i) => i));
    let orderedPoints = [];
    let totalDuration = 0;

    let startIndex = 0;
    if (startPoint) {
      startIndex = pointIndexMap.get(startPoint.name);
    }

    orderedPoints.push(points[startIndex]);
    unvisitedIndices.delete(startIndex);
    let currentIndex = startIndex;

    // Handle Target End Point (Look Ahead)
    let exitIndex = -1;
    if (targetEndPoint && unvisitedIndices.size > 0) {
      let minExitDist = Infinity;

      unvisitedIndices.forEach((i) => {
        const p = points[i];
        // Use straight line distance for this heuristic
        const dist = turf.distance(
          turf.point([p.lon, p.lat]),
          turf.point([targetEndPoint.lon, targetEndPoint.lat]),
          { units: "miles" }
        );

        if (dist < minExitDist) {
          minExitDist = dist;
          exitIndex = i;
        }
      });

      if (exitIndex !== -1) {
        unvisitedIndices.delete(exitIndex);
      }
    }

    while (unvisitedIndices.size > 0) {
      let nearest = { index: -1, duration: Infinity };
      unvisitedIndices.forEach((unvisitedIndex) => {
        const duration = matrix[currentIndex][unvisitedIndex];
        if (duration < nearest.duration) {
          nearest = { index: unvisitedIndex, duration: duration };
        }
      });

      if (nearest.index !== -1) {
        totalDuration += nearest.duration;
        currentIndex = nearest.index;
        orderedPoints.push(points[currentIndex]);
        unvisitedIndices.delete(currentIndex);
      } else {
        break;
      }
    }

    // Append the exit node if one was reserved
    if (exitIndex !== -1) {
      // Add duration from last point to exit point
      totalDuration += matrix[currentIndex][exitIndex];
      orderedPoints.push(points[exitIndex]);
    }

    // The distance here is in seconds, convert to minutes for display maybe?
    return { orderedPoints, totalDistance: totalDuration / 60 };
  }

  async function optimizeRoutes() {
    if (clustered.length === 0) {
      tripUtils.log("❌ No clustered points to optimize.");
      return;
    }

    const optimizeBtn = document.getElementById("optimizeBtn");
    const setOptimizeBtn = (disabled, label, useHtml = false) => {
      if (!optimizeBtn) return;
      optimizeBtn.disabled = !!disabled;
      if (label !== undefined) {
        if (useHtml) optimizeBtn.innerHTML = label;
        else optimizeBtn.textContent = label;
      }
    };

    setOptimizeBtn(true, '<span class="spinner"></span> Optimizing...', true);

    try {
      tripUtils.log("🚗 Optimizing routes for each cluster...");

      const metric = document.querySelector(
        'input[name="distanceMetric"]:checked'
      ).value;
      const apiKey = document.getElementById("apiKey").value;
      const startingAddress = document
        .getElementById("startingAddressInput")
        .value.trim();

      let geocodedStartingPoint = null;
      if (startingAddress) {
        tripUtils.log(`🌐 Geocoding starting address: ${startingAddress}...`);
        const provider = document.getElementById("geocodeProvider").value; // Use the selected geocoding provider
        geocodedStartingPoint = await tripGeocoding.geocodeAddressMulti(
          startingAddress,
          provider,
          apiKey
        );
        if (!geocodedStartingPoint) {
          tripUtils.log(
            `❌ Could not geocode starting address: ${startingAddress}. Please check the address.`
          );
          alert(
            `Could not geocode starting address: "${startingAddress}". Please check the address.`
          );
          setOptimizeBtn(false, "Optimize Routes");
          return;
        }
        geocodedStartingPoint = {
          name: "Starting Point", // Assign a name for identification in TSP
          address: startingAddress,
          lat: geocodedStartingPoint.lat,
          lon: geocodedStartingPoint.lon,
        };
        tripUtils.log(
          `✅ Starting address geocoded: [${geocodedStartingPoint.lat.toFixed(
            6
          )}, ${geocodedStartingPoint.lon.toFixed(6)}]`
        );
      }

      if (metric === "mapbox" && !apiKey) {
        tripUtils.log("❌ Road Network metric requires a Mapbox API key.");
        setOptimizeBtn(false, "Optimize Routes");
        return;
      }

      const clusters = {};
      clustered.forEach((p) => {
        if (p.cluster === -1) return;
        if (!clusters[p.cluster]) clusters[p.cluster] = [];
        clusters[p.cluster].push(p);
      });

      // Sort clusters geographically (North to South) to determine processing order
      const clusterCentroids = {};
      for (const id in clusters) {
        const points = clusters[id].map((p) => turf.point([p.lon, p.lat]));
        clusterCentroids[id] = turf.centroid(turf.featureCollection(points));
      }

      const sortedClusterIds = Object.keys(clusterCentroids).sort((a, b) => {
        return (
          clusterCentroids[b].geometry.coordinates[1] -
          clusterCentroids[a].geometry.coordinates[1]
        );
      });

      let finalRoutes = [];
      let previousEndPoint = geocodedStartingPoint;

      for (let i = 0; i < sortedClusterIds.length; i++) {
        const clusterId = sortedClusterIds[i];
        const pointsInCluster = clusters[clusterId];

        // Determine target end point (centroid of next cluster) to guide the route
        let targetEndPoint = null;
        if (i < sortedClusterIds.length - 1) {
          const nextClusterId = sortedClusterIds[i + 1];
          const nextClusterPoints = clusters[nextClusterId];
          // Calculate centroid of next cluster
          // We need to convert points to Turf format temporarily
          const turfPoints = nextClusterPoints.map((p) =>
            turf.point([p.lon, p.lat])
          );
          const centroid = turf.centroid(turf.featureCollection(turfPoints));
          targetEndPoint = {
            lat: centroid.geometry.coordinates[1],
            lon: centroid.geometry.coordinates[0],
          };
        }

        const route = await findBestInternalRoute(
          pointsInCluster,
          metric,
          apiKey,
          previousEndPoint, // Start where the previous cluster (or user) ended
          targetEndPoint // Aim for the center of the next cluster
        );

        finalRoutes.push(route);

        // Update previousEndPoint to be the last point of this newly optimized route
        const routePoints = route.points;
        if (routePoints && routePoints.length > 0) {
          previousEndPoint = routePoints[routePoints.length - 1];
        }
      }

      optimized = finalRoutes;
      tripMap.drawRoutes(optimized);
      tripUtils.updateStats();
      tripUtils.log("✅ Route optimization complete.");

      setOptimizeBtn(false, "Optimize Routes");
      const exportCsvBtn = document.getElementById("exportCsvBtn");
      if (exportCsvBtn) exportCsvBtn.disabled = false;
      const exportPdfBtn = document.getElementById("exportPdfBtn");
      if (exportPdfBtn) exportPdfBtn.disabled = false;
    } catch (error) {
      console.error("Error optimizing routes:", error);
      tripUtils.log(
        "❌ An error occurred during optimization. See console for details."
      );
      setOptimizeBtn(false, "Optimize Routes");
    }
  }

  async function getDistance(p1, p2, metric, apiKey) {
    if (metric === "mapbox") {
      const coords = `${p1.lon},${p1.lat};${p2.lon},${p2.lat}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?access_token=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        return data.routes[0].duration / 60; // in minutes
      }
      return Infinity;
    } else {
      // Convert kilometers to miles (1 km = 0.621371 miles)
      return (
        turf.distance(
          turf.point([p1.lon, p1.lat]),
          turf.point([p2.lon, p2.lat]),
          { units: "kilometers" }
        ) * 0.621371
      ); // in miles
    }
  }

  async function findBestInternalRoute(
    points,
    metric,
    apiKey,
    startingPoint = null,
    targetEndPoint = null
  ) {
    let effectivePoints = [...points];
    let currentStartPoint = startingPoint;

    // Add the starting point to the effective points if it's external and not already present
    // This helps TSP consider it as a potential start for the cluster's internal route
    if (
      currentStartPoint &&
      !effectivePoints.some(
        (p) =>
          p.lat === currentStartPoint.lat && p.lon === currentStartPoint.lon
      )
    ) {
      effectivePoints.unshift(currentStartPoint);
    }

    let routePoints;
    if (metric === "mapbox" && apiKey) {
      try {
        const matrix = await getMapboxTravelMatrix(effectivePoints, apiKey);
        const result = solveTspWithMatrix(
          matrix,
          effectivePoints,
          currentStartPoint,
          targetEndPoint
        );
        routePoints = result.orderedPoints;
      } catch (err) {
        console.error("Matrix optimization failed, falling back to NN:", err);
        routePoints = await solveTspNearestNeighbor(
          effectivePoints,
          currentStartPoint,
          targetEndPoint
        );
      }
    } else {
      routePoints = await solveTspNearestNeighbor(
        effectivePoints,
        currentStartPoint,
        targetEndPoint
      );
    }

    // If the starting point was external (added by us), remove it from the result
    // UNLESS it was actually part of the cluster (which we checked with .some)
    // The logic here is: if we unshifted `currentStartPoint`, we should shift it back off
    // IF it wasn't originally in `points`.
    const wasAdded =
      currentStartPoint &&
      !points.some(
        (p) =>
          p.lat === currentStartPoint.lat && p.lon === currentStartPoint.lon
      );

    if (
      wasAdded &&
      routePoints.length > 0 &&
      routePoints[0].lat === currentStartPoint.lat &&
      routePoints[0].lon === currentStartPoint.lon
    ) {
      routePoints.shift();
    }

    // Calculate total distance for this segment
    let totalDist = 0;
    for (let i = 0; i < routePoints.length - 1; i++) {
      totalDist += await getDistance(
        routePoints[i],
        routePoints[i + 1],
        metric,
        apiKey
      );
    }

    return {
      cluster: points.length > 0 ? points[0].cluster : -1,
      points: routePoints,
      distance: totalDist,
    };
  }

  async function solveTspNearestNeighbor(
    points,
    startPoint = null,
    targetEndPoint = null
  ) {
    if (!points || points.length === 0) return [];

    let unvisited = [...points];
    let currentPoint;
    let route = [];

    // Determine the actual starting point for the route
    if (
      startPoint &&
      unvisited.some(
        (p) => p.lat === startPoint.lat && p.lon === startPoint.lon
      )
    ) {
      currentPoint = unvisited.find(
        (p) => p.lat === startPoint.lat && p.lon === startPoint.lon
      );
    } else if (startPoint) {
      currentPoint = startPoint;
    } else {
      currentPoint = unvisited[0];
    }

    route.push(currentPoint);
    unvisited = unvisited.filter((p) => p !== currentPoint);

    // Handle Target End Point (Look Ahead)
    // If a targetEndPoint is provided, find the point in the cluster closest to it
    // and reserve it to be the LAST visited point.
    let exitNode = null;
    if (targetEndPoint && unvisited.length > 0) {
      let minExitDist = Infinity;
      let exitIndex = -1;

      for (let i = 0; i < unvisited.length; i++) {
        const p = unvisited[i];
        // Use straight line distance for this heuristic to be fast
        const d = await getDistance(p, targetEndPoint, "straight", null);
        if (d < minExitDist) {
          minExitDist = d;
          exitNode = p;
          exitIndex = i;
        }
      }

      if (exitNode) {
        // Remove exitNode from unvisited so it's not picked during the NN loop
        unvisited.splice(exitIndex, 1);
      }
    }

    while (unvisited.length > 0) {
      let nearest = { point: null, distance: Infinity, index: -1 };

      // Find nearest unvisited neighbor
      for (let i = 0; i < unvisited.length; i++) {
        const p = unvisited[i];
        const dist = await getDistance(currentPoint, p, "straight", null);
        if (dist < nearest.distance) {
          nearest = { point: p, distance: dist, index: i };
        }
      }

      if (nearest.point) {
        route.push(nearest.point);
        currentPoint = nearest.point;
        unvisited.splice(nearest.index, 1);
      } else {
        break; // Should not happen
      }
    }

    // Append the exit node if one was reserved
    if (exitNode) {
      route.push(exitNode);
    }

    return route;
  }

  // Expose functions for testing
  if (typeof window !== "undefined") {
    window.tripRouting = {
      getMapboxTravelMatrix,
      solveTspWithMatrix,
      optimizeRoutes,
      getDistance,
      findBestInternalRoute,
      solveTspNearestNeighbor,
    };
  }
})();
