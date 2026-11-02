import { sleep } from '../utils';
import { Constants, Types } from '../types';
import { logTripStatus } from '../ui/stateHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Builds full travel-duration and travel-distance matrices using batched Mapbox Matrix API calls.
 * Cells the API cannot supply fall back to straight-line miles at a fixed average speed.
 *
 * @param points - Coordinate-bearing members.
 * @param apiKey - Mapbox access token.
 * @returns Square duration (seconds) and distance (meters) matrices.
 */
export async function getMapboxTravelMatrix(
  points: Types.TripMapMember[],
  apiKey: string
): Promise<Types.MapboxTravelMatrix> {
  const count = points.length;
  if (count < 2) {
    return count === 1 ? { durations: [[0]], distances: [[0]] } : { durations: [], distances: [] };
  }

  const blank = (): number[][] =>
    Array.from({ length: count }, (_, rowIdx) =>
      Array.from({ length: count }, (_, colIdx) => (rowIdx === colIdx ? 0 : Number.NaN))
    );
  const durations = blank();
  const distances = blank();
  const batch = Constants.MAPBOX_MATRIX_BATCH_SIZE;

  for (let row = 0; row < count; row += batch) {
    for (let col = 0; col < count; col += batch) {
      const sources = points.slice(row, Math.min(row + batch, count));
      const destinations = points.slice(col, Math.min(col + batch, count));
      if (sources.length < 1 || destinations.length < 1) continue;
      await fillMatrixBatch({ durations, distances }, sources, destinations, row, col, apiKey);
    }
  }

  const fallbackCount = applyHaversineFallback({ durations, distances }, points);
  if (fallbackCount > 0) {
    logTripStatus(
      `Mapbox matrix was missing ${fallbackCount} cell(s); used straight-line estimates at ${Constants.FALLBACK_SPEED_MPH} mph.`
    );
  }
  return { durations, distances };
}

/**
 * Builds the cost matrix minimized by the route solver for the chosen metric.
 *
 * @param points - Coordinate-bearing nodes (start first when one exists).
 * @param metric - Straight-line miles or Mapbox driving durations.
 * @param apiKey - Mapbox access token, used only for road-network routing.
 * @returns Cost matrix plus raw road durations and distances for Mapbox routing.
 */
export async function buildRoutingMatrices(
  points: Types.TripMapMember[],
  metric: Types.DistanceMetric,
  apiKey: string
): Promise<Types.RoutingMatrices> {
  if (metric === 'mapbox') {
    const { durations, distances } = await getMapboxTravelMatrix(points, apiKey);
    return { cost: durations, durationsSec: durations, distancesMeters: distances };
  }
  return {
    cost: points.map((from) => points.map((to) => haversineMiles(from, to))),
  };
}

/**
 * Orders nodes into the cheapest open path (no return) using nearest neighbor, 2-opt, and Or-opt.
 *
 * @internal
 * @param cost - Square cost matrix, possibly asymmetric.
 * @param fixedStart - Index the path must begin at, or null to choose the best start.
 * @returns Visiting order as matrix indices.
 */
export function solveOpenPath(cost: number[][], fixedStart: number | null): number[] {
  const count = cost.length;
  if (count === 0) return [];
  if (count === 1) return [0];

  let order: number[];
  if (fixedStart !== null) {
    order = nearestNeighborPath(cost, fixedStart);
  } else {
    order = nearestNeighborPath(cost, 0);
    let best = pathCost(cost, order);
    for (let start = 1; start < count; start += 1) {
      const candidate = nearestNeighborPath(cost, start);
      const candidateCost = pathCost(cost, candidate);
      if (candidateCost < best - Constants.PATH_IMPROVEMENT_EPSILON) {
        best = candidateCost;
        order = candidate;
      }
    }
  }

  const firstMovable = fixedStart !== null ? 1 : 0;
  for (let pass = 0; pass < Constants.OPEN_PATH_MAX_PASSES; pass += 1) {
    const twoOptImproved = improveTwoOpt(cost, order, firstMovable);
    const orOptImproved = improveOrOpt(cost, order, firstMovable);
    if (!twoOptImproved && !orOptImproved) break;
  }
  return order;
}

