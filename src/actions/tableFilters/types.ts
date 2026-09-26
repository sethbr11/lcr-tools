import * as Base from '@/types';

/* ==========================================================================
   TYPES
   ========================================================================== */

export namespace Types {
  /** Re-export base ActionResult */
  export type ActionResult<T = unknown> = Base.Types.ActionResult<T>;
  /** Re-export base ActionDefinition */
  export type ActionDefinition = Base.Types.ActionDefinition;
  /** Re-export base SideModalOptions */
  export type SideModalOptions = Base.Types.SideModalOptions;
  /** Re-export base TableInfo */
  export type TableInfo = Base.Types.TableInfo;
  /** Allowed column filter evaluation categories. */
  export type FilterType =
    | 'select'
    | 'boolean'
    | 'attendance'
    | 'gender'
    | 'status'
    | 'number'
    | 'date'
    | 'month-day'
    | 'vacancy'
    | 'presence';

  /** Active column filter rule definition. */
  export interface FilterRule {
    /** Zero-based column index targeted by this rule. */
    columnIndex: number;
    /** Expected column header name. */
    columnName: string;
    /** Current selected filter value string for dropdown filters. */
    selectedValue: string;
    /** Minimum numeric value for number/age range filters. */
    minValue?: number;
    /** Maximum numeric value for number/age range filters. */
    maxValue?: number;
    /** Start date boundary string (YYYY-MM-DD) for date range filters. */
    fromDate?: string;
    /** End date boundary string (YYYY-MM-DD) for date range filters. */
    toDate?: string;
    /** Selected 1-based calendar month (1-12) for month-day filters. */
    selectedMonth?: number;
    /** Minimum 1-based day of month (1-31) for month-day filters. */
    fromDay?: number;
    /** Maximum 1-based day of month (1-31) for month-day filters. */
    toDay?: number;
    /** Filter evaluation category. */
    type: FilterType;
  }

  /** State storage for active table filters. */
  export interface TableFilterState {
    /** Table element currently being filtered. */
    table: HTMLElement;
    /** Registered filter rules mapped by column index. */
    rules: Map<number, FilterRule>;
    /** Total row count before filtering. */
    totalRows: number;
    /** Visible row count matching filter rules. */
    visibleRows: number;
  }

  /** Result payload returned by table filters action execution. */
  export interface TableFiltersResult {
    /** Total count of table columns actively filtered. */
    columnsFiltered: number;
  }

  /** Summary count of rows filtered in table DOM. */
  export interface FilterApplicationResult {
    /** Number of rows visible after applying filter. */
    visible: number;
    /** Total number of rows in the table. */
    total: number;
    /** Total number of tables filtered in multi-table mode. */
    tableCount?: number;
  }

  /** Result of building filter rules and HTML controls for table headers. */
  export interface FilterControlsBuildResult {
    /** Map of column indices to their configured filter rules. */
    rules: Map<number, FilterRule>;
    /** HTML string containing rendered filter controls markup. */
    controlsHtml: string;
  }
}

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

export const Constants = {
  ...Base.Constants,
  /** Maximum unique values permitted for dropdown options before column is omitted. */
  MAX_DROPDOWN_UNIQUE_VALUES: 20,
  /** Maximum unique values permitted for high-cardinality categorical dropdown options (callings, orgs). */
  MAX_CATEGORY_DROPDOWN_VALUES: 250,
  /** Select option value representing all tables on the page. */
  ALL_TABLES_OPTION_VALUE: 'all',
  /** Display label for filtering all tables. */
  ALL_TABLES_LABEL: 'All Tables',
  /** Window property identifier storing active filter rules for in-memory session persistence. */
  FILTER_STATE_KEY: '__LCR_TABLE_FILTERS_STATE__',
  /** Label for vacant callings filter control. */
  VACANCY_FILTER_LABEL: 'Vacant Callings',
  /** Option value representing all callings (filled and vacant). */
  VACANCY_OPTION_ALL: '',
  /** Option value to hide vacant callings and show filled callings only. */
  VACANCY_OPTION_EXCLUDE: 'exclude',
  /** Option value to show vacant callings only. */
  VACANCY_OPTION_ONLY: 'only',
  /** Rule index key used in rules map for vacancy filtering. */
  VACANCY_RULE_INDEX: -1,
} as const;

declare global {
  interface Window {
    /** In-memory state preserving active table filter rules across modal toggles. */
    __LCR_TABLE_FILTERS_STATE__?: Map<number, Types.FilterRule>;
  }
}

/* ==========================================================================
   REGULAR EXPRESSIONS
   ========================================================================== */

