/**
 * Action-specific utilities for membersOutsideBoundary, re-exporting all base utilities.
 */

export * from '@/utils';
import * as turf from '@turf/turf';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Tests whether a point coordinate falls inside a polygon GeoJSON geometry or feature.
 *
 * @param pt - Latitude and longitude coordinates.
 * @param polygon - Polygon or MultiPolygon GeoJSON geometry or feature.
 * @returns True if coordinate is physically inside the boundary polygon.
 */
export function isPointInsidePolygon(
  pt: Types.LatLng,
  polygon: Feature<Polygon | MultiPolygon> | Polygon | MultiPolygon
): boolean {
  try {
    const point = turf.point([pt.lng, pt.lat]);
    const feature = polygon.type === 'Feature' ? polygon : turf.feature(polygon);
    return turf.booleanPointInPolygon(point, feature as Feature<Polygon | MultiPolygon>);
  } catch {
    return isPointInsidePolygonRaycast(pt, polygon);
  }
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Ray-casting point-in-polygon algorithm fallback. */
function isPointInsidePolygonRaycast(
  pt: Types.LatLng,
  polygon: Feature<Polygon | MultiPolygon> | Polygon | MultiPolygon
): boolean {
  const geom: Polygon | MultiPolygon =
    polygon.type === 'Feature' ? (polygon.geometry as Polygon | MultiPolygon) : polygon;

  if (geom.type === 'Polygon') {
    return raycastRings(pt, geom.coordinates);
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.some((polyCoords) => raycastRings(pt, polyCoords));
  }
  return false;
}

/** Evaluates 2D point against coordinate ring array. */
function raycastRings(pt: Types.LatLng, rings: number[][][]): boolean {
  const ring = rings[0];
  if (!ring || ring.length === 0) return false;
  let inside = false;
  const x = pt.lng;
  const y = pt.lat;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
