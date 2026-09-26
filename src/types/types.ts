/**
 * Global shared interface and type alias declarations for LCR Tools.
 */

import type * as ApiKeyTypes from './apiKeyTypes';
import type * as CryptoTypes from './cryptoTypes';
import type * as LogTypes from './logTypes';

/* ==========================================================================
   TYPES
   ========================================================================== */

export namespace Types {
  /** Represents category classification for extension actions. */
  export type ActionCategory =
    'Data Export' | 'Data Management' | 'Calling Management' | 'Member Management' | 'Tools';

  /** URL matching configuration for dynamic action availability. */
  export interface UrlPatternConfig {
    /** Substrings or patterns required to match the current tab URL. */
    include: (string | RegExp)[];
    /** Substrings or patterns that disqualify the action from running. */
    exclude: (string | RegExp)[];
    /** Special flag excluding exact ministering page path. */
    excludeExactMinistering?: boolean;
  }

  /** Reference documentation page where an action is accessible. */
  export interface DirectoryPageReference {
    /** Name of the church directory or report page. */
    name: string;
    /** Direct URL to page if available. */
    url: string | null;
  }

  /** Action metadata defining display properties and execution rules. */
  export interface ActionDefinition {
    /** Unique identifier for the action. */
    id: string;
    /** Display title shown in menus and popups. */
    title: string;
    /** Functional category group for this action. */
    category: ActionCategory;
    /** User-facing description of what the action does. */
    description: string;
    /** Execution type indicating how the action runs. */
    type: 'script' | 'page';
    /** Path to target page if type is 'page'. */
    pageUrl?: string;
    /** Target script file or bundle identifier. */
    scriptFile?: string | string[];
    /** URL matching rules determining where this action can run. */
    urlPatterns: UrlPatternConfig;
    /** Reference documentation pages where the action operates. */
    directoryPages?: DirectoryPageReference[];
    /** Reference list of excluded pages for documentation. */
    directoryExcluded?: string[];
    /** Execution mode distinguishing active user-initiated actions from passive background tools. */
    executionMode?: 'active' | 'passive';
    /** Local storage preference key for toggling passive action state. */
    storageKey?: string;
    /** Default enabled state for passive action (defaults to false). */
    defaultEnabled?: boolean;
  }

  /** Generated CSV file payload representation. */
  export interface GeneratedCsvFile {
    /** File name including extension. */
    filename: string;
    /** Raw comma-separated values string content. */
    csvContent: string;
  }

  /** Toast notification display style variants. */
  export type ToastType = 'success' | 'error' | 'warning' | 'info';

  /** Screen positioning options for rendered toast alerts. */
  export type ToastPosition =
    'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';

  /** Configuration parameters for toast notification display. */
  export interface ToastOptions {
    /** Visual theme type of the toast. */
    type?: ToastType;
    /** Lifespan of toast in milliseconds before auto-dismissal. */
    duration?: number;
    /** Screen corner or edge to anchor the toast container. */
    position?: ToastPosition;
    /** Optional click event handler. */
    onClick?: () => void;
  }

  /** Action button configuration for modal dialogs. */
  export interface ModalButton {
    /** Button display label. */
    text: string;
    /** Visual style classification of the button. */
    type?: 'primary' | 'secondary' | 'danger' | 'success';
    /** Click handler callback. */
    onClick?: (event: MouseEvent) => void | boolean | Promise<void | boolean>;
    /** Visual color override string (e.g. hex code or CSS name). */
    color?: string;
  }

  /** Alert banner item configuration inside modal headers. */
  export interface ModalAlert {
    /** Message string or HTML content for the banner. */
    message: string;
    /** Visual theme of alert banner. */
    type: 'info' | 'warning' | 'error' | 'success';
  }

  /** Configuration options for standard center-screen modal dialogs. */
  export interface StandardModalOptions {
    /** DOM ID assigned to the modal element. */
    id?: string;
    /** Header title text or HTML for the modal dialog. */
    title?: string;
    /** Body HTML or text content. */
    content?: string | HTMLElement;
    /** Array of action buttons rendered in the modal footer. */
    buttons?: ModalButton[];
    /** Array of top alert messages. */
    alerts?: ModalAlert[];
    /** Callback invoked when the modal is closed. */
    onClose?: () => void;
    /** Max pixel or percentage width for the modal container. */
    width?: string;
    /** Optional extra CSS class string for styling. */
    className?: string;
  }

  /** Configuration options for the LCR layout update maintenance modal. */
  export interface MaintenanceModalOptions {
    /** Name of the action or tool encountering the unexpected LCR layout. */
    actionName?: string;
    /** Specific details or description of the missing or altered DOM elements. */
    reason?: string;
  }

