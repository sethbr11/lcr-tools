import { Constants, Types } from '../types';
import { geocodeAddressMulti } from '../geocoding/geocodingHelper';
import { getMapboxTravelMatrix, haversineMiles, solveTspWithMatrix } from './matrixHelper';
import { getTripState, logTripStatus, setTripState, updateTripStats } from '../ui/stateHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Optimizes a visit order for each cluster, chaining routes north to south.
 *
 * @param metric - Straight-line miles or Mapbox driving durations.
 * @param mapboxKey - Mapbox token required for road-network routing.
 * @param provider - Geocoder used only for an optional starting address.
 * @param geocodeKey - API key used for starting address geocoding when required.
 * @param startingAddress - Optional user-typed start location.
 * @returns Optimized routes, or null when routing cannot proceed.
 */
export async function optimizeRoutes(
  metric: Types.DistanceMetric,
  mapboxKey: string,
  provider: Types.GeocodeProvider,
  geocodeKey: string,
  startingAddress: string
): Promise<Types.OptimizedRoute[] | null> {
  const { clustered } = getTripState();
  if (clustered.length === 0) {
    logTripStatus('No clustered points to optimize.');
    return null;
  }

  if (metric === 'mapbox' && !mapboxKey) {
    logTripStatus('Road Network metric requires a Mapbox API key.');
    return null;
  }

  let previousEnd: Types.TripMapMember | null = null;
  if (startingAddress) {
    logTripStatus(`Geocoding starting address: ${startingAddress}...`);
    const geo = await geocodeAddressMulti(startingAddress, provider, geocodeKey);
    if (!geo) {
      logTripStatus(`Could not geocode starting address: ${startingAddress}.`);
      return null;
    }
    previousEnd = {
      name: 'Starting Point',
      address: startingAddress,
      columns: {},
      lat: geo.lat,
      lng: geo.lng,
      coordSource: 'geocode',
    };
    logTripStatus(`Starting address geocoded: [${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}]`);
  }

  const clusters = groupClusters(clustered);
  const sortedIds = sortClustersNorthToSouth(clusters);
  const routes: Types.OptimizedRoute[] = [];

  for (let index = 0; index < sortedIds.length; index += 1) {
    const clusterId = sortedIds[index];
    const pointsInCluster = clusters[clusterId];
    let targetEnd: Types.CoordinatePoint | null = null;
    if (index < sortedIds.length - 1) {
      targetEnd = clusterCentroid(clusters[sortedIds[index + 1]]);
    }
    const route = await findBestInternalRoute(
      pointsInCluster,
      metric,
      mapboxKey,
      previousEnd,
      targetEnd
    );
    routes.push(route);
    if (route.points.length > 0) previousEnd = route.points[route.points.length - 1];
  }

  setTripState({ optimized: routes });
  updateTripStats();
  logTripStatus('Route optimization complete.');
  return routes;
}

/**
 * Orders a collection of points using a greedy nearest-neighbor TSP heuristic.
 *
 * @param points - Points to sequence into a visit route.
 * @param startPoint - Optional departure point to anchor the route beginning.
 * @param targetEndPoint - Optional target point used to reserve an exit stop.
 * @returns Ordered sequence of points minimizing segment distances.
 */