/**
 * Fetches the driving path through stops in order, for drawing one cluster's road route.
 * Requests are split into windows of Constants.MAPBOX_DIRECTIONS_MAX_WAYPOINTS that share their
 * boundary stop, and the pieces are joined.
 *
 * @param stops - Ordered stops, including the trip's starting point if it has one.
 * @param apiKey - Mapbox access token.
 * @returns Road path as [lat, lng] pairs, or null when any request fails.
 */
export async function getMapboxRouteGeometry(
  stops: Types.CoordinatePoint[],
  apiKey: string
): Promise<[number, number][] | null> {
  if (stops.length < 2) return null;
  const windowSize = Constants.MAPBOX_DIRECTIONS_MAX_WAYPOINTS;
  const path: [number, number][] = [];

  for (let first = 0; first < stops.length - 1; first += windowSize - 1) {
    const window = stops.slice(first, first + windowSize);
    const coords = window.map((point) => `${point.lng},${point.lat}`).join(';');
    const url = `${Constants.MAPBOX_DIRECTIONS_URL}/${coords}?geometries=geojson&overview=full&access_token=${encodeURIComponent(apiKey)}`;
    try {
      const data = await fetchMatrixResponse(url);
      const line = data?.routes?.[0]?.geometry?.coordinates;
      if (!line || line.length === 0) return null;
      const latLngs = line.map(([lng, lat]) => [lat, lng] as [number, number]);
      path.push(...(path.length > 0 ? latLngs.slice(1) : latLngs));
    } catch {
      return null;
    }
  }
  return path;
}

/**
 * Calculates spherical distance in statute miles between two coordinate points.
 *
 * @param from - Origin coordinate point.
 * @param to - Destination coordinate point.
 * @returns Spherical distance expressed in miles.
 */
