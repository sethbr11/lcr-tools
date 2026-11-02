import * as turf from '@turf/turf';
import type { Feature, Point } from 'geojson';
import { Types } from '../types';
import { bestKMeans, capacitatedClusters, countClusters, projectToPlane } from './kMeansHelper';
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

  // Step 1: Project to a planar space so distances are not skewed by longitude convergence
  const xy = projectToPlane(geocoded);

  // Step 2: Assign every member to a cluster
  let assignments: number[];
  if (strategy === 'byCount') {
    const k = Math.max(1, Math.min(Math.round(clusterCount) || 1, geocoded.length));
    logTripStatus(`Clustering with strategy: byCount. Aiming for ${k} clusters.`);
    assignments = bestKMeans(xy, k, logTripStatus).assignments;
  } else {
    assignments = capacitatedClusters(xy, minSize, maxSize, logTripStatus);
  }
  logTripStatus(`Cluster sizes: ${countClusters(assignments).join(', ')}.`);

  // Step 3: Build features, renumber geographically, and publish state
  const clusteredFeatures = geocoded.map(
    (row, index) =>
      turf.point([row.lng, row.lat], {
        ...row,
        cluster: assignments[index],
      }) as Types.ClusterFeature
  );
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
