/**
 * Shared logging and diagnostic tracking types for LCR Tools.
 */

/* ==========================================================================
   TYPES
   ========================================================================== */

/** Structured diagnostic log record representing an action event. */
export interface LogEntry {
  /** ISO timestamp string when event occurred or null if disabled. */
  timestamp: string | null;
  /** Action identifier or lifecycle event name. */
  action: string;
  /** Optional target DOM element, member, or subject of the action. */
  target?: string;
  /** Log severity level classification. */
  level?: 'INFO' | 'WARN' | 'ERROR';
  /** Optional name of the action orchestrator. */
  actionName?: string;
  /** Browser URL when log occurred. */
  url?: string | null;
  /** Browser userAgent string if enabled. */
  userAgent?: string | null;
  /** Arbitrary string or dictionary details for the event. */
  details?: string | Record<string, unknown>;
  /** Optional display status or outcome message for log viewers. */
  lcrUpdateStatus?: string;
  /** Optional Sunday date associated with this log event. */
  date?: string;
  /** Optional first name of attendee. */
  firstName?: string;
  /** Optional last name of attendee. */
  lastName?: string;
  /** Optional zero-based chronological index in processing queue. */
  originalIndex?: number;
}

/** Diagnostic tracking logger instance equipped with structured logging and CSV export methods. */
export interface ActionLogger {
  /** Records an action event with optional details, severity level, and target. */
  logAction: (
    action: string,
    details?: Record<string, unknown> | string,
    level?: 'INFO' | 'WARN' | 'ERROR',
    target?: string
  ) => void;
  /** Logs a data modification lifecycle event. */
  logModification: (
    modificationType: string,
    target: string,
    before?: unknown,
    after?: unknown,
    extra?: unknown
  ) => void;
  /** Logs a user interface interaction event. */
  logUserAction: (
    actionType: string,
    element: string,
    description: string,
    context?: unknown
  ) => void;
  /** Records a caught error with contextual diagnostic metadata. */
  logError: (error: Error | string, context?: string) => void;
  /** Retrieves snapshot of all recorded log entries. */
  getLogs: () => LogEntry[];
  /** Serializes recorded log history into formatted CSV text. */
  exportToCSV: () => string;
}
