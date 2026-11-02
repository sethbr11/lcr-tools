import { Dom, Types } from '../types';

let records: Types.TripPlanningMember[] = [];
let geocoded: Types.TripMapMember[] = [];
let clustered: Types.TripMapMember[] = [];
let optimized: Types.OptimizedRoute[] = [];
let failedGeocodes: Types.FailedGeocode[] = [];
let originalHeaders: string[] = [];
let tripLogs: Types.TripLogEntry[] = [];
/** Per-cluster starting addresses that override the default starting address. */
let clusterStartAddresses: Record<number, string> = {};

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Appends a timestamped line to the planner execution log.
 *
 * @param message - Status text to display.
 */
export function logTripStatus(message: string): void {
  const timestamp = new Date().toLocaleTimeString();
  tripLogs.push({ timestamp, message });
  const statusEl = document.getElementById(Dom.STATUS_ID);
  if (!statusEl) return;
  statusEl.textContent = `${statusEl.textContent || ''}[${timestamp}] ${message}\n`;
  const parent = statusEl.parentElement;
  if (parent) parent.scrollTop = parent.scrollHeight;
}

/**
 * Returns all recorded trip execution log entries.
 *
 * @returns Array of timestamped log entries.
 */
export function getTripLogs(): Types.TripLogEntry[] {
  return [...tripLogs];
}

/** Refreshes header statistic cards from current planner state. */
export function updateTripStats(): void {
  capClusterSizeInputs(geocoded.length);
  setStat(Dom.STAT_TOTAL_ID, String(records.length));
  setStat(Dom.STAT_GEOCODED_ID, `${geocoded.length}/${records.length}`);

  if (clustered.length > 0) {
    const unique = new Set(
      clustered.map((c) => c.cluster).filter((c) => c !== undefined && c !== -1)
    ).size;
    setStat(Dom.STAT_CLUSTERS_ID, String(unique));
  } else {
    setStat(Dom.STAT_CLUSTERS_ID, '-');
  }

  if (optimized.length > 0) {
    const total = optimized.reduce((sum, route) => sum + (route.displayDistance || 0), 0);
    setStat(Dom.STAT_DISTANCE_ID, `${total.toFixed(1)} miles`);
  } else {
    setStat(Dom.STAT_DISTANCE_ID, '-');
  }
}

/** Returns a shallow copy of the current planner workspace. */
export function getTripState(): Types.TripPlannerState {
  return {
    records: [...records],
    geocoded: [...geocoded],
    clustered: [...clustered],
    optimized: [...optimized],
    failedGeocodes: [...failedGeocodes],
    originalHeaders: [...originalHeaders],
  };
}

/**
 * Replaces portions of the planner workspace. Used by tests and pipeline steps.
 *
 * @param next - Partial workspace values to assign.
 */
export function setTripState(next: Partial<Types.TripPlannerState>): void {
  if (next.records) records = [...next.records];
  if (next.geocoded) geocoded = [...next.geocoded];
  if (next.clustered) clustered = [...next.clustered];
  if (next.optimized) optimized = [...next.optimized];
  if (next.failedGeocodes) failedGeocodes = [...next.failedGeocodes];
  if (next.originalHeaders) originalHeaders = [...next.originalHeaders];
}

/**
 * Converts a coordinate-bearing member into the strict map-member shape.
 *
 * @param member - Member that already has latitude and longitude.
 * @returns Map member with required coordinates.
 */
export function toMapMember(member: Types.TripPlanningMember): Types.TripMapMember | null {
  if (typeof member.lat !== 'number' || typeof member.lng !== 'number') return null;
  return { ...member, lat: member.lat, lng: member.lng };
}

/** Returns the current cluster color palette. */
export function getClusterColors(): readonly string[] {
  return Dom.CLUSTER_COLORS;
}

/**
 * Returns the starting address chosen for one cluster, or '' to use the default.
 *
 * @param clusterId - Zero-based cluster identifier.
 * @returns The cluster's own starting address, or an empty string.
 */
export function getClusterStartAddress(clusterId: number): string {
  return clusterStartAddresses[clusterId] || '';
}

/**
 * Sets (or clears, when blank) a starting address for one cluster.
 *
 * @param clusterId - Zero-based cluster identifier.
 * @param address - Address typed by the user; blank reverts to the default.
 */
export function setClusterStartAddress(clusterId: number, address: string): void {
  const trimmed = address.trim();
  if (trimmed) clusterStartAddresses = { ...clusterStartAddresses, [clusterId]: trimmed };
  else {
    const { [clusterId]: _removed, ...rest } = clusterStartAddresses;
    clusterStartAddresses = rest;
  }
}

/**
 * Returns all per-cluster starting addresses keyed by cluster id.
 *
 * @returns Copy of the cluster-to-address overrides.
 */
export function getClusterStartAddresses(): Record<number, string> {
  return { ...clusterStartAddresses };
}

/** Clears per-cluster starting addresses (cluster ids change whenever members are re-clustered). */
export function clearClusterStartAddresses(): void {
  clusterStartAddresses = {};
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Writes a statistic value when the target element exists. */
/** Caps the group count and group size inputs at the number of people available to group. */
function capClusterSizeInputs(people: number): void {
  const cap = Math.max(1, people);
  const ids = [
    Dom.CLUSTER_COUNT_ID,
    Dom.COUNT_MIN_SIZE_ID,
    Dom.MIN_CLUSTER_SIZE_ID,
    Dom.MAX_CLUSTER_SIZE_ID,
  ];
  for (const id of ids) {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (!input) continue;
    input.max = String(cap);
    if (people > 0 && Number(input.value) > cap) input.value = String(cap);
  }
}

function setStat(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ==========================================================================
   TESTING FUNCTIONS
   ========================================================================== */

/** Clears all in-memory planner collections. @internal */
export function resetTripState(): void {
  records = [];
  geocoded = [];
  clustered = [];
  optimized = [];
  failedGeocodes = [];
  originalHeaders = [];
  tripLogs = [];
  clusterStartAddresses = {};
}
