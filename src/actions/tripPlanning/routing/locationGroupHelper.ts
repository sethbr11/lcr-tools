import { Constants, Types } from '../types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Groups planar points into distinct locations so a household is always clustered as one unit.
 *
 * @param xy - Planar coordinates of each person.
 * @returns One group per distinct (rounded) coordinate, in order of first appearance.
 */
export function groupLocations(xy: [number, number][]): Types.LocationGroup[] {
  const byKey = new Map<string, Types.LocationGroup>();
  xy.forEach((point, index) => {
    const key = `${point[0].toFixed(Constants.KMEANS_COORD_KEY_DECIMALS)},${point[1].toFixed(Constants.KMEANS_COORD_KEY_DECIMALS)}`;
    const group = byKey.get(key);
    if (group) {
      group.weight += 1;
      group.indices.push(index);
    } else {
      byKey.set(key, { point: [...point], weight: 1, indices: [index] });
    }
  });
  return [...byKey.values()];
}

/**
 * Expands one cluster index per location into one cluster index per original point.
 *
 * @param groups - Locations produced by groupLocations.
 * @param assignments - Cluster index per location.
 * @param total - Number of original points.
 * @returns Cluster index per original point.
 */
export function expandAssignments(
  groups: Types.LocationGroup[],
  assignments: number[],
  total: number
): number[] {
  const expanded = new Array<number>(total).fill(0);
  groups.forEach((group, index) => {
    for (const pointIndex of group.indices) expanded[pointIndex] = assignments[index];
  });
  return expanded;
}

/** Squared Euclidean distance between two planar points. */
export function squaredDistance(left: [number, number], right: [number, number]): number {
  return (left[0] - right[0]) ** 2 + (left[1] - right[1]) ** 2;
}

/** Returns the index in [0, length) with the lowest score (first wins ties); null scores are skipped. */
export function argMin(length: number, score: (index: number) => number | null): number {
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

/** Counts people (location weights) per cluster. */
export function weightedCounts(
  groups: Types.LocationGroup[],
  assignments: number[],
  clusterTotal: number
): number[] {
  const counts = new Array<number>(clusterTotal).fill(0);
  groups.forEach((group, index) => {
    counts[assignments[index]] += group.weight;
  });
  return counts;
}

/** Recomputes people-weighted cluster means, keeping the previous centroid for empty clusters. */
export function recomputeWeightedCentroids(
  groups: Types.LocationGroup[],
  assignments: number[],
  previous: [number, number][]
): [number, number][] {
  const sums = previous.map(() => [0, 0]);
  const counts = weightedCounts(groups, assignments, previous.length);
  groups.forEach((group, index) => {
    const id = assignments[index];
    sums[id][0] += group.point[0] * group.weight;
    sums[id][1] += group.point[1] * group.weight;
  });
  return previous.map((centroid, id) =>
    counts[id] === 0 ? centroid : [sums[id][0] / counts[id], sums[id][1] / counts[id]]
  );
}

/**
 * Assigns whole locations in descending regret order to the nearest centroid with room for them.
 * A location that fits nowhere (or exceeds the maximum alone) goes to its nearest centroid unsplit.
 *
 * @param groups - Locations to assign.
 * @param centroids - Current cluster centroids.
 * @param maxSize - Maximum people per cluster.
 * @param log - Sink for status messages.
 * @returns Cluster index per location.
 */
export function assignLocationsWithCapacity(
  groups: Types.LocationGroup[],
  centroids: [number, number][],
  maxSize: number,
  log: (message: string) => void
): number[] {
  const distances = groups.map((group) =>
    centroids.map((centroid) => squaredDistance(group.point, centroid))
  );
  const regret = distances.map((row) => {
    const [nearest = 0, second = nearest] = [...row].sort((left, right) => left - right);
    return second - nearest;
  });
  const order = groups.map((_, index) => index).sort((a, b) => regret[b] - regret[a] || a - b);

  const assignments = new Array<number>(groups.length).fill(0);
  const counts = new Array<number>(centroids.length).fill(0);
  for (const index of order) {
    const weight = groups[index].weight;
    const choice = argMin(counts.length, (id) =>
      counts[id] + weight <= maxSize ? distances[index][id] : null
    );
    let id = choice;
    if (choice === -1) {
      id = argMin(counts.length, (c) => distances[index][c]);
      log(
        weight > maxSize
          ? `A household of ${weight} people exceeds the maximum of ${maxSize}; keeping them together.`
          : `No group has room for a household of ${weight} people; keeping them together in the nearest group.`
      );
    }
    assignments[index] = id;
    counts[id] += weight;
  }
  return assignments;
}

/**
 * Moves whole locations from donor clusters into undersized clusters, cheapest move first.
 * A donor only gives up a location when it still meets the minimum afterwards.
 *
 * @param groups - Locations being clustered.
 * @param assignments - Cluster index per location (updated in place).
 * @param centroids - Current cluster centroids.
 * @param minSize - Minimum people per cluster.
 * @param log - Sink for status messages.
 */
export function repairLocationMinimums(
  groups: Types.LocationGroup[],
  assignments: number[],
  centroids: [number, number][],
  minSize: number,
  log: (message: string) => void
): void {
  let current = centroids;
  const counts = weightedCounts(groups, assignments, current.length);
  for (;;) {
    const receiver = argMin(counts.length, (id) => (counts[id] < minSize ? counts[id] : null));
    if (receiver === -1) return;

    const chosen = argMin(groups.length, (index) =>
      counts[assignments[index]] - groups[index].weight < minSize
        ? null
        : squaredDistance(groups[index].point, current[receiver])
    );
    if (chosen === -1) {
      log(`Cluster ${receiver} has ${counts[receiver]} members; no donor to reach min.`);
      return;
    }
    counts[assignments[chosen]] -= groups[chosen].weight;
    counts[receiver] += groups[chosen].weight;
    assignments[chosen] = receiver;
    current = recomputeWeightedCentroids(groups, assignments, current);
  }
}
