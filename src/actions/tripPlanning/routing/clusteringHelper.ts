import * as turf from '@turf/turf';
import type { Feature, Point } from 'geojson';
import { Constants, Types } from '../types';
import { getTripState, logTripStatus, setTripState, updateTripStats } from '../ui/stateHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Clusters geocoded members by requested group count or target group size.
 *
 * @param strategy - byCount or bySize.
 * @param clusterCount - Target number of groups when using byCount.
 * @param minSize - Minimum members per group when using bySize.
 * @param maxSize - Maximum members per group when using bySize.
 */
export function clusterAddresses(
  strategy: Types.ClusterStrategy,
  clusterCount: number,
  minSize: number,
  maxSize: number
): void {
  const { geocoded } = getTripState();
  if (geocoded.length === 0) {
    logTripStatus('No geocoded points to cluster.');
    return;
  }

  const points = turf.featureCollection(
    geocoded.map((row) => turf.point([row.lng, row.lat], { ...row }))
  ) as { type: 'FeatureCollection'; features: Types.ClusterFeature[] };

  let clusteredFeatures: Types.ClusterFeature[];
  if (strategy === 'byCount') {
    const k = Math.max(1, Math.min(clusterCount, geocoded.length));
    logTripStatus(`Clustering with strategy: byCount. Aiming for ${k} clusters.`);
    clusteredFeatures = turf.clustersKmeans(points, { numberOfClusters: k })
      .features as Types.ClusterFeature[];
  } else {
    clusteredFeatures = clusterBySize(points.features, minSize, maxSize);
  }

  const finalFeatures = getGeographicallySortedClusters(clusteredFeatures);
  const clustered = finalFeatures.map((feature) => feature.properties);
  const finalCount = new Set(
    clustered.map((row) => row.cluster).filter((id) => id !== undefined && id !== -1)
  ).size;
  logTripStatus(`Clustering complete. Found ${finalCount} clusters.`);
  setTripState({ clustered, optimized: [] });
  updateTripStats();
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Balances k-means clusters toward min/max membership using steal/shed passes. */
function clusterBySize(
  seedFeatures: Types.ClusterFeature[],
  minSize: number,
  maxSize: number
): Types.ClusterFeature[] {
  if (minSize > maxSize || minSize < 1) {
    logTripStatus('Invalid min/max cluster size.');
    return seedFeatures;
  }

  const collection = turf.featureCollection(seedFeatures);
  const initialK = Math.max(1, Math.round(seedFeatures.length / ((minSize + maxSize) / 2)));
  logTripStatus(`Initial guess: ${initialK} clusters.`);
  let features = turf.clustersKmeans(collection, { numberOfClusters: initialK })
    .features as Types.ClusterFeature[];

  let iteration = 0;
  while (iteration < Constants.CLUSTER_SIZE_MAX_ITERATIONS) {
    iteration += 1;
    let changesMade = false;
    let clusterMap = getClusterMap(features);
    const centroids = getClusterCentroids(clusterMap);
    const sortedIds = Object.keys(clusterMap).sort(
      (left, right) => clusterMap[left].length - clusterMap[right].length
    );

    for (const clusterId of sortedIds) {
      const cluster = clusterMap[clusterId];
      if (!cluster || cluster.length >= minSize) continue;
      const stolen = stealNearestPoint(clusterId, cluster, clusterMap, minSize);
      if (!stolen) continue;
      changesMade = true;
      clusterMap = getClusterMap(features);
    }

    const reverseIds = Object.keys(clusterMap).sort(
      (left, right) => clusterMap[right].length - clusterMap[left].length
    );
    for (const clusterId of reverseIds) {
      const cluster = clusterMap[clusterId];
      if (!cluster || cluster.length <= maxSize) continue;
      const shed = shedFarthestPoint(clusterId, cluster, clusterMap, centroids, maxSize);
      if (!shed) continue;
      changesMade = true;
      clusterMap = getClusterMap(features);
      Object.assign(centroids, getClusterCentroids(clusterMap));
    }

    if (!changesMade) {
      logTripStatus(`Clusters are stable after ${iteration} iterations.`);
      break;
    }
  }

  return features;
}

/** Moves the nearest extra point from another cluster into an undersized group. */
function stealNearestPoint(
  clusterId: string,
  cluster: Types.ClusterFeature[],
  clusterMap: Record<string, Types.ClusterFeature[]>,
  minSize: number
): boolean {
  let bestCandidate: Types.ClusterFeature | null = null;
  let bestDist = Infinity;
  let sourceClusterId: string | null = null;

  for (const otherId of Object.keys(clusterMap)) {
    if (otherId === clusterId || clusterMap[otherId].length <= minSize) continue;
    for (const origin of cluster) {
      for (const candidate of clusterMap[otherId]) {
        const distance = turf.distance(origin, candidate);
        if (distance >= bestDist) continue;
        bestDist = distance;
        bestCandidate = candidate;
        sourceClusterId = otherId;
      }
    }
  }

  if (!bestCandidate || sourceClusterId === null) return false;
  logTripStatus(
    `Stealing point "${bestCandidate.properties.name}" from cluster ${sourceClusterId} for undersized cluster ${clusterId}`
  );
  bestCandidate.properties.cluster = parseInt(clusterId, 10);
  return true;
}

/** Moves the farthest member of an oversized cluster to the nearest eligible neighbor. */
function shedFarthestPoint(
  clusterId: string,
  cluster: Types.ClusterFeature[],
  clusterMap: Record<string, Types.ClusterFeature[]>,
  centroids: Record<string, Feature<Point>>,
  maxSize: number
): boolean {
  const centroid = centroids[clusterId];
  if (!centroid) return false;
  let farthestPoint: Types.ClusterFeature | null = null;
  let maxDist = -1;
  for (const point of cluster) {
    const distance = turf.distance(point, centroid);
    if (distance <= maxDist) continue;
    maxDist = distance;
    farthestPoint = point;
  }
  if (!farthestPoint) return false;

  let nearestClusterId: string | null = null;
  let minClusterDist = Infinity;
  for (const otherId of Object.keys(centroids)) {
    if (otherId === clusterId || clusterMap[otherId].length >= maxSize) continue;
    const distance = turf.distance(farthestPoint, centroids[otherId]);
    if (distance >= minClusterDist) continue;
    minClusterDist = distance;
    nearestClusterId = otherId;
  }
  if (!nearestClusterId) return false;
  logTripStatus(
    `Shedding point "${farthestPoint.properties.name}" from oversized cluster ${clusterId} to cluster ${nearestClusterId}`
  );
  farthestPoint.properties.cluster = parseInt(nearestClusterId, 10);
  return true;
}

/** Groups Turf features by current cluster identifier. */
function getClusterMap(features: Types.ClusterFeature[]): Record<string, Types.ClusterFeature[]> {
  const map: Record<string, Types.ClusterFeature[]> = {};
  for (const feature of features) {
    const id = String(feature.properties.cluster);
    if (!map[id]) map[id] = [];
    map[id].push(feature);
  }
  return map;
}

/** Builds a centroid feature for each cluster. */
function getClusterCentroids(
  clusterMap: Record<string, Types.ClusterFeature[]>
): Record<string, Feature<Point>> {
  const centroids: Record<string, Feature<Point>> = {};
  for (const id of Object.keys(clusterMap)) {
    if (clusterMap[id].length === 0) continue;
    centroids[id] = turf.centroid(turf.featureCollection(clusterMap[id]));
  }
  return centroids;
}

/** Renumbers clusters north-to-south using nearest-neighbor chaining. */
function getGeographicallySortedClusters(features: Types.ClusterFeature[]): Types.ClusterFeature[] {
  logTripStatus('Renumbering clusters based on geographic location...');
  const finalMap = getClusterMap(features);
  const centroids = getClusterCentroids(finalMap);
  const sortedCentroidIds = Object.keys(centroids).sort(
    (left, right) =>
      centroids[right].geometry.coordinates[1] - centroids[left].geometry.coordinates[1]
  );
  if (sortedCentroidIds.length === 0) return [];

  const unvisited = new Set(sortedCentroidIds);
  const ordered: string[] = [];
  let currentId = sortedCentroidIds[0];
  ordered.push(currentId);
  unvisited.delete(currentId);

  while (unvisited.size > 0) {
    let nearestId: string | null = null;
    let nearestDist = Infinity;
    unvisited.forEach((candidateId) => {
      const distance = turf.distance(centroids[currentId], centroids[candidateId]);
      if (distance >= nearestDist) return;
      nearestDist = distance;
      nearestId = candidateId;
    });
    if (!nearestId) {
      ordered.push(...Array.from(unvisited));
      break;
    }
    currentId = nearestId;
    ordered.push(currentId);
    unvisited.delete(currentId);
  }

  const idMap: Record<string, number> = {};
  ordered.forEach((oldId, newId) => {
    idMap[oldId] = newId;
  });

  return features.map((feature) => {
    const oldId = String(feature.properties.cluster);
    return {
      ...feature,
      properties: { ...feature.properties, cluster: idMap[oldId] },
    };
  });
}
