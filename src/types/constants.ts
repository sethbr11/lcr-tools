/**
 * Global shared constants and DOM configurations for LCR Tools.
 */

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

export const Constants = {
  /** Developer contact email for bug reports, LCR structure updates, and maintenance requests. */
  MAINTENANCE_EMAIL: 'seth@brockefni.com',
  /** Base URL for official Church Directory service. */
  CHURCH_DIRECTORY_URL: 'https://directory.churchofjesuschrist.org',
  /** Base API endpoint for Church Directory households. */
  DIRECTORY_HOUSEHOLDS_ENDPOINT: '/api/v4/households',
  /** Base API endpoint for Church Directory member photos. */
  DIRECTORY_PHOTOS_ENDPOINT: '/api/v4/photos/members',
  /** Size suffix appended to LCR member photo token URLs for full HD resolution. */
  LCR_PHOTO_LARGE_SUFFIX: '/LARGE',
  /** Timeout in milliseconds waiting for the LCR Individuals tab to report aria-selected true. */
  DIRECTORY_TAB_SWITCH_TIMEOUT_MS: 3000,
  /** Polling interval in milliseconds while waiting for the Individuals tab to become selected. */
  DIRECTORY_TAB_SWITCH_POLL_MS: 50,
  /** Delay in milliseconds after an Individuals tab click so the member table can re-render. */
  DIRECTORY_TAB_SETTLE_MS: 250,
  /** Number of attempts to wait for LCR member directory table rows to appear. */
  DIRECTORY_ROW_WAIT_ATTEMPTS: 4,
  /** Delay in milliseconds between LCR member directory table row wait attempts. */
  DIRECTORY_ROW_WAIT_MS: 250,
  /** Default batch size for concurrent asynchronous operations. */
  DEFAULT_BATCH_SIZE: 10,
  /** Default sleep timeout when no milliseconds specified. */
  DEFAULT_SLEEP_MS: 1000,
  /** Base API origin for Church MLTP services. */
  MLTP_API_BASE: 'https://mltp-api.churchofjesuschrist.org',
  /** Standard auto-hide toast delay in milliseconds. */
  DEFAULT_TOAST_DURATION_MS: 3000,
  /** Maximum number of auto-scroll pagination attempts to prevent infinite loops. */
  MAX_PAGINATION_LOOPS: 100,
  /** Delay between table scroll pagination steps in milliseconds. */
  PAGINATION_SCROLL_DELAY_MS: 300,
  /** Default delay in milliseconds between pagination navigation clicks. */
  DEFAULT_PAGINATION_DELAY_MS: 500,
  /** Storage key used to persist member photo cache entries. */
  PHOTO_CACHE_KEY: 'lcr_photo_cache',
  /** Storage key used to persist photo cache configuration settings. */
  CACHE_SETTINGS_KEY: 'lcr_cache_settings',
  /** Maximum number of member photo records retained in local storage cache. */
  MAX_CACHE_ENTRIES: 2000,
  /** Maximum time-to-live for cached member photos (24 hours in milliseconds). */
  PHOTO_CACHE_TTL_MS: 24 * 60 * 60 * 1000,
  /** Default filename for diagnostic CSV log export. */
  DEFAULT_LOG_FILENAME: 'lcr_action_log.csv',
  /** Abbreviated calendar month names in chronological order. */
  // prettier-ignore
  SHORT_MONTH_NAMES: ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'],
  /** Full lowercase calendar month names in chronological order. */
  // prettier-ignore
  FULL_MONTH_NAMES: ['january','february','march','april','may','june','july','august','september','october','november','december'],
  /** Capitalized month display names for UI selectors. */
  // prettier-ignore
  MONTH_DISPLAY_NAMES: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  /** Placeholder image source for DOM anonymization. */
  MOCK_IMAGE_SRC: 'https://example.com/mock-photo.jpg',
  /** Placeholder person name for DOM anonymization. */
  MOCK_PERSON_NAME: 'Mock, Person',
  /** Placeholder text token for DOM anonymization. */
  MOCK_TEXT: 'Mock Text',
  /** Placeholder email link for DOM anonymization. */
  MOCK_MAILTO_HREF: 'mailto:user@example.com',
  /** Placeholder telephone link for DOM anonymization. */
  MOCK_TEL_HREF: 'tel:555-0101',
  /** Placeholder member UUID for DOM anonymization. */
  MOCK_UUID: '00000000-0000-0000-0000-000000000001',
  /** Maximum number of sample rows retained when anonymizing tables. */
  ANONYMIZER_MAX_SAMPLE_ROWS: 5,
  /** Storage key used in development mode to toggle attendance dry-run simulation. */
  DEV_SIMULATE_ATTENDANCE_KEY: 'lcr_dev_simulate_attendance',
  /** Storage key used to persist user-mapped attendance nicknames in local storage. */
  ATTENDANCE_NICKNAMES_KEY: 'lcr_attendance_nicknames',
  /** Description of attendance aliases shown on the More page when the active tab is an LCR host. */
  ALIASES_DESCRIPTION:
    'Nickname mappings used when processing attendance rosters. Multiple nicknames for the same member are grouped together. Stored only on this device.',
  /** Hint shown when aliases cannot be opened because the active tab is not an LCR host. */
  ALIASES_REQUIRES_LCR: 'Open an LCR page to view or remove saved attendance aliases.',
  /** Button title when attendance aliases can be managed from the popup. */
  ALIASES_MANAGE_TITLE: 'View and remove saved attendance aliases',
  /** Empty-state copy when no attendance aliases are stored on this device. */
  ALIASES_EMPTY: 'No attendance aliases saved on this device.',
  /** Status shown after all attendance aliases are cleared. */
  ALIASES_CLEARED: 'All attendance aliases cleared.',
  /** Status shown after an alias mapping is removed. */
  ALIASES_DELETED: 'Alias removed.',
  /** Placeholder for the aliases list search field. */
  ALIASES_SEARCH_PLACEHOLDER: 'Search aliases or member names',
  /** Empty-state copy when the aliases search matches no saved mappings. */
  ALIASES_NO_MATCH: 'No aliases match this search.',
  /** Title for data stewardship confirmation dialog before CSV or ZIP export. */
  STEWARDSHIP_TITLE: 'Data Stewardship Reminder',
  /** Message explaining Church General Handbook Section 33.8 requirements. */
  STEWARDSHIP_MESSAGE:
    'In accordance with Church General Handbook Section 33.8, exported member information must be kept secure, used strictly for ecclesiastical calling purposes, and deleted when no longer needed. Proceed with download?',
  /** Confirmation button label for export stewardship dialog. */
  STEWARDSHIP_CONFIRM_TEXT: 'Download',
  /** Cancel button label for export stewardship dialog. */
  STEWARDSHIP_CANCEL_TEXT: 'Cancel',
  /** Toast shown when the user cancels a stewardship-gated download. */
  STEWARDSHIP_CANCELLED_TOAST: 'Download cancelled.',
  /** Storage key used to persist catalog third-party API keys on this device. */
  API_KEYS_STORAGE_KEY: 'lcr_api_keys',
  /** Description of API keys shown on the More page when the active tab is an LCR host. */
  API_KEYS_DESCRIPTION:
    'Store the provider keys this extension asks for. Values stay on this device and are hidden by default.',
  /** Hint shown when API keys cannot be opened because the active tab is not an LCR host. */
  API_KEYS_REQUIRES_LCR: 'Open an LCR page to manage API keys.',
  /** Button title when API keys can be managed from the popup. */
  API_KEYS_MANAGE_TITLE: 'Manage API Keys',
  /** Catalog identifier for the Mapbox access token slot. */
  API_KEY_ID_MAPBOX: 'mapbox',
  /** Catalog identifier for the LocationIQ access token slot. */
  API_KEY_ID_LOCATIONIQ: 'locationiq',
  /** Status shown after an API key is saved. */
  API_KEYS_SAVED: 'API key saved.',
  /** Status shown after an API key is cleared. */
  API_KEYS_CLEARED: 'API key cleared.',
  /** Placeholder shown in masked API key inputs. */
  API_KEYS_INPUT_PLACEHOLDER: 'Paste key',
  /** Button label that reveals a hidden API key value. */
  API_KEYS_SHOW_LABEL: 'Show',
  /** Button label that hides a visible API key value. */
  API_KEYS_HIDE_LABEL: 'Hide',
  /** Button label that persists one catalog API key. */
  API_KEYS_SAVE_LABEL: 'Save',
  /** Button label that removes one catalog API key. */
  API_KEYS_CLEAR_LABEL: 'Clear',
  /** Catalog of extension-managed API keys that users may store. */
  API_KEY_CATALOG: [
    {
      id: 'mapbox',
      label: 'Mapbox',
      description:
        'Used for Trip Planner geocoding and optional road-network routing. Stored only on this device.',
    },
    {
      id: 'locationiq',
      label: 'LocationIQ',
      description: 'Used for Trip Planner geocoding. Stored only on this device.',
    },
  ] as const,
  /** Storage key for PIN verification sentinel envelope. */
  PIN_STORAGE_KEY: 'lcr_security_pin_verification',
  /** Storage key for temporary in-memory session PIN cache in browser.storage.session. */
  PIN_SESSION_KEY: 'lcr_session_unlocked_pin',
  /** Salt byte length for PBKDF2 master key derivation. */
  PIN_SALT_BYTE_LENGTH: 16,
  /** Initialization vector byte length for AES-GCM encryption. */
  PIN_IV_BYTE_LENGTH: 12,
  /** Iteration count for PBKDF2 key derivation. */
  PIN_PBKDF2_ITERATIONS: 200000,
  /** Minimum character length for user security PIN. */
  PIN_MIN_LENGTH: 4,
  /** Maximum character length for user security PIN. */
  PIN_MAX_LENGTH: 8,
  /** Sentinel verification plaintext encrypted to test PIN validity. */
  PIN_SENTINEL_PLAINTEXT: 'LCR_SECURITY_VERIFIED',
  /** Title shown when prompting user to establish a new security PIN. */
  PIN_SETUP_TITLE: 'Set Security PIN',
  /** Description shown when prompting user to establish a new security PIN. */
  PIN_SETUP_DESC:
    'Create a 4–8 digit PIN to encrypt and protect your stored API keys and member mappings on this device.',
  /** Title shown when prompting user to unlock protected storage with their PIN. */
  PIN_UNLOCK_TITLE: 'Unlock with PIN',
  /** Description shown when prompting user to unlock protected storage with their PIN. */
  PIN_UNLOCK_DESC: 'Enter your security PIN to access your stored data.',
  /** Error message shown when an entered PIN fails verification. */
  PIN_INCORRECT: 'Incorrect PIN. Please try again.',
  /** Error message shown when PIN confirmation does not match. */
  PIN_MISMATCH: 'PINs do not match. Please try again.',
  /** Error message shown when an entered PIN violates length constraints. */
  PIN_INVALID_LENGTH: 'PIN must be between 4 and 8 digits.',
  /** Confirmation prompt warning text before resetting PIN and wiping data. */
  PIN_RESET_CONFIRM:
    'Are you sure you want to reset your PIN? All stored API keys and nickname mappings will be permanently erased.',
  /** Status notification shown after security PIN and data have been wiped. */
  PIN_RESET_SUCCESS: 'Security PIN and stored data have been reset.',
  /** Message shown when navigating to protected views while session is locked. */
  PIN_LOCKED_MSG: 'Session locked. Enter PIN to view.',
  /** Button title for manually locking the active session. */
  PIN_LOCK_BUTTON_TITLE: 'Lock Session',
  /** Title shown on trip planner PIN unlock modal. */
  TRIP_PIN_MODAL_TITLE: 'Unlock Stored API Keys',
  /** Description shown on trip planner PIN unlock modal. */
  TRIP_PIN_MODAL_DESC: 'Enter your security PIN to unlock and autofill your stored API key.',
  /** Submit button text on trip planner PIN unlock modal. */
  TRIP_PIN_MODAL_SUBMIT: 'Unlock & Autofill',
  /** Toast message shown after successfully unlocking and autofilling API key. */
  TRIP_PIN_MODAL_SUCCESS: 'API key autofilled successfully.',
  /** Label for the autofill key button on trip planner page. */
  TRIP_PIN_AUTOFILL_LABEL: 'Autofill',
  /** Local storage key used to persist state dropdown auto-sync passive preference. */
  PASSIVE_STATE_DROPDOWN_KEY: 'lcr_passive_state_dropdown',
  /** Prefix for local storage keys governing passive action toggle states. */
  PASSIVE_ACTIONS_PREFIX: 'lcr_passive_',
  /** Toast message shown when a passive tool is toggled on. */
  PASSIVE_TOOL_ENABLED_TOAST: 'Passive tool enabled.',
  /** Toast message shown when a passive tool is toggled off. */
  PASSIVE_TOOL_DISABLED_TOAST: 'Passive tool disabled.',
} as const;
