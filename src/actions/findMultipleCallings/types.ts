import * as Base from '@/types';

/* ==========================================================================
   TYPES
   ========================================================================== */

export namespace Types {
  /** Re-export base ActionResult */
  export type ActionResult<T = unknown> = Base.Types.ActionResult<T>;
  /** Re-export base ActionDefinition */
  export type ActionDefinition = Base.Types.ActionDefinition;
  /** Re-export base StandardModalOptions */
  export type StandardModalOptions = Base.Types.StandardModalOptions;

  /** Detected LCR callings report page variant. */
  export type CallingsPageType = 'callings-by-organization' | 'member-callings';

  /** Individual calling record with associated organization. */
  export interface CallingAssignment {
    /** Name of the calling position. */
    calling: string;
    /** Organization or auxiliary containing the calling. */
    organization: string;
  }

  /** Named set of equivalent callings that should count as a single assignment. */
  export interface CallingGroup {
    /** Stable identifier used to track the group in the editor. */
    id: string;
    /** Display name shown on the report when the group collapses. */
    name: string;
    /** Calling-and-organization pairs that belong to this group. */
    members: CallingAssignment[];
  }

  /** Calling-and-organization pair that can be excluded from the multiple-callings count. */
  export interface IgnoredCalling {
    /** Name of the calling position to ignore. */
    calling: string;
    /** Organization or auxiliary containing the calling. */
    organization: string;
    /** True when this calling is currently excluded from the multiple-callings count. */
    enabled: boolean;
  }

  /** Callback invoked after calling groups are saved so the report can refresh. */
  export type CallingGroupsSavedHandler = () => void | Promise<void>;

  /** Badge shown on the report after equivalent callings have been collapsed. */
  export interface DisplayCalling {
    /** Badge label (group name or individual calling title). */
    label: string;
    /** Organization for a single calling; empty for a collapsed group. */
    organization: string;
    /** True when this badge represents a collapsed equivalent-calling group. */
    isGroup: boolean;
  }

  /** Member holding one or more callings after grouping. */
  export interface MemberCallingsRecord {
    /** Full name of the member. */
    name: string;
    /** Display badges for remaining callings and collapsed groups. */
    callings: DisplayCalling[];
  }

  /** Scan and grouping outcome used to render the report and editor. */
  export interface CallingAnalysisResult {
    /** Members whose remaining callings still exceed one after grouping. */
    holders: MemberCallingsRecord[];
    /** Unique calling-and-organization pairs discovered on the page. */
    catalog: CallingAssignment[];
  }

  /** Result payload returned by find multiple callings action execution. */
  export interface MultipleCallingsResult {
    /** Total count of members found holding multiple callings. */
    count: number;
  }

  /** Parsed calling row accepted for grouping after placeholder filters. */
  export interface ParsedAssignmentRow {
    /** Member display name from the name column. */
    memberName: string;
    /** Cleaned calling title. */
    calling: string;
    /** Organization label from the row or parent table. */
    organization: string;
  }
}

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

/** Stable identifier for the built-in Bishop equivalent-calling group. */
const GROUP_ID_BISHOP = 'bishop';
/** Stable identifier for the built-in Bishopric First Counselor group. */
const GROUP_ID_FIRST_COUNSELOR = 'bishopric-first-counselor';
/** Stable identifier for the built-in Bishopric Second Counselor group. */
const GROUP_ID_SECOND_COUNSELOR = 'bishopric-second-counselor';

/** Built-in ignored callings seeded before the user saves a custom list. */
const DEFAULT_IGNORED_CALLINGS: Types.IgnoredCalling[] = [
  { calling: 'Temple Worker', organization: 'Temple Workers', enabled: true },
];

