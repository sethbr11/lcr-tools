import { Types } from '../types';

/** A keyless raster basemap the planner and PDF can draw. Templates use {z}/{x}/{y}. */
export interface KeylessBasemap {
  /** Short provider id, for logs and tests. */
  id: 'usgs' | 'esri';
  /** Tile URL template (256px tiles). */
  tileUrl: string;
  /** Attribution HTML for the on-screen Leaflet map. */
  attributionHtml: string;
  /** Plain-text attribution printed on PDF maps. */
  attributionText: string;
  /** Highest zoom the provider actually has tiles for; deeper zooms scale these up. */
  maxNativeZoom: number;
}

/**
 * Public-domain USGS National Map topographic tiles (no key, US coverage only).
 * OpenStreetMap's servers block requests from browser extensions and CARTO now requires a key.
 */
const USGS_BASEMAP: KeylessBasemap = {
  id: 'usgs',
  tileUrl:
    'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
  attributionHtml:
    'Map tiles: <a href="https://www.usgs.gov/programs/national-geospatial-program/national-map">USGS The National Map</a>',
  attributionText: 'Map tiles: USGS The National Map',
  maxNativeZoom: 16,
};

/** Esri World Street Map tiles (no key, worldwide), used outside the United States. */
const ESRI_BASEMAP: KeylessBasemap = {
  id: 'esri',
  tileUrl:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  attributionHtml: 'Tiles &copy; Esri &mdash; Sources: Esri, HERE, Garmin, USGS, and others',
  attributionText: 'Tiles © Esri — Sources: Esri, HERE, Garmin, USGS, and others',
  maxNativeZoom: 19,
};

/** Rough [south, west, north, east] boxes for the US states and Puerto Rico. */
const US_REGIONS: Array<[number, number, number, number]> = [
  [24.4, -125.0, 49.0, -66.8], // contiguous states (49th parallel border)
  [51.2, -179.2, 71.5, -129.9], // Alaska
  [18.8, -160.3, 22.3, -154.7], // Hawaii
  [17.8, -67.4, 18.6, -65.2], // Puerto Rico
];

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
export function chooseKeylessBasemap(points: Types.CoordinatePoint[]): KeylessBasemap {
  const located = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (located.length === 0) return ESRI_BASEMAP;
  const inUs = located.filter(isInUnitedStates).length;
  return inUs * 2 >= located.length ? USGS_BASEMAP : ESRI_BASEMAP;
}

/**
 * Reports whether a coordinate falls inside the US regions USGS tiles cover.
 *
 * @param point - Coordinate to test.
 * @returns True for the contiguous states, Alaska, Hawaii, and Puerto Rico.
 */
export function isInUnitedStates(point: Types.CoordinatePoint): boolean {
  return US_REGIONS.some(
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
