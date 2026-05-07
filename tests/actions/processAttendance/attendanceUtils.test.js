/**
 * @jest-environment jsdom
 */

// Mock global objects
global.utils = {
  returnIfLoaded: jest.fn(),
  ensureLoaded: jest.fn(),
  replaceTemplate: jest.fn((template, data) => {
    let result = template;
    for (const key in data) {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), data[key]);
    }
    return result;
  }),
};

global.modalUtils = {
  showStatus: jest.fn(),
};

global.fileUtils = {
  downloadCsv: jest.fn(),
};

global.dataUtils = {
  parseLCRDate: jest.fn((dateStr) => {
    if (!dateStr) return null;
    // Handle YYYY-MM-DD specifically to ensure it's treated as local time (or at least consistent)
    // Appending T12:00:00 prevents timezone shifts to previous day
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr + "T12:00:00");
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }),
  formatDate: jest.fn((date, format) => {
    if (!date) return null;
    if (format === "YYYY-MM-DD") {
      return date.toISOString().split("T")[0];
    }
    return date.toLocaleDateString();
  }),
};

// Load the file under test
require("../../../js/actions/processAttendance/utils/csvParser.js");

describe("csvParser", () => {
  let parseAttendanceCsv;

  beforeAll(() => {
    parseAttendanceCsv = window.attendanceCsvParser.parseAttendanceCsv;
  });

  test("should parse a valid CSV with consistent dates", () => {
    const csv = `Date,First Name,Last Name
2025-11-23,John,Doe
2025-11-23,Jane,Smith`;

    const result = parseAttendanceCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.targetDate).toBe("2025-11-23");
    expect(result.names).toHaveLength(2);
    expect(result.namesByDate).toBeDefined();
    expect(result.namesByDate["2025-11-23"]).toHaveLength(2);
  });

  test("should accept mixed dates and group by date", () => {
    const csv = `Date,First Name,Last Name
2025-11-16,Outlier,Person
2025-11-23,John,Doe
2025-11-23,Jane,Smith
2025-11-23,Bob,Jones`;

    const result = parseAttendanceCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.names).toHaveLength(4);
    expect(result.namesByDate["2025-11-23"]).toHaveLength(3);
    expect(result.namesByDate["2025-11-16"]).toHaveLength(1);
    // targetDate should be the most common
    expect(result.targetDate).toBe("2025-11-23");
  });

  test("should handle multiple dates correctly", () => {
    const csv = `Date,First Name,Last Name
2025-11-23,A,A
2025-11-23,B,B
2025-11-23,C,C
2025-11-16,D,D
2025-11-16,E,E`;

    const result = parseAttendanceCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.names).toHaveLength(5);
    expect(Object.keys(result.namesByDate)).toHaveLength(2);
    expect(result.namesByDate["2025-11-23"]).toHaveLength(3);
    expect(result.namesByDate["2025-11-16"]).toHaveLength(2);
  });

  test("should deduplicate per date but allow same name on different dates", () => {
    const csv = `Date,First Name,Last Name
2025-11-23,John,Doe
2025-11-23,John,Doe
2025-11-16,John,Doe`;

    const result = parseAttendanceCsv(csv);
    expect(result.errors).toHaveLength(0);
    // John Doe appears on two dates — once per date
    expect(result.namesByDate["2025-11-23"]).toHaveLength(1);
    expect(result.namesByDate["2025-11-16"]).toHaveLength(1);
    // Total flat names includes both (different dates)
    expect(result.names).toHaveLength(2);
    expect(result.duplicateCount).toBe(1);
  });

  test("should fail if date is not a Sunday", () => {
    // Mock dataUtils.parseLCRDate to return a non-Sunday for specific input
    global.dataUtils.parseLCRDate.mockImplementation((dateStr) => {
      if (dateStr === "2025-11-24") { // Monday
        return new Date("2025-11-24T12:00:00");
      }
      return new Date(dateStr);
    });

    const csv = `Date,First Name,Last Name
2025-11-24,John,Doe`;

    const result = parseAttendanceCsv(csv);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("not a Sunday");
  });

  test("should handle empty CSV", () => {
    const result = parseAttendanceCsv("");
    expect(result.errors).toContain("CSV is empty or has no data rows.");
  });

  test("should handle missing headers", () => {
    const csv = `Wrong,Headers,Here
Data,Data,Data`;
    const result = parseAttendanceCsv(csv);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("CSV missing");
  });
});