/** Built-in calling groups seeded before the user saves a custom list. */
const DEFAULT_CALLING_GROUPS: Types.CallingGroup[] = [
  {
    id: GROUP_ID_BISHOP,
    name: 'Bishop',
    members: [
      { calling: 'Bishop', organization: 'Bishopric' },
      {
        calling: 'Bishop',
        organization: 'Aaronic Priesthood Quorums - Presidency of the Aaronic Priesthood',
      },
      {
        calling: 'Priests Quorum President',
        organization: 'Aaronic Priesthood Quorums - Priests Quorum Presidency',
      },
      {
        calling: 'Priests Quorum President',
        organization: 'Aaronic Priesthood Quorums',
      },
    ],
  },
  {
    id: GROUP_ID_FIRST_COUNSELOR,
    name: 'Bishopric First Counselor',
    members: [
      { calling: 'Bishopric First Counselor', organization: 'Bishopric' },
      {
        calling: 'Bishopric First Counselor',
        organization: 'Aaronic Priesthood Quorums - Presidency of the Aaronic Priesthood',
      },
    ],
  },
  {
    id: GROUP_ID_SECOND_COUNSELOR,
    name: 'Bishopric Second Counselor',
    members: [
      { calling: 'Bishopric Second Counselor', organization: 'Bishopric' },
      {
        calling: 'Bishopric Second Counselor',
        organization: 'Aaronic Priesthood Quorums - Presidency of the Aaronic Priesthood',
      },
    ],
  },
];

export const Constants = {
  ...Base.Constants,
  /** Storage key for persisted equivalent-calling group definitions. */
  CALLING_GROUPS_STORAGE_KEY: 'lcr_calling_groups',
  /** Storage key for persisted ignored-calling definitions. */
  IGNORED_CALLINGS_STORAGE_KEY: 'lcr_ignored_callings',
  /** Built-in calling groups used when no custom list has been saved. */
  DEFAULT_CALLING_GROUPS,
  /** Built-in ignored callings used when no custom list has been saved. */
  DEFAULT_IGNORED_CALLINGS,
  /** Stable identifier for the built-in Bishop equivalent-calling group. */
  GROUP_ID_BISHOP,
  /** Stable identifier for the built-in Bishopric First Counselor group. */
  GROUP_ID_FIRST_COUNSELOR,
  /** Stable identifier for the built-in Bishopric Second Counselor group. */
  GROUP_ID_SECOND_COUNSELOR,
  /** Separator joining calling title and organization into a match key. */
  CALLING_KEY_SEPARATOR: '|',
  /** Prefix applied to newly created calling group identifiers. */
  NEW_GROUP_ID_PREFIX: 'group-',
  /** Maximum autocomplete suggestions shown while searching callings. */
  CALLING_SEARCH_MAX_RESULTS: 8,
  /** Delay in milliseconds after switching callings tabs or opening the organizations filter. */
  PAGE_PREPARE_MS: 300,
  /** Delay in milliseconds after checking All Organizations so the table can reload. */
  ORG_FILTER_APPLY_MS: 500,
  /** Delay in milliseconds after closing the organizations dropdown. */
  ORG_DROPDOWN_CLOSE_MS: 200,
  /** Page-type token for the member callings report. */
  PAGE_TYPE_MEMBER: 'member-callings',
  /** Page-type token for the callings-by-organization report. */
  PAGE_TYPE_ORGS: 'callings-by-organization',
  /** Heading text used to detect organization callings pages. */
  ORGS_HEADING_TEXT: 'Organizations',
  /** Toast shown when the action is run off a callings report page. */
  UNSUPPORTED_PAGE_TOAST: 'Please run this tool from a Callings report page.',
  /** ActionResult error when the current page is not a callings report. */
  UNSUPPORTED_PAGE_ERROR: 'Unsupported page',
  /** Header candidates identifying the member name column. */
  MEMBER_COLUMN_CANDIDATES: ['name', 'member', 'member name'],
  /** Header candidates identifying the calling title column. */
  CALLING_COLUMN_CANDIDATES: ['calling', 'position', 'assignment'],
  /** Header candidates identifying the organization column. */
  ORG_COLUMN_CANDIDATES: ['organization', 'org', 'auxiliary'],
  /** CSV header for the member name column. */
  CSV_HEADER_MEMBER: 'Member Name',
  /** CSV header for the calling title column. */
  CSV_HEADER_CALLING: 'Calling',
  /** CSV header for the organization column. */
  CSV_HEADER_ORGANIZATION: 'Organization',
  /** Filename stem used when downloading the multiple-callings CSV. */
  CSV_FILENAME_STEM: 'multiple_callings',
  /** Report modal width. */
  REPORT_MODAL_WIDTH: '560px',
  /** Calling groups editor modal width. */
  GROUPS_MODAL_WIDTH: '720px',
  /** Title for the multiple callings report modal. */
  REPORT_MODAL_TITLE: 'Multiple Calling Assignments',
  /** Title for the calling groups editor modal. */
  GROUPS_MODAL_TITLE: 'Calling Groups',
  /** Heading shown when no members have extra callings after grouping. */
  NO_ISSUES_HEADING: 'No Issues Found',
  /** Heading shown when members still have extra callings after grouping. */
  FOUND_MEMBERS_HEADING: 'Found {{count}} Members with Multiple Callings',
  /** Subtitle explaining that grouped callings count as one assignment. */
  GROUPS_MODAL_SUBTITLE:
    'Callings in the same group count as one assignment when a member holds two or more of them.',
  /** Heading for the ignored-callings section in the groups editor. */
  IGNORE_SECTION_TITLE: 'Ignored Callings',
  /** Subtitle explaining that ignored callings can be toggled without removing them. */
  IGNORE_SECTION_SUBTITLE:
    'Ignored callings are excluded from the multiple-callings count. Toggle one off to count it again without removing it from the list.',
  /** Empty-state copy when no callings are on the ignore list. */
  NO_IGNORED_CALLINGS: 'No ignored callings yet.',
  /** Footer button that opens the calling groups editor. */
  MANAGE_GROUPS_BTN: 'Manage Groups',
  /** Footer button that exports the report CSV. */
  EXPORT_CSV_BTN: 'Export CSV',
  /** Footer button that closes the report modal. */
  CLOSE_BTN: 'Close',
  /** Footer button that adds a blank calling group. */
  ADD_GROUP_BTN: 'Add Group',
  /** Footer button that saves calling groups and returns to the report. */
  GROUPS_DONE_BTN: 'Done',
  /** Default name assigned to a newly created calling group. */
  NEW_GROUP_NAME: 'New Group',
  /** Placeholder for the calling search input. */
  SEARCH_CALLINGS_PLACEHOLDER: 'Search callings...',
  /** Label for removing a calling group or a calling from a group. */
  REMOVE_LABEL: 'Remove',
  /** Empty-state copy when a group has no selected callings. */
  NO_CALLINGS_SELECTED: 'No callings in this group yet.',
  /** Empty-state copy when the calling search matches nothing. */
  NO_MATCHING_CALLINGS: 'No matching callings',
  /** Scope adjective used when the member-callings page has no issues. */
  PAGE_SCOPE_MEMBER: 'active ',
  /** Scope adjective used when the organizations page has no issues. */
  PAGE_SCOPE_WARD: 'ward ',
} as const;

