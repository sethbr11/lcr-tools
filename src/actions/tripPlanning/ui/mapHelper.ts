import L from 'leaflet';
import * as turf from '@turf/turf';
import { escapeHtml } from '../utils';
import { Constants, Dom, Types } from '../types';
import { getClusterColors } from './stateHelper';

let map: L.Map | null = null;
let markerLayer: L.LayerGroup | null = null;
let routeLayer: L.LayerGroup | null = null;
let tileLayer: L.TileLayer | null = null;

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Creates the Leaflet map using Carto Voyager tiles, or Mapbox Streets when a token is supplied.
 *
 * @param mapboxToken - Optional Mapbox token used only for the Streets raster layer.
 */
export function initTripMap(mapboxToken = ''): void {
  const container = document.getElementById(Dom.MAP_ID);
  if (!container || map) return;

  map = L.map(Dom.MAP_ID).setView(
    [Constants.MAP_DEFAULT_LAT, Constants.MAP_DEFAULT_LNG],
    Constants.MAP_DEFAULT_ZOOM
  );
  tileLayer = createTileLayer(mapboxToken).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  routeLayer = L.layerGroup().addTo(map);
}

/**
 * Replaces the basemap when a Mapbox token becomes available after init.
 *
 * @param mapboxToken - Optional Mapbox token.
 */
export function refreshTripBasemap(mapboxToken: string): void {
  if (!map) return;
  if (tileLayer) map.removeLayer(tileLayer);
  tileLayer = createTileLayer(mapboxToken).addTo(map);
}

/**
 * Draws circle markers for geocoded or clustered members.
 *
 * @param points - Members to plot.
 * @param isClustered - Whether cluster colors should be applied.
 */
export function drawMarkers(points: Types.TripMapMember[], isClustered = false): void {
  if (!markerLayer) return;
  markerLayer.clearLayers();
  const colors = getClusterColors();
  for (const point of points) {
    const isOutlier = point.cluster === -1;
    const color = isClustered
      ? colors[(((point.cluster || 0) % colors.length) + colors.length) % colors.length]
      : Dom.MARKER_DEFAULT_COLOR;
    const fillColor = isOutlier ? Dom.MARKER_OUTLIER_COLOR : color;
    L.circleMarker([point.lat, point.lng], {
      radius: 6,
      fillColor,
      color: 'white',
      weight: 1.5,
      opacity: 1,
      fillOpacity: 0.9,
    })
      .bindPopup(`<b>${escapeHtml(point.name)}</b><br>${escapeHtml(point.address)}`)
      .addTo(markerLayer);
  }
  recenterToPoints(points);
}

/**
 * Draws colored polylines and start/end markers for optimized cluster routes.
 *
 * @param routes - Optimized per-cluster routes.
 */
export function drawRoutes(routes: Types.OptimizedRoute[]): void {
  const routesLayer = routeLayer;
  const markers = markerLayer;
  if (!routesLayer || !markers) return;
  routesLayer.clearLayers();
  markers.clearLayers();
  const colors = getClusterColors();

  for (const route of routes) {
    if (route.points.length === 0) continue;
    const isOutlier = route.cluster === -1;
    const color = isOutlier
      ? Dom.MARKER_OUTLIER_COLOR
      : colors[((route.cluster % colors.length) + colors.length) % colors.length];

    if (route.points.length > 1) {
      const latlngs: L.LatLngExpression[] = route.points.map((point) => [point.lat, point.lng]);
      const line = turf.lineString(route.points.map((point) => [point.lng, point.lat]));
      route.displayDistance = turf.length(line, { units: 'miles' });

      L.polyline(latlngs, { color, weight: 3, opacity: 0.8 })
        .bindPopup(
          `<b>${isOutlier ? 'Outlier' : `Cluster ${route.cluster + 1}`}</b><br>Distance: ${route.displayDistance.toFixed(1)} miles`
        )
        .addTo(routesLayer);
    }

    route.points.forEach((point, index) => {
      const isStart = index === 0 && route.points.length > 1;
      const isEnd = index === route.points.length - 1 && route.points.length > 1;
      let fillColor: string = color;
      let radius = 6;
      if (isStart) {
        fillColor = Dom.MARKER_START_COLOR;
        radius = 8;
      } else if (isEnd) {
        fillColor = Dom.MARKER_END_COLOR;
        radius = 8;
      }
      L.circleMarker([point.lat, point.lng], {
        radius,
        fillColor,
        color: 'white',
        weight: 2,
        fillOpacity: 1,
      })
        .bindPopup(
          `<b>${index + 1}. ${escapeHtml(point.name)}</b><br>${escapeHtml(point.address)}<br>${isOutlier ? 'Outlier' : `Cluster: ${route.cluster + 1}`}`
        )
        .addTo(routesLayer);
    });
  }

  const allPoints = routes.flatMap((route) => route.points);
  recenterToPoints(allPoints);
}

/**
 * Renders the cluster details sidebar with color swatches, member names, and optional distance.
 *
 * @param points - Clustered members.
 * @param routes - Optional optimized routes containing distance calculations.
 */