export async function solveTspNearestNeighbor(
  points: Types.TripMapMember[],
  startPoint: Types.TripMapMember | null = null,
  targetEndPoint: Types.CoordinatePoint | null = null
): Promise<Types.TripMapMember[]> {
  if (points.length === 0) return [];
  let unvisited = [...points];
  let current =
    (startPoint &&
      unvisited.find((point) => point.lat === startPoint.lat && point.lng === startPoint.lng)) ||
    startPoint ||
    unvisited[0];
  const route = [current];
  unvisited = unvisited.filter((point) => point !== current);

  let exitNode: Types.TripMapMember | null = null;
  if (targetEndPoint && unvisited.length > 0) {
    let minExitDist = Infinity;
    let exitIndex = -1;
    for (let index = 0; index < unvisited.length; index += 1) {
      const distance = haversineMiles(unvisited[index], targetEndPoint);
      if (distance >= minExitDist) continue;
      minExitDist = distance;
      exitNode = unvisited[index];
      exitIndex = index;
    }
    if (exitNode && exitIndex >= 0) unvisited.splice(exitIndex, 1);
  }

  while (unvisited.length > 0) {
    let nearestIndex = -1;
    let nearestDist = Infinity;
    for (let index = 0; index < unvisited.length; index += 1) {
      const distance = haversineMiles(current, unvisited[index]);
      if (distance >= nearestDist) continue;
      nearestDist = distance;
      nearestIndex = index;
    }
    if (nearestIndex === -1) break;
    current = unvisited[nearestIndex];
    route.push(current);
    unvisited.splice(nearestIndex, 1);
  }

  if (exitNode) route.push(exitNode);
  return route;
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Straight-line or Mapbox driving distance between two points. */
async function getRouteDistance(
  from: Types.CoordinatePoint,
  to: Types.CoordinatePoint,
  metric: Types.DistanceMetric,
  apiKey: string
): Promise<number> {
  if (metric === 'mapbox') {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `${Constants.MAPBOX_DIRECTIONS_URL}/${coords}?access_token=${encodeURIComponent(apiKey)}`;
    try {
      const response = await fetch(url);
      const data = (await response.json()) as Types.MapboxApiResponse;
      if (data.routes && data.routes.length > 0 && typeof data.routes[0].duration === 'number') {
        return data.routes[0].duration / 60;
      }
    } catch {
      return haversineMiles(from, to);
    }
    return haversineMiles(from, to);
  }

  return haversineMiles(from, to);
}

/** Groups clustered members, dropping unassigned points. */
function groupClusters(clustered: Types.TripMapMember[]): Record<number, Types.TripMapMember[]> {
  const clusters: Record<number, Types.TripMapMember[]> = {};
  for (const point of clustered) {
    if (point.cluster === undefined || point.cluster === -1) continue;
    if (!clusters[point.cluster]) clusters[point.cluster] = [];
    clusters[point.cluster].push(point);
  }
  return clusters;
}

/** Orders cluster ids from northernmost centroid to southernmost. */
function sortClustersNorthToSouth(clusters: Record<number, Types.TripMapMember[]>): number[] {
  return Object.keys(clusters)
    .map((id) => Number(id))
    .sort(
      (left, right) => clusterCentroid(clusters[right]).lat - clusterCentroid(clusters[left]).lat
    );
}

/** Returns the arithmetic centroid of a collection of points. */
function clusterCentroid(points: Types.TripMapMember[]): Types.CoordinatePoint {
  if (!points || points.length === 0) return { lat: 0, lng: 0 };
  const sumLat = points.reduce((acc, point) => acc + point.lat, 0);
  const sumLng = points.reduce((acc, point) => acc + point.lng, 0);
  return { lat: sumLat / points.length, lng: sumLng / points.length };
}

/** Builds an ordered internal route for one cluster. */
async function findBestInternalRoute(
  points: Types.TripMapMember[],
  metric: Types.DistanceMetric,
  apiKey: string,
  startingPoint: Types.TripMapMember | null,
  targetEndPoint: Types.CoordinatePoint | null
): Promise<Types.OptimizedRoute> {
  const wasAdded = Boolean(
    startingPoint &&
    !points.some((point) => point.lat === startingPoint.lat && point.lng === startingPoint.lng)
  );
  const effectivePoints = wasAdded && startingPoint ? [startingPoint, ...points] : [...points];

  let routePoints: Types.TripMapMember[];
  if (metric === 'mapbox' && apiKey) {
    try {
      const matrix = await getMapboxTravelMatrix(effectivePoints, apiKey);
      routePoints = solveTspWithMatrix(
        matrix,
        effectivePoints,
        startingPoint,
        targetEndPoint
      ).orderedPoints;
    } catch (error) {
      console.error(
        'LCR Tools: Matrix optimization failed, falling back to nearest neighbor:',
        error
      );
      routePoints = await solveTspNearestNeighbor(effectivePoints, startingPoint, targetEndPoint);
    }
  } else {
    routePoints = await solveTspNearestNeighbor(effectivePoints, startingPoint, targetEndPoint);
  }

  if (
    wasAdded &&
    startingPoint &&
    routePoints.length > 0 &&
    routePoints[0].lat === startingPoint.lat &&
    routePoints[0].lng === startingPoint.lng
  ) {
    routePoints = routePoints.slice(1);
  }

  let totalDist = 0;
  let miles = 0;
  for (let index = 0; index < routePoints.length - 1; index += 1) {
    totalDist += await getRouteDistance(routePoints[index], routePoints[index + 1], metric, apiKey);
    miles += haversineMiles(routePoints[index], routePoints[index + 1]);
  }

  return {
    cluster: points[0]?.cluster ?? -1,
    points: routePoints,
    distance: totalDist,
    displayDistance: miles,
  };
}