describe("parsePastedAttendance", () => {
  let parsePastedAttendance;

  beforeAll(() => {
    // Reset the mock to default behavior
    global.dataUtils.parseLCRDate = jest.fn((dateStr) => {
      if (!dateStr) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return new Date(dateStr + "T12:00:00");
      }
      // Handle M/D/YYYY format
      const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]), 12, 0, 0);
      }
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    });
    parsePastedAttendance = window.attendanceCsvParser.parsePastedAttendance;
  });

  test("should parse valid tab-separated paste with timestamps", () => {
    const text = "4/26/2026 14:01:02\tJane\tDoe\n4/26/2026 23:18:28\tJohn\tSmith";
    const result = parsePastedAttendance(text);
    expect(result.errors).toHaveLength(0);
    expect(result.names).toHaveLength(2);
    expect(result.targetDate).toBe("2026-04-26");
    // Should be sorted by last name
    expect(result.names[0].lastName).toBe("Doe");
    expect(result.names[1].lastName).toBe("Smith");
  });

  test("should parse valid comma-separated paste with timestamps", () => {
    const text = "4/26/2026 14:01:02,Jane,Doe\n4/26/2026 23:18:28,John,Smith";
    const result = parsePastedAttendance(text);
    expect(result.errors).toHaveLength(0);
    expect(result.names).toHaveLength(2);
    expect(result.targetDate).toBe("2026-04-26");
  });

  test("should strip time component from timestamp", () => {
    const text = "4/26/2026 14:01:02\tJane\tDoe";
    const result = parsePastedAttendance(text);
    expect(result.errors).toHaveLength(0);
    expect(result.targetDate).toBe("2026-04-26");
  });

  test("should handle timestamps with AM/PM", () => {
    const text = "4/26/2026 2:01:02 PM\tJane\tDoe";
    const result = parsePastedAttendance(text);
    expect(result.errors).toHaveLength(0);
    expect(result.targetDate).toBe("2026-04-26");
  });

  test("should validate Sunday requirement", () => {
    // 4/27/2026 is a Monday
    const text = "4/27/2026 14:01:02\tJane\tDoe";
    const result = parsePastedAttendance(text);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("not a Sunday");
  });

  test("should handle rows with fewer than 3 columns", () => {
    const text = "4/26/2026\tJane";
    const result = parsePastedAttendance(text);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Expected 3 columns");
  });

  test("should handle empty paste", () => {
    const result = parsePastedAttendance("");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("No data found");
  });

  test("should handle paste with trailing newlines", () => {
    const text = "4/26/2026 14:01:02\tJane\tDoe\n\n\n";
    const result = parsePastedAttendance(text);
    expect(result.errors).toHaveLength(0);
    expect(result.names).toHaveLength(1);
  });

  test("should deduplicate names", () => {
    const text = "4/26/2026 14:01:02\tJane\tDoe\n4/26/2026 23:18:28\tJane\tDoe";
    const result = parsePastedAttendance(text);
    expect(result.errors).toHaveLength(0);
    expect(result.names).toHaveLength(1);
    expect(result.duplicateCount).toBe(1);
  });

  test("should return rawRows for edit view", () => {
    const text = "4/26/2026 14:01:02\tJane\tDoe\n4/26/2026 23:18:28\tJohn\tSmith";
    const result = parsePastedAttendance(text);
    expect(result.rawRows).toHaveLength(2);
    expect(result.rawRows[0].firstName).toBe("Jane");
    expect(result.rawRows[0].lastName).toBe("Doe");
    expect(result.rawRows[0].rawTimestamp).toBe("4/26/2026 14:01:02");
  });

  test("should handle comma-separated with quoted values", () => {
    const text = '"4/26/2026 14:01:02","Jane","Doe"\n"4/26/2026 23:18:28","John","Smith"';
    const result = parsePastedAttendance(text);
    expect(result.errors).toHaveLength(0);
    expect(result.names).toHaveLength(2);
  });

  test("should group multiple dates into namesByDate", () => {
    const text = "4/12/2026 14:01:02\tJane\tDoe\n4/26/2026 23:18:28\tJohn\tSmith";
    const result = parsePastedAttendance(text);
    expect(result.errors).toHaveLength(0);
    expect(result.names).toHaveLength(2);
    expect(Object.keys(result.namesByDate)).toHaveLength(2);
    expect(result.namesByDate["2026-04-12"]).toHaveLength(1);
    expect(result.namesByDate["2026-04-26"]).toHaveLength(1);
  });

  test("should deduplicate per date but allow same name on different dates", () => {
    const text = "4/26/2026 14:01:02\tJane\tDoe\n4/26/2026 15:00:00\tJane\tDoe\n4/12/2026 14:01:02\tJane\tDoe";
    const result = parsePastedAttendance(text);
    expect(result.errors).toHaveLength(0);
    expect(result.namesByDate["2026-04-26"]).toHaveLength(1);
    expect(result.namesByDate["2026-04-12"]).toHaveLength(1);
    expect(result.names).toHaveLength(2);
    expect(result.duplicateCount).toBe(1);
  });
});
