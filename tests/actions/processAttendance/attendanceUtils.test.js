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
require("../../../js/actions/processAttendance/attendanceUtils.js");

describe("attendanceUtils", () => {
  let parseAttendanceCsv;

  beforeAll(() => {
    parseAttendanceCsv = window.attendanceUtils.parseAttendanceCsv;
  });

  test("should parse a valid CSV with consistent dates", () => {
    const csv = `Date,First Name,Last Name
2025-11-23,John,Doe
2025-11-23,Jane,Smith`;

    const result = parseAttendanceCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.targetDate).toBe("2025-11-23");
    expect(result.names).toHaveLength(2);
  });

  test("should identify the correct consensus date when first row is an outlier", () => {
    // Row 1 has 2025-11-16 (wrong), others have 2025-11-23 (correct)
    const csv = `Date,First Name,Last Name
2025-11-16,Outlier,Person
2025-11-23,John,Doe
2025-11-23,Jane,Smith
2025-11-23,Bob,Jones`;

    const result = parseAttendanceCsv(csv);
    
    // When errors exist, targetDate is null
    expect(result.targetDate).toBeNull();
    
    // Should have 1 error for the outlier row
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Row 2"); // 1-based index, header is row 1, so data starts at row 2
    expect(result.errors[0]).toContain("differs from the most common date (2025-11-23)");
  });

  test("should identify the correct consensus date when a middle row is an outlier", () => {
    const csv = `Date,First Name,Last Name
2025-11-23,John,Doe
2025-11-16,Outlier,Person
2025-11-23,Jane,Smith`;

    const result = parseAttendanceCsv(csv);
    expect(result.targetDate).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Row 3");
    expect(result.errors[0]).toContain("differs from the most common date (2025-11-23)");
  });

  test("should handle mixed dates by picking the most frequent", () => {
    const csv = `Date,First Name,Last Name
2025-11-23,A,A
2025-11-23,B,B
2025-11-23,C,C
2025-11-16,D,D
2025-11-16,E,E`;

    const result = parseAttendanceCsv(csv);
    expect(result.targetDate).toBeNull();
    expect(result.errors).toHaveLength(2); // Two rows with 2025-11-16
    expect(result.errors[0]).toContain("differs from the most common date (2025-11-23)");
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
