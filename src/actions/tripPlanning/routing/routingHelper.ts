import { Constants, Types } from '../types';
import { geocodeAddressMulti } from '../geocoding/geocodingHelper';
import { buildRoutingMatrices, getMapboxRouteGeometry, solveOpenPath } from './matrixHelper';
import { getTripState, logTripStatus, setTripState, updateTripStats } from '../ui/stateHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Optimizes a visit order for each cluster, treating every cluster as an independent open trip.
 *
 * @param metric - Straight-line miles or Mapbox driving durations.
 * @param mapboxKey - Mapbox token required for road-network routing.
 * @param provider - Geocoder used only for an optional starting address.
 * @param geocodeKey - API key used for starting address geocoding when required.
 * @param startingAddress - Optional default start location for every trip.
 * @param clusterStartAddresses - Optional per-cluster start locations that replace the default.
 * @returns Optimized routes, or null when routing cannot proceed.
 */
export async function optimizeRoutes(
  metric: Types.DistanceMetric,
  mapboxKey: string,
  provider: Types.GeocodeProvider,
  geocodeKey: string,
  startingAddress: string,
  clusterStartAddresses: Record<number, string> = {}
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

  const clusters = groupClusters(clustered);
  const clusterIds = Object.keys(clusters)
    .map((id) => Number(id))
    .sort((left, right) => left - right);

  // Geocode each distinct starting address once (default plus any per-cluster overrides)
  const startsByAddress = new Map<string, Types.TripMapMember>();
  const addresses = new Set(
    clusterIds.map((id) => (clusterStartAddresses[id] || startingAddress).trim()).filter(Boolean)
  );
  for (const address of addresses) {
    logTripStatus(`Geocoding starting address: ${address}...`);
    const geo = await geocodeAddressMulti(address, provider, geocodeKey);
    if (!geo) {
      logTripStatus(`Could not geocode starting address: ${address}.`);
      return null;
    }
    startsByAddress.set(address, {
      name: 'Starting Point',
      address,
      columns: {},
      lat: geo.lat,
      lng: geo.lng,
      coordSource: 'geocode',
    });
    logTripStatus(`Starting address geocoded: [${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}]`);
  }

  // Each cluster is its own trip with its own road route
  const routes: Types.OptimizedRoute[] = [];
  for (const clusterId of clusterIds) {
    const address = (clusterStartAddresses[clusterId] || startingAddress).trim();
    const startMember = address ? (startsByAddress.get(address) ?? null) : null;
    const route = await findBestInternalRoute(clusters[clusterId], metric, mapboxKey, startMember);
    if (metric === 'mapbox' && mapboxKey) {
      const stops = route.startPoint ? [route.startPoint, ...route.points] : route.points;
      route.geometry = (await getMapboxRouteGeometry(stops, mapboxKey)) ?? undefined;
      if (!route.geometry && stops.length > 1) {
        logTripStatus(
          `Road path for cluster ${clusterId + 1} unavailable; drawing straight lines.`
        );
      }
    }
    routes.push(route);
  }

  setTripState({ optimized: routes });
  updateTripStats();
  logTripStatus('Route optimization complete.');
  return routes;
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

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

/** Builds an ordered open trip for one cluster, departing from the start point when given. */
async function findBestInternalRoute(
  points: Types.TripMapMember[],
  metric: Types.DistanceMetric,
  apiKey: string,
  startMember: Types.TripMapMember | null
): Promise<Types.OptimizedRoute> {
  const nodes = startMember ? [startMember, ...points] : [...points];
  const cluster = points[0]?.cluster ?? -1;
  const startPoint = startMember ? { lat: startMember.lat, lng: startMember.lng } : undefined;
  if (nodes.length < 2) {
    return { cluster, points: [...points], distance: 0, displayDistance: 0, startPoint };
  }

  const matrices = await buildRoutingMatrices(nodes, metric, apiKey);
  const order = solveOpenPath(matrices.cost, startMember ? 0 : null);
  const routePoints = order.filter((index) => !startMember || index !== 0).map((i) => nodes[i]);

  let costTotal = 0;
  let meters = 0;
  for (let step = 0; step < order.length - 1; step += 1) {
    costTotal += matrices.cost[order[step]][order[step + 1]];
    meters += matrices.distancesMeters?.[order[step]][order[step + 1]] ?? 0;
  }

  const isRoad = Boolean(matrices.durationsSec && matrices.distancesMeters);
  return {
    cluster,
    points: routePoints,
    distance: isRoad ? costTotal / 60 : costTotal,
    displayDistance: isRoad ? meters / Constants.METERS_PER_MILE : costTotal,
    startPoint,
  };
}