export const Regex = {
  ...Base.Regex,
  /** Context: Pattern matching row count labels in Eden table footers (e.g. Count: 243, Total: 243, or raw 123). */
  TABLE_FOOTER_COUNT: /(?:(?:count|total(?:\s+rows)?|showing):\s*)?(\d[\d,]*)/i,
  /** Context: Explicit count or total label in non-standard table footers. */
  GENERIC_FOOTER_COUNT: /(?:count|total|rows?):\s*(\d[\d,]*)/i,
  /** Context: Personal info columns (name, phone, address, email) excluded from filtering. */
  PERSONAL_INFO_COLUMN_HEADER: /name|phone|email|e-mail|address|street/i,
  /** Context: Column headers identifying birthday columns without year. */
  BIRTHDAY_COLUMN_HEADER: /birthday/i,
  /** Context: Column headers identifying calling or position columns. */
  CALLING_COLUMN_HEADER: /calling|position|assignment/i,
  /** Context: Column headers identifying organization or class columns. */
  ORGANIZATION_COLUMN_HEADER: /organization|org|quorum|class/i,
  /** Context: Column headers identifying gender columns. */
  GENDER_COLUMN_HEADER: /gender|sex/i,
  /** Context: Column headers identifying date range columns. */
  DATE_COLUMN_HEADER: /date|birth|move|baptism|created|updated|time|sustained|expiration/i,
  /** Context: Column headers identifying age or numeric range columns. */
  NUMBER_COLUMN_HEADER: /age|count|amount|total|number|num/i,
  /** Context: Column headers identifying status columns. */
  STATUS_COLUMN_HEADER: /status|state/i,
  /** Context: Column headers identifying boolean yes/no columns. */
  BOOLEAN_COLUMN_HEADER:
    /active|completed|ordained|endowed|recommend|set apart|set-apart|quarter\s*\d/i,
  /** Context: Column headers matching calendar month contact indicators. */
  MONTH_CONTACT_HEADER: /^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i,
  /** Context: Identifying text patterns indicating vacant callings in table rows. */
  VACANT_CALLING_TEXT: /calling vacant|\bvacant\b/i,
  /** Context: Column headers identifying presence-based boolean columns (e.g. ministering companions or assignments). */
  PRESENCE_COLUMN_HEADER:
    /companion|ministering assignment|ministering brothers|ministering sisters|ministering|assigned households|assigned sisters|assigned families|assigned members/i,
  /** Context: Column headers identifying ministering companionship pairs vs individual ministers. */
  MINISTERING_COMPANIONSHIP_HEADER: /ministering brothers|ministering sisters/i,
  /** Context: Characters to strip when parsing numeric cell values. */
  NON_NUMERIC_CHARS: /[^0-9.-]/g,
} as const;

/* ==========================================================================
   DOM
   ========================================================================== */

export const Dom = {
  ...Base.Dom,
  /** Side modal container ID for table filters. */
  FILTER_MODAL_ID: 'lcr-tools-table-filter-modal',
  /** Prefix for filter select DOM IDs. */
  FILTER_SELECT_PREFIX: 'lcr-tools-filter-',
  /** Suffix for range minimum numeric input DOM IDs. */
  FILTER_MIN_SUFFIX: '-min',
  /** Suffix for range maximum numeric input DOM IDs. */
  FILTER_MAX_SUFFIX: '-max',
  /** Suffix for date range from-date input DOM IDs. */
  FILTER_FROM_SUFFIX: '-from',
  /** Suffix for date range to-date input DOM IDs. */
  FILTER_TO_SUFFIX: '-to',
  /** Suffix for month select DOM IDs. */
  FILTER_MONTH_SUFFIX: '-month',
  /** Suffix for month-day from-day input DOM IDs. */
  FILTER_FROM_DAY_SUFFIX: '-from-day',
  /** Suffix for month-day to-day input DOM IDs. */
  FILTER_TO_DAY_SUFFIX: '-to-day',
  /** ID for multi-table selector dropdown element. */
  TABLE_SELECTOR_ID: 'lcr-tools-table-selector',
  /** CSS selector for Eden table card containers. */
  EDEN_TABLE_CONTAINER_SELECTOR: '.eden-table-card-view__container, .eden-table-card-view',
  /** Class name for Eden layout stack wrappers. */
  EDEN_STACK_CLASS: 'eden-stack',
  /** ID for load all data pagination button element. */
  LOAD_ALL_DATA_BTN_ID: 'lcr-tools-load-data-btn',
  /** ID for load all data pagination banner wrapper container. */
  LOAD_DATA_CONTAINER_ID: 'lcr-tools-load-data-container',
  /** ID for filter controls list wrapper container. */
  FILTER_CONTROLS_ID: 'lcr-tools-filter-controls',
  /** ID for filter status counter banner element. */
  STATUS_ELEMENT_ID: 'lcr-tools-filter-status',
  /** DOM element ID for vacant callings filter select. */
  VACANCY_FILTER_ID: 'lcr-tools-filter-vacancy',
  /** CSS class for partial scope badge in filter modal. */
  FILTER_SCOPE_BADGE_CLASS: 'lcr-tools-filter-scope-badge',
  /** Data attribute storing original table footer count before filtering. */
  ORIGINAL_FOOTER_COUNT_ATTR: 'data-lcr-original-count',
  /** Data attribute storing original table footer text before filtering. */
  ORIGINAL_FOOTER_TEXT_ATTR: 'data-lcr-original-text',
  /** CSS class applied to rows hidden by filter rules. */
  HIDDEN_ROW: 'lcr-tools-filtered-hidden',
} as const;
