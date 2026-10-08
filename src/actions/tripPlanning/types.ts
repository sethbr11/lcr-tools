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
  /** Distance metric used when optimizing visit routes. */
  export type DistanceMetric = 'straight' | 'mapbox';
  /** Clustering strategy selected in the planner UI. */
  export type ClusterStrategy = 'byCount' | 'bySize';
  /** Origin of a member coordinate pair. */
  export type CoordSource = 'church' | 'geocode' | 'manual';
  /** Turf feature representing a clustered member. */
  export type ClusterFeature = Feature<Point, Types.TripMapMember>;
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
    /** Display distance always expressed in miles. */
    displayDistance?: number;
  }
  /** Result payload returned by matrix TSP optimization. */
  export interface MatrixTspResult {
    /** Route stop points ordered by travel duration. */
    orderedPoints: TripMapMember[];
    /** Total travel duration across the route in minutes. */
    totalDistance: number;
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
    /** Returned driving routes. */
    routes?: Array<{ duration?: number }>;
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
}

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

export const Constants = {
  ...Base.Constants,
  /** Extension storage key holding member data sent to Trip Planner tab. */
  STORAGE_DATA_KEY: 'tripPlanningData',
  /** Extension storage key holding table header names for Trip Planner tab. */
  STORAGE_HEADERS_KEY: 'tripPlanningHeaders',
  /** Extension storage key holding cached geocode results keyed by address. */
  GEOCODE_CACHE_KEY: 'geocode_cache',
  /** Relative URL path for the standalone trip planning tool tab. */
  PAGE_PATH: '/trip-planning.html',
  /** Confirmation modal title shown before opening the planner. */
  CONFIRM_TITLE: 'Trip Planner',
  /** Confirmation modal body shown before opening the planner. */
  CONFIRM_MESSAGE: 'This will open the Trip Planner in a new tab. Proceed?',
  /** Confirmation button label for opening the planner. */
  CONFIRM_OPEN_TEXT: 'Open Trip Planner',
  /** Cancel button label for the planner launch confirmation. */
  CONFIRM_CANCEL_TEXT: 'Cancel',
  /** Display name used when LCR layout verification fails. */
  ACTION_DISPLAY_NAME: 'Trip Planner',
  /** Maintenance reason when no tables are found on the Moved In report. */
  MAINTENANCE_NO_TABLES: 'No member tables could be located on this page.',
  /** Maintenance reason when Name or Address columns are missing. */
  MAINTENANCE_MISSING_COLUMNS:
    'Visible Name and Address columns could not be located on the selected table.',
  /** Nominatim contact email required by their usage policy. */
  NOMINATIM_EMAIL: Base.Constants.MAINTENANCE_EMAIL,
  /** Nominatim search endpoint. */
  NOMINATIM_SEARCH_URL: 'https://nominatim.openstreetmap.org/search',
  /** LocationIQ search endpoint. */
  LOCATIONIQ_SEARCH_URL: 'https://us1.locationiq.com/v1/search.php',
  /** Mapbox geocoding endpoint prefix. */
  MAPBOX_GEOCODE_URL: 'https://api.mapbox.com/geocoding/v5/mapbox.places',
  /** Mapbox Directions Matrix endpoint prefix without trailing slash. */
  MAPBOX_MATRIX_URL: 'https://api.mapbox.com/directions-matrix/v1/mapbox/driving',
  /** Mapbox Directions endpoint prefix. */
  MAPBOX_DIRECTIONS_URL: 'https://api.mapbox.com/directions/v5/mapbox/driving',
  /** Carto Voyager raster tile URL template. */
  CARTO_TILE_URL: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  /** Leaflet attribution for Carto Voyager tiles. */
  CARTO_ATTRIBUTION: '&copy; OpenStreetMap contributors &copy; CARTO',
  /** Mapbox Streets raster tile URL template. */
  MAPBOX_TILE_URL:
    'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token={accessToken}',
  /** Leaflet attribution for Mapbox Streets tiles. */
  MAPBOX_TILE_ATTRIBUTION: '&copy; Mapbox &copy; OpenStreetMap',
  /** Default map center latitude. */
  MAP_DEFAULT_LAT: 20,
  /** Default map center longitude. */
  MAP_DEFAULT_LNG: 0,
  /** Default map zoom. */
  MAP_DEFAULT_ZOOM: 2,
  /** Maximum Leaflet tile zoom. */
  MAP_MAX_ZOOM: 19,
  /** Leaflet retina-style tile size. */
  MAP_TILE_SIZE: 512,
  /** Leaflet zoom offset paired with retina tile size. */
  MAP_ZOOM_OFFSET: -1,
  /** Padding applied when fitting map bounds. */
  MAP_BOUNDS_PADDING: 30,
  /** Nominatim delay between requests in milliseconds. */
  NOMINATIM_RATE_LIMIT_MS: 1100,
  /** Paid-provider delay between geocode requests in milliseconds. */
  PAID_GEOCODE_RATE_LIMIT_MS: 300,
  /** Backoff delay in milliseconds when a geocoding provider returns HTTP 429. */
  RATE_LIMIT_BACKOFF_MS: 5000,
  /** Mapbox matrix batch size limit. */
  MAPBOX_MATRIX_BATCH_SIZE: 12,
  /** Maximum by-size clustering adjustment iterations. */
  CLUSTER_SIZE_MAX_ITERATIONS: 30,
  /** Default number of clusters. */
  CLUSTER_COUNT_DEFAULT: 1,
  /** Default minimum cluster size. */
  CLUSTER_MIN_SIZE_DEFAULT: 5,
  /** Default maximum cluster size. */
  CLUSTER_MAX_SIZE_DEFAULT: 10,
  /** Mean radius of Earth in miles used for spherical distance calculations. */
  EARTH_RADIUS_MILES: 3958.8,
  /** Ratio of records requiring a ZIP code before flagging missing ZIP format. */
  ZIP_RATIO_THRESHOLD: 0.6,
  /** Fallback extension version string for User-Agent when runtime version is unavailable. */
  FALLBACK_VERSION: '2.0.1',
  /** Miles per kilometer conversion factor. */
  MILES_PER_KM: 0.621371,
  /** Button label for repairing an un-geocoded address. */
  BUTTON_FIX_TEXT: 'Fix',
  /** Button label shown while actively repairing an address. */
  BUTTON_FIXING_TEXT: 'Fixing...',
  /** Button label for picking coordinates directly on the Leaflet map. */
  BUTTON_PICK_MAP_TEXT: 'Pick on Map',
  /** Button label while waiting for map click selection. */
  BUTTON_PICKING_MAP_TEXT: 'Click map...',
  /** Confirmation disclosure shown before sending unmapped addresses to external geocoding endpoints. */
  GEOCODE_DISCLOSURE_CONFIRM:
    'Send {count} residential address(es) to {provider} to look up coordinates?\n\nOnly street address text is sent—never member names or sensitive personal information.',
  /** CSV download filename for trip reports. */
  CSV_FILENAME: 'route_report.csv',
  /** Extra CSV columns appended after original LCR headers. */
  CSV_CUSTOM_FIELDS: ['Latitude', 'Longitude', 'Cluster', 'RouteOrder', 'FailureReason'],
  /** Fallback CSV headers when original headers are unavailable. */
  CSV_FALLBACK_HEADERS: ['Name', 'Address'],
  /** User-Agent header sent to Nominatim, with `{version}` replaced at runtime. */
  GEOCODE_USER_AGENT: 'LCR-Tools-Extension/{version} (https://github.com/sethbr11/lcr-tools)',
  /** Title displayed on the modal loader while extracting records from LCR. */
  LOADING_TITLE: 'Preparing Trip Planner...',
  /** Supporting subtitle displayed on the modal loader while extracting records. */
  LOADING_SUBHEADER: 'Extracting member records and checking Church Directory coordinates...',
  /** Storage key used to persist the default trip starting address. */
  STORAGE_STARTING_ADDRESS_KEY: 'trip_planner_starting_address',
  /** Execution log download filename. */
  LOG_FILENAME: 'trip_planner_execution_log.txt',
  /** Toast message shown when default starting address is saved to local storage. */
  STARTING_ADDRESS_SAVED_TOAST: 'Starting address saved as default!',
  /** Title text shown in the execution logs modal header. */
  LOGS_MODAL_TITLE: 'Trip Planner • Execution Log',
  /** Placeholder text shown when the execution log is empty. */
  LOGS_NO_ENTRIES: 'No log entries recorded.',
  /** Toast message shown after execution log download completes. */
  LOGS_DOWNLOADED_TOAST: 'Execution log downloaded',
} as const;

