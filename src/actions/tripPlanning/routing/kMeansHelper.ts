import { Constants, Types } from '../types';
// prettier-ignore
import { argMin, assignLocationsWithCapacity, expandAssignments, groupLocations, recomputeWeightedCentroids, repairLocationMinimums, squaredDistance } from './locationGroupHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Converts lat/lng to planar x = lng * cos(mean latitude), y = lat.
 *
 * @param points - Points with lat/lng in degrees.
 * @returns Planar coordinates in the same order.
 */
export function projectToPlane(points: { lat: number; lng: number }[]): [number, number][] {
  const meanLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const scale = Math.cos((meanLat * Math.PI) / 180);
  return points.map((point) => [point.lng * scale, point.lat]);
}

/**
 * Counts members per cluster index.
 *
 * @param assignments - Cluster index per point.
 * @param clusterTotal - Optional cluster count (defaults to max index + 1).
 * @returns Member count per cluster.
 */
export function countClusters(assignments: number[], clusterTotal?: number): number[] {
  const size = clusterTotal ?? (assignments.length ? Math.max(...assignments) + 1 : 0);
  const counts = new Array<number>(size).fill(0);
  for (const id of assignments) counts[id] += 1;
  return counts;
}

/**
 * Runs seeded k-means restarts over distinct locations and returns the lowest-cost result.
 * Everyone at one location always shares a cluster.
 *
 * @param xy - Planar coordinates of each point.
 * @param k - Requested number of clusters (capped at distinct coordinates).
 * @param log - Optional sink for status messages.
 * @returns Best assignments per point, centroids, and Lloyd iterations used.
 */
export function bestKMeans(
  xy: [number, number][],
  k: number,
  log: (message: string) => void = () => {}
): Types.KMeansResult {
  const groups = groupLocations(xy);
  const best = bestLocationKMeans(groups, k, log);
  return { ...best, assignments: expandAssignments(groups, best.assignments, xy.length) };
}

/**
 * Runs one deterministic k-means pass (k-means++ seeding, Lloyd iterations) over locations.
 * Seeds only from distinct coordinates, reseeds emptied clusters, and guarantees
 * exactly min(k, distinct coordinates) non-empty clusters.
 *
 * @param xy - Planar coordinates of each point.
 * @param k - Requested number of clusters.
 * @param seed - Seed for the pseudo-random generator.
 * @returns Cluster index per point, final centroids, and Lloyd iterations used.
 * @internal
 */
export function kMeans(xy: [number, number][], k: number, seed: number): Types.KMeansResult {
  const groups = groupLocations(xy);
  const result = kMeansLocations(groups, k, seed);
  return { ...result, assignments: expandAssignments(groups, result.assignments, xy.length) };
}

/**
 * Groups points into clusters whose sizes respect a maximum and, where feasible, a minimum.
 * Whole locations are assigned, so a household is never split (it may exceed the maximum).
 *
 * @param xy - Planar coordinates of each point.
 * @param minSize - Minimum members per cluster.
 * @param maxSize - Maximum members per cluster.
 * @param log - Optional sink for status messages.
 * @returns Cluster index per point.
 * @internal
 */
export function capacitatedClusters(
  xy: [number, number][],
  minSize: number,
  maxSize: number,
  log: (message: string) => void = () => {}
): number[] {
  const total = xy.length;
  const guess = Math.round(total / ((minSize + maxSize) / 2));
  if (!(minSize >= 1) || !(minSize <= maxSize)) {
    const fallbackK = Math.max(1, Math.min(total, Number.isFinite(guess) ? guess : 1));
    log(
      `Invalid min/max cluster size (${minSize}/${maxSize}); falling back to ${fallbackK} clusters by count.`
    );
    return bestKMeans(xy, fallbackK, log).assignments;
  }

  // Step 1: Choose the number of clusters allowed by the size limits
  const minClusters = Math.ceil(total / maxSize);
  let maxClusters = Math.floor(total / minSize);
  if (minClusters > maxClusters) {
    log(
      `Group sizes ${minSize}-${maxSize} for ${total} members: sizes cannot all be satisfied; honoring max.`
    );
    maxClusters = minClusters;
  }
  const k = Math.max(minClusters, Math.min(guess, maxClusters));
  log(`Clustering by size ${minSize}-${maxSize}. Using ${k} clusters.`);

  // Step 2: Alternate capacity-aware location assignment and centroid updates
  const groups = groupLocations(xy);
  const logged = new Set<string>();
  const logOnce = (message: string): void => {
    if (logged.has(message)) return;
    logged.add(message);
    log(message);
  };
  let centroids = bestLocationKMeans(groups, k, log).centroids;
  let assignments: number[] = [];
  let iterations = 0;
  while (iterations < Constants.CLUSTER_SIZE_MAX_ITERATIONS) {
    iterations += 1;
    const next = assignLocationsWithCapacity(groups, centroids, maxSize, logOnce);
    centroids = recomputeWeightedCentroids(groups, next, centroids);
    const unchanged = next.every((id, index) => id === assignments[index]);
    assignments = next;
    if (unchanged) break;
  }
  log(`Capacity assignment finished after ${iterations} iterations.`);

  // Step 3: Top up undersized clusters with whole locations
  repairLocationMinimums(groups, assignments, centroids, minSize, log);
  return expandAssignments(groups, assignments, total);
}

