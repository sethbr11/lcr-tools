/**
 * Utility file for logging actions and modifications within the LCR extension.
 * Provides structured logging for user interactions, data changes, and errors,
 * with support for CSV export of logs. Helps track and audit extension usage.
 */

if (typeof window.currentLogger === "undefined") {
  window.currentLogger = null;
}

/**
 * Creates a new action logger for tracking modifications
 * @param {string} actionName - Name of the action being performed
 * @param {Object} options - Configuration options
 * @returns {Object} - Logger instance with methods
 */
function createActionLogger(actionName, options = {}) {
  const {
    includeTimestamp = true,
    includeUserAgent = false,
    includeUrl = true,
    logLevel = "INFO",
  } = options;

  const log = [];
  const startTime = new Date();

  // Add initial log entry
  const initialEntry = {
    timestamp: includeTimestamp ? startTime.toISOString() : null,
    action: "ACTION_STARTED",
    actionName: actionName,
    url: includeUrl ? window.location.href : null,
    userAgent: includeUserAgent ? navigator.userAgent : null,
    details: {},
  };

  log.push(initialEntry);
  console.log(`LCR Tools Action Logger: [${actionName}] Started`);

  const logger = {
    /**
     * Logs an action with details
     * @param {string} action - Action description
     * @param {Object} details - Additional details
     * @param {string} level - Log level (INFO, WARN, ERROR)
     */
    logAction(action, details = {}, level = "INFO") {
      const timestamp = includeTimestamp ? new Date().toISOString() : null;
      const logEntry = {
        timestamp,
        action,
        level,
        details:
          typeof details === "object" ? JSON.stringify(details) : details,
      };

      log.push(logEntry);

      // Console logging based on level
      const consoleDetails =
        JSON.stringify(details).length > 200
          ? JSON.stringify(details).substring(0, 197) + "..."
          : details;

      switch (level) {
        case "ERROR":
          console.error(`LCR Tools [${actionName}]: ${action}`, consoleDetails);
          break;
        case "WARN":
          console.warn(`LCR Tools [${actionName}]: ${action}`, consoleDetails);
          break;
        default:
          console.log(`LCR Tools [${actionName}]: ${action}`, consoleDetails);
      }
    },

    /**
     * Logs a data modification action
     * @param {string} modificationType - Type of modification (CREATE, UPDATE, DELETE)
     * @param {string} target - What was modified
     * @param {Object} beforeState - State before modification
     * @param {Object} afterState - State after modification
     * @param {Object} additionalDetails - Additional context
     */
    logModification(
      modificationType,
      target,
      beforeState = null,
      afterState = null,
      additionalDetails = {}
    ) {
      this.logAction(`DATA_MODIFICATION_${modificationType}`, {
        target,
        beforeState,
        afterState,
        ...additionalDetails,
      });
    },

    /**
     * Logs user input or interaction
     * @param {string} inputType - Type of input (CLICK, TYPE, SELECT, etc.)
     * @param {string} element - Element that was interacted with
     * @param {*} value - Value that was input/selected
     * @param {Object} additionalDetails - Additional context
     */
    logUserAction(inputType, element, value = null, additionalDetails = {}) {
      this.logAction(`USER_ACTION_${inputType}`, {
        element,
        value,
        ...additionalDetails,
      });
    },

    /**
     * Logs an error that occurred during the action
     * @param {Error|string} error - Error that occurred
     * @param {Object} context - Context where error occurred
     */
    logError(error, context = {}) {
      const errorDetails = {
        message: error?.message || error,
        stack: error?.stack,
        context,
      };
      this.logAction("ERROR_OCCURRED", errorDetails, "ERROR");
    },

    /**
     * Logs completion of the action
     * @param {string} status - Completion status (SUCCESS, FAILED, ABORTED)
     * @param {Object} summary - Summary of what was accomplished
     */
    logCompletion(status, summary = {}) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      this.logAction("ACTION_COMPLETED", {
        status,
        duration: `${duration}ms`,
        summary,
      });

      console.log(
        `LCR Tools Action Logger: [${actionName}] Completed with status: ${status} (Duration: ${duration}ms)`
      );
    },

    /**
     * Gets all log entries
     * @returns {Array} - Array of log entries
     */
    getLog() {
      return [...log];
    },

    /**
     * Downloads the log as a CSV file
     * @param {string} customFilename - Optional custom filename
     */
    downloadLog(customFilename = null) {
      const csvRows = log.map((entry) => {
        const timestamp = new Date(entry.timestamp).toISOString();
        const level = entry.level || "INFO";
        const action = entry.action || "";

        // Properly handle details - convert objects to strings
        let details = "";
        if (entry.details !== undefined && entry.details !== null) {
          if (typeof entry.details === "string") {
            details = entry.details;
          } else if (typeof entry.details === "object") {
            try {
              details = JSON.stringify(entry.details);
            } catch (jsonError) {
              details = "[Object - could not stringify]";
            }
          } else {
            details = String(entry.details);
          }
        }

        // Escape quotes for CSV format
        const escapedAction = action.replace(/"/g, '""');
        const escapedDetails = details.replace(/"/g, '""');

        return `"${timestamp}","${level}","${escapedAction}","${escapedDetails}"`;
      });

      const csvContent = [
        '"Timestamp","Level","Action","Details"',
        ...csvRows,
      ].join("\n");

      // Use custom filename if provided, otherwise generate default
      const logFilename =
        customFilename ||
        `lcr_tools_action_log_${actionName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_")}_${
          new Date().toISOString().split("T")[0]
        }_${Date.now()}.csv`;

      utils.ensureLoaded("fileUtils");
      fileUtils.downloadCsv(csvContent, logFilename);
    },

    /**
     * Creates a summary report of modifications made
     * @returns {Object} - Summary object
     */
    createSummary() {
      const modifications = log.filter((entry) =>
        entry.action.startsWith("DATA_MODIFICATION_")
      );
      const userActions = log.filter((entry) =>
        entry.action.startsWith("USER_ACTION_")
      );
      const errors = log.filter((entry) => entry.level === "ERROR");

      return {
        actionName,
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
        totalLogEntries: log.length,
        modificationsCount: modifications.length,
        userActionsCount: userActions.length,
        errorsCount: errors.length,
        modifications: modifications.map((mod) => ({
          action: mod.action,
          timestamp: mod.timestamp,
          details: JSON.parse(mod.details),
        })),
        errors: errors.map((err) => ({
          timestamp: err.timestamp,
          details: JSON.parse(err.details),
        })),
      };
    },

    /**
     * Gets logs for display in the UI
     * @returns {Array} - Array of log entries
     */
    getLogs() {
      return log;
    },
  };
  window.currentLogger = logger;
  return logger;
}

function getCurrentLogger() {
  return window.currentLogger;
}

/**
 * Creates a simple logger for basic logging needs
 * @param {string} prefix - Prefix for log messages
 * @returns {Object} - Simple logger with basic methods
 */
function createSimpleLogger(prefix) {
  return {
    /**
     * Logs an informational message
     * @param {string} message - Message to log
     * @param {Object} details - Additional details
     */
    info: (message, details = {}) => {
      console.log(`LCR Tools [${prefix}]: ${message}`, details);
    },
    /**
     * Logs a warning message
     * @param {string} message - Message to log
     * @param {Object} details - Additional details
     */
    warn: (message, details = {}) => {
      console.warn(`LCR Tools [${prefix}]: ${message}`, details);
    },
    /**
     * Logs an error message
     * @param {string} message - Message to log
     * @param {Object} details - Additional details
     */
    error: (message, details = {}) => {
      console.error(`LCR Tools [${prefix}]: ${message}`, details);
    },
  };
}

window.loggingUtils = {
  createActionLogger,
  createSimpleLogger,
  getCurrentLogger,
};
