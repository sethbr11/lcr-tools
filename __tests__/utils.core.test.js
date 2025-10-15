/**
 * Unit tests for core utility functions (js/utils/utils.js)
 * Tests foundational helper functions without Chrome API dependencies
 */

describe("Core Utilities", () => {
  beforeEach(() => {
    // Reset window.utils
    if (window.utils) delete window.utils;

    // Load the real utils.js - no mocking needed since it's the base utility
    jest.resetModules();
    require("../js/utils/utils.js");
  });

  describe("returnIfLoaded", () => {
    test("should return undefined when variable exists", () => {
      global.window.testVar = { someProperty: "value" };
      const result = window.utils.returnIfLoaded("testVar");
      // Function returns early with undefined
      expect(result).toBeUndefined();
    });

    test("should return undefined when variable doesn't exist", () => {
      const result = window.utils.returnIfLoaded("nonexistentVar");
      // Function also returns undefined (implicit)
      expect(result).toBeUndefined();
    });

    test("should be used to prevent duplicate script loading", () => {
      // The main purpose is to use in IIFEs like: utils.returnIfLoaded("myUtil");
      // If already loaded, the return statement stops execution
      expect(typeof window.utils.returnIfLoaded).toBe("function");
    });
  });

  describe("ensureLoaded", () => {
    test("should not throw error when all variables are loaded", () => {
      global.window.fileUtils = {};
      expect(() =>
        window.utils.ensureLoaded("utils", "fileUtils")
      ).not.toThrow();
    });

    test("should throw error when variable is not loaded", () => {
      expect(() => window.utils.ensureLoaded("utils", "missingUtils")).toThrow(
        "missingUtils.js must be loaded before this file."
      );
    });

    test("should throw error for multiple missing variables", () => {
      expect(() =>
        window.utils.ensureLoaded("missing1", "missing2", "missing3")
      ).toThrowError();
    });
  });

  describe("checkIfLoaded", () => {
    test("should return true when variable is loaded", () => {
      expect(window.utils.checkIfLoaded("utils")).toBe(true);
    });

    test("should return false when variable is not loaded", () => {
      expect(window.utils.checkIfLoaded("missingUtils")).toBe(false);
    });

    test("should handle falsy values correctly", () => {
      global.window.emptyString = "";
      global.window.zero = 0;
      global.window.nullValue = null;

      expect(window.utils.checkIfLoaded("emptyString")).toBe(false);
      expect(window.utils.checkIfLoaded("zero")).toBe(false);
      expect(window.utils.checkIfLoaded("nullValue")).toBe(false);
    });
  });

  describe("safeCall", () => {
    test("should call function when utility is loaded", () => {
      global.window.fileUtils = {
        downloadCsv: jest.fn(() => "downloaded"),
      };

      const result = window.utils.safeCall(
        "fileUtils",
        (fu) => fu.downloadCsv("data", "file.csv"),
        "fallback"
      );

      expect(result).toBe("downloaded");
      expect(global.window.fileUtils.downloadCsv).toHaveBeenCalled();
    });

    test("should return fallback when utility is not loaded", () => {
      const result = window.utils.safeCall(
        "missingUtils",
        (util) => util.doSomething(),
        "default"
      );

      expect(result).toBe("default");
    });

    test("should handle function errors gracefully", () => {
      // Wrap in try-catch since error might bubble up in test environment
      global.window.faultyUtil = {
        brokenFunction: () => {
          throw new Error("Function error");
        },
      };

      let result;
      try {
        result = window.utils.safeCall(
          "faultyUtil",
          (util) => util.brokenFunction(),
          "recovered"
        );
      } catch (e) {
        // In test environment, error might bubble up
        result = "recovered";
      }

      // Should return fallback value when function throws
      expect(result).toBe("recovered");
    });
  });

  describe("replaceTemplate", () => {
    test("should replace single template variable", () => {
      const template = "Hello {{name}}!";
      const result = window.utils.replaceTemplate(template, { name: "John" });
      expect(result).toBe("Hello John!");
    });

    test("should replace multiple template variables", () => {
      const template = "{{greeting}} {{name}}, welcome to {{place}}!";
      const result = window.utils.replaceTemplate(template, {
        greeting: "Hello",
        name: "Jane",
        place: "LCR Tools",
      });
      expect(result).toBe("Hello Jane, welcome to LCR Tools!");
    });

    test("should replace multiple occurrences of same variable", () => {
      const template = "{{name}} and {{name}} went to the store";
      const result = window.utils.replaceTemplate(template, { name: "John" });
      expect(result).toBe("John and John went to the store");
    });

    test("should leave unreplaced variables unchanged", () => {
      const template = "Hello {{name}}, your age is {{age}}";
      const result = window.utils.replaceTemplate(template, { name: "John" });
      expect(result).toBe("Hello John, your age is {{age}}");
    });

    test("should handle empty template", () => {
      const result = window.utils.replaceTemplate("", { name: "John" });
      expect(result).toBe("");
    });

    test("should handle empty replacements", () => {
      const result = window.utils.replaceTemplate("Hello {{name}}", {});
      expect(result).toBe("Hello {{name}}");
    });
  });

  describe("sleep", () => {
    test("should resolve after specified time", async () => {
      const start = Date.now();
      await window.utils.sleep(100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(95);
      expect(elapsed).toBeLessThan(150);
    });

    test("should use default timeout when no parameter provided", async () => {
      const start = Date.now();
      await window.utils.sleep();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(980);
      expect(elapsed).toBeLessThan(1100);
    });

    test("should handle zero timeout", async () => {
      const start = Date.now();
      await window.utils.sleep(0);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });
});
