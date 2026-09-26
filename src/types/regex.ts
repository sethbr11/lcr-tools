/**
 * Centralized regular expression dictionary for LCR Tools.
 */

/* ==========================================================================
   REGULAR EXPRESSIONS
   ========================================================================== */

export const Regex = {
  /** Context: Matching generic headings to ignore when deriving section table titles. */
  HEADING_IGNORE_TEXT: /^(?:Organizations|Print Options|Filter Table Data)$/i,
  /** Context: Root base URL pattern for church LCR dashboard. */
  BASE_PAGE_URL: /^https:\/\/(lcr|lcrf|lcrffe)\.churchofjesuschrist\.org(\/(home|#\/?)?)?(\?.*)?$/,
  /** Context: Any path on Church LCR, LCRF, or LCRFFE hosts. */
  LCR_HOST_URL: /^https:\/\/(lcr|lcrf|lcrffe)\.churchofjesuschrist\.org(?:[/?#]|$)/i,
  /** Context: Confidential path segment in LCR URLs. */
  CONFIDENTIAL_REPORT_PATH: /\/ca(?=\/|\?|$)/,
  /** Context: Ministering assignments root path. */
  MINISTERING_PATH: /\/ministering(\?.*)?$/,
  /** Context: Extract numeric query parameter value from URL. */
  NUMERIC_PARAM: /[?&](?:id|unitNumber|unit)=(\d+)/,
  /** Context: ISO 8601 or common YYYY-MM-DD date format. */
  ISO_DATE_FORMAT: /^\d{4}-\d{2}-\d{2}$/,
  /** Context: Day and month name date string without year (e.g. '1 Sep' or '24 December'). */
  DAY_MONTH_PARTS: /^(\d{1,2})\s+([A-Za-z]+)$/,
  /** Context: Month name and day date string without year (e.g. 'Sep 1' or 'December 24'). */
  MONTH_DAY_PARTS: /^([A-Za-z]+)\s+(\d{1,2})$/,
  /** Context: Comma separated Last, First name format. */
  LAST_FIRST_NAME: /^([^,]+),\s*(.+)$/,
  /** Context: One or more consecutive whitespace characters. */
  WHITESPACE: /\s+/,
  /** Context: Matching one or more consecutive whitespace characters globally. */
  MULTIPLE_SPACES: /\s+/g,
  /** Context: Double quote characters requiring escaping in CSV data. */
  CSV_DOUBLE_QUOTE: /"/g,
  /** Context: Removal of Leader and Clerk Resources phrase from page titles. */
  CHURCH_LCR_TITLE: /Leader and Clerk Resources/gi,
  /** Context: Removal of LCR acronym from page titles. */
  LCR_ACRONYM: /LCR/gi,
  /** Context: Removal of Church organization name from page titles. */
  CHURCH_FULL_NAME: /The Church of Jesus Christ of Latter-day Saints/gi,
  /** Context: Stripping characters that are unsafe or invalid for filenames. */
  FILENAME_SANITIZE: /[^a-zA-Z0-9_\- ]/g,
  /** Context: Extracting member UUID token from member-profile anchor URL. */
  MEMBER_PROFILE_UUID: /member-profile\/([a-f0-9-]+)/,
  /** Context: Stripping trailing count parentheses such as '(14)' from sub-heading text. */
  TRAILING_COUNT_PARENS: /\s*\(\d+\)$/,
  /** Context: Parsing 'X of Y' page status text in LCR paginated table footers. */
  PAGE_STATUS_COUNT: /(\d+)\s+of\s+(\d+)/i,
  /** Context: Non-alphanumeric character cleaner for string normalization. */
  NON_ALPHANUMERIC: /[^a-z0-9]/g,
  /** Context: Parsing month, day, and year parts from slash-separated date string. */
  SLASH_DATE_PARTS: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  /** Context: Parsing month, day, and year parts from dash-separated date string. */
  DASH_DATE_PARTS: /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
  /** Context: Address sub-unit designators such as Apt, Unit, Suite, Ste, or #. */
  UNIT_DESIGNATOR: /(?:apt|apartment|unit|suite|ste|#)\s*[\w-]+/gi,
  /** Context: Formula injection prefix characters (=, @, tab, cr, or non-numeric +/-) requiring sanitization in CSV cells. */
  FORMULA_PREFIX: /^(?:[=@\t\r]|[+\-](?!\d))/,
  /** Context: Matching 'months to show' label or option text in LCR report selectors. */
  MONTHS_TO_SHOW: /months to show/i,
  /** Context: Matching district, pod, or area title in ministering table cards (e.g. 'District 1', 'Pod 1'). */
  DISTRICT_HEADING: /\b((?:District|Pod|Area)\s*\d+)\b/i,
  /** Context: Matching presidency member text in ministering cards (e.g. 'Presidency Member: Wilson, Henry'). */
  PRESIDENCY_MEMBER: /Presidency Member:\s*([A-Za-z, -]+)/i,
  /** Context: Matching action text or chart text appended to leader names. */
  LEADER_ACTION_TEXT: /Move to.*|Created with.*/i,
  /** Context: Matching newline character sequences across platforms. */
  NEWLINE: /\r?\n/,
  /** Context: Extracting 5 or more digit unit number from path or string. */
  UNIT_NUMBER: /\b\d{5,}\b/,
  /** Context: Extracting 4 to 8 digit Church unit number from trailing parentheses (e.g. '(12345)'). */
  TRAILING_UNIT_NUMBER: /\((\d{4,8})\)\s*$/,
  /** Context: Extracting 4 to 8 digit Church unit number from any parentheses in unit text. */
  PAREN_UNIT_NUMBER: /\((\d{4,8})\)/,
  /** Context: Matching newline character sequences globally across platforms. */
  NEWLINE_GLOBAL: /\r?\n/g,
  /** Context: Global comma characters for numeric and list sanitization. */
  COMMA_GLOBAL: /,/g,
  /** Context: Church Directory and Maps domain matching. */
  CHURCH_DIRECTORY_DOMAIN: /directory\.churchofjesuschrist\.org/i,
  /** Context: Directory or LCR image sources that are generic silhouettes rather than member portraits. */
  PLACEHOLDER_PHOTO_SRC:
    /nophoto|no-photo|placeholder|default[-_]?avatar|silhouette|person\.svg|blank|no-image|data:image\/svg/i,
  /** Context: Matching LCR Member Directory path segment. */
  LCR_MEMBER_LIST_PATH: /\/mlt\/records\/member-list/i,
  /** Context: Detects internal browser URL schemes. */
  INTERNAL_BROWSER_URL: /^(?:chrome|chrome-extension|edge|about|view-source):/i,
  /** Context: Matching email addresses for anonymization. */
  EMAIL_ADDRESS: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  /** Context: Matching multi-digit numbers or phone sequences for anonymization. */
  PHONE_OR_NUMBERS: /\b\d{3,}[-\d]*\b/g,
  /** Context: Matching Last, First name formats globally for anonymization. */
  LAST_FIRST_NAME_GLOBAL: /\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b/g,
  /** Context: Matching ISO date strings for anonymization. */
  ISO_DATE_STRING: /\b\d{4}-\d{2}-\d{2}\b/g,
  /** Context: Matching mailto scheme links for anonymization. */
  MAILTO_LINK: /^mailto:.+/i,
  /** Context: Matching tel scheme links for anonymization. */
  TEL_LINK: /^tel:.+/i,
  /** Context: Matching standard UUID v4 or v1 hex patterns. */
  UUID_PATTERN: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  /** Context: Detecting sensitive attribute names containing PII or identifiers. */
  SENSITIVE_ATTR_NAME: /(?:uuid|person|member|email|phone|mrn|address|birth|name)/i,
  /** Context: Matching row selection checkbox aria-label prefix. */
  SELECT_ROW_ARIA_PREFIX: /^select row\b/i,
  /** Context: Validates user security PIN format as 4 to 8 numeric digits. */
  PIN_FORMAT: /^\d{4,8}$/,
  /** Context: Temporary placeholder token during UUID sanitization. */
  MOCK_UUID_PLACEHOLDER: /___MOCK_UUID___/g,
} as const;
