import { Constants, Types } from '../types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Chooses the keyless basemap for a set of locations: USGS when most are in the United States,
 * otherwise Esri World Street Map. With no locations yet, Esri (worldwide) is used.
 *
 * @param points - Member or stop coordinates on the map.
 * @returns The basemap to draw.
 */
export function chooseKeylessBasemap(points: Types.CoordinatePoint[]): Types.KeylessBasemap {
  const located = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (located.length === 0) return Constants.ESRI_BASEMAP;
  const inUs = located.filter(isInUnitedStates).length;
  return inUs * 2 >= located.length ? Constants.USGS_BASEMAP : Constants.ESRI_BASEMAP;
}

/**
 * Reports whether a coordinate falls inside the US regions USGS tiles cover.
 *
 * @param point - Coordinate to test.
 * @returns True for the contiguous states, Alaska, Hawaii, and Puerto Rico.
 */
export function isInUnitedStates(point: Types.CoordinatePoint): boolean {
  return Constants.US_REGIONS.some(
    ([south, west, north, east]) =>
      point.lat >= south && point.lat <= north && point.lng >= west && point.lng <= east
  );
}

/**
 * Fills a {z}/{x}/{y} tile template.
 *
 * @param template - Tile URL template.
 * @param zoom - Zoom level.
 * @param x - Tile column.
 * @param y - Tile row.
 * @returns The tile URL.
 */
export function fillTileUrl(template: string, zoom: number, x: number, y: number): string {
  return template.replace('{z}', String(zoom)).replace('{x}', String(x)).replace('{y}', String(y));
}