export function haversineMiles(from: Types.CoordinatePoint, to: Types.CoordinatePoint): number {
  const toRad = (value: number): number => (value * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * Constants.EARTH_RADIUS_MILES * Math.asin(Math.sqrt(a));
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Fetches one Mapbox matrix or directions URL, retrying with a delay while the API returns HTTP 429. */
async function fetchMatrixResponse(url: string): Promise<Types.MapboxApiResponse | null> {
  for (let attempt = 0; attempt <= Constants.MAPBOX_MATRIX_MAX_RETRIES; attempt += 1) {
    const response = await fetch(url);
    if (response.status === 429 && attempt < Constants.MAPBOX_MATRIX_MAX_RETRIES) {
      await sleep(Constants.MAPBOX_MATRIX_RETRY_DELAY_MS);
      continue;
    }
    if (!response.ok) return null;
    const data = (await response.json()) as Types.MapboxApiResponse;
    return data.code === 'Ok' ? data : null;
  }
  return null;
}

/** Fills one Mapbox matrix sub-batch into the destination matrices. */
async function fillMatrixBatch(
  target: Types.MapboxTravelMatrix,
  sources: Types.TripMapMember[],
  destinations: Types.TripMapMember[],
  rowOffset: number,
  colOffset: number,
  apiKey: string
): Promise<void> {
  const sameBatch = rowOffset === colOffset && sources.length === destinations.length;
  const batchPoints = sameBatch ? sources : sources.concat(destinations);
  if (batchPoints.length < 2) return;

  const sourceIndices = sources.map((_, index) => index);
  const destinationIndices = sameBatch
    ? destinations.map((_, index) => index)
    : destinations.map((_, index) => sources.length + index);

  const coordPath = batchPoints.map((point) => `${point.lng},${point.lat}`).join(';');
  const url = `${Constants.MAPBOX_MATRIX_URL}/${coordPath}?access_token=${encodeURIComponent(apiKey)}&annotations=duration,distance&sources=${sourceIndices.join(';')}&destinations=${destinationIndices.join(';')}`;

  try {
    const data = await fetchMatrixResponse(url);
    if (!data) return;
    for (let row = 0; row < sourceIndices.length; row += 1) {
      for (let col = 0; col < destinationIndices.length; col += 1) {
        const duration = data.durations?.[row]?.[col];
        const distance = data.distances?.[row]?.[col];
        if (typeof duration === 'number')
          target.durations[rowOffset + row][colOffset + col] = duration;
        if (typeof distance === 'number')
          target.distances[rowOffset + row][colOffset + col] = distance;
      }
    }
  } catch (error) {
    console.error('LCR Tools: Error fetching Mapbox matrix:', error);
  }
}

/** Replaces unfilled cells with straight-line estimates and returns how many cells were replaced. */
function applyHaversineFallback(
  matrices: Types.MapboxTravelMatrix,
  points: Types.TripMapMember[]
): number {
  let fallbackCount = 0;
  for (let row = 0; row < points.length; row += 1) {
    for (let col = 0; col < points.length; col += 1) {
      const missingDuration = !Number.isFinite(matrices.durations[row][col]);
      const missingDistance = !Number.isFinite(matrices.distances[row][col]);
      if (!missingDuration && !missingDistance) continue;
      const miles = haversineMiles(points[row], points[col]);
      if (missingDuration) {
        matrices.durations[row][col] = (miles / Constants.FALLBACK_SPEED_MPH) * 3600;
      }
      if (missingDistance) matrices.distances[row][col] = miles * Constants.METERS_PER_MILE;
      fallbackCount += 1;
    }
  }
  return fallbackCount;
}

/** Builds a greedy nearest-neighbor open path beginning at the given index. */
function nearestNeighborPath(cost: number[][], start: number): number[] {
  const order = [start];
  const visited = new Set<number>(order);
  let current = start;
  while (order.length < cost.length) {
    let nextIndex = -1;
    let nextCost = Infinity;
    for (let index = 0; index < cost.length; index += 1) {
      if (visited.has(index) || cost[current][index] >= nextCost) continue;
      nextCost = cost[current][index];
      nextIndex = index;
    }
    if (nextIndex === -1) nextIndex = cost.findIndex((_, index) => !visited.has(index));
    order.push(nextIndex);
    visited.add(nextIndex);
    current = nextIndex;
  }
  return order;
}

/** Sums the cost of traveling an open path in order. */
function pathCost(cost: number[][], order: number[]): number {
  let total = 0;
  for (let index = 0; index < order.length - 1; index += 1) {
    total += cost[order[index]][order[index + 1]];
  }
  return total;
}

/** Applies the first improving segment reversal found; returns true when the order changed. */
function improveTwoOpt(cost: number[][], order: number[], firstMovable: number): boolean {
  let improved = false;
  let best = pathCost(cost, order);
  for (let left = firstMovable; left < order.length - 1; left += 1) {
    for (let right = left + 1; right < order.length; right += 1) {
      const candidate = order
        .slice(0, left)
        .concat(order.slice(left, right + 1).reverse(), order.slice(right + 1));
      const candidateCost = pathCost(cost, candidate);
      if (candidateCost >= best - Constants.PATH_IMPROVEMENT_EPSILON) continue;
      order.splice(0, order.length, ...candidate);
      best = candidateCost;
      improved = true;
    }
  }
  return improved;
}

/** Repeatedly moves segments of 1 to 3 stops to cheaper positions; returns true when the order changed. */
function improveOrOpt(cost: number[][], order: number[], firstMovable: number): boolean {
  let improved = false;
  while (applyFirstOrMove(cost, order, firstMovable)) improved = true;
  return improved;
}

/** Applies the first improving segment relocation found; returns true when the order changed. */
function applyFirstOrMove(cost: number[][], order: number[], firstMovable: number): boolean {
  const current = pathCost(cost, order);
  for (let length = 1; length <= 3; length += 1) {
    for (let from = firstMovable; from + length <= order.length; from += 1) {
      const segment = order.slice(from, from + length);
      const rest = order.slice(0, from).concat(order.slice(from + length));
      for (let to = firstMovable; to <= rest.length; to += 1) {
        if (to === from) continue;
        for (const piece of [segment, [...segment].reverse()]) {
          const candidate = rest.slice(0, to).concat(piece, rest.slice(to));
          if (pathCost(cost, candidate) >= current - Constants.PATH_IMPROVEMENT_EPSILON) continue;
          order.splice(0, order.length, ...candidate);
          return true;
        }
      }
    }
  }
  return false;
}