/* ==========================================================================
   REGULAR EXPRESSIONS
   ========================================================================== */

export const Regex = {
  ...Base.Regex,
  /** Context: Member callings URL path matching. */
  MEMBER_CALLINGS_URL: /member-callings/i,
  /** Context: Organization callings URL path matching. */
  ORGS_CALLINGS_URL: /callings-by-organization|report\/organizations/i,
  /** Context: Detection of placeholder calling values indicating no active calling. */
  CALLING_EMPTY_PLACEHOLDER: /^none$|^not set$|^unassigned$/i,
  /** Context: Placeholder member names that represent vacant callings rather than people. */
  MEMBER_NAME_BLACKLIST: /^calling vacant$/i,
  /** Context: LCR suffix appended to custom calling position names. */
  CUSTOM_CALLING_LABEL: /\s*custom\s*calling\s*/gi,
} as const;

/* ==========================================================================
   DOM
   ========================================================================== */

export const Dom = {
  ...Base.Dom,
  /** ID for multiple callings analysis modal dialog. */
  MODAL_ID: 'lcr-tools-multiple-callings-modal',
  /** ID for the calling groups editor modal. */
  GROUPS_MODAL_ID: 'lcr-tools-calling-groups-modal',
  /** ID for the scrollable list of calling group cards. */
  GROUPS_LIST_ID: 'lcr-tools-calling-groups-list',
  /** ID for the ignored-callings list in the groups editor. */
  IGNORE_LIST_ID: 'lcr-tools-ignored-callings-list',
  /** CSS class for the ignored-callings search wrapper. */
  IGNORE_SEARCH_WRAP: 'lcr-tools-ignored-search-wrap',
  /** CSS class for the ignored-callings search input. */
  IGNORE_SEARCH_INPUT: 'lcr-tools-ignored-search',
  /** CSS class for the ignored-callings search dropdown list. */
  IGNORE_SEARCH_DROPDOWN: 'lcr-tools-ignored-dropdown',
  /** CSS class for one ignored-calling row. */
  IGNORE_ROW: 'lcr-tools-ignored-calling-row',
  /** CSS class for the per-calling ignore toggle checkbox. */
  IGNORE_TOGGLE: 'lcr-tools-ignored-calling-toggle',
  /** CSS class for the button that removes a calling from the ignore list. */
  IGNORE_REMOVE: 'lcr-tools-ignored-calling-remove',
  /** Opacity applied to an ignored-calling row while its toggle is on. */
  IGNORE_ENABLED_OPACITY: '1',
  /** Opacity applied to an ignored-calling row while its toggle is off. */
  IGNORE_DISABLED_OPACITY: '0.55',
  /** CSS selector for page title headings used to detect organization reports. */
  PAGE_TITLE_SELECTOR: 'h1, .eden-headings-h1',
  /** CSS selector for the Member Callings "With Callings" tab button. */
  WITH_CALLINGS_TAB_SELECTOR:
    'button#tab-withCallings[role="tab"], button[data-testid="tab-withCallings"]',
  /** CSS selector for the All Organizations checkbox in the filter dropdown. */
  ALL_ORGS_CHECKBOX_SELECTOR: 'input[value*="all-organizations"], input[name*="all-organizations"]',
  /** CSS selector for the hidden organizations filter panel that contains that checkbox. */
  ORGS_FILTER_PANEL_SELECTOR: '.multi-select__styled-card',
  /** Attribute used to associate a dropdown trigger with its panel. */
  ARIA_CONTROLS: 'aria-controls',
  /** Attribute reporting whether a dropdown trigger is expanded. */
  ARIA_EXPANDED: 'aria-expanded',
  /** Attribute value indicating an expanded dropdown trigger. */
  ARIA_EXPANDED_TRUE: 'true',
  /** CSS class for one calling group editor card. */
  GROUP_CARD: 'lcr-tools-calling-group-card',
  /** CSS class for a group display-name input. */
  GROUP_NAME_INPUT: 'lcr-tools-calling-group-name',
  /** CSS class for the button that deletes a calling group. */
  GROUP_DELETE_BTN: 'lcr-tools-calling-group-delete',
  /** CSS class for the selected-calling chips container. */
  GROUP_CHIPS: 'lcr-tools-calling-group-chips',
  /** CSS class for one selected calling chip. */
  GROUP_CHIP: 'lcr-tools-calling-group-chip',
  /** CSS class for the button that removes a calling from a group. */
  GROUP_CHIP_REMOVE: 'lcr-tools-calling-group-chip-remove',
  /** CSS class for the calling search wrapper on a group card. */
  GROUP_SEARCH_WRAP: 'lcr-tools-calling-group-search-wrap',
  /** CSS class for the calling search input. */
  GROUP_SEARCH_INPUT: 'lcr-tools-calling-group-search',
  /** CSS class for the calling search dropdown list. */
  GROUP_SEARCH_DROPDOWN: 'lcr-tools-calling-group-dropdown',
  /** CSS class for one calling search suggestion. */
  GROUP_SEARCH_ITEM: 'lcr-tools-calling-group-option',
  /** CSS class for a collapsed group badge on the report. */
  CALLING_GROUP_BADGE: 'lcr-tools-calling-group-badge',
  /** CSS display value used to hide the calling search dropdown. */
  DISPLAY_NONE: 'none',
  /** CSS display value used to show the calling search dropdown. */
  DISPLAY_BLOCK: 'block',
  /** CSS position used to pin an open search dropdown above modal sections. */
  POSITION_FIXED: 'fixed',
  /** Stacking order for a portaled calling search dropdown on the groups modal. */
  GROUP_SEARCH_DROPDOWN_Z_INDEX: '100',
  /** Data attribute storing a calling group identifier. */
  DATA_GROUP_ID: 'data-group-id',
  /** Data attribute storing a calling title on chips and search items. */
  DATA_CALLING: 'data-calling',
  /** Data attribute storing an organization label on chips and search items. */
  DATA_ORGANIZATION: 'data-organization',
} as const;
