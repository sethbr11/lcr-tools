import { Types } from '../types';
import { chooseKeylessBasemap, fillTileUrl } from '../ui/basemapHelper';

/** Logical map size in CSS pixels; the canvas is drawn at 2x for print sharpness. */
const MAP_WIDTH = 800;
const MAP_HEIGHT = 500;
const PIXEL_RATIO = 2;
/** Blank margin kept around the stops when choosing a zoom level. */
const MAP_PADDING = 48;
const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 17;
const STOP_RADIUS = 11;
const MAPBOX_ATTRIBUTION = '© Mapbox © OpenStreetMap';
/** Mapbox Streets raster tiles at 256px (retina), matching the on-screen map when a key is set. */
const MAPBOX_STATIC_TILE_URL =
  'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token={accessToken}';
/** JPEG quality for the embedded map image (PNG maps made the PDF ~6 MB per group). */
const MAP_JPEG_QUALITY = 0.85;
/** Most zoom levels the map may lose to keep a distant starting point in view. */
const MAX_START_ZOOM_OUT = 2;

/** Everything needed to draw one cluster's map. */
export interface ClusterMapInput {
  /** Ordered stops; stop N is labelled N on the map. */
  stops: Types.CoordinatePoint[];
  /** Optional starting point, drawn as an "S" square. */
  startPoint?: Types.CoordinatePoint;
  /** Optional road path as [lat, lng] pairs; straight lines connect the stops without it. */
  geometry?: [number, number][];
  /** Whether to draw the route line (false when routes have not been optimized). */
  drawRoute: boolean;
  /** Cluster color as a CSS hex string. */
  color: string;
  /** Mapbox token; when set, Mapbox Streets tiles are used like the on-screen map, else USGS/Esri. */
  mapboxToken?: string;
}

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Renders a cluster's map (basemap tiles, route, numbered stops) to a PNG data URL for the PDF.
 * Uses Mapbox tiles when a key is set, otherwise USGS (US) or Esri (matching the on-screen map). Tiles
 * that fail to load leave a plain background, so the stops and route still print.
 *
 * @param input - Stops, optional start and road path, and cluster color.
 * @returns JPEG data URL, or null when canvas drawing is unavailable.
 */
export async function renderClusterMap(input: ClusterMapInput): Promise<string | null> {
  const canvas = document.createElement('canvas');
  canvas.width = MAP_WIDTH * PIXEL_RATIO;
  canvas.height = MAP_HEIGHT * PIXEL_RATIO;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);
  ctx.fillStyle = '#eef2f5';
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  if (input.stops.length === 0 && !input.startPoint) {
    return canvas.toDataURL('image/jpeg', MAP_JPEG_QUALITY);
  }

  const view = chooseClusterView(input);
  // Mapbox when a key is saved; otherwise USGS (US) or Esri, since OSM blocks extensions
  const keyless = chooseKeylessBasemap([
    ...input.stops,
    ...(input.startPoint ? [input.startPoint] : []),
  ]);
  const source = input.mapboxToken
    ? {
        template: MAPBOX_STATIC_TILE_URL.replace(
          '{accessToken}',
          encodeURIComponent(input.mapboxToken)
        ),
        maxNativeZoom: MAX_ZOOM,
        attribution: MAPBOX_ATTRIBUTION,
      }
    : {
        template: keyless.tileUrl,
        maxNativeZoom: keyless.maxNativeZoom,
        attribution: keyless.attributionText,
      };
  await drawTiles(ctx, view, source);

  const toScreen = (point: Types.CoordinatePoint): [number, number] => {
    const [x, y] = projectToWorld(point.lat, point.lng, view.zoom);
    return [x - view.originX, y - view.originY];
  };

  if (input.drawRoute) {
    const path = input.geometry?.length
      ? input.geometry.map(([lat, lng]) => toScreen({ lat, lng }))
      : [...(input.startPoint ? [input.startPoint] : []), ...input.stops].map(toScreen);
    drawPath(ctx, path, input.color);
  }
  if (input.startPoint) drawStart(ctx, toScreen(input.startPoint));
  input.stops.forEach((stop, index) => drawStop(ctx, toScreen(stop), index + 1, input.color));
  drawAttribution(ctx, source.attribution);

  return canvas.toDataURL('image/jpeg', MAP_JPEG_QUALITY);
}

/**
 * Projects a coordinate to Web Mercator world pixels at a zoom level (256px tiles).
 *
 * @param lat - Latitude in degrees.
 * @param lng - Longitude in degrees.
 * @param zoom - Map zoom level.
 * @returns [x, y] world pixel position.
 * @internal
 */
export function projectToWorld(lat: number, lng: number, zoom: number): [number, number] {
  const scale = TILE_SIZE * 2 ** zoom;
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const sin = Math.sin((clampedLat * Math.PI) / 180);
  const x = ((lng + 180) / 360) * scale;
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return [x, y];
}

/**
 * Picks the highest zoom at which every point fits inside the padded map, centered on them.
 *
 * @param points - Points that must be visible.
 * @param width - Map width in pixels.
 * @param height - Map height in pixels.
 * @param padding - Margin kept around the points.
 * @returns Zoom level and the world-pixel position of the map's top-left corner.
 * @internal
 */
export function chooseView(
  points: Types.CoordinatePoint[],
  width: number,
  height: number,
  padding: number
): { zoom: number; originX: number; originY: number } {
  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= 1) {
    const projected = points.map((p) => projectToWorld(p.lat, p.lng, zoom));
    const xs = projected.map(([x]) => x);
    const ys = projected.map(([, y]) => y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    if ((spanX <= width - 2 * padding && spanY <= height - 2 * padding) || zoom === MIN_ZOOM) {
      const centerX = (Math.max(...xs) + Math.min(...xs)) / 2;
      const centerY = (Math.max(...ys) + Math.min(...ys)) / 2;
      return { zoom, originX: centerX - width / 2, originY: centerY - height / 2 };
    }
  }
  return { zoom: MIN_ZOOM, originX: 0, originY: 0 };
}