  /** Configuration options for side-sliding drawer modals. */
  export interface SideModalOptions extends StandardModalOptions {
    /** Screen side from which the modal slides in. */
    side?: 'left' | 'right';
  }

  /** Configuration options for confirmation prompt dialogs. */
  export interface ConfirmationOptions {
    /** Header title for the confirmation prompt. */
    title?: string;
    /** Message body describing the action to be confirmed. */
    message: string;
    /** Label text for the confirm button. */
    confirmText?: string;
    /** Label text for the cancel button. */
    cancelText?: string;
    /** Theme color for the confirm button. */
    confirmColor?: 'primary' | 'danger' | 'success';
  }

  /** Standard result format returned from table or page scrapers. */
  export interface ScrapedTableData {
    /** Extracted column header titles. */
    headers: string[];
    /** Matrix of string values for each row and column. */
    rows: string[][];
  }

  /** Standard execution result passed between tab scripts and popup. */
  export interface ActionResult<T = unknown> {
    /** Status outcome flag. */
    success: boolean;
    /** Payload data if execution succeeded. */
    data?: T;
    /** Detailed error message if execution failed. */
    error?: string;
  }

  /** Profile photo cache entry stored in extension storage. */
  export interface PhotoCacheEntry {
    /** Unique member identifier string. */
    memberId: string;
    /** Member first name. */
    firstName?: string;
    /** Member last name. */
    lastName?: string;
    /** Member full name. */
    fullName?: string;
    /** Indicates whether a photograph exists. */
    hasPhoto: boolean;
    /** Tokenized or public URL to photo asset. */
    photoUrl?: string;
    /** Timestamp in epoch milliseconds when cache entry was recorded. */
    timestamp?: number;
  }

  /** Key-value dictionary mapping member UUIDs to cached photo entries. */
  export type PhotoCache = Record<string, PhotoCacheEntry>;

  /** Named popup screen shown in the extension action popup. */
  export type PopupView = ApiKeyTypes.PopupView;
  /** Direction of animation when navigating between popup screens. */
  export type ViewTransitionDirection = ApiKeyTypes.ViewTransitionDirection;
  /** Identifier for an extension-managed third-party API key slot. */
  export type KnownApiKeyId = ApiKeyTypes.KnownApiKeyId;
  /** Catalog entry describing one API key the extension can store. */
  export type ApiKeyDefinition = ApiKeyTypes.ApiKeyDefinition;
  /** Device-local map of catalog API key identifiers to stored secret values. */
  export type StoredApiKeys = ApiKeyTypes.StoredApiKeys;
  /** Serialized envelope containing AES-256-GCM ciphertext and derivation parameters. */
  export type EncryptedPayload = CryptoTypes.EncryptedPayload;
  /** Operational state of user security PIN configuration and session unlock. */
  export type PinSecurityStatus = CryptoTypes.PinSecurityStatus;
  /** Mode of operation when presenting the PIN entry prompt to the user. */
  export type PinPromptMode = CryptoTypes.PinPromptMode;
  /** Action target view to navigate to after successful PIN setup or unlock. */
  export type PinProtectedView = CryptoTypes.PinProtectedView;
  /** Result object returned when verifying an entered security PIN. */
  export type PinVerificationResult = CryptoTypes.PinVerificationResult;

  /** Stored nickname to canonical ward member name mapping. */
  export interface NicknameMapping {
    /** Informal or nickname string as entered on an attendance roster. */
    alias: string;
    /** Canonical ward member full name on the roll. */
    canonicalName: string;
    /** Timestamp when the mapping was saved or updated. */
    updatedAt: number;
  }

  /** Dictionary of saved nickname mappings keyed by normalized alias. */
  export type NicknameDictionary = Record<string, NicknameMapping>;

  /** Aliases grouped under one canonical ward member for the popup viewer. */
  export interface NicknamePersonGroup {
    /** Canonical ward member full name shown as the group heading. */
    canonicalName: string;
    /** Nickname mappings that resolve to this member. */
    aliases: NicknameMapping[];
  }

  /** Settings governing extension photo caching behaviors. */
  export interface CacheSettings {
    /** Flag controlling whether photo caching is active. */
    enabled?: boolean;
    /** Time-to-live expiration duration in days. */
    cacheExpirationDays?: number;
    /** Alias for cache expiration days. */
    expirationDays?: number;
    /** Maximum entries to retain in storage before pruning. */
    maxEntries?: number;
  }

  /** Photo metadata descriptor returned from Church member card API. */
  export interface PhotoMetadata {
    /** Base tokenized image URL. */
    tokenUrl?: string;
    /** Approved display status. */
    status?: string;
  }

