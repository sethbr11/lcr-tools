import { Constants } from '../types';

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
 * Runs seeded k-means restarts and returns the lowest within-cluster variance result.
 *
 * @param xy - Planar coordinates of each point.
 * @param k - Requested number of clusters (capped at distinct coordinates).
 * @param log - Optional sink for status messages.
 * @returns Best assignments, centroids, and Lloyd iterations used.
 */
export function bestKMeans(
  xy: [number, number][],
  k: number,
  log: (message: string) => void = () => {}
): { assignments: number[]; centroids: [number, number][]; iterations: number } {
  const distinctCount = getDistinctIndices(xy).length;
  const clusterTotal = Math.min(k, distinctCount);
  if (clusterTotal < k) {
    log(
      `Only ${distinctCount} distinct locations; reducing clusters from ${k} to ${clusterTotal}.`
    );
  }

  const runs = Array.from({ length: KMEANS_RESTARTS }, (_, i) => kMeans(xy, clusterTotal, i + 1));
  const costs = runs.map((run) => withinClusterCost(xy, run.assignments, run.centroids));
  const best = runs[argMin(runs.length, (i) => costs[i])];
  log(
    `k-means chose ${best.centroids.length} clusters (best of ${KMEANS_RESTARTS} restarts, ${best.iterations} iterations).`
  );
  return best;
}

/**
 * Runs one deterministic k-means pass (k-means++ seeding, Lloyd iterations).
 * Seeds only from distinct coordinates, reseeds emptied clusters, and guarantees
 * exactly min(k, distinct coordinates) non-empty clusters.
 *
 * @param xy - Planar coordinates of each point.
 * @param k - Requested number of clusters.
 * @param seed - Seed for the pseudo-random generator.
 * @returns Cluster index per point, final centroids, and Lloyd iterations used.
 * @internal
 */
export function kMeans(
  xy: [number, number][],
  k: number,
  seed: number
): { assignments: number[]; centroids: [number, number][]; iterations: number } {
  const distinct = getDistinctIndices(xy);
  const clusterTotal = Math.max(0, Math.min(k, distinct.length));
  if (clusterTotal === 0) return { assignments: [], centroids: [], iterations: 0 };

  // Step 1: Seed with k-means++ over distinct locations
  let centroids = seedCentroids(xy, distinct, clusterTotal, mulberry32(seed));
  const assignments = new Array<number>(xy.length).fill(-1);

  // Step 2: Lloyd iterations
  let iterations = 0;
  while (iterations < KMEANS_MAX_ITERATIONS) {
    iterations += 1;
    let changed = false;
    xy.forEach((point, index) => {
      const nearest = nearestCentroid(point, centroids);
      if (nearest === assignments[index]) return;
      assignments[index] = nearest;
      changed = true;
    });
    if (reseedEmptyClusters(xy, assignments, centroids)) changed = true;
    if (!changed) break;
    centroids = recomputeCentroids(xy, assignments, centroids);
  }

  // Step 3: Enforce the exact-k postcondition
  if (fillEmptyClusters(xy, assignments, centroids)) {
    centroids = recomputeCentroids(xy, assignments, centroids);
  }
  return { assignments, centroids, iterations };
}

/**
 * Groups points into clusters whose sizes respect a maximum and, where feasible, a minimum.
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

  // Step 2: Alternate capacity-aware assignment and centroid updates
  let centroids = bestKMeans(xy, k, log).centroids;
  let assignments: number[] = [];
  let iterations = 0;
  while (iterations < Constants.CLUSTER_SIZE_MAX_ITERATIONS) {
    iterations += 1;
    const next = assignWithCapacity(xy, centroids, maxSize);
    centroids = recomputeCentroids(xy, next, centroids);
    const unchanged = next.every((id, index) => id === assignments[index]);
    assignments = next;
    if (unchanged) break;
  }
  log(`Capacity assignment finished after ${iterations} iterations.`);

  // Step 3: Top up undersized clusters
  repairMinimumSizes(xy, assignments, centroids, minSize, log);
  return assignments;
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Maximum Lloyd iterations per k-means run. */
const KMEANS_MAX_ITERATIONS = 100;
/** Number of seeded k-means restarts; the lowest-variance result wins. */
const KMEANS_RESTARTS = 8;
/** Decimal places used to treat two coordinates as the same location. */
const COORD_KEY_DECIMALS = 6;

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

