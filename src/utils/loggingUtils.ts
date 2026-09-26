import { Constants, Types } from '@/types';
import { formatCSVCell } from './coreUtils';
import { downloadFile } from './fileUtils';

let activeLogger: Types.ActionLogger | null = null;

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Initializes a new action logger instance for structured diagnostic and audit tracking.
 *
 * @param actionName - Name of the active action being executed.
 * @param options - Custom logging settings.
 * @returns Configured ActionLogger instance.
 */
export function createActionLogger(
  actionName: string,
  options: Types.ActionLoggerOptions = {}
): Types.ActionLogger {
  const { includeTimestamp = true, includeUserAgent = false, includeUrl = true } = options;
  const entries: Types.LogEntry[] = [];

  entries.push({
    timestamp: includeTimestamp ? new Date().toISOString() : null,
    action: 'ACTION_STARTED',
    actionName,
    url: includeUrl && typeof window !== 'undefined' ? window.location.href : null,
    userAgent: includeUserAgent && typeof navigator !== 'undefined' ? navigator.userAgent : null,
    details: {},
  });

  const logger: Types.ActionLogger = {
    logAction(action, details = {}, level = 'INFO', target?: string) {
      const timestamp = includeTimestamp ? new Date().toISOString() : null;
      let targetVal = target;
      let statusVal: string | undefined;

      if (typeof details === 'object' && details !== null) {
        const dObj = details as Record<string, unknown>;
        if (!targetVal && 'target' in dObj) targetVal = String(dObj.target);
        if ('lcrUpdateStatus' in dObj) statusVal = String(dObj.lcrUpdateStatus);
        else if ('status' in dObj) statusVal = String(dObj.status);
      }

      const detailsStr =
        typeof details === 'object' && details !== null
          ? 'details' in details
            ? String((details as Record<string, unknown>).details)
            : statusVal || JSON.stringify(details)
          : String(details);

      entries.push({
        timestamp,
        action,
        target: targetVal,
        level,
        details: detailsStr,
        lcrUpdateStatus: statusVal || detailsStr,
      });

      if (level === 'ERROR') console.error(`LCR Tools [${actionName}]: ${action}`, details);
      else if (level === 'WARN') console.warn(`LCR Tools [${actionName}]: ${action}`, details);
      else console.log(`LCR Tools [${actionName}]: ${action}`, details);
    },

    logModification(type, target, before = null, after = null, extra = {}) {
      const extraObj =
        typeof extra === 'object' && extra !== null
          ? (extra as Record<string, unknown>)
          : { extra };
      this.logAction(
        `DATA_MODIFICATION_${type}`,
        { target, before, after, ...extraObj },
        'INFO',
        target
      );
    },

    logUserAction(actionType, element, description, context = {}) {
      this.logAction(
        actionType,
        { target: element, details: description, context },
        'INFO',
        element
      );
    },

    logError(error, context = '') {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logAction('ERROR_OCCURRED', { message, stack, context }, 'ERROR');
    },

    getLogs() {
      return [...entries];
    },

    exportToCSV() {
      const headers = ['Timestamp', 'Action', 'Target', 'Level', 'Details'];
      const rows = entries.map((e) => [
        e.timestamp || '',
        e.action,
        e.target || '',
        e.level || 'INFO',
        typeof e.details === 'object' ? JSON.stringify(e.details) : e.details,
      ]);
      const headerLine = headers.map(formatCSVCell).join(',');
      const rowLines = rows.map((r) => r.map(formatCSVCell).join(','));
      return [headerLine, ...rowLines].join('\r\n');
    },
  };

  activeLogger = logger;
  return logger;
}

/**
 * Retrieves the currently registered global ActionLogger instance.
 *
 * @returns Active ActionLogger or null if none is initialized.
 */
export function getCurrentLogger(): Types.ActionLogger | null {
  return activeLogger;
}

/**
 * Assigns or overrides the global active ActionLogger.
 *
 * @param logger - Logger instance to register.
 */
export function setCurrentLogger(logger: Types.ActionLogger | null): void {
  activeLogger = logger;
}

/**
 * Exports current logger entries directly to a downloaded CSV file.
 *
 * @param filename - Name for the downloaded CSV file.
 * @param loggerOrEntries - Optional logger instance or entries array to export instead of global active logger.
 */
export function exportLogsToCSV(
  filename: string = Constants.DEFAULT_LOG_FILENAME,
  loggerOrEntries: Types.ActionLogger | Types.LogEntry[] | null = activeLogger
): void {
  let csv = '';
  if (loggerOrEntries && 'exportToCSV' in loggerOrEntries) {
    csv = loggerOrEntries.exportToCSV();
  } else if (Array.isArray(loggerOrEntries)) {
    const headers = ['Timestamp', 'Action', 'Target', 'Level', 'Details'];
    const rows = loggerOrEntries.map((e) => [
      e.timestamp || '',
      e.action,
      e.target || '',
      e.level || 'INFO',
      typeof e.details === 'object' ? JSON.stringify(e.details) : e.details,
    ]);
    const headerLine = headers.map(formatCSVCell).join(',');
    const rowLines = rows.map((r) => r.map(formatCSVCell).join(','));
    csv = [headerLine, ...rowLines].join('\r\n');
  } else if (activeLogger) {
    csv = activeLogger.exportToCSV();
  } else {
    return;
  }
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}
