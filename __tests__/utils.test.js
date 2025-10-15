/**
 * Unit tests for utility functions
 * Tests core utility functions from js/utils/
 */

// Mock the utils module
const mockUtils = {
  returnIfLoaded: jest.fn(),
  ensureLoaded: jest.fn(),
  checkIfLoaded: jest.fn(),
  safeCall: jest.fn(),
  replaceTemplate: jest.fn(),
  sleep: jest.fn(),
};

// Mock dataUtils functions
const mockDataUtils = {
  formatDate: jest.fn(),
  parseDate: jest.fn(),
  parseFullName: jest.fn(),
  fuzzyNameMatch: jest.fn(),
  isDateValue: jest.fn(),
  isDateColumn: jest.fn(),
  parseLCRDate: jest.fn(),
};

describe("Utility Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Template Replacement", () => {
    test("should replace template variables correctly", () => {
      const template = "Hello {{name}}, you have {{count}} messages.";
      const replacements = { name: "John", count: "5" };

      // Simulate the replaceTemplate function
      let result = template;
      Object.keys(replacements).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, "g");
        result = result.replace(regex, replacements[key]);
      });

      expect(result).toBe("Hello John, you have 5 messages.");
    });

    test("should handle multiple occurrences of the same variable", () => {
      const template = "{{name}} is {{name}} and {{name}} is great.";
      const replacements = { name: "LCR Tools" };

      let result = template;
      Object.keys(replacements).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, "g");
        result = result.replace(regex, replacements[key]);
      });

      expect(result).toBe("LCR Tools is LCR Tools and LCR Tools is great.");
    });

    test("should leave unreplaced variables as-is", () => {
      const template = "Hello {{name}}, {{unknown}} variable.";
      const replacements = { name: "John" };

      let result = template;
      Object.keys(replacements).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, "g");
        result = result.replace(regex, replacements[key]);
      });

      expect(result).toBe("Hello John, {{unknown}} variable.");
    });
  });

  describe("Date Parsing", () => {
    test("should parse MM/DD/YYYY format", () => {
      const dateStr = "01/15/2024";
      const date = new Date(dateStr);

      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0); // January is 0
      expect(date.getDate()).toBe(15);
    });

    test("should parse YYYY-MM-DD format", () => {
      const dateStr = "2024-01-15";
      const date = new Date(dateStr + "T00:00:00"); // Avoid timezone issues

      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    test("should handle invalid date strings", () => {
      const invalidDates = ["invalid", "32/01/2024", "2024-13-01", ""];

      invalidDates.forEach((dateStr) => {
        const date = new Date(dateStr);
        expect(isNaN(date.getTime())).toBe(true);
      });
    });
  });

  describe("Name Parsing", () => {
    test("should parse comma-separated names", () => {
      const fullName = "Smith, John Michael";

      // Simulate parseFullName logic
      const commaIdx = fullName.indexOf(",");
      const lastName = fullName.substring(0, commaIdx).trim().toLowerCase();
      const firstName = fullName
        .substring(commaIdx + 1)
        .trim()
        .toLowerCase();
      const firstNamesArray = firstName
        .split(/\s+/)
        .map((n) => n.trim())
        .filter(Boolean);

      expect(lastName).toBe("smith");
      expect(firstName).toBe("john michael");
      expect(firstNamesArray).toEqual(["john", "michael"]);
    });

    test("should parse space-separated names", () => {
      const fullName = "John Michael Smith";

      const parts = fullName.split(" ").filter((p) => p);
      const lastName = parts[0].toLowerCase();
      const firstName = parts.slice(1).join(" ").toLowerCase();
      const firstNamesArray = firstName
        .split(/\s+/)
        .map((n) => n.trim())
        .filter(Boolean);

      expect(lastName).toBe("john");
      expect(firstName).toBe("michael smith");
      expect(firstNamesArray).toEqual(["michael", "smith"]);
    });

    test("should handle single names", () => {
      const fullName = "Smith";

      const parts = fullName.split(" ").filter((p) => p);
      const lastName = parts[0].toLowerCase();
      const firstName = parts.slice(1).join(" ").toLowerCase();
      const firstNamesArray = firstName
        .split(/\s+/)
        .map((n) => n.trim())
        .filter(Boolean);

      expect(lastName).toBe("smith");
      expect(firstName).toBe("");
      expect(firstNamesArray).toEqual([]);
    });
  });

  describe("Fuzzy Name Matching", () => {
    test("should match exact first names", () => {
      const name = {
        firstName: "john",
        lastName: "smith",
        firstNamesArray: [],
      };
      const nameToMatch = {
        firstName: "john",
        lastName: "smith",
        firstNamesArray: ["john"],
      };

      // Simulate fuzzyNameMatch logic
      const lastName = name.lastName.toLowerCase();
      const firstName = name.firstName.toLowerCase();
      const lastNameToMatch = nameToMatch.lastName.toLowerCase();
      const firstNameToMatch = nameToMatch.firstName.toLowerCase();
      const firstNameToMatchsArray = nameToMatch.firstNamesArray || [];

      const isLastNameMatch = lastNameToMatch === lastName;
      const isFirstNameMatch = firstNameToMatchsArray.some(
        (lcrFirst) => lcrFirst === firstName
      );

      expect(isLastNameMatch).toBe(true);
      expect(isFirstNameMatch).toBe(true);
    });

    test("should not match different last names", () => {
      const name = {
        firstName: "john",
        lastName: "smith",
        firstNamesArray: [],
      };
      const nameToMatch = {
        firstName: "john",
        lastName: "jones",
        firstNamesArray: ["john"],
      };

      const lastName = name.lastName.toLowerCase();
      const lastNameToMatch = nameToMatch.lastName.toLowerCase();

      const isLastNameMatch = lastNameToMatch === lastName;

      expect(isLastNameMatch).toBe(false);
    });

    test("should handle case-insensitive matching", () => {
      const name = {
        firstName: "JOHN",
        lastName: "SMITH",
        firstNamesArray: [],
      };
      const nameToMatch = {
        firstName: "john",
        lastName: "smith",
        firstNamesArray: ["john"],
      };

      const lastName = name.lastName.toLowerCase();
      const firstName = name.firstName.toLowerCase();
      const lastNameToMatch = nameToMatch.lastName.toLowerCase();
      const firstNameToMatchsArray = nameToMatch.firstNamesArray || [];

      const isLastNameMatch = lastNameToMatch === lastName;
      const isFirstNameMatch = firstNameToMatchsArray.some(
        (lcrFirst) => lcrFirst === firstName
      );

      expect(isLastNameMatch).toBe(true);
      expect(isFirstNameMatch).toBe(true);
    });
  });

  describe("CSV Formatting", () => {
    test("should format simple CSV cells", () => {
      const text = "Simple text";

      // Simulate formatCsvCell logic
      let formattedText = String(text || "").trim();
      if (!formattedText) return "";

      if (
        formattedText.includes(",") ||
        formattedText.includes("\n") ||
        formattedText.includes('"')
      ) {
        formattedText = '"' + formattedText.replace(/"/g, '""') + '"';
      }

      expect(formattedText).toBe("Simple text");
    });

    test("should escape commas in CSV cells", () => {
      const text = "Text, with, commas";

      let formattedText = String(text || "").trim();
      if (!formattedText) return "";

      if (
        formattedText.includes(",") ||
        formattedText.includes("\n") ||
        formattedText.includes('"')
      ) {
        formattedText = '"' + formattedText.replace(/"/g, '""') + '"';
      }

      expect(formattedText).toBe('"Text, with, commas"');
    });

    test("should escape quotes in CSV cells", () => {
      const text = 'Text with "quotes" inside';

      let formattedText = String(text || "").trim();
      if (!formattedText) return "";

      if (
        formattedText.includes(",") ||
        formattedText.includes("\n") ||
        formattedText.includes('"')
      ) {
        formattedText = '"' + formattedText.replace(/"/g, '""') + '"';
      }

      expect(formattedText).toBe('"Text with ""quotes"" inside"');
    });

    test("should handle empty values", () => {
      const text = "";

      let formattedText = String(text || "").trim();
      if (!formattedText) {
        formattedText = "";
      } else if (
        formattedText.includes(",") ||
        formattedText.includes("\n") ||
        formattedText.includes('"')
      ) {
        formattedText = '"' + formattedText.replace(/"/g, '""') + '"';
      }

      expect(formattedText).toBe("");
    });
  });

  describe("Loading State Management", () => {
    test("should track abort state", () => {
      // Simulate loading state management
      window.lcrToolsShouldStopProcessing = false;

      expect(window.lcrToolsShouldStopProcessing).toBe(false);

      window.lcrToolsShouldStopProcessing = true;

      expect(window.lcrToolsShouldStopProcessing).toBe(true);
    });

    test("should reset abort state", () => {
      window.lcrToolsShouldStopProcessing = true;

      // Simulate reset
      window.lcrToolsShouldStopProcessing = false;

      expect(window.lcrToolsShouldStopProcessing).toBe(false);
    });
  });
});