/** Squared Euclidean distance between two planar points. */
function squaredDistance(left: [number, number], right: [number, number]): number {
  return (left[0] - right[0]) ** 2 + (left[1] - right[1]) ** 2;
}

/** Builds a string key identifying a location at 6-decimal precision. */
function coordKey(point: [number, number]): string {
  return `${point[0].toFixed(COORD_KEY_DECIMALS)},${point[1].toFixed(COORD_KEY_DECIMALS)}`;
}

/** Returns the index of the first point at each distinct (6-decimal) location. */
function getDistinctIndices(xy: [number, number][]): number[] {
  const seen = new Set<string>();
  return xy.flatMap((point, index) => {
    const key = coordKey(point);
    if (seen.has(key)) return [];
    seen.add(key);
    return [index];
  });
}

/** Picks k starting centroids from distinct locations using k-means++ weighting. */
function seedCentroids(
  xy: [number, number][],
  distinct: number[],
  k: number,
  random: () => number
): [number, number][] {
  const first = distinct[Math.floor(random() * distinct.length)];
  const centroids: [number, number][] = [[...xy[first]]];
  const minDist = distinct.map((index) => squaredDistance(xy[index], xy[first]));

  while (centroids.length < k) {
    const total = minDist.reduce((sum, value) => sum + value, 0);
    if (total <= 0) break;
    let threshold = random() * total;
    let pick = minDist.findIndex((value) => {
      threshold -= value;
      return value > 0 && threshold <= 0;
    });
    if (pick === -1) pick = minDist.findIndex((value) => value > 0);
    const chosen = xy[distinct[pick]];
    centroids.push([...chosen]);
    distinct.forEach((index, i) => {
      minDist[i] = Math.min(minDist[i], squaredDistance(xy[index], chosen));
    });
  }
  return centroids;
}

/** Returns the index in [0, length) with the lowest score (first wins ties); null scores are skipped. */
function argMin(length: number, score: (index: number) => number | null): number {
  let best = -1;
  let bestScore = Infinity;
  for (let index = 0; index < length; index += 1) {
    const value = score(index);
    if (value === null || value >= bestScore) continue;
    bestScore = value;
    best = index;
  }
  return best;
}

/** Returns the index of the closest centroid (lowest index wins ties). */
function nearestCentroid(point: [number, number], centroids: [number, number][]): number {
  return argMin(centroids.length, (id) => squaredDistance(point, centroids[id]));
}

/** Recomputes cluster means, keeping the previous centroid for empty clusters. */
function recomputeCentroids(
  xy: [number, number][],
  assignments: number[],
  previous: [number, number][]
): [number, number][] {
  const sums = previous.map(() => [0, 0]);
  const counts = new Array<number>(previous.length).fill(0);
  assignments.forEach((id, index) => {
    sums[id][0] += xy[index][0];
    sums[id][1] += xy[index][1];
    counts[id] += 1;
  });
  return previous.map((centroid, id) =>
    counts[id] === 0 ? centroid : [sums[id][0] / counts[id], sums[id][1] / counts[id]]
  );
}

/** Moves the point farthest from its centroid into each empty cluster; true when any moved. */
function reseedEmptyClusters(
  xy: [number, number][],
  assignments: number[],
  centroids: [number, number][]
): boolean {
  const counts = countClusters(assignments, centroids.length);
  let reseeded = false;
  counts.forEach((count, empty) => {
    if (count > 0) return;
    const farthest = argMin(xy.length, (index) =>
      counts[assignments[index]] < 2
        ? null
        : -squaredDistance(xy[index], centroids[assignments[index]])
    );
    if (farthest === -1) return;
    counts[assignments[farthest]] -= 1;
    counts[empty] += 1;
    assignments[farthest] = empty;
    centroids[empty] = [...xy[farthest]];
    reseeded = true;
  });
  return reseeded;
}

