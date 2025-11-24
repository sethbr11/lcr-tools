/**
 * Unit tests for data utilities (js/utils/dataUtils.js)
 * Tests data parsing, validation, and transformation functions
 */

describe("Data Utilities", () => {
  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = "";

    // Reset window variables
    if (window.dataUtils) delete window.dataUtils;
    if (window.utils) delete window.utils;

    // Mock utils
    window.utils = {
      returnIfLoaded: jest.fn(() => false),
    };

    // Load the real dataUtils
    jest.resetModules();
    require("../../js/utils/dataUtils.js");
  });

  describe("formatDate", () => {
    test("should format date in MM/DD/YYYY format by default", () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(window.dataUtils.formatDate(date)).toBe("01/15/2024");
    });

    test("should format date in YYYY-MM-DD format", () => {
      const date = new Date(2024, 11, 31); // December 31, 2024
      expect(window.dataUtils.formatDate(date, "YYYY-MM-DD")).toBe(
        "2024-12-31"
      );
    });

    test("should pad single digits with zeros", () => {
      const date = new Date(2024, 2, 5); // March 5, 2024
      expect(window.dataUtils.formatDate(date)).toBe("03/05/2024");
      expect(window.dataUtils.formatDate(date, "YYYY-MM-DD")).toBe(
        "2024-03-05"
      );
    });

    test("should return null for invalid dates", () => {
      expect(window.dataUtils.formatDate(new Date("invalid"))).toBe(null);
      expect(window.dataUtils.formatDate(null)).toBe(null);
      expect(window.dataUtils.formatDate(undefined)).toBe(null);
      expect(window.dataUtils.formatDate("not a date")).toBe(null);
    });

    test("should handle edge dates", () => {
      const date1 = new Date(2024, 0, 1); // January 1, 2024
      const date2 = new Date(2024, 11, 31); // December 31, 2024

      expect(window.dataUtils.formatDate(date1)).toBe("01/01/2024");
      expect(window.dataUtils.formatDate(date2)).toBe("12/31/2024");
    });
  });

  describe("parseLCRDate", () => {
    test("should parse ISO date format", () => {
      const result = window.dataUtils.parseLCRDate("2024-01-15");
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      // Note: Date parsing can vary by timezone, so we check it's close
      expect(result.getDate()).toBeGreaterThanOrEqual(14);
      expect(result.getDate()).toBeLessThanOrEqual(16);
    });

    test("should parse MM/DD/YYYY format", () => {
      const result = window.dataUtils.parseLCRDate("01/15/2024");
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    test("should parse MM-DD-YYYY format", () => {
      const result = window.dataUtils.parseLCRDate("12-25-2024");
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(11);
      expect(result.getDate()).toBe(25);
    });

    test("should parse DD MMM YYYY format", () => {
      const result = window.dataUtils.parseLCRDate("15 Jan 2024");
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    test("should parse MMM DD, YYYY format", () => {
      const result = window.dataUtils.parseLCRDate("Jan 15, 2024");
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    test("should handle single digit months and days", () => {
      const result = window.dataUtils.parseLCRDate("1/5/2024");
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(5);
    });

    test("should return null for invalid input", () => {
      expect(window.dataUtils.parseLCRDate("")).toBe(null);
      expect(window.dataUtils.parseLCRDate(null)).toBe(null);
      expect(window.dataUtils.parseLCRDate(undefined)).toBe(null);
      expect(window.dataUtils.parseLCRDate("invalid date")).toBe(null);
      expect(window.dataUtils.parseLCRDate("invalid/date/format")).toBe(null);
      expect(window.dataUtils.parseLCRDate("not-a-date")).toBe(null);
    });

    test("should handle whitespace", () => {
      const result = window.dataUtils.parseLCRDate("  01/15/2024  ");
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
    });
  });

  describe("parseFullName", () => {
    test("should parse comma-separated names", () => {
      const result = window.dataUtils.parseFullName("Smith, John Michael");
      expect(result.lastName).toBe("smith");
      expect(result.firstName).toBe("john michael");
      expect(result.firstNamesArray).toEqual(["john", "michael"]);
    });

    test("should parse space-separated names", () => {
      const result = window.dataUtils.parseFullName("John Michael Smith");
      expect(result.lastName).toBe("john");
      expect(result.firstName).toBe("michael smith");
      expect(result.firstNamesArray).toEqual(["michael", "smith"]);
    });

    test("should handle single names", () => {
      const result = window.dataUtils.parseFullName("Smith");
      expect(result.lastName).toBe("smith");
      expect(result.firstName).toBe("");
      expect(result.firstNamesArray).toEqual([]);
    });

    test("should handle multiple spaces", () => {
      const result = window.dataUtils.parseFullName("John   Michael   Smith");
      expect(result.lastName).toBe("john");
      expect(result.firstName).toBe("michael smith");
      expect(result.firstNamesArray).toEqual(["michael", "smith"]);
    });

    test("should handle comma with extra spaces", () => {
      const result = window.dataUtils.parseFullName("Smith ,  John Michael ");
      expect(result.lastName).toBe("smith");
      expect(result.firstName).toBe("john michael");
      expect(result.firstNamesArray).toEqual(["john", "michael"]);
    });

    test("should handle empty input", () => {
      const result = window.dataUtils.parseFullName("");
      expect(result.lastName).toBe("");
      expect(result.firstName).toBe("");
      expect(result.firstNamesArray).toEqual([]);
    });
  });

  describe("isDateValue", () => {
    test("should identify valid date patterns", () => {
      expect(window.dataUtils.isDateValue("01/15/2024")).toBe(true);
      expect(window.dataUtils.isDateValue("12-25-2024")).toBe(true);
      expect(window.dataUtils.isDateValue("2024-01-15")).toBe(true);
      expect(window.dataUtils.isDateValue("01/15/24")).toBe(true);
      expect(window.dataUtils.isDateValue("15 Jan 2024")).toBe(true);
      expect(window.dataUtils.isDateValue("Jan 15, 2024")).toBe(true);
    });

    test("should reject invalid date patterns", () => {
      expect(window.dataUtils.isDateValue("January 15, 2024")).toBe(false); // Full month name
      expect(window.dataUtils.isDateValue("15/xx/2024")).toBe(false); // DD/MM/YYYY with non-numeric month
      expect(window.dataUtils.isDateValue("2024/01/15")).toBe(false); // YYYY/MM/DD
      expect(window.dataUtils.isDateValue("not a date")).toBe(false);
      expect(window.dataUtils.isDateValue("123")).toBe(false);
    });

    test("should handle whitespace", () => {
      expect(window.dataUtils.isDateValue("  01/15/2024  ")).toBe(true);
      expect(window.dataUtils.isDateValue("  15 Jan 2024  ")).toBe(true);
    });

    test("should handle edge cases", () => {
      expect(window.dataUtils.isDateValue("")).toBe(false);
      expect(window.dataUtils.isDateValue("   ")).toBe(false);
    });
  });
});
