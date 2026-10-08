/**
 * Global shared DOM identifiers, CSS class names, selectors, and styling constants for LCR Tools.
 */

/* ==========================================================================
   DOM
   ========================================================================== */

export const Dom = {
  /** CSS class for global loading spinner overlay container. */
  LOADING_OVERLAY: 'lcr-tools-loading-overlay',
  /** CSS class for loading spinner indicator wheel. */
  LOADING_SPINNER: 'lcr-tools-spinner',
  /** CSS class for standard modal container. */
  MODAL_CONTAINER: 'lcr-tools-modal',
  /** CSS class for side-drawer modal container. */
  SIDE_MODAL_CONTAINER: 'lcr-tools-side-modal',
  /** CSS class for toast notification container. */
  TOAST_CONTAINER: 'lcr-tools-toast-container',
  /** CSS class for individual toast notification item. */
  TOAST_ITEM: 'lcr-tools-toast',

  /** DOM element ID for global toast container. */
  TOAST_CONTAINER_ID: 'lcr-tools-toast-container',
  /** DOM element ID for modal overlay backdrop. */
  MODAL_BACKDROP_ID: 'lcr-tools-modal-backdrop',
  /** DOM element ID for the shared full-page loading indicator overlay. */
  LOADER_OVERLAY_ID: 'lcr-tools-loader-overlay-shared',
  /** DOM element ID for the injected spinner animation CSS stylesheet. */
  SPIN_ANIMATION_STYLE_ID: 'lcr-tools-spin-animation-style-shared',
  /** Default DOM element ID for standard centered modals. */
  DEFAULT_STANDARD_MODAL_ID: 'lcr-tools-standard-modal',
  /** Default DOM element ID for side-drawer modals. */
  DEFAULT_SIDE_MODAL_ID: 'lcr-tools-side-modal',
  /** DOM element ID for the maintenance required notification modal. */
  MAINTENANCE_MODAL_ID: 'lcr-tools-maintenance-modal',
  /** DOM element ID for modal animation stylesheet. */
  MODAL_BASE_STYLE_ID: 'lcr-tools-modal-base-styles',
  /** DOM element ID for confirmation modal stylesheet. */
  CONFIRM_MODAL_STYLE_ID: 'lcr-tools-confirm-modal-styles',
  /** DOM element ID for toast animation stylesheet. */
  TOAST_STYLE_ID: 'lcr-tools-toast-styles',
  /** ID for current table name label inside side modal body. */
  CURRENT_TABLE_NAME_ID: 'lcr-tools-current-table-name',
  /** DOM element ID for the developer simulation toggle switch in popup. */
  DEV_SIMULATE_TOGGLE_ID: 'dev-simulate-attendance-toggle',
  /** DOM element ID for the developer simulation action button in popup. */
  DEV_SIMULATE_BUTTON_ID: 'dev-simulate-attendance-button',
  /** DOM element ID for the popup More view container. */
  SETTINGS_VIEW_ID: 'settings-view',
  /** DOM element ID for the popup More page button. */
  SETTINGS_BUTTON_ID: 'settings-button',
  /** DOM element ID for the More view back button. */
  SETTINGS_BACK_BUTTON_ID: 'settings-back-button',
  /** DOM element ID for the extension version display label. */
  EXTENSION_VERSION_ID: 'extension-version',
  /** DOM element ID for the extension version badge in the popup header. */
  POPUP_VERSION_BADGE_ID: 'popup-version-badge',
  /** CSS class for popup version badges across headers. */
  POPUP_VERSION_BADGE_CLASS: 'popup-version-badge',
  /** DOM element ID for the main view bottom version footer label. */
  MAIN_VERSION_LABEL_ID: 'main-version-label',
  /** DOM element ID for the attendance aliases manager view. */
  ALIASES_VIEW_ID: 'aliases-view',
  /** DOM element ID for the Manage Aliases button on the More page. */
  ALIASES_BUTTON_ID: 'aliases-button',
  /** DOM element ID for the aliases card description on the More page. */
  ALIASES_DESCRIPTION_ID: 'aliases-card-description',
  /** DOM element ID for the aliases view back button. */
  ALIASES_BACK_BUTTON_ID: 'aliases-back-button',
  /** DOM element ID for the aliases list container. */
  ALIASES_LIST_ID: 'aliases-list',
  /** DOM element ID for the aliases list search input. */
  ALIASES_SEARCH_ID: 'aliases-search',
  /** DOM element ID for the clear-all aliases button. */
  ALIASES_CLEAR_BUTTON_ID: 'aliases-clear-button',
  /** DOM element ID for the aliases view status banner. */
  ALIASES_STATUS_ID: 'aliases-status-message',
  /** CSS class for a single saved alias row. */
  ALIASES_ROW_CLASS: 'aliases-row',
  /** CSS class for a member group containing one or more aliases. */
  ALIASES_GROUP_CLASS: 'aliases-group',
  /** CSS class for the canonical member name heading on an alias group. */
  ALIASES_GROUP_NAME_CLASS: 'aliases-group-name',
  /** CSS class for the alias name in a row. */
  ALIASES_ALIAS_CLASS: 'aliases-alias',
  /** CSS class for alias row Remove buttons. */
  ALIASES_DELETE_BTN_CLASS: 'aliases-delete-btn',
  /** CSS class for the aliases empty-state message. */
  ALIASES_EMPTY_CLASS: 'aliases-empty',
  /** DOM element ID for the API Keys manager view. */
  API_KEYS_VIEW_ID: 'api-keys-view',
  /** DOM element ID for the Manage API Keys button on the More page. */
  API_KEYS_BUTTON_ID: 'api-keys-button',
  /** DOM element ID for the API Keys card description on the More page. */
  API_KEYS_DESCRIPTION_ID: 'api-keys-card-description',
  /** DOM element ID for the API Keys view back button. */
  API_KEYS_BACK_BUTTON_ID: 'api-keys-back-button',
  /** DOM element ID for the API Keys list container. */
  API_KEYS_LIST_ID: 'api-keys-list',
  /** DOM element ID for the API Keys view status banner. */
  API_KEYS_STATUS_ID: 'api-keys-status-message',
  /** CSS class for a single catalog API key row. */
  API_KEYS_ROW_CLASS: 'api-keys-row',
  /** CSS class for the API key value input. */
  API_KEYS_INPUT_CLASS: 'api-keys-input',
  /** CSS class for the show/hide toggle on an API key row. */
  API_KEYS_TOGGLE_CLASS: 'api-keys-toggle',
  /** CSS class for the Save button on an API key row. */
  API_KEYS_SAVE_CLASS: 'api-keys-save',
  /** CSS class for the Clear button on an API key row. */
  API_KEYS_CLEAR_CLASS: 'api-keys-clear',
  /** CSS class for popup API key instructions copy text. */
  API_KEYS_COPY_CLASS: 'api-keys-copy',
  /** CSS class for popup API key field label. */
  API_KEYS_LABEL_CLASS: 'api-keys-label',
  /** CSS class for popup API key description text. */
  API_KEYS_DESCRIPTION_CLASS: 'api-keys-description',
  /** CSS class for popup API key control actions container. */
  API_KEYS_CONTROLS_CLASS: 'api-keys-controls',
  /** Data attribute naming the catalog API key identifier on a row. */
  API_KEYS_ID_ATTR: 'data-api-key-id',
  /** CSS class for sliding in a popup view from the right. */
  SLIDE_IN_RIGHT_CLASS: 'slide-in-right',
  /** CSS class for sliding in a popup view from the left. */
  SLIDE_IN_LEFT_CLASS: 'slide-in-left',

  /** DOM element ID for the static current unit name and number container in LCR header. */
  STATIC_CURRENT_UNIT_TEXT_ID: 'static-current-unit-text',
  /** DOM element ID for the interactive current unit text trigger in LCR header. */
  CURRENT_UNIT_TEXT_ID: 'current-unit-text',
  /** DOM element ID for the parent stake/district unit text in LCR header. */
  MLTP_UNIT_INFO_PARENT_ID: 'mltp-unit-info-parent',
  /** CSS selector for the LCR unit and stake information header container. */
  WARD_STAKE_CONTAINER_SELECTOR: '.ward-stake-container',

  /** CSS selector candidates for discovering table pagination controls in LCR reports. */
  PAGINATION_SELECTORS: {
    /** Candidate selectors for first page button. */
    firstPageButtons: ['button[data-testid="first"]', 'button[aria-label*="first"]'],
    /** Candidate selectors for next page button. */
    nextPageButtons: ['button[data-testid="next"]', 'button[aria-label*="next"]'],
    /** Candidate selectors for last page button. */
    lastPageButtons: ['button[data-testid="last"]', 'button[aria-label*="last"]'],
    /** Selector for pagination counter text (e.g. '1 of 5'). */
    pageIndicatorText: '[data-testid="pagination-count"], [aria-label*="of"]',
    /** Selector for infinite scroll table viewport container. */
    infiniteScrollElement: '.eden-table-container, .eden-fade-scrollable',
  },
  /** Selector for interactive attendance toggle buttons. */
  ATTENDANCE_BUTTON_SELECTOR: 'button[aria-pressed], button[class*="attendanceButton"]',
  /** Selector for pressed/active attendance toggle buttons. */
  ATTENDANCE_PRESSED_SELECTOR: 'button[aria-pressed="true"], button[aria-checked="true"]',
  /** Selector for unpressed/inactive attendance toggle buttons. */
  ATTENDANCE_UNPRESSED_SELECTOR: 'button[aria-pressed="false"], button[aria-checked="false"]',
  /** Selector for meeting organization text spans. */
  ATTENDANCE_ORG_NAME_SELECTOR: '[class*="meetingOrgName"]',
  /** CSS selector matching elements stripped during cell text normalization. */
  CELL_STRIP_SELECTORS:
    '[aria-hidden="true"], .eden-table-card-view__cloned-column-header, [class*="meetingOrgName"], .sr-only, .visually-hidden, [class*="sr-only"], [class*="visually-hidden"]',
  /** CSS selector for inline line break elements within table cells. */
  LINE_BREAK_SELECTOR: 'br',
  /** CSS selector for block-level elements within table cells. */
  BLOCK_CELL_SELECTOR: 'div, p, li',
  /** CSS selector matching all heading element tags H1 through H6. */
  ALL_HEADINGS_SELECTOR: 'h1, h2, h3, h4, h5, h6',

  /** DOM element ID for the LCR member directory Individuals tab. */
  INDIVIDUALS_TAB_ID: 'tab-individuals',
  /** DOM element ID for the LCR member directory Households tab. */
  HOUSEHOLDS_TAB_ID: 'tab-households',
  /** CSS selector for Eden directory Individuals/Households tab lists. */
  DIRECTORY_TABLIST: '[role="tablist"]',
  /** aria-selected attribute value indicating the active directory tab. */
  ARIA_SELECTED_TRUE: 'true',
  /** CSS selector for individual member name buttons in the LCR directory table. */
  MEMBER_NAME_BUTTON: 'button.member-card__styled-ghost',
  /** CSS selector for member portrait images in LCR directory table rows. */
  MEMBER_PHOTO_IMG: 'img[src*="photo"], img.member-photo',
  /** CSS selector for LCR member directory table body rows. */
  MEMBER_DIRECTORY_ROWS: 'table tbody tr',

  /** Z-index layer depth for modal backdrop overlays. */
  MODAL_BACKDROP_Z_INDEX: '20000',
  /** Z-index for confirmation dialogs so they stack above action overlays. */
  CONFIRM_MODAL_Z_INDEX: '100100',
  /** DOM element ID for the security PIN entry screen in the popup. */
  PIN_VIEW_ID: 'pin-view',
  /** DOM element ID for the security PIN view title. */
  PIN_TITLE_ID: 'pin-view-title',
  /** DOM element ID for the security PIN view description. */
  PIN_DESCRIPTION_ID: 'pin-view-description',
  /** DOM element ID for the security PIN primary input element. */
  PIN_INPUT_ID: 'pin-input',
  /** DOM element ID for the security PIN confirmation input container. */
  PIN_CONFIRM_CONTAINER_ID: 'pin-confirm-container',
  /** DOM element ID for the security PIN confirmation input element. */
  PIN_CONFIRM_INPUT_ID: 'pin-confirm-input',
  /** DOM element ID for the security PIN submit button. */
  PIN_SUBMIT_BTN_ID: 'pin-submit-button',
  /** DOM element ID for the security PIN back button. */
  PIN_BACK_BTN_ID: 'pin-back-button',
  /** DOM element ID for the security PIN status error/info message. */
  PIN_STATUS_ID: 'pin-status-message',
  /** DOM element ID for the security PIN reset link or button. */
  PIN_RESET_BTN_ID: 'pin-reset-button',
  /** DOM element ID for the manual lock session button in settings. */
  LOCK_SESSION_BTN_ID: 'lock-session-button',
  /** DOM element ID for the lock session card container in settings. */
  LOCK_SESSION_CONTAINER_ID: 'lock-session-container',
  /** DOM element ID for the API key autofill button in Trip Planner. */
  TRIP_API_KEY_AUTOFILL_BTN_ID: 'apiKeyAutofillBtn',
  /** DOM element ID for the Mapbox metric autofill button in Trip Planner routing. */
  TRIP_METRIC_MAPBOX_AUTOFILL_BTN_ID: 'metricMapboxAutofillBtn',
  /** DOM element ID for the Trip Planner PIN unlock modal backdrop overlay. */
  TRIP_PIN_MODAL_OVERLAY_ID: 'lcr-tools-trip-pin-overlay',
  /** DOM element ID for the Trip Planner PIN unlock input element. */
  TRIP_PIN_MODAL_INPUT_ID: 'lcr-tools-trip-pin-input',
  /** DOM element ID for the Trip Planner PIN unlock submit button. */
  TRIP_PIN_MODAL_SUBMIT_ID: 'lcr-tools-trip-pin-submit',
  /** DOM element ID for the Trip Planner PIN unlock modal close button. */
  TRIP_PIN_MODAL_CLOSE_ID: 'lcr-tools-trip-pin-close',
  /** DOM element ID for the Trip Planner PIN unlock modal cancel button. */
  TRIP_PIN_MODAL_CANCEL_ID: 'lcr-tools-trip-pin-cancel',
  /** DOM element ID for the Trip Planner PIN unlock modal error banner. */
  TRIP_PIN_MODAL_STATUS_ID: 'lcr-tools-trip-pin-status',
  /** DOM element ID for the passive actions container section in the popup. */
  PASSIVE_SECTION_ID: 'passive-actions-section',
  /** DOM element ID for the passive items list in the popup. */
  PASSIVE_ITEMS_ID: 'passive-items',
  /** ID prefix for passive action checkbox toggle inputs. */
  PASSIVE_TOGGLE_PREFIX: 'passive-toggle-',
  /** Query selector for state dropdown select elements across LCR address forms. */
  STATE_SELECT_SELECTOR: 'select[name="stateProvinceId"], select[name*="state" i]',
  /** Query selector for address input fields associated with state dropdowns. */
  ADDRESS_INPUT_SELECTORS:
    'input[name="street1"], input[name="street2"], input[name="city"], input[name="postalCode"]',
  /** DOM data attribute marking a select element as already synchronized. */
  SYNCED_DATA_ATTR: 'data-lcr-state-synced',
  /** DOM data attribute marking an address input element as guarded by listeners. */
  INPUT_HOOKED_DATA_ATTR: 'data-lcr-input-hooked',
  /** Form control name attribute for LCR state and province select elements. */
  STATE_PROVINCE_ID_NAME: 'stateProvinceId',
  /** Query selector for parent address container wrappers in Eden design system. */
  ADDRESS_GROUP_SELECTOR: '.address-group__styled-label, .eden-stack, form',
  /** CSS class for passive action card container in popup. */
  PASSIVE_CARD_CLASS: 'passive-card',
  /** CSS class for passive action card text information wrapper. */
  PASSIVE_CARD_INFO_CLASS: 'passive-card-info',
  /** CSS class for passive action title header. */
  PASSIVE_CARD_TITLE_CLASS: 'passive-card-title',
  /** CSS class for passive action description text. */
  PASSIVE_CARD_DESC_CLASS: 'passive-card-desc',
  /** CSS class for toggle switch label container in popup. */
  TOGGLE_SWITCH_CLASS: 'toggle-switch',
  /** CSS class for slider element inside toggle switch. */
  TOGGLE_SLIDER_CLASS: 'toggle-slider',
  /** CSS class for passive tool indicator badge in action directory cards. */
  PASSIVE_BADGE_CLASS: 'passive-badge',
} as const;
