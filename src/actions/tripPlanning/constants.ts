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
  /** Longest wait after a Mapbox HTTP 429 when its rate-limit headers ask for more (per-minute limits). */
  MAPBOX_MAX_RATE_LIMIT_WAIT_MS: 60000,
  /** Standard HTTP header giving seconds to wait before retrying. */
  HTTP_RETRY_AFTER_HEADER: 'retry-after',
  /** Mapbox header giving the epoch second when the rate limit resets. */
  MAPBOX_RATE_LIMIT_RESET_HEADER: 'x-rate-limit-reset',
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
  FALLBACK_VERSION: '2.0.2',
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
  /** Font size in points for a group heading in the PDF. */
  PDF_HEADING_FONT_SIZE: 15,
  /** Font size in points for the facts line under a group heading. */
  PDF_SUBTITLE_FONT_SIZE: 9.5,
  /** Font size in points for the "continued" label on overflow pages. */
  PDF_CONTINUED_FONT_SIZE: 9,
  /** Font size in points for the PDF page footer. */
  PDF_FOOTER_FONT_SIZE: 8,
  /** RGB color of group headings and table header text. */
  PDF_HEADING_TEXT_COLOR: [26, 32, 44],
  /** RGB color of the facts line under a group heading. */
  PDF_SUBTITLE_COLOR: [74, 85, 104],
  /** RGB color of the border drawn around each PDF map. */
  PDF_MAP_BORDER_COLOR: [203, 213, 224],
  /** RGB color of the "continued" label on overflow pages. */
  PDF_CONTINUED_COLOR: [113, 128, 150],
  /** RGB fill color of the table header row. */
  PDF_HEADER_FILL_COLOR: [237, 242, 247],
  /** RGB fill color of alternating table rows. */
  PDF_ZEBRA_FILL_COLOR: [247, 250, 252],
  /** RGB color of table cell text. */
  PDF_CELL_TEXT_COLOR: [45, 55, 72],
  /** RGB color of the line under each table row. */
  PDF_ROW_BORDER_COLOR: [226, 232, 240],
  /** RGB color of the page footer text. */
  PDF_FOOTER_COLOR: [160, 174, 192],
  /** RGB color used when a group color cannot be parsed. */
  PDF_FALLBACK_GROUP_COLOR: [113, 128, 150],
  /** Width in millimeters of the colored bar beside a group heading. */
  PDF_ACCENT_BAR_WIDTH_MM: 4,
  /** Height in millimeters of the colored bar beside a group heading. */
  PDF_ACCENT_BAR_HEIGHT_MM: 7,
  /** Horizontal offset in millimeters from the margin to the heading text. */
  PDF_HEADING_TEXT_OFFSET_MM: 7,
  /** Vertical offset in millimeters of the heading text baseline. */
  PDF_HEADING_BASELINE_MM: 5.5,
  /** Vertical space in millimeters consumed by the heading row. */
  PDF_HEADING_ADVANCE_MM: 11,
  /** Vertical space in millimeters consumed by the facts line. */
  PDF_FACTS_ADVANCE_MM: 6,
  /** Vertical gap in millimeters below the map. */
  PDF_MAP_GAP_MM: 6,
  /** Vertical offset in millimeters of the "Map unavailable" text. */
  PDF_MAP_UNAVAILABLE_BASELINE_MM: 4,
  /** Vertical space in millimeters consumed when the map is unavailable. */
  PDF_MAP_UNAVAILABLE_ADVANCE_MM: 10,
  /** Space in millimeters reserved above the bottom margin for the footer. */
  PDF_FOOTER_RESERVE_MM: 6,
  /** Vertical offset in millimeters of the "continued" label below the margin. */
  PDF_CONTINUED_BASELINE_MM: 3,
  /** Offset in millimeters from the margin to the table on continuation pages. */
  PDF_CONTINUED_TABLE_TOP_MM: 7,
  /** Offset in millimeters from a cell top padding to its text baseline. */
  PDF_TEXT_BASELINE_MM: 3,
  /** Offset in millimeters from a header cell top padding to its text baseline. */
  PDF_HEADER_BASELINE_MM: 3.5,
  /** Extra height in millimeters added to the table header row. */
  PDF_HEADER_EXTRA_HEIGHT_MM: 1,
  /** Offset in millimeters of the footer below the bottom margin line. */
  PDF_FOOTER_OFFSET_MM: 4,
  /** Minimum relative width weight (in characters) of a PDF table column. */
  PDF_COLUMN_MIN_WEIGHT: 8,
  /** Maximum relative width weight (in characters) of a PDF table column. */
  PDF_COLUMN_MAX_WEIGHT: 40,
  /** Background color of PDF maps behind the tiles. */
  STATIC_MAP_BACKGROUND_COLOR: '#eef2f5',
  /** Web Mercator latitude limit in degrees. */
  STATIC_MAP_MAX_LATITUDE: 85.0511,
  /** Font family used for text drawn on PDF maps. */
  STATIC_MAP_FONT_FAMILY: 'Helvetica, Arial, sans-serif',
  /** Canvas font for stop numbers up to 99. */
  STATIC_MAP_STOP_FONT: 'bold 11px Helvetica, Arial, sans-serif',
  /** Canvas font for stop numbers above 99. */
  STATIC_MAP_STOP_FONT_SMALL: 'bold 9px Helvetica, Arial, sans-serif',
  /** Highest stop number drawn with the regular stop font. */
  STATIC_MAP_STOP_SMALL_FONT_THRESHOLD: 99,
  /** Canvas font for the off-map start label. */
  STATIC_MAP_START_NOTE_FONT: 'bold 10px Helvetica, Arial, sans-serif',
  /** Letter drawn inside the start marker. */
  STATIC_MAP_START_LABEL: 'S',
  /** Canvas font for the basemap attribution. */
  STATIC_MAP_ATTRIBUTION_FONT: '9px Helvetica, Arial, sans-serif',
  /** Vertical nudge in pixels that centers marker labels. */
  STATIC_MAP_LABEL_OFFSET_Y: 0.5,
  /** Width in pixels of the white casing under the route line. */
  STATIC_MAP_ROUTE_CASING_WIDTH: 7,
  /** Color of the casing under the route line. */
  STATIC_MAP_ROUTE_CASING_COLOR: 'rgba(255,255,255,0.9)',
  /** Width in pixels of the route line. */
  STATIC_MAP_ROUTE_WIDTH: 4,
  /** Width in pixels of marker outlines. */
  STATIC_MAP_MARKER_OUTLINE_WIDTH: 2,
  /** Color of marker outlines and marker label text. */
  STATIC_MAP_MARKER_OUTLINE_COLOR: '#ffffff',
  /** Fill color of the start marker and off-map start label. */
  STATIC_MAP_START_COLOR: '#1a202c',
  /** Extra pixels beyond the marker half-size that keep the start marker inside the map. */
  STATIC_MAP_START_INSET: 4,
  /** Background color behind the map attribution. */
  STATIC_MAP_ATTRIBUTION_BG: 'rgba(255,255,255,0.8)',
  /** Text color of the map attribution. */
  STATIC_MAP_ATTRIBUTION_COLOR: '#4a5568',
  /** Height in pixels of the attribution box. */
  STATIC_MAP_ATTRIBUTION_HEIGHT: 14,
  /** Horizontal padding in pixels inside the attribution box. */
  STATIC_MAP_ATTRIBUTION_PADDING: 4,
} as const;
