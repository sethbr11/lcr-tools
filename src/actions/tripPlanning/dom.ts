import * as Base from '@/types';

/* ==========================================================================
   DOM IDENTIFIERS AND SELECTORS
   ========================================================================== */

export const Dom = {
  ...Base.Dom,
  /** Leaflet map container element ID. */
  MAP_ID: 'map',
  /** Header total-records statistic element ID. */
  STAT_TOTAL_ID: 'statTotal',
  /** Header geocoded-count statistic element ID. */
  STAT_GEOCODED_ID: 'statGeocoded',
  /** Header cluster-count statistic element ID. */
  STAT_CLUSTERS_ID: 'statClusters',
  /** Header total-distance statistic element ID. */
  STAT_DISTANCE_ID: 'statDistance',
  /** Geocoding provider select element ID. */
  GEOCODE_PROVIDER_ID: 'geocodeProvider',
  /** API key row container element ID. */
  API_KEY_ROW_ID: 'apiKeyRow',
  /** API key input element ID. */
  API_KEY_ID: 'apiKey',
  /** API key visibility toggle button ID. */
  API_KEY_TOGGLE_ID: 'apiKeyToggle',
  /** API key autofill button ID. */
  API_KEY_AUTOFILL_BTN_ID: 'apiKeyAutofillBtn',
  /** Start geocoding button ID. */
  GEOCODE_BTN_ID: 'geocodeBtn',
  /** Geocode progress container ID. */
  GEOCODE_PROGRESS_ID: 'geocodeProgressContainer',
  /** Geocode progress percent label ID. */
  GEOCODE_PROGRESS_PERCENT_ID: 'geocodeProgressPercent',
  /** Geocode progress fill element ID. */
  GEOCODE_PROGRESS_FILL_ID: 'geocodeProgressFill',
  /** Cluster addresses button ID. */
  CLUSTER_BTN_ID: 'clusterBtn',
  /** Number-of-groups input ID. */
  CLUSTER_COUNT_ID: 'clusterCount',
  /** Minimum cluster size input ID. */
  MIN_CLUSTER_SIZE_ID: 'minClusterSize',
  /** Maximum cluster size input ID. */
  MAX_CLUSTER_SIZE_ID: 'maxClusterSize',
  /** By-count clustering controls container ID. */
  BY_COUNT_CONTROLS_ID: 'byCountControls',
  /** By-size clustering controls container ID. */
  BY_SIZE_CONTROLS_ID: 'bySizeControls',
  /** Optimize routes button ID. */
  OPTIMIZE_BTN_ID: 'optimizeBtn',
  /** Road-network distance metric radio ID. */
  METRIC_MAPBOX_ID: 'metricMapbox',
  /** Road-network distance metric autofill button ID. */
  METRIC_MAPBOX_AUTOFILL_BTN_ID: 'metricMapboxAutofillBtn',
  /** Optional starting address input ID. */
  STARTING_ADDRESS_ID: 'startingAddressInput',
  /** Save default starting address button ID. */
  SAVE_STARTING_ADDRESS_BTN_ID: 'saveStartingAddressBtn',
  /** Download CSV button ID. */
  EXPORT_CSV_BTN_ID: 'exportCsvBtn',
  /** Execution log preformatted element ID. */
  STATUS_ID: 'status',
  /** Execution log header ID. */
  LOG_HEADER_ID: 'logHeader',
  /** Execution log container ID. */
  LOG_CONTAINER_ID: 'logContainer',
  /** View execution logs top header button ID. */
  VIEW_LOGS_BTN_ID: 'viewLogsBtn',
  /** Execution logs modal overlay backdrop ID. */
  LOGS_MODAL_OVERLAY_ID: 'lcr-tools-trip-logs-overlay',
  /** Execution logs modal close button ID. */
  LOGS_MODAL_CLOSE_ID: 'lcr-tools-trip-logs-close',
  /** Execution logs modal done dismiss button ID. */
  LOGS_MODAL_DONE_ID: 'lcr-tools-trip-logs-done',
  /** Execution logs modal download button ID. */
  LOGS_MODAL_DOWNLOAD_ID: 'lcr-tools-trip-logs-download',
  /** Trip Planner PIN unlock modal backdrop overlay ID. */
  PIN_MODAL_OVERLAY_ID: 'lcr-tools-trip-pin-overlay',
  /** Trip Planner PIN unlock input element ID. */
  PIN_MODAL_INPUT_ID: 'lcr-tools-trip-pin-input',
  /** Trip Planner PIN unlock submit button ID. */
  PIN_MODAL_SUBMIT_ID: 'lcr-tools-trip-pin-submit',
  /** Trip Planner PIN unlock modal close button ID. */
  PIN_MODAL_CLOSE_ID: 'lcr-tools-trip-pin-close',
  /** Trip Planner PIN unlock modal cancel button ID. */
  PIN_MODAL_CANCEL_ID: 'lcr-tools-trip-pin-cancel',
  /** Trip Planner PIN unlock modal error banner ID. */
  PIN_MODAL_STATUS_ID: 'lcr-tools-trip-pin-status',
  /** Geocoding step card ID. */
  STEP1_ID: 'step1',
  /** Clustering step card ID. */
  STEP2_ID: 'step2',
  /** Routing step card ID. */
  STEP3_ID: 'step3',
  /** Next button on the geocoding step card. */
  STEP1_NEXT_ID: 'step1Next',
  /** Next button on the clustering step card. */
  STEP2_NEXT_ID: 'step2Next',
  /** Cluster details list container ID. */
  CLUSTER_LIST_CONTAINER_ID: 'clusterListContainer',
  /** Cluster details list ID. */
  CLUSTER_LIST_ID: 'clusterList',
  /** Failed-address fixer container ID. */
  FAILURE_CONTAINER_ID: 'failureFixerContainer',
  /** Failed-address fixer list ID. */
  FAILURE_LIST_ID: 'failureList',
  /** CSS class for accordion step cards. */
  ACCORDION_ITEM_CLASS: 'accordion-item',
  /** CSS class for accordion headers. */
  ACCORDION_HEADER_CLASS: 'accordion-header',
  /** CSS class for accordion expand icons. */
  ACCORDION_ICON_CLASS: 'accordion-icon',
  /** CSS class applied to the expanded accordion card. */
  ACCORDION_ACTIVE_CLASS: 'active',
  /** CSS class applied when the log drawer is collapsed. */
  LOG_COLLAPSED_CLASS: 'collapsed',
  /** CSS class for a failed-address fixer row. */
  FAILURE_ITEM_CLASS: 'failure-item',
  /** CSS class for a failed-address member name label. */
  FAILURE_NAME_CLASS: 'failure-name',
  /** CSS class for a failed-address input field. */
  FAILURE_ADDRESS_INPUT_CLASS: 'failure-address-input',
  /** CSS class for a failed-address coordinate row container. */
  FAILURE_COORD_ROW_CLASS: 'failure-coord-row',
  /** CSS class for a manual coordinate input field. */
  FAILURE_COORD_INPUT_CLASS: 'failure-coord-input',
  /** CSS class for a failure item Fix button. */
  FAILURE_BUTTON_CLASS: 'failure-button',
  /** CSS class for picking coordinates on the Leaflet map in the failure fixer. */
  FAILURE_PICK_MAP_CLASS: 'failure-pick-map-btn',
  /** CSS class for failure reason description text. */
  FAILURE_REASON_CLASS: 'failure-reason',
  /** CSS class for a cluster item container in the sidebar. */
  CLUSTER_ITEM_CLASS: 'cluster-item',
  /** CSS class for a cluster header row. */
  CLUSTER_HEADER_CLASS: 'cluster-header',
  /** CSS class for a cluster color indicator swatch. */
  CLUSTER_COLOR_CLASS: 'cluster-color',
  /** CSS class for a cluster title heading. */
  CLUSTER_TITLE_CLASS: 'cluster-title',
  /** CSS class for cluster member count or text. */
  CLUSTER_MEMBERS_CLASS: 'cluster-members',
  /** CSS class for light gray distance number on top right of cluster box. */
  CLUSTER_DISTANCE_CLASS: 'cluster-distance',
  /** Name attribute for clustering strategy radios. */
  CLUSTER_STRATEGY_NAME: 'clusterStrategy',
  /** Name attribute for distance metric radios. */
  DISTANCE_METRIC_NAME: 'distanceMetric',
  /** Cluster color palette used for markers and route polylines. */
  // prettier-ignore
  CLUSTER_COLORS: ['#e53e3e', '#dd6b20', '#d69e2e', '#38a169', '#319795', '#3182ce', '#5a67d8', '#805ad5', '#d53f8c', '#ed64a6', '#f6ad55', '#fbd38d', '#68d391', '#4fd1c5', '#63b3ed', '#7f9cf5', '#b794f4', '#f687b3', '#fc8181', '#718096'],
  /** Default unclustered marker color. */
  MARKER_DEFAULT_COLOR: '#3182ce',
  /** Outlier cluster marker color. */
  MARKER_OUTLIER_COLOR: '#718096',
  /** Route start marker color. */
  MARKER_START_COLOR: 'limegreen',
  /** Route end marker color. */
  MARKER_END_COLOR: 'red',
} as const;