  /** Structured first and last name components of a member. */
  export interface MemberNameParts {
    /** Extracted first name. */
    firstName: string;
    /** Extracted last name. */
    lastName: string;
  }

  /** Structured representation of a calendar month and day without year context. */
  export interface MonthDay {
    /** 1-based calendar month (1 = January, 12 = December). */
    month: number;
    /** 1-based calendar day of month (1-31). */
    day: number;
  }

  /** Configuration options controlling automatic scrolling behavior. */
  export interface AutoScrollOptions {
    /** Pixel increment to advance per scroll iteration. */
    scrollStep?: number;
    /** Milliseconds delay between scroll increments. */
    scrollInterval?: number;
    /** Maximum consecutive unchanged height checks before terminating. */
    maxConsecutiveNoChange?: number;
    /** Absolute maximum iterations before forcing termination. */
    maxTotalIterations?: number;
  }

  /** Column header titles and their associated 0-based column indices. */
  export interface RelevantHeadersResult {
    /** Array of meaningful header text strings. */
    headers: string[];
    /** Corresponding 0-based column indices matching each header. */
    indices: number[];
  }

  /** Configuration options for the diagnostic action logger. */
  export interface ActionLoggerOptions {
    /** Whether to record ISO timestamp in log entries. */
    includeTimestamp?: boolean;
    /** Whether to capture navigator userAgent string. */
    includeUserAgent?: boolean;
    /** Whether to capture current browser location URL. */
    includeUrl?: boolean;
  }

  /** Structure defining parsed geographic coordinate latitude and longitude. */
  export interface CoordinatePoint {
    /** Geographic latitude coordinate in degrees. */
    lat: number;
    /** Geographic longitude coordinate in degrees. */
    lng: number;
  }

  /** Structure of Church member card API payload. */
  export interface LcrMemberCardData {
    /** Member UUID identifier. */
    uuid?: string;
    /** Nested photo metadata descriptor. */
    photoMetadata?: PhotoMetadata | null;
    /** Catch-all for extra member card API attributes. */
    [key: string]: unknown;
  }

  /** Metadata descriptor and element reference for a detected Church LCR DOM data table. */
  export interface TableInfo {
    /** Human-readable display title for the table. */
    name: string;
    /** Architectural structure categorization of the table. */
    type: 'data-table' | 'summary' | 'emphasize' | 'labeled-table' | 'finance-table';
    /** The HTML table or container element in the DOM. */
    table: HTMLElement;
    /** Functional feature requirements (e.g. ['pagination']). */
    needs: string[];
  }

  /** Result payload of table to CSV conversion containing CSV string and filename. */
  export interface TableCsvResult {
    /** Generated comma-separated CSV text. */
    csvContent: string;
    /** Suggested filename for downloading the CSV. */
    filename: string;
  }

  /** Structured member identity attributes extracted from a directory table row. */
  export interface MemberRowInfo {
    /** Unique member identifier or profile UUID. */
    memberId: string;
    /** Parsed first name. */
    firstName: string;
    /** Parsed last name. */
    lastName: string;
    /** Combined display full name. */
    fullName: string;
    /** Raw directory display name without age suffix. */
    directoryName: string;
  }

  /** Member photo availability record produced by a directory photo scan. */
  export interface MemberPhotoStatus {
    /** Unique member ID string. */
    memberId: string;
    /** First name component. */
    firstName: string;
    /** Last name component. */
    lastName: string;
    /** Full display name of the member. */
    fullName: string;
    /** Flag indicating whether a portrait photo is available. */
    hasPhoto: boolean;
    /** URL pointing to the member portrait photo when one exists. */
    photoUrl?: string;
  }

  /** Classified photo-scan result for a unit directory. */
  export interface MemberPhotoScanResult {
    /** Members confirmed to have a retrievable portrait. */
    withPhotos: MemberPhotoStatus[];
    /** Members confirmed to lack a portrait photo. */
    withoutPhotos: MemberPhotoStatus[];
  }

  /** Structured diagnostic log record representing an action event. */
  export type LogEntry = LogTypes.LogEntry;
  /** Diagnostic tracking logger instance equipped with structured logging and CSV export methods. */
  export type ActionLogger = LogTypes.ActionLogger;
  /** Dictionary mapping passive action IDs or storage keys to enabled boolean flags. */
  export type PassiveActionStateMap = Record<string, boolean>;
  /** Generic parameterless teardown callback function. */
  export type CleanupFn = () => void;
  /** Status callback for notifying popup user of operations and alerts. */
  export type StatusCallback = (message: string, isError?: boolean) => void;
}