export function updateClusterList(
  points: Types.TripMapMember[],
  routes?: Types.OptimizedRoute[]
): void {
  const container = document.getElementById(Dom.CLUSTER_LIST_ID);
  const wrapper = document.getElementById(Dom.CLUSTER_LIST_CONTAINER_ID);
  if (!container || !wrapper) return;
  container.replaceChildren();
  wrapper.style.display = 'block';
  const colors = getClusterColors();
  const groups = new Map<string, { members: Types.TripMapMember[]; id: number }>();

  for (const point of points) {
    const clusterId = point.cluster === -1 ? 'Outliers' : `Cluster ${(point.cluster || 0) + 1}`;
    const existing = groups.get(clusterId) || { members: [], id: point.cluster ?? -1 };
    existing.members.push(point);
    groups.set(clusterId, existing);
  }

  const keys = Array.from(groups.keys()).sort((left, right) => {
    if (left === 'Outliers') return 1;
    if (right === 'Outliers') return -1;
    return left.localeCompare(right, undefined, { numeric: true });
  });

  for (const key of keys) {
    const group = groups.get(key);
    if (!group) continue;
    const isOutlier = group.id === -1;
    const color = isOutlier
      ? Dom.MARKER_OUTLIER_COLOR
      : colors[((group.id % colors.length) + colors.length) % colors.length];
    const mid = Math.ceil(group.members.length / 2);
    const item = document.createElement('div');
    item.className = Dom.CLUSTER_ITEM_CLASS;

    const matchedRoute = routes?.find((r) => r.cluster === group.id);
    const dist =
      typeof matchedRoute?.displayDistance === 'number'
        ? matchedRoute.displayDistance
        : typeof matchedRoute?.distance === 'number'
          ? matchedRoute.distance
          : null;

    item.innerHTML = `
      <div class="${Dom.CLUSTER_HEADER_CLASS}">
        <div class="${Dom.CLUSTER_COLOR_CLASS}" style="background:${color};"></div>
        <div class="${Dom.CLUSTER_TITLE_CLASS}">${escapeHtml(key)} (${group.members.length} members)</div>
        ${dist !== null ? `<div class="${Dom.CLUSTER_DISTANCE_CLASS}">${dist.toFixed(1)} mi</div>` : ''}
      </div>
      <div class="${Dom.CLUSTER_MEMBERS_CLASS}">
        <ul>${group.members
          .slice(0, mid)
          .map((member) => `<li>${escapeHtml(member.name)}</li>`)
          .join('')}</ul>
        <ul>${group.members
          .slice(mid)
          .map((member) => `<li>${escapeHtml(member.name)}</li>`)
          .join('')}</ul>
      </div>
    `;
    container.appendChild(item);
  }
}

/**
 * Enables click-to-pin selection mode on the Leaflet map for manually fixing addresses.
 *
 * @param onPick - Callback invoked with chosen latitude and longitude.
 * @returns Teardown function to cancel pick mode.
 */
export function enableMapClickToPin(onPick: (lat: number, lng: number) => void): () => void {
  if (!map) return () => {};

  const container = map.getContainer();
  const prevCursor = container.style.cursor;
  container.style.cursor = 'crosshair';

  let clickMarker: L.Marker | null = null;

  const handleClick = (e: L.LeafletMouseEvent): void => {
    const { lat, lng } = e.latlng;
    if (clickMarker) clickMarker.remove();
    clickMarker = L.marker([lat, lng]).addTo(map!);
    container.style.cursor = prevCursor;
    map!.off('click', handleClick);
    onPick(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
  };

  map.on('click', handleClick);

  return () => {
    if (map) map.off('click', handleClick);
    if (clickMarker) clickMarker.remove();
    if (container) container.style.cursor = prevCursor;
  };
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Builds either a Carto raster tile layer or a Mapbox Streets tile layer. */
function createTileLayer(mapboxToken: string): L.TileLayer {
  if (mapboxToken) {
    const tileUrl = Constants.MAPBOX_TILE_URL.replace(
      '{accessToken}',
      encodeURIComponent(mapboxToken)
    );
    return L.tileLayer(tileUrl, {
      attribution: Constants.MAPBOX_TILE_ATTRIBUTION,
      maxZoom: Constants.MAP_MAX_ZOOM,
      tileSize: Constants.MAP_TILE_SIZE,
      zoomOffset: Constants.MAP_ZOOM_OFFSET,
    });
  }
  return L.tileLayer(Constants.CARTO_TILE_URL, {
    attribution: Constants.CARTO_ATTRIBUTION,
    maxZoom: Constants.MAP_MAX_ZOOM,
  });
}

/** Fits map bounds to contain every plotted coordinate. */
function recenterToPoints(points: Types.TripMapMember[]): void {
  if (!map || points.length === 0) return;
  const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
  map.fitBounds(bounds, { padding: [Constants.MAP_BOUNDS_PADDING, Constants.MAP_BOUNDS_PADDING] });
}
