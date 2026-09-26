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

  /** Geographic coordinate latitude and longitude pair. */
  export interface LatLng {
    /** Latitude in degrees. */
    lat: number;
    /** Longitude in degrees. */
    lng: number;
  }

  /** Classification of household location relative to unit boundary. */
  export type BoundaryStatus = 'inside' | 'outside' | 'unmapped';

  /** Evaluated household location against boundary polygon. */
  export interface AuditedHousehold {
    /** Head of household name or couple name. */
    name: string;
    /** Formatted residential address line. */
    address: string;
    /** Geographic coordinate position. */
    coordinates: LatLng;
    /** Whether household coordinates fall inside the ward boundary. */
    isInside: boolean;
    /** Detailed boundary audit classification status. */
    status: BoundaryStatus;
  }

  /** Summary totals from a completed boundary audit. */
  export interface AuditSummary {
    /** Total count of audited households. */
    totalCount: number;
    /** Households situated inside the boundary. */
    insideCount: number;
    /** Households situated outside the boundary. */
    outsideCount: number;
    /** Households lacking coordinate pins. */
    unmappedCount: number;
    /** List of detailed household records. */
    households: AuditedHousehold[];
  }

  /** Result payload returned when boundary audit triggers a page reload. */
  export interface BoundaryReloadResult {
    /** Audit lifecycle state indicating reload. */
    status: 'reloading';
  }

  /** Options configuration for boundary audit execution. */
  export interface BoundaryAuditOptions {
    /** Skip reload prompt and execute audit immediately against active page. */
    skipReload?: boolean;
  }

  /** Result payload returned by boundary audit action execution. */
  export type BoundaryAuditActionResult = AuditSummary | BoundaryReloadResult;
}

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

export const Constants = {
  ...Base.Constants,
  /** Session storage key signaling a pending boundary audit on page reload. */
  AUDIT_PENDING_KEY: 'LCR_AUDIT_PENDING',
} as const;

/* ==========================================================================
   REGULAR EXPRESSIONS
   ========================================================================== */

export const Regex = {
  ...Base.Regex,
} as const;

/* ==========================================================================
   DOM
   ========================================================================== */

export const Dom = {
  ...Base.Dom,
  /** ID assigned to the boundary audit results modal. */
  MODAL_ID: 'lcr-tools-boundary-audit-modal',
  /** ID for the CSV download button in audit modal. */
  DOWNLOAD_CSV_BTN_ID: 'lcr-download-audit-csv',
  /** ID for the boundary list scrollable container. */
  LIST_CONTAINER_ID: 'lcr-boundary-list-container',
  /** ID for empty search state message box. */
  EMPTY_STATE_ID: 'lcr-boundary-empty-state',
  /** ID for empty filter state name text span. */
  EMPTY_FILTER_NAME_ID: 'lcr-boundary-empty-filter-name',
  /** CSS class applied to individual audited household rows in modal. */
  HOUSEHOLD_ROW_CLASS: 'lcr-boundary-row',
} as const;