/**
 * Moves whole locations from larger-than-min clusters into undersized clusters, cheapest move first.
 *
 * @param xy - Planar coordinates of each point.
 * @param assignments - Cluster index per point (updated in place).
 * @param centroids - Current cluster centroids.
 * @param minSize - Minimum members per cluster.
 * @param log - Sink for status messages.
 * @internal
 */
export function repairMinimumSizes(
  xy: [number, number][],
  assignments: number[],
  centroids: [number, number][],
  minSize: number,
  log: (message: string) => void
): void {
  const groups = groupLocations(xy);
  const byLocation = groups.map((group) => assignments[group.indices[0]]);
  repairLocationMinimums(groups, byLocation, centroids, minSize, log);
  groups.forEach((group, index) => {
    for (const pointIndex of group.indices) assignments[pointIndex] = byLocation[index];
  });
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Runs seeded restarts over locations and returns the lowest weighted-cost result. */
function bestLocationKMeans(
  groups: Types.LocationGroup[],
  k: number,
  log: (message: string) => void
): Types.KMeansResult {
  const clusterTotal = Math.min(k, groups.length);
  if (clusterTotal < k) {
    log(
      `Only ${groups.length} distinct locations; reducing clusters from ${k} to ${clusterTotal}.`
    );
  }

  const runs = Array.from({ length: Constants.KMEANS_RESTARTS }, (_, i) =>
    kMeansLocations(groups, clusterTotal, i + 1)
  );
  const costs = runs.map((run) => withinClusterCost(groups, run.assignments, run.centroids));
  const best = runs[argMin(runs.length, (i) => costs[i])];
  log(
    `k-means chose ${best.centroids.length} clusters (best of ${Constants.KMEANS_RESTARTS} restarts, ${best.iterations} iterations).`
  );
  return best;
}

/** Runs one k-means pass over locations, weighting centroids by people count. */
function kMeansLocations(
  groups: Types.LocationGroup[],
  k: number,
  seed: number
): Types.KMeansResult {
  const clusterTotal = Math.max(0, Math.min(k, groups.length));
  if (clusterTotal === 0) return { assignments: [], centroids: [], iterations: 0 };

  // Step 1: Seed with k-means++ over distinct locations
  let centroids = seedCentroids(groups, clusterTotal, mulberry32(seed));
  const assignments = new Array<number>(groups.length).fill(-1);

  // Step 2: Lloyd iterations
  let iterations = 0;
  while (iterations < Constants.KMEANS_MAX_ITERATIONS) {
    iterations += 1;
    let changed = false;
    groups.forEach((group, index) => {
      const nearest = nearestCentroid(group.point, centroids);
      if (nearest === assignments[index]) return;
      assignments[index] = nearest;
      changed = true;
    });
    if (reseedEmptyClusters(groups, assignments, centroids)) changed = true;
    if (!changed) break;
    centroids = recomputeWeightedCentroids(groups, assignments, centroids);
  }

  // Step 3: Enforce the exact-k postcondition
  if (reseedEmptyClusters(groups, assignments, centroids)) {
    centroids = recomputeWeightedCentroids(groups, assignments, centroids);
  }
  return { assignments, centroids, iterations };
}

/** Creates a deterministic pseudo-random generator returning values in [0, 1). */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks k starting centroids from distinct locations using k-means++ weighting. */
function seedCentroids(
  groups: Types.LocationGroup[],
  k: number,
  random: () => number
): [number, number][] {
  const first = groups[Math.floor(random() * groups.length)].point;
  const centroids: [number, number][] = [[...first]];
  const minDist = groups.map((group) => squaredDistance(group.point, first));

  while (centroids.length < k) {
    const total = minDist.reduce((sum, value) => sum + value, 0);
    if (total <= 0) break;
    let threshold = random() * total;
    let pick = minDist.findIndex((value) => {
      threshold -= value;
      return value > 0 && threshold <= 0;
    });
    if (pick === -1) pick = minDist.findIndex((value) => value > 0);
    const chosen = groups[pick].point;
    centroids.push([...chosen]);
    groups.forEach((group, i) => {
      minDist[i] = Math.min(minDist[i], squaredDistance(group.point, chosen));
    });
  }
  return centroids;
}

/** Returns the index of the closest centroid (lowest index wins ties). */
function nearestCentroid(point: [number, number], centroids: [number, number][]): number {
  return argMin(centroids.length, (id) => squaredDistance(point, centroids[id]));
}

/** Moves the location farthest from its centroid into each empty cluster; true when any moved. */
function reseedEmptyClusters(
  groups: Types.LocationGroup[],
  assignments: number[],
  centroids: [number, number][]
): boolean {
  const counts = countClusters(assignments, centroids.length);
  let reseeded = false;
  counts.forEach((count, empty) => {
    if (count > 0) return;
    const farthest = argMin(groups.length, (index) =>
      counts[assignments[index]] < 2
        ? null
        : -squaredDistance(groups[index].point, centroids[assignments[index]])
    );
    if (farthest === -1) return;
    counts[assignments[farthest]] -= 1;
    counts[empty] += 1;
    assignments[farthest] = empty;
    centroids[empty] = [...groups[farthest].point];
    reseeded = true;
  });
  return reseeded;
}

/** Sums people-weighted squared distances from each location to its assigned centroid. */
function withinClusterCost(
  groups: Types.LocationGroup[],
  assignments: number[],
  centroids: [number, number][]
): number {
  return groups.reduce(
    (sum, group, i) => sum + group.weight * squaredDistance(group.point, centroids[assignments[i]]),
    0
  );
}
