import { Constants, Types } from '../types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Builds a full travel-duration matrix using batched Mapbox Matrix API calls.
 *
 * @param points - Coordinate-bearing members.
 * @param apiKey - Mapbox access token.
 * @returns Square duration matrix in seconds.
 */
export async function getMapboxTravelMatrix(
  points: Types.TripMapMember[],
  apiKey: string
): Promise<number[][]> {
  const count = points.length;
  if (count < 2) return count === 1 ? [[0]] : [];

  const fullMatrix = Array.from({ length: count }, (_, rowIdx) =>
    Array.from({ length: count }, (_, colIdx) => (rowIdx === colIdx ? 0 : Infinity))
  );
  const batch = Constants.MAPBOX_MATRIX_BATCH_SIZE;

  for (let row = 0; row < count; row += batch) {
    for (let col = 0; col < count; col += batch) {
      const sources = points.slice(row, Math.min(row + batch, count));
      const destinations = points.slice(col, Math.min(col + batch, count));
      if (sources.length < 1 || destinations.length < 1) continue;
      await fillMatrixBatch(fullMatrix, sources, destinations, row, col, apiKey);
    }
  }
  return fullMatrix;
}

/**
 * Greedy nearest-neighbor TSP using a duration matrix, with optional exit reservation.
 *
 * @param matrix - Square duration matrix in seconds.
 * @param points - Points corresponding to matrix indices.
 * @param startPoint - Optional start member.
 * @param targetEndPoint - Optional geographic target used to reserve an exit stop.
 * @returns Ordered points and total duration in minutes.
 */
export function solveTspWithMatrix(
  matrix: number[][],
  points: Types.TripMapMember[],
  startPoint: Types.TripMapMember | null = null,
  targetEndPoint: Types.CoordinatePoint | null = null
): Types.MatrixTspResult {
  if (points.length < 2) return { orderedPoints: points, totalDistance: 0 };

  const unvisited = new Set(points.map((_, index) => index));
  let startIndex = 0;
  if (startPoint) {
    const found = points.findIndex(
      (point) => point.lat === startPoint.lat && point.lng === startPoint.lng
    );
    if (found >= 0) startIndex = found;
  }

  const orderedPoints = [points[startIndex]];
  unvisited.delete(startIndex);
  let currentIndex = startIndex;
  let totalDuration = 0;

  let exitIndex = -1;
  if (targetEndPoint && unvisited.size > 0) {
    exitIndex = reserveExitIndex(points, unvisited, targetEndPoint);
    if (exitIndex !== -1) unvisited.delete(exitIndex);
  }

  while (unvisited.size > 0) {
    let nearestIndex = -1;
    let nearestDuration = Infinity;
    unvisited.forEach((index) => {
      const duration = matrix[currentIndex]?.[index];
      if (duration === undefined || !Number.isFinite(duration) || duration >= nearestDuration) {
        return;
      }
      nearestDuration = duration;
      nearestIndex = index;
    });
    if (nearestIndex === -1) {
      // Fallback: pick remaining unvisited point via spherical distance if matrix entry was missing
      let minFallbackDist = Infinity;
      unvisited.forEach((index) => {
        const dist = haversineMiles(points[currentIndex], points[index]);
        if (dist < minFallbackDist) {
          minFallbackDist = dist;
          nearestIndex = index;
        }
      });
      if (nearestIndex === -1) break;
      nearestDuration = minFallbackDist * 60; // Approximate minutes
    }
    totalDuration += nearestDuration;
    currentIndex = nearestIndex;
    orderedPoints.push(points[currentIndex]);
    unvisited.delete(currentIndex);
  }

  if (exitIndex !== -1) {
    const exitDuration = matrix[currentIndex]?.[exitIndex];
    totalDuration += Number.isFinite(exitDuration)
      ? (exitDuration ?? 0)
      : haversineMiles(points[currentIndex], points[exitIndex]) * 60;
    orderedPoints.push(points[exitIndex]);
  }

  return { orderedPoints, totalDistance: totalDuration / 60 };
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

/** Fills one Mapbox matrix sub-batch into the destination matrix. */
async function fillMatrixBatch(
  fullMatrix: number[][],
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
  const url = `${Constants.MAPBOX_MATRIX_URL}/${coordPath}?access_token=${encodeURIComponent(apiKey)}&annotations=duration&sources=${sourceIndices.join(';')}&destinations=${destinationIndices.join(';')}`;

  try {
    const response = await fetch(url);
    const data = (await response.json()) as Types.MapboxApiResponse;
    if (data.code !== 'Ok' || !data.durations) return;
    for (let row = 0; row < sourceIndices.length; row += 1) {
      for (let col = 0; col < destinationIndices.length; col += 1) {
        const duration = data.durations[row]?.[col];
        if (typeof duration !== 'number') continue;
        fullMatrix[rowOffset + row][colOffset + col] = duration;
      }
    }
  } catch (error) {
    console.error('LCR Tools: Error fetching Mapbox matrix:', error);
  }
}

/** Reserves the unvisited point closest to the next-cluster centroid. */
function reserveExitIndex(
  points: Types.TripMapMember[],
  unvisited: Set<number>,
  targetEndPoint: Types.CoordinatePoint
): number {
  let exitIndex = -1;
  let minExitDist = Infinity;
  unvisited.forEach((index) => {
    const point = points[index];
    const distance = haversineMiles(point, targetEndPoint);
    if (distance >= minExitDist) return;
    minExitDist = distance;
    exitIndex = index;
  });
  return exitIndex;
}
