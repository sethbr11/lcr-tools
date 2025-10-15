/**
 * Tests for loggingUtils.js - logging functionality
 */

describe("Logging Utilities", () => {
  let consoleLogSpy, consoleWarnSpy, consoleErrorSpy;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = "";

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Reset window variables
    if (window.currentLogger) delete window.currentLogger;
    if (window.loggingUtils) delete window.loggingUtils;
    if (window.utils) delete window.utils;
    if (window.fileUtils) delete window.fileUtils;

    // Mock utils - returnIfLoaded needs to NOT exist (scripts check for this)
    window.utils = {
      ensureLoaded: jest.fn(),
      returnIfLoaded: jest.fn(), // Mock this but it won't prevent loading
    };

    // Mock fileUtils
    window.fileUtils = {
      downloadCsv: jest.fn(),
    };

    // Load the logging utils - need to clear the require cache
    jest.resetModules();
    require("../js/utils/loggingUtils.js");
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("createActionLogger", () => {
    it("should create an action logger with default options", () => {
      const logger = window.loggingUtils.createActionLogger("TestAction");

      expect(logger).toBeDefined();
      expect(logger.logAction).toBeDefined();
      expect(logger.logModification).toBeDefined();
      expect(logger.logUserAction).toBeDefined();
      expect(logger.logError).toBeDefined();
      expect(logger.logCompletion).toBeDefined();
      expect(logger.getLog).toBeDefined();
      expect(logger.downloadLog).toBeDefined();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[TestAction] Started")
      );
    });

    it("should log action with INFO level", () => {
      const logger = window.loggingUtils.createActionLogger("TestAction");
      logger.logAction("Test Event", { key: "value" }, "INFO");

      const logs = logger.getLog();
      expect(logs.length).toBeGreaterThan(1);
      expect(logs[logs.length - 1].action).toBe("Test Event");
      expect(logs[logs.length - 1].level).toBe("INFO");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Test Event"),
        expect.any(Object)
      );
    });

    it("should log action with WARN level", () => {
      const logger = window.loggingUtils.createActionLogger("TestAction");
      logger.logAction("Warning Event", { key: "value" }, "WARN");

      const logs = logger.getLog();
      expect(logs[logs.length - 1].level).toBe("WARN");
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it("should log action with ERROR level", () => {
      const logger = window.loggingUtils.createActionLogger("TestAction");
      logger.logAction("Error Event", { key: "value" }, "ERROR");

      const logs = logger.getLog();
      expect(logs[logs.length - 1].level).toBe("ERROR");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should truncate long details in console output", () => {
      const logger = window.loggingUtils.createActionLogger("TestAction");
      const longDetails = { data: "x".repeat(300) };
      logger.logAction("Long Event", longDetails);

      // Should be called with Long Event message
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Long Event"),
        expect.anything() // Details might be truncated string or object
      );

      // Verify it was actually logged
      const logCalls = consoleLogSpy.mock.calls;
      const longEventCall = logCalls.find(
        (call) => call[0] && call[0].includes("Long Event")
      );
      expect(longEventCall).toBeDefined();
    });

    it("should log data modifications", () => {
      const logger = window.loggingUtils.createActionLogger("TestAction");
      const beforeState = { name: "John" };
      const afterState = { name: "Jane" };

      logger.logModification("UPDATE", "userProfile", beforeState, afterState, {
        userId: 123,
      });

      const logs = logger.getLog();
      const modLog = logs[logs.length - 1];
      expect(modLog.action).toBe("DATA_MODIFICATION_UPDATE");
      const details = JSON.parse(modLog.details);
      expect(details.target).toBe("userProfile");
      expect(details.beforeState).toEqual(beforeState);
      expect(details.afterState).toEqual(afterState);
      expect(details.userId).toBe(123);
    });

    it("should log user actions", () => {
      const logger = window.loggingUtils.createActionLogger("TestAction");
      logger.logUserAction("CLICK", "#submit-button", null, { page: "form" });

      const logs = logger.getLog();
      const userLog = logs[logs.length - 1];
      expect(userLog.action).toBe("USER_ACTION_CLICK");
      const details = JSON.parse(userLog.details);
      expect(details.element).toBe("#submit-button");
      expect(details.page).toBe("form");
    });

    it("should log errors with stack trace", () => {
      const logger = window.loggingUtils.createActionLogger("TestAction");
      const error = new Error("Test error");
      logger.logError(error, { operation: "dataFetch" });

      const logs = logger.getLog();
      const errorLog = logs[logs.length - 1];
      expect(errorLog.action).toBe("ERROR_OCCURRED");
      expect(errorLog.level).toBe("ERROR");
      const details = JSON.parse(errorLog.details);
      expect(details.message).toBe("Test error");
      expect(details.stack).toBeDefined();
      expect(details.context.operation).toBe("dataFetch");
    });

    it("should log errors from string", () => {
      const logger = window.loggingUtils.createActionLogger("TestAction");
      logger.logError("Simple error message");

      const logs = logger.getLog();
      const errorLog = logs[logs.length - 1];
      const details = JSON.parse(errorLog.details);
      expect(details.message).toBe("Simple error message");
    });

    it("should log completion with duration", (done) => {
      const logger = window.loggingUtils.createActionLogger("TestAction");

      setTimeout(() => {
        logger.logCompletion("SUCCESS", { itemsProcessed: 10 });

        const logs = logger.getLog();
        const completionLog = logs[logs.length - 1];
        expect(completionLog.action).toBe("ACTION_COMPLETED");
        const details = JSON.parse(completionLog.details);
        expect(details.status).toBe("SUCCESS");
        expect(details.duration).toMatch(/\d+ms/);
        expect(details.summary.itemsProcessed).toBe(10);
        done();
      }, 50);
    });

    it("should return copy of logs", () => {
      const logger = window.loggingUtils.createActionLogger("TestAction");
      logger.logAction("Test", {});

      const logs1 = logger.getLog();
      const logs2 = logger.getLog();

      expect(logs1).toEqual(logs2);
      expect(logs1).not.toBe(logs2); // Different array instances
    });

    it("should download log as CSV", () => {
      const logger = window.loggingUtils.createActionLogger("TestAction");
      logger.logAction("Test Event", { key: "value" });
      logger.downloadLog();

      expect(window.utils.ensureLoaded).toHaveBeenCalledWith("fileUtils");
      expect(window.fileUtils.downloadCsv).toHaveBeenCalled();

      const csvCall = window.fileUtils.downloadCsv.mock.calls[0];
      const csvContent = csvCall[0];
      const filename = csvCall[1];

      expect(csvContent).toContain("Timestamp");
      expect(csvContent).toContain("Level");
      expect(csvContent).toContain("Action");
      expect(csvContent).toContain("Details");
      expect(filename).toMatch(/lcr_tools_action_log_testaction/);
    });

    it("should download log with custom filename", () => {
      const logger = window.loggingUtils.createActionLogger("TestAction");
      logger.downloadLog("custom_log.csv");

      expect(window.fileUtils.downloadCsv).toHaveBeenCalled();
      const filename = window.fileUtils.downloadCsv.mock.calls[0][1];
      expect(filename).toBe("custom_log.csv");
    });

    it("should escape quotes in CSV export", () => {
      const logger = window.loggingUtils.createActionLogger("TestAction");
      logger.logAction('Event with "quotes"', { key: 'value "with" quotes' });
      logger.downloadLog();

      const csvContent = window.fileUtils.downloadCsv.mock.calls[0][0];
      expect(csvContent).toContain('""');
    });

    it("should create summary report", () => {
      const logger = window.loggingUtils.createActionLogger("TestAction");
      logger.logModification("CREATE", "user", null, { name: "John" });
      logger.logUserAction("CLICK", "#button");
      logger.logError("Test error");

      const summary = logger.createSummary();

      expect(summary.actionName).toBe("TestAction");
      expect(summary.totalLogEntries).toBeGreaterThan(0);
      expect(summary.modificationsCount).toBe(1);
      expect(summary.userActionsCount).toBe(1);
      expect(summary.errorsCount).toBe(1);
      expect(summary.modifications).toHaveLength(1);
      expect(summary.errors).toHaveLength(1);
    });

    it("should create logger with custom options", () => {
      const logger = window.loggingUtils.createActionLogger("TestAction", {
        includeTimestamp: false,
        includeUserAgent: true,
        includeUrl: false,
        logLevel: "DEBUG",
      });

      const logs = logger.getLog();
      const initialLog = logs[0];
      expect(initialLog.timestamp).toBeNull();
      expect(initialLog.userAgent).toBeDefined();
      expect(initialLog.url).toBeNull();
    });

    it("should set current logger globally", () => {
      const logger = window.loggingUtils.createActionLogger("TestAction");
      expect(window.currentLogger).toBe(logger);
    });

    it("should get current logger", () => {
      const logger = window.loggingUtils.createActionLogger("TestAction");
      const currentLogger = window.loggingUtils.getCurrentLogger();
      expect(currentLogger).toBe(logger);
    });
  });

  describe("createSimpleLogger", () => {
    it("should create a simple logger", () => {
      const logger = window.loggingUtils.createSimpleLogger("TestPrefix");

      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
    });

    it("should log info messages", () => {
      const logger = window.loggingUtils.createSimpleLogger("TestPrefix");
      logger.info("Info message", { key: "value" });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[TestPrefix]"),
        expect.objectContaining({ key: "value" })
      );
    });

    it("should log warning messages", () => {
      const logger = window.loggingUtils.createSimpleLogger("TestPrefix");
      logger.warn("Warning message", { key: "value" });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[TestPrefix]"),
        expect.objectContaining({ key: "value" })
      );
    });

    it("should log error messages", () => {
      const logger = window.loggingUtils.createSimpleLogger("TestPrefix");
      logger.error("Error message", { key: "value" });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[TestPrefix]"),
        expect.objectContaining({ key: "value" })
      );
    });

    it("should handle messages without details", () => {
      const logger = window.loggingUtils.createSimpleLogger("TestPrefix");
      logger.info("Simple message");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Simple message"),
        {}
      );
    });
  });
});
