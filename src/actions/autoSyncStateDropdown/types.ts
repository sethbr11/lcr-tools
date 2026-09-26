/**
 * Action-specific type definitions, constants, regexes, and DOM selectors for Auto-Sync State Dropdown.
 */

import * as Base from '@/types';

/* ==========================================================================
   TYPES
   ========================================================================== */

export namespace Types {
  /** Execution result summarizing the number of state dropdowns synchronized. */
  export interface StateDropdownSyncResult {
    /** Total number of state dropdowns successfully synchronized. */
    syncedCount: number;
    /** Array of synchronized select DOM elements. */
    selectElements: HTMLSelectElement[];
    /** List of state names or codes successfully synchronized. */
    syncedStateNames: string[];
  }

  /** Teardown function signature for disconnecting observers and removing active listeners. */
  export type CleanupObserverFn = Base.Types.CleanupFn;

  /** Parameters configuring passive state dropdown monitoring and polling. */
  export interface StateSyncWatcherOptions {
    /** Polling interval in milliseconds between DOM inspections. */
    pollIntervalMs?: number;
    /** Maximum consecutive polling cycles while spinners are active. */
    maxPollAttempts?: number;
  }
}

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

export const Constants = {
  ...Base.Constants,
  /** Sample US state code abbreviations used to identify unlabelled state selects. */
  US_STATE_SAMPLE_CODES: [
    'UT',
    'AL',
    'AK',
    'AZ',
    'AR',
    'CA',
    'CO',
    'CT',
    'DE',
    'FL',
    'GA',
    'HI',
    'ID',
    'IL',
    'IN',
    'IA',
    'KS',
    'KY',
    'LA',
    'ME',
    'MD',
    'MA',
    'MI',
    'MN',
    'MS',
    'MO',
    'MT',
    'NE',
    'NV',
    'NH',
    'NJ',
    'NM',
    'NY',
    'NC',
    'ND',
    'OH',
    'OK',
    'OR',
    'PA',
    'RI',
    'SC',
    'SD',
    'TN',
    'TX',
    'VT',
    'VA',
    'WA',
    'WV',
    'WI',
    'WY',
  ],
  /** Sample full US state names used to identify dropdown options rendered without state codes. */
  US_STATE_SAMPLE_NAMES: [
    'Utah',
    'California',
    'Idaho',
    'Arizona',
    'Texas',
    'Washington',
    'Nevada',
    'Oregon',
    'Colorado',
    'Wyoming',
    'Florida',
    'Montana',
    'Alabama',
    'Alaska',
    'Hawaii',
    'New York',
    'North Carolina',
    'Virginia',
    'Georgia',
    'Ohio',
  ],
  /** Milliseconds delay for debouncing mutation observer batches. */
  MUTATION_DEBOUNCE_MS: 50,
  /** Toast message prefix displayed when a state dropdown is successfully synchronized. */
  STATE_SYNC_SUCCESS_TOAST_PREFIX: 'State dropdown auto-synchronized: ',
  /** Toast message displayed when state dropdown synchronization encounters an error. */
  STATE_SYNC_FAILURE_TOAST:
    'Could not auto-sync state dropdown. Please click to verify your state selection.',
  /** Polling interval in milliseconds between DOM inspections for loading spinners. */
  STATE_SYNC_POLL_INTERVAL_MS: 400,
  /** Maximum consecutive polling cycles while spinners are active before timing out. */
  STATE_SYNC_MAX_POLL_ATTEMPTS: 25,
  /** Delay in milliseconds between value setting cycles to accommodate React 18 event batching. */
  STATE_SYNC_CYCLE_DELAY_MS: 100,
  /** Settling delay in milliseconds after field becomes interactable before executing sync. */
  STATE_SYNC_SETTLING_DELAY_MS: 150,
  /** Prefix for console diagnostic log entries emitted by the state dropdown auto-sync action. */
  STATE_SYNC_LOG_PREFIX: '[LCR Tools - State Sync]',
  /** Toast duration in milliseconds for state sync notifications. */
  STATE_SYNC_TOAST_DURATION_MS: 4000,
  /** Staggered millisecond delays for checking DOM state following user clicks on wizard buttons. */
  STEP_TRANSITION_CHECK_DELAYS_MS: [150, 600, 1200] as readonly number[],
} as const;

/* ==========================================================================
   REGULAR EXPRESSIONS
   ========================================================================== */

export const Regex = {
  ...Base.Regex,
  /** Context: Detecting state or province field identifiers in element name or ID attributes. */
  STATE_OR_PROVINCE_PATTERN: /(?:state|province|region|subdivision)/i,
  /** Context: Matching placeholder option text indicating state or province selection. */
  STATE_PLACEHOLDER_PATTERN: /select\s+(?:a\s+)?(?:state|province)|^state\s*(?:\/|\s*province)?/i,
  /** Context: Detecting country field identifiers that must not be mistaken for state dropdowns. */
  COUNTRY_FIELD_PATTERN: /country/i,
} as const;

/* ==========================================================================
   DOM SELECTORS & IDENTIFIERS
   ========================================================================== */

export const Dom = {
  ...Base.Dom,
  /** Query selector detecting active loading indicators, progress bars, and animated spinners. */
  SPINNER_SELECTOR:
    '.eden-spinner, [class*="spinner" i], [class*="loading" i], [role="progressbar"], [aria-busy="true"], svg[class*="spin" i]',
  /** Query selector for address container wrappers and forms on Church LCR pages. */
  ADDRESS_CONTAINER_SELECTOR:
    '.address-group__styled-label, [class*="address" i], form, .eden-stack',
  /** Query selector matching all candidate select controls within address forms. */
  ALL_SELECTS_SELECTOR: 'select, select.eden-form-part-input__control',
  /** Query selector matching Eden form field container elements. */
  EDEN_FORM_FIELD_SELECTOR:
    '.eden-form-part-form-field, [class*="form-field"], .eden-stack, form, [class*="address"]',
  /** Query selector matching label elements within Eden form fields. */
  EDEN_LABEL_SELECTOR: 'label, .eden-form-part-label, [class*="label"]',
  /** Query selector matching generic HTML label elements. */
  LABEL_TAG_SELECTOR: 'label',
  /** Query selector detecting clickable buttons, tabs, or wizard step elements. */
  WIZARD_NAV_BUTTON_SELECTOR: 'button, a, [role="button"], [class*="step"], [class*="tab"]',
} as const;
