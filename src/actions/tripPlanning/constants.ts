import * as Base from '@/types';

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
  /** Title of the prompt shown when the browser blocked opening the planner tab. */
  READY_TITLE: 'Trip Planner is ready',
  /** Message of the prompt shown when the browser blocked opening the planner tab. */
  READY_MESSAGE: 'Your browser blocked the new tab. Click Open to view the Trip Planner.',
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
  /** Mapbox Directions endpoint used once per cluster to draw its road path. */
  MAPBOX_DIRECTIONS_URL: 'https://api.mapbox.com/directions/v5/mapbox/driving',
  /** Maximum waypoints Mapbox Directions accepts in one request. */
  MAPBOX_DIRECTIONS_MAX_WAYPOINTS: 25,
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
  /** Delay in milliseconds before retrying a Mapbox matrix request that returned HTTP 429. */
  MAPBOX_MATRIX_RETRY_DELAY_MS: 1500,
  /** Maximum number of retries for a rate-limited Mapbox matrix request. */
  MAPBOX_MATRIX_MAX_RETRIES: 3,
  /** Assumed average driving speed in miles per hour when a matrix cell is missing. */
  FALLBACK_SPEED_MPH: 30,
  /** Meters per statute mile. */
  METERS_PER_MILE: 1609.34,
  /** Maximum 2-opt plus Or-opt improvement passes for an open path. */
  OPEN_PATH_MAX_PASSES: 50,
  /** Minimum cost reduction treated as a real path improvement, guarding against float noise. */
  PATH_IMPROVEMENT_EPSILON: 1e-9,
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
  /** Storage key for the last starting address saved on a group, offered when editing another. */
  STORAGE_STARTING_ADDRESS_KEY: 'trip_planner_starting_address',
  /** Storage key for the columns last chosen for the PDF export. */
  STORAGE_PDF_FIELDS_KEY: 'trip_planner_pdf_fields',
  /** Execution log download filename. */
  LOG_FILENAME: 'trip_planner_execution_log.txt',
  /** Title text shown in the execution logs modal header. */
  LOGS_MODAL_TITLE: 'Trip Planner • Execution Log',
  /** Placeholder text shown when the execution log is empty. */
  LOGS_NO_ENTRIES: 'No log entries recorded.',
  /** Toast message shown after execution log download completes. */
  LOGS_DOWNLOADED_TOAST: 'Execution log downloaded',
  /** Width of the PDF map image in CSS pixels (drawn at 2x for print sharpness). */
  STATIC_MAP_WIDTH: 800,
  /** Height of the PDF map image in CSS pixels. */
  STATIC_MAP_HEIGHT: 500,
  /** Canvas pixel density multiplier for PDF map images. */
  STATIC_MAP_PIXEL_RATIO: 2,
  /** Blank margin in pixels kept around a group's stops when choosing the PDF map zoom. */
  STATIC_MAP_PADDING: 48,
  /** Web Mercator tile size in CSS pixels used to lay out PDF map tiles. */
  STATIC_MAP_TILE_SIZE: 256,
  /** Lowest zoom level a PDF map may use. */
  STATIC_MAP_MIN_ZOOM: 3,
  /** Highest zoom level a PDF map may use. */
  STATIC_MAP_MAX_ZOOM: 17,
  /** Radius in pixels of the numbered stop markers on PDF maps. */
  STATIC_MAP_STOP_RADIUS: 11,
  /** Attribution printed on PDF maps drawn with Mapbox tiles. */
  STATIC_MAP_MAPBOX_ATTRIBUTION: '© Mapbox © OpenStreetMap',
  /** Mapbox Streets raster tiles at 256px (retina), matching the on-screen map when a key is set. */
  MAPBOX_STATIC_TILE_URL:
    'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token={accessToken}',
  /** JPEG quality for embedded PDF map images (PNG maps made the PDF about 6 MB per group). */
  STATIC_MAP_JPEG_QUALITY: 0.85,
  /** Most zoom levels a PDF map may lose to keep a distant starting point in view. */
  STATIC_MAP_MAX_START_ZOOM_OUT: 2,
  /** PDF page margin in millimeters (US Letter). */
  PDF_PAGE_MARGIN_MM: 12,
  /** Font size in points for PDF table text. */
  PDF_TABLE_FONT_SIZE: 9,
  /** Line height in millimeters for wrapped PDF table text. */
  PDF_LINE_HEIGHT_MM: 4,
  /** Cell padding in millimeters for PDF table cells. */
  PDF_CELL_PADDING_MM: 1.5,
  /** Width in millimeters of the PDF table's stop-number column. */
  PDF_STOP_COLUMN_WIDTH_MM: 9,
  /** Maximum Lloyd iterations per k-means run. */
  KMEANS_MAX_ITERATIONS: 100,
  /** Number of seeded k-means restarts; the lowest-variance result wins. */
  KMEANS_RESTARTS: 8,
  /** Decimal places used to treat two coordinates as the same location when clustering. */
  KMEANS_COORD_KEY_DECIMALS: 6,
  /** Public-domain USGS National Map tiles (no key, US only); OSM blocks extensions and CARTO needs a key. */
  USGS_BASEMAP: {
    id: 'usgs',
    tileUrl:
      'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
    attributionHtml:
      'Map tiles: <a href="https://www.usgs.gov/programs/national-geospatial-program/national-map">USGS The National Map</a>',
    attributionText: 'Map tiles: USGS The National Map',
    maxNativeZoom: 16,
  },
  /** Esri World Street Map tiles (no key, worldwide), used outside the United States. */
  ESRI_BASEMAP: {
    id: 'esri',
    tileUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attributionHtml: 'Tiles &copy; Esri &mdash; Sources: Esri, HERE, Garmin, USGS, and others',
    attributionText: 'Tiles © Esri — Sources: Esri, HERE, Garmin, USGS, and others',
    maxNativeZoom: 19,
  },
  /** Rough [south, west, north, east] boxes for the contiguous US (49th parallel), Alaska, Hawaii, and Puerto Rico. */
  US_REGIONS: [
    [24.4, -125.0, 49.0, -66.8],
    [51.2, -179.2, 71.5, -129.9],
    [18.8, -160.3, 22.3, -154.7],
    [17.8, -67.4, 18.6, -65.2],
  ],
  /** Label before a group's starting address in the cluster card. */
  CLUSTER_START_LABEL: 'Start:',
  /** Shown when a group has no starting address and begins at its first stop. */
  CLUSTER_START_DEFAULT: 'First stop',
  /** Tooltip for a group without a starting address. */
  CLUSTER_START_DEFAULT_TITLE: 'No starting address; the route begins at the first stop',
  /** Link text to edit a group's existing starting address. */
  CLUSTER_START_EDIT: 'Edit',
  /** Link text to give a group a starting address. */
  CLUSTER_START_SET: 'Set start',
  /** Placeholder for the group starting address field. */
  CLUSTER_START_PLACEHOLDER: 'Starting address for this group',
  /** Link text that saves a group's starting address. */
  CLUSTER_START_SAVE: 'Save',
  /** Link text that applies one starting address to every group. */
  CLUSTER_START_APPLY_ALL: 'Use for all groups',
  /** Link text that clears a group's starting address (also used to clear PDF column choices). */
  CLUSTER_START_CLEAR: 'Clear',
  /** Subject of the log line when one address is applied to every group. */
  CLUSTER_START_ALL_GROUPS: 'All groups',
  /** Destination in the log line when a group's starting address is cleared. */
  CLUSTER_START_FIRST_STOP: 'their first stop',
  /** Log line after a starting address changes ({{who}}, {{where}}). */
  CLUSTER_START_APPLIED_LOG: '{{who}} will start from {{where}}. Run Optimize Routes to apply.',
  /** Title of the PDF column chooser. */
  PDF_FIELDS_TITLE: 'PDF columns',
  /** Explanation in the PDF column chooser. */
  PDF_FIELDS_DESC:
    "Choose what to show in each group's table. The stop number always comes first and matches the numbered dots on the map.",
  /** Link text that checks every PDF column. */
  PDF_FIELDS_SELECT_ALL: 'Select all',
  /** Button that exports the PDF with the chosen columns. */
  PDF_FIELDS_EXPORT: 'Export PDF',
  /** Toast shown when the PDF export is used before clustering. */
  PDF_NEEDS_CLUSTERS: 'Cluster the addresses before exporting a PDF.',
  /** Toast shown while the PDF is being generated. */
  PDF_BUILDING: 'Building PDF…',
  /** PDF group summary text for the starting address ({{address}}). */
  PDF_START_AT: 'Start: {{address}}',
  /** PDF group summary text when the group has no starting address. */
  PDF_STARTS_AT_FIRST_STOP: 'Starts at stop 1',
  /** PDF group summary note when routes have not been optimized yet. */
  PDF_NOT_ROUTED: 'Not yet routed: stops listed by name',
  /** Text shown in the PDF when a group's map could not be drawn. */
  PDF_MAP_UNAVAILABLE: 'Map unavailable.',
  /** Footer printed on every PDF page. */
  PDF_CONFIDENTIAL_FOOTER: 'Confidential: contains member information',
  /** Label beside the start marker when it is pinned to the PDF map's edge. */
  STATIC_MAP_START_OFF_MAP: 'Start (off map)',
} as const;