/** Splits the largest multi-location cluster into any still-empty cluster; true when any moved. */
function fillEmptyClusters(
  xy: [number, number][],
  assignments: number[],
  centroids: [number, number][]
): boolean {
  let moved = false;
  for (let empty = 0; empty < centroids.length; empty += 1) {
    const counts = countClusters(assignments, centroids.length);
    if (counts[empty] > 0) continue;
    const current = recomputeCentroids(xy, assignments, centroids);
    const donors = counts
      .map((count, id) => ({ count, id }))
      .filter(({ id }) => id !== empty)
      .sort((left, right) => right.count - left.count || left.id - right.id);
    for (const { id: donor } of donors) {
      const members = assignments.flatMap((id, index) => (id === donor ? [index] : []));
      if (getDistinctIndices(members.map((index) => xy[index])).length < 2) continue;
      const farthest =
        members[argMin(members.length, (i) => -squaredDistance(xy[members[i]], current[donor]))];
      // Move every member at that location so a household is never split
      const farthestKey = coordKey(xy[farthest]);
      for (const index of members) {
        if (coordKey(xy[index]) === farthestKey) assignments[index] = empty;
      }
      moved = true;
      break;
    }
  }
  return moved;
}

/** Sums squared distances from each point to its assigned centroid. */
function withinClusterCost(
  xy: [number, number][],
  assignments: number[],
  centroids: [number, number][]
): number {
  return xy.reduce((sum, p, i) => sum + squaredDistance(p, centroids[assignments[i]]), 0);
}

/** Assigns points in descending regret order to the nearest centroid with spare capacity. */
function assignWithCapacity(
  xy: [number, number][],
  centroids: [number, number][],
  maxSize: number
): number[] {
  const distances = xy.map((point) =>
    centroids.map((centroid) => squaredDistance(point, centroid))
  );
  const regret = distances.map((row) => {
    const [nearest = 0, second = nearest] = [...row].sort((left, right) => left - right);
    return second - nearest;
  });
  const order = xy.map((_, index) => index).sort((a, b) => regret[b] - regret[a] || a - b);

  const assignments = new Array<number>(xy.length).fill(0);
  const counts = new Array<number>(centroids.length).fill(0);
  for (const index of order) {
    // Fall back to the nearest centroid if every cluster is full (max cannot be honored)
    const choice = argMin(counts.length, (id) =>
      counts[id] < maxSize ? distances[index][id] : null
    );
    const id = choice === -1 ? argMin(counts.length, (c) => distances[index][c]) : choice;
    assignments[index] = id;
    counts[id] += 1;
  }
  return assignments;
}

/** Moves points from larger-than-min clusters into undersized clusters, cheapest move first. @internal */
export function repairMinimumSizes(
  xy: [number, number][],
  assignments: number[],
  centroids: [number, number][],
  minSize: number,
  log: (message: string) => void
): void {
  let current = centroids;
  const counts = countClusters(assignments, current.length);
  for (;;) {
    const receiver = argMin(counts.length, (id) => (counts[id] < minSize ? counts[id] : null));
    if (receiver === -1) return;

    const chosen = argMin(xy.length, (index) =>
      counts[assignments[index]] <= minSize ? null : squaredDistance(xy[index], current[receiver])
    );
    if (chosen === -1) {
      log(`Cluster ${receiver} has ${counts[receiver]} members; no donor to reach min.`);
      return;
    }
    counts[assignments[chosen]] -= 1;
    counts[receiver] += 1;
    assignments[chosen] = receiver;
    current = recomputeCentroids(xy, assignments, current);
  }
}