/* ==========================================================================
   REGULAR EXPRESSIONS
   ========================================================================== */

export const Regex = {
  ...Base.Regex,
  /** Context: Column headers identifying member name columns. */
  NAME_HEADER: /name|member/i,
  /** Context: Column headers identifying member address columns. */
  ADDRESS_HEADER: /address|street|location/i,
  /** Context: USPS two-letter state code. */
  STATE_CODE: /\b[A-Z]{2}\b/,
  /** Context: Two or three letter state, province, or territory abbreviation (US, CA, AU). */
  REGION_OR_STATE_CODE: /\b[A-Z]{2,3}\b/,
  /** Context: International postal code formats (Canada, UK, Australia, Europe, etc.). */
  POSTAL_CODE_INTL:
    /\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b|\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b|\b\d{4,6}\b/i,
  /** Context: Global match for US or international postal codes to support stripping variants. */
  POSTAL_CODE_GLOBAL:
    /\b\d{5}(?:-\d{4})?\b|\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b|\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b|\b\d{4,6}\b/gi,
  /** Context: International country name tokens found in residential addresses. */
  COUNTRY_NAME:
    /\b(?:Canada|UK|United Kingdom|Australia|New Zealand|France|Germany|Spain|Mexico|Japan|Brazil|Philippines|England|Scotland|Wales)\b/i,
  /** Context: ZIP+4 hyphenated postal code for shortening. */
  ZIP_PLUS_FOUR: /\b(\d{5})-\d{4}\b/g,
  /** Context: Five-digit ZIP with optional plus-four. */
  ZIP_CODE: /\b\d{5}(?:-\d{4})?\b/g,
  /** Context: Surrounding double quotes on an address string. */
  SURROUNDING_QUOTES: /^"+|"+$/g,
  /** Context: Address that does not begin with a street number. */
  LEADING_STREET_NUMBER: /^\d+/,
  /** Context: Address that is only a street number. */
  INCOMPLETE_STREET: /^\d+\s*$/,
  /** Context: Street number and name before a trailing state code. */
  NUMBER_STREET_ONLY: /^(\d+\s+[^\d,]+?)(?:\s+[A-Z]{2}\b.*)?$/,
  /** Context: Glued unit designator attached to preceding street text without whitespace. */
  GLUED_UNIT:
    /([a-zA-Z0-9])((?:Ste|Apt|Unit|#|Suite|Bldg|Rm|Room|Floor|Fl|Spc|Space|Lot|Trlr|Trailer)\.?\s*\d+)/gi,
  /** Context: Glued unit designator attached to following unit number without whitespace. */
  GLUED_UNIT_DIGIT:
    /((?:Ste|Apt|Unit|#|Suite|Bldg|Rm|Room|Floor|Fl|Spc|Space|Lot|Trlr|Trailer)\.?)(\d+)/gi,
  /** Context: Glued number attached to following word without whitespace. */
  GLUED_NUMBER_WORD: /(\d+)([A-Z][a-z]+)/g,
  /** Context: Glued two-letter state code attached to five-digit ZIP code without whitespace. */
  GLUED_STATE_ZIP: /\b([A-Z]{2})(\d{5})\b/g,
} as const;

export { Dom } from './dom';