/**
 * Chooses the map view for one cluster, scaled to that cluster's stops.
 * The starting point (and the road leading from it) is included only when that costs at most
 * MAX_START_ZOOM_OUT zoom levels; a far-away start is instead pinned to the map edge.
 *
 * @param input - The cluster's stops, optional start, and optional road path.
 * @returns Zoom level and the world-pixel position of the map's top-left corner.
 * @internal
 */
export function chooseClusterView(input: ClusterMapInput): {
  zoom: number;
  originX: number;
  originY: number;
} {
  const roadPoints = (input.geometry ?? []).map(([lat, lng]) => ({ lat, lng }));
  const withStart = [
    ...input.stops,
    ...(input.startPoint ? [input.startPoint] : []),
    ...roadPoints,
  ];
  const fullView = chooseView(withStart, MAP_WIDTH, MAP_HEIGHT, MAP_PADDING);
  if (!input.startPoint || input.stops.length === 0) return fullView;

  const stopsView = chooseView(input.stops, MAP_WIDTH, MAP_HEIGHT, MAP_PADDING);
  return stopsView.zoom - fullView.zoom > MAX_START_ZOOM_OUT ? stopsView : fullView;
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/**
 * Fetches and draws every basemap tile covering the view; failed tiles are skipped.
 * When the view zooms past the provider's deepest tiles, those tiles are drawn scaled up.
 */
async function drawTiles(
  ctx: CanvasRenderingContext2D,
  view: { zoom: number; originX: number; originY: number },
  source: { template: string; maxNativeZoom: number }
): Promise<void> {
  const tileZoom = Math.min(view.zoom, source.maxNativeZoom);
  const drawSize = TILE_SIZE * 2 ** (view.zoom - tileZoom);
  const tileCount = 2 ** tileZoom;
  const firstX = Math.floor(view.originX / drawSize);
  const lastX = Math.floor((view.originX + MAP_WIDTH) / drawSize);
  const firstY = Math.max(0, Math.floor(view.originY / drawSize));
  const lastY = Math.min(tileCount - 1, Math.floor((view.originY + MAP_HEIGHT) / drawSize));

  const jobs: Promise<void>[] = [];
  for (let tx = firstX; tx <= lastX; tx += 1) {
    for (let ty = firstY; ty <= lastY; ty += 1) {
      const wrappedX = ((tx % tileCount) + tileCount) % tileCount;
      const url = fillTileUrl(source.template, tileZoom, wrappedX, ty);
      jobs.push(
        loadTile(url).then((image) => {
          if (!image) return;
          const dx = tx * drawSize - view.originX;
          const dy = ty * drawSize - view.originY;
          ctx.drawImage(image, dx, dy, drawSize, drawSize);
        })
      );
    }
  }
  await Promise.all(jobs);
}

/** Downloads one tile as a drawable bitmap, or null if it can't be loaded. */
async function loadTile(url: string): Promise<CanvasImageSource | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await createImageBitmap(await response.blob());
  } catch {
    return null;
  }
}

/** Draws the route line with a white casing so it stands out over the basemap. */
function drawPath(ctx: CanvasRenderingContext2D, path: [number, number][], color: string): void {
  if (path.length < 2) return;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const [width, stroke] of [
    [7, 'rgba(255,255,255,0.9)'],
    [4, color],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(path[0][0], path[0][1]);
    for (const [x, y] of path.slice(1)) ctx.lineTo(x, y);
    ctx.lineWidth = width;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

/** Draws a numbered stop marker. */
function drawStop(
  ctx: CanvasRenderingContext2D,
  [x, y]: [number, number],
  label: number,
  color: string
): void {
  ctx.beginPath();
  ctx.arc(x, y, STOP_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${label > 99 ? 9 : 11}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(label), x, y + 0.5);
}

/** Draws the starting point as a dark "S" square, pinned to the map edge when it is off the map. */
function drawStart(ctx: CanvasRenderingContext2D, [rawX, rawY]: [number, number]): void {
  const half = STOP_RADIUS;
  const inset = half + 4;
  const x = Math.max(inset, Math.min(MAP_WIDTH - inset, rawX));
  const y = Math.max(inset, Math.min(MAP_HEIGHT - inset, rawY));
  if (x !== rawX || y !== rawY) {
    ctx.font = 'bold 10px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#1a202c';
    ctx.textBaseline = 'middle';
    ctx.textAlign = x > MAP_WIDTH / 2 ? 'right' : 'left';
    const offset = x > MAP_WIDTH / 2 ? -(half + 4) : half + 4;
    ctx.fillText('Start (off map)', x + offset, y);
  }
  ctx.fillStyle = '#1a202c';
  ctx.fillRect(x - half, y - half, half * 2, half * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(x - half, y - half, half * 2, half * 2);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S', x, y + 0.5);
}

/** Draws the basemap attribution required by the tile provider. */
function drawAttribution(ctx: CanvasRenderingContext2D, attribution: string): void {
  ctx.font = '9px Helvetica, Arial, sans-serif';
  const width = ctx.measureText(attribution).width + 8;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(MAP_WIDTH - width, MAP_HEIGHT - 14, width, 14);
  ctx.fillStyle = '#4a5568';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(attribution, MAP_WIDTH - 4, MAP_HEIGHT - 7);
}
