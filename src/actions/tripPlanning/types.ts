import * as Base from '@/types';
import type { Feature, Point } from 'geojson';

/* ==========================================================================
   TYPES
   ========================================================================== */

export namespace Types {
  /** Re-export base ActionResult. */
  export type ActionResult<T = unknown> = Base.Types.ActionResult<T>;
  /** Re-export base CoordinatePoint. */
  export type CoordinatePoint = Base.Types.CoordinatePoint;
  /** Re-export stored API key dictionary. */
  export type StoredApiKeys = Base.Types.StoredApiKeys;
  /** Re-export known API key catalog identifier. */
  export type KnownApiKeyId = Base.Types.KnownApiKeyId;
  /** Re-export encrypted payload envelope. */
  export type EncryptedPayload = Base.Types.EncryptedPayload;

  /** Geocoding provider identifier used by the Trip Planner. */
  export type GeocodeProvider = 'nominatim' | 'locationiq' | 'mapbox';
  /** PIN dialog purpose: unlock to autofill, unlock to save, create a PIN, or re-check to reveal. */
  export type TripPinMode = 'unlock' | 'save' | 'setup' | 'verify';
  /** Distance metric used when optimizing visit routes. */
  export type DistanceMetric = 'straight' | 'mapbox';
  /** Clustering strategy selected in the planner UI. */
  export type ClusterStrategy = 'byCount' | 'bySize';
  /** Origin of a member coordinate pair. */
  export type CoordSource = 'church' | 'geocode' | 'manual';
  /** Turf feature representing a clustered member. */
  export type ClusterFeature = Feature<Point, TripMapMember>;
  /** Member entry formatted for map trip planning. */
  export interface TripPlanningMember {
    /** Full name of the member. */
    name: string;
    /** Residential street address string. */
    address: string;
    /** Key-value dictionary of all extracted table columns. */
    columns: Record<string, string>;
    /** Geographic latitude coordinate if resolved. */
    lat?: number;
    /** Geographic longitude coordinate if resolved. */
    lng?: number;
    /** Assigned geographic cluster index after clustering. */
    cluster?: number;
    /** How latitude and longitude were obtained. */
    coordSource?: CoordSource;
  }
  /** Member record that has resolved map coordinates. */
  export interface TripMapMember extends TripPlanningMember {
    /** Geographic latitude coordinate. */
    lat: number;
    /** Geographic longitude coordinate. */
    lng: number;
  }
  /** Geocode result including the address variant that succeeded. */
  export interface GeocodeLookupResult {
    /** Geographic latitude coordinate. */
    lat: number;
    /** Geographic longitude coordinate. */
    lng: number;
    /** Address variant that produced the coordinate. */
    usedVariant: string;
  }
  /** Row that failed geocoding and can be repaired in the fixer panel. */
  export interface FailedGeocode {
    /** Member display name. */
    name: string;
    /** Address that failed lookup. */
    address: string;
    /** Classified failure reason. */
    reason: string;
    /** Original extracted table columns. */
    columns: Record<string, string>;
  }
  /** Optimized visit sequence for one cluster. */
  export interface OptimizedRoute {
    /** Zero-based cluster identifier. */
    cluster: number;
    /** Ordered stop points for the cluster. */
    points: TripMapMember[];
    /** Optimizer distance in miles or minutes depending on metric. */
    distance: number;
    /** Display distance always expressed in miles (road miles for Mapbox routing). */
    displayDistance?: number;
    /** Trip origin the route departs from; excluded from `points`. */
    startPoint?: CoordinatePoint;
    /** Road path as [lat, lng] pairs from Mapbox Directions; straight lines are drawn without it. */
    geometry?: [number, number][];
  }
  /** Square duration and distance matrices returned by the Mapbox Matrix API. */
  export interface MapboxTravelMatrix {
    /** Travel durations in seconds between every pair of points. */
    durations: number[][];
    /** Travel distances in meters between every pair of points. */
    distances: number[][];
  }
  /** Cost matrix used by the open-path solver plus the raw road metrics, when available. */
  export interface RoutingMatrices {
    /** Square cost matrix minimized by the solver (seconds or straight-line miles). */
    cost: number[][];
    /** Travel durations in seconds, present for road-network routing. */
    durationsSec?: number[][];
    /** Travel distances in meters, present for road-network routing. */
    distancesMeters?: number[][];
  }
  /** Structured execution log entry recorded during trip planning. */
  export interface TripLogEntry {
    /** Formatted time of day (e.g. "11:42:05 PM"). */
    timestamp: string;
    /** Human-readable status description or event message. */
    message: string;
  }
  /** Parsed table payload ready for trip planner storage. */
  export interface TripTableExtraction {
    /** Formatted members with valid name and address attributes. */
    members: TripPlanningMember[];
    /** List of table header column names. */
    headers: string[];
  }
  /** Result payload returned by trip planning action execution. */
  export interface TripPlanningResult {
    /** Total count of ward members extracted with valid addresses. */
    memberCount: number;
    /** Count of members that received Church Directory coordinates. */
    churchCoordCount: number;
  }
  /** Church Directory household payload subset used for coordinate matching. */
  export interface DirectoryHouseholdGeo {
    /** Household display name. */
    name?: string;
    /** Alternate household display name. */
    displayName?: string;
    /** Household street address. */
    address?: string;
    /** Top-level latitude when provided. */
    latitude?: number;
    /** Top-level longitude when provided. */
    longitude?: number;
    /** Nested coordinate object when provided. */
    coordinates?: Types.DirectoryHouseholdCoordinates;
    /** Members belonging to the household. */
    members?: Types.DirectoryHouseholdPerson[];
  }
  /** Nested latitude and longitude on a Directory household record. */
  export interface DirectoryHouseholdCoordinates {
    /** Household latitude. */
    latitude?: number;
    /** Household longitude. */
    longitude?: number;
  }
  /** Directory household member name fields used for local matching. */
  export interface DirectoryHouseholdPerson {
    /** Surname-first formatted name. */
    name?: string;
    /** Given-name-first display name. */
    displayName?: string;
    /** Given or first name. */
    givenName?: string;
    /** Surname or last name. */
    surname?: string;
  }
  /** Nominatim or LocationIQ geocode JSON item. */
  export interface NominatimGeocodeHit {
    /** Latitude string from the provider. */
    lat?: string;
    /** Longitude string from the provider. */
    lon?: string;
  }
  /** Mapbox Geocoding, Matrix, or Directions JSON payload. */
  export interface MapboxApiResponse {
    /** Geocoded place features. */
    features?: Array<{ center?: number[] }>;
    /** Provider status code. */
    code?: string;
    /** Duration matrix in seconds. */
    durations?: Array<Array<number | null>>;
    /** Distance matrix in meters. */
    distances?: Array<Array<number | null>>;
    /** Returned driving routes; geometry is [lng, lat] pairs when requested as GeoJSON. */
    routes?: Array<{ duration?: number; geometry?: { coordinates?: number[][] } }>;
  }
  /** Address normalization variants used during geocoding. */
  export interface AddressVariants {
    /** Original address string. */
    original: string;
    /** Distinct lookup variants derived from the original. */
    variants: string[];
  }
  /** In-memory planner workspace snapshot used by tests. */
  export interface TripPlannerState {
    /** Extracted member rows. */
    records: TripPlanningMember[];
    /** Members with resolved coordinates. */
    geocoded: TripMapMember[];
    /** Members after clustering. */
    clustered: TripMapMember[];
    /** Optimized per-cluster routes. */
    optimized: OptimizedRoute[];
    /** Geocode failures awaiting repair. */
    failedGeocodes: FailedGeocode[];
    /** Original LCR table headers. */
    originalHeaders: string[];
  }
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
  /** Everything needed to draw one cluster's map. */
  export interface ClusterMapInput {
    /** Ordered stops; stop N is labelled N on the map. */
    stops: CoordinatePoint[];
    /** Optional starting point, drawn as an "S" square. */
    startPoint?: CoordinatePoint;
    /** Optional road path as [lat, lng] pairs; straight lines connect the stops without it. */
    geometry?: [number, number][];
    /** Whether to draw the route line (false when routes have not been optimized). */
    drawRoute: boolean;
    /** Cluster color as a CSS hex string. */
    color: string;
    /** Mapbox token; when set, Mapbox Streets tiles are used like the on-screen map, else USGS/Esri. */
    mapboxToken?: string;
  }
  /** One group's page content. */
  export interface PdfClusterSection {
    /** Zero-based cluster id. */
    clusterId: number;
    /** Cluster color as a CSS hex string. */
    color: string;
    /** Stops in visit order (route order when optimized, otherwise by name). */
    stops: TripMapMember[];
    /** Starting point coordinates, when the route has one. */
    startPoint?: CoordinatePoint;
    /** Starting address text, when the group has one. */
    startAddress?: string;
    /** Road path as [lat, lng] pairs, when routed with Mapbox. */
    geometry?: [number, number][];
    /** True when stops are in optimized route order. */
    isRouted: boolean;
    /** Route length in miles, when routed. */
    miles?: number;
  }
  /** Title, description, and submit label shown in the Trip Planner PIN dialog. */
  export interface TripPinCopy {
    /** Dialog heading. */
    title: string;
    /** Explanatory sentence under the heading. */
    desc: string;
    /** Submit button label. */
    submit: string;
  }
  /** Result of one k-means run over planar points. */
  export interface KMeansResult {
    /** Cluster index per point. */
    assignments: number[];
    /** Final centroid per cluster, in planar coordinates. */
    centroids: [number, number][];
    /** Lloyd iterations performed. */
    iterations: number;
  }
  /** Static map viewport: zoom level and the world-pixel position of the top-left corner. */
  export interface MapView {
    /** Web Mercator zoom level. */
    zoom: number;
    /** World-pixel x of the map's left edge. */
    originX: number;
    /** World-pixel y of the map's top edge. */
    originY: number;
  }
  /** Planar distance and coordinate fields mapped to the static map tile source. */
  export interface MapTileSource {
    /** Tile URL template with {z}/{x}/{y}. */
    template: string;
    /** Deepest zoom the source has tiles for. */
    maxNativeZoom: number;
    /** Attribution printed on the map. */
    attribution: string;
  }
}

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

export { Constants } from './constants';

/* ==========================================================================
   REGULAR EXPRESSIONS
   ========================================================================== */

export { Regex } from './regex';

export { Dom } from './dom';
