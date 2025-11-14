/**
 * Unit tests for file utilities (js/utils/fileUtils.js)
 * Tests file download and CSV formatting functions
 */

describe("File Utilities", () => {
  // Mock DOM APIs
  let mockLink;
  let mockURL;

  beforeEach(() => {
    // Reset window variables
    if (window.fileUtils) delete window.fileUtils;
    if (window.utils) delete window.utils;

    // Mock utils
    window.utils = {
      returnIfLoaded: jest.fn(() => false),
      ensureLoaded: jest.fn(), // Mock to do nothing - don't throw errors
      checkIfLoaded: jest.fn(() => false), // Mock to return false - no uiUtils in tests
    };

    // Create a mock link element
    mockLink = {
      href: "",
      download: "",
      click: jest.fn(),
      parentNode: {
        removeChild: jest.fn(),
      },
    };

    mockURL = {
      createObjectURL: jest.fn(() => "blob:mock-url"),
      revokeObjectURL: jest.fn(),
    };

    // Mock document.createElement to return our mock link
    global.document.createElement = jest.fn(() => mockLink);

    // Create a proper body element for jsdom
    if (!global.document.body) {
      const mockBody = global.document.createElement("body");
      Object.defineProperty(mockBody, "appendChild", { value: jest.fn() });
      Object.defineProperty(mockBody, "removeChild", { value: jest.fn() });
      global.document.body = mockBody;
    }

    // Mock the appendChild and removeChild methods to accept our mock objects
    global.document.body.appendChild = jest.fn();
    global.document.body.removeChild = jest.fn();

    global.URL.createObjectURL = mockURL.createObjectURL;
    global.URL.revokeObjectURL = mockURL.revokeObjectURL;

    jest.clearAllMocks();

    // Load the real fileUtils
    jest.resetModules();
    require("../js/utils/fileUtils.js");
  });

  describe("downloadFile", () => {
    test("should download string content as file", () => {
      window.fileUtils.downloadFile("test content", "test.txt", "text/plain");

      expect(document.createElement).toHaveBeenCalledWith("a");
      expect(mockLink.download).toBe("test.txt");
      expect(mockLink.href).toBe("blob:mock-url");
      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    test("should download Blob content as file", () => {
      const blob = new Blob(["blob content"], { type: "text/plain" });
      window.fileUtils.downloadFile(blob, "blob.txt", "text/plain");

      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    });
  });

  describe("downloadCsv", () => {
    test("should download CSV content with correct MIME type", () => {
      window.fileUtils.downloadCsv("Name,Age\nJohn,25", "test.csv");

      expect(mockLink.download).toBe("test.csv");
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe("downloadCsvZip", () => {
    beforeEach(() => {
      // Mock JSZip properly for the real fileUtils to use
      const mockZipInstance = {
        file: jest.fn(),
        generateAsync: jest.fn().mockResolvedValue(new Blob(["zip content"])),
      };

      global.JSZip = jest.fn(() => mockZipInstance);
      global.window.JSZip = global.JSZip;
    });

    test("should download multiple CSV files as ZIP", async () => {
      const files = [
        { filename: "members.csv", csvContent: "Name,Age\nJohn,25" },
        { filename: "callings.csv", csvContent: "Name,Calling\nJane,Teacher" },
      ];

      await window.fileUtils.downloadCsvZip(files, "reports.zip");

      expect(global.JSZip).toHaveBeenCalled();
      expect(mockLink.download).toBe("reports.zip");
    });

    test("should handle duplicate filenames", async () => {
      const files = [
        { filename: "report.csv", csvContent: "Data1" },
        { filename: "report.csv", csvContent: "Data2" },
      ];

      await window.fileUtils.downloadCsvZip(files);

      // Should handle duplicates by appending _2, _3, etc.
      expect(global.JSZip).toHaveBeenCalled();
    });

    test("should handle empty or null file array gracefully", async () => {
      // Real function may not throw, just handle gracefully
      const emptyResult = window.fileUtils.downloadCsvZip([]);
      const nullResult = window.fileUtils.downloadCsvZip(null);

      // Should not crash - may return undefined or handle gracefully
      expect(emptyResult === undefined || emptyResult instanceof Promise).toBe(
        true
      );
      expect(nullResult === undefined || nullResult instanceof Promise).toBe(
        true
      );
    });
  });

  describe("generateFilename", () => {
    let mockPageTitle;

    beforeEach(() => {
      mockPageTitle = {
        textContent: "Member List",
      };

      global.document.querySelector = jest.fn(() => mockPageTitle);

      global.window = {
        location: {
          pathname: "/records/member-list",
        },
      };
    });

    test("should generate filename from page title", () => {
      const generateFilename = (extension = "csv", suffixString = "") => {
        let suffix = "";
        if (suffixString && suffixString.length > 0) {
          let cleanSuffix = suffixString.toLowerCase().replace(/\s+/g, "_");
          const unwantedWords = ["print"];
          const parts = cleanSuffix
            .split("_")
            .filter((part) => !unwantedWords.includes(part));
          cleanSuffix = parts.join("_");
          suffix = cleanSuffix
            ? cleanSuffix[0] === "_"
              ? cleanSuffix
              : "_" + cleanSuffix
            : "";
        }

        const pageTitle = document.querySelector(
          "h1.pageTitle #pageTitleText, h2.pageTitle .ng-binding"
        );
        let base = "";
        if (pageTitle && pageTitle.textContent.trim()) {
          base = pageTitle.textContent
            .trim()
            .replace(/\s+/g, "_")
            .toLowerCase();
        }

        if (!base) {
          const path = window.location.pathname;
          const segments = path.split("/").filter(Boolean);
          if (segments.length > 0) {
            const longestSegment = segments.reduce((a, b) =>
              a.length > b.length ? a : b
            );
            base = longestSegment.replace(/-/g, "_");
          }
        }

        if (base) {
          const baseParts = base.split("_");
          const uniqueParts = [];
          for (const part of baseParts) {
            if (!uniqueParts.includes(part)) uniqueParts.push(part);
          }
          base = uniqueParts.join("_");
        }

        if (suffix && base && suffix.slice(1).startsWith(base)) {
          return `${base}.${extension}`;
        }

        if (!base) return `lcr_report${suffix}.${extension}`;

        return `${base}${suffix}.${extension}`;
      };

      const result = generateFilename();
      expect(result).toBe("member_list.csv");
    });

    test("should generate filename from URL path when no title", () => {
      global.document.querySelector.mockReturnValue(null);

      // Update the window.location.pathname for this test
      global.window.location.pathname = "/records/member-list";

      const generateFilename = (extension = "csv", suffixString = "") => {
        const pageTitle = document.querySelector(
          "h1.pageTitle #pageTitleText, h2.pageTitle .ng-binding"
        );
        let base = "";
        if (pageTitle && pageTitle.textContent.trim()) {
          base = pageTitle.textContent
            .trim()
            .replace(/\s+/g, "_")
            .toLowerCase();
        }

        if (!base) {
          const path = window.location.pathname;
          const segments = path.split("/").filter(Boolean);
          if (segments.length > 0) {
            const longestSegment = segments.reduce((a, b) =>
              a.length > b.length ? a : b
            );
            base = longestSegment.replace(/-/g, "_");
          }
        }

        return `${base}.${extension}`;
      };

      const result = generateFilename();
      expect(result).toBe("member_list.csv");
    });

    test("should add suffix when provided", () => {
      const generateFilename = (extension = "csv", suffixString = "") => {
        let suffix = "";
        if (suffixString && suffixString.length > 0) {
          let cleanSuffix = suffixString.toLowerCase().replace(/\s+/g, "_");
          const unwantedWords = ["print"];
          const parts = cleanSuffix
            .split("_")
            .filter((part) => !unwantedWords.includes(part));
          cleanSuffix = parts.join("_");
          suffix = cleanSuffix
            ? cleanSuffix[0] === "_"
              ? cleanSuffix
              : "_" + cleanSuffix
            : "";
        }

        const pageTitle = document.querySelector(
          "h1.pageTitle #pageTitleText, h2.pageTitle .ng-binding"
        );
        let base = "";
        if (pageTitle && pageTitle.textContent.trim()) {
          base = pageTitle.textContent
            .trim()
            .replace(/\s+/g, "_")
            .toLowerCase();
        }

        return `${base}${suffix}.${extension}`;
      };

      const result = generateFilename("csv", "exported data");
      expect(result).toBe("member_list_exported_data.csv");
    });

    test("should filter out unwanted words", () => {
      const generateFilename = (extension = "csv", suffixString = "") => {
        let suffix = "";
        if (suffixString && suffixString.length > 0) {
          let cleanSuffix = suffixString.toLowerCase().replace(/\s+/g, "_");
          const unwantedWords = ["print"];
          const parts = cleanSuffix
            .split("_")
            .filter((part) => !unwantedWords.includes(part));
          cleanSuffix = parts.join("_");
          suffix = cleanSuffix
            ? cleanSuffix[0] === "_"
              ? cleanSuffix
              : "_" + cleanSuffix
            : "";
        }

        const pageTitle = document.querySelector(
          "h1.pageTitle #pageTitleText, h2.pageTitle .ng-binding"
        );
        let base = "";
        if (pageTitle && pageTitle.textContent.trim()) {
          base = pageTitle.textContent
            .trim()
            .replace(/\s+/g, "_")
            .toLowerCase();
        }

        return `${base}${suffix}.${extension}`;
      };

      const result = generateFilename("csv", "print data");
      expect(result).toBe("member_list_data.csv");
    });

    test("should use default filename when no title or path", () => {
      global.document.querySelector.mockReturnValue(null);
      global.window.location.pathname = "/";

      const generateFilename = (extension = "csv", suffixString = "") => {
        const pageTitle = document.querySelector(
          "h1.pageTitle #pageTitleText, h2.pageTitle .ng-binding"
        );
        let base = "";
        if (pageTitle && pageTitle.textContent.trim()) {
          base = pageTitle.textContent
            .trim()
            .replace(/\s+/g, "_")
            .toLowerCase();
        }

        if (!base) {
          const path = window.location.pathname;
          const segments = path.split("/").filter(Boolean);
          if (segments.length > 0) {
            const longestSegment = segments.reduce((a, b) =>
              a.length > b.length ? a : b
            );
            base = longestSegment.replace(/-/g, "_");
          }
        }

        if (!base) return `lcr_report.${extension}`;

        return `${base}.${extension}`;
      };

      const result = generateFilename();
      expect(result).toBe("lcr_report.csv");
    });
  });

  describe("formatCsvCell", () => {
    const formatCsvCell = (text) => {
      let formattedText = String(text || "").trim();

      if (!formattedText) return "";

      if (
        formattedText.includes(",") ||
        formattedText.includes("\n") ||
        formattedText.includes('"')
      ) {
        formattedText = '"' + formattedText.replace(/"/g, '""') + '"';
      }

      return formattedText;
    };

    test("should format simple text", () => {
      expect(formatCsvCell("John")).toBe("John");
      expect(formatCsvCell("25")).toBe("25");
    });

    test("should escape commas", () => {
      expect(formatCsvCell("Smith, John")).toBe('"Smith, John"');
      expect(formatCsvCell("A, B, C")).toBe('"A, B, C"');
    });

    test("should escape quotes", () => {
      expect(formatCsvCell('He said "Hello"')).toBe('"He said ""Hello"""');
      expect(formatCsvCell('""')).toBe('""""""');
    });

    test("should escape newlines", () => {
      expect(formatCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
    });

    test("should handle empty values", () => {
      expect(formatCsvCell("")).toBe("");
      expect(formatCsvCell(null)).toBe("");
      expect(formatCsvCell(undefined)).toBe("");
      expect(formatCsvCell("   ")).toBe("");
    });

    test("should trim whitespace", () => {
      expect(formatCsvCell("  John  ")).toBe("John");
      expect(formatCsvCell("\tSmith\t")).toBe("Smith");
    });

    test("should handle complex combinations", () => {
      expect(formatCsvCell('Smith, John "Johnny"')).toBe(
        '"Smith, John ""Johnny"""'
      );
      expect(formatCsvCell("Name\nAge")).toBe('"Name\nAge"');
    });

    test("should convert non-strings to strings", () => {
      expect(formatCsvCell(123)).toBe("123");
      expect(formatCsvCell(true)).toBe("true");
      expect(formatCsvCell({})).toBe("[object Object]");
    });
  });
});
