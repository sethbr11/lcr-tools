import { Dom, Types } from '../types';

let records: Types.TripPlanningMember[] = [];
let geocoded: Types.TripMapMember[] = [];
let clustered: Types.TripMapMember[] = [];
let optimized: Types.OptimizedRoute[] = [];
let failedGeocodes: Types.FailedGeocode[] = [];
let originalHeaders: string[] = [];
let tripLogs: Types.TripLogEntry[] = [];

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

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Writes a statistic value when the target element exists. */
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
}
