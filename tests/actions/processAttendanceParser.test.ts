import { describe, it, expect } from 'vitest';
import {
  isSundayDate,
  normalizeDateString,
  parsePastedAttendance,
} from '@/actions/processAttendance/setup/parseHelper';

describe('attendanceParserHelper', () => {
  describe('normalizeDateString', () => {
    it('should strip time components from timestamps', () => {
      expect(normalizeDateString('2026-09-13 10:15:30 AM')).toBe('2026-09-13');
      expect(normalizeDateString('2026-09-13 14:22:00')).toBe('2026-09-13');
      expect(normalizeDateString('9/13/2026 9:00 AM')).toBe('2026-09-13');
    });

    it('should return null for empty or unparseable input', () => {
      expect(normalizeDateString('')).toBeNull();
      expect(normalizeDateString('Not a date')).toBeNull();
    });
  });

  describe('isSundayDate', () => {
    it('should correctly identify Sundays', () => {
      expect(isSundayDate('2026-09-13')).toBe(true);
      expect(isSundayDate('2026-09-20')).toBe(true);
      expect(isSundayDate('2026-09-14')).toBe(false); // Monday
    });
  });

  describe('parsePastedAttendance', () => {
    it('should parse 3-column spreadsheet rows (Timestamp, First Name, Last Name)', () => {
      const pasted = `
Timestamp\tFirst Name\tLast Name
2026-09-13 09:30:00\tJohn\tSmith
2026-09-13 09:31:00\tJane\tDoe
2026-09-13 09:32:00\tAlice\tJohnson
      `.trim();

      const result = parsePastedAttendance(pasted);

      expect(result.names.length).toBe(3);
      expect(result.targetDate).toBe('2026-09-13');
      expect(result.names[0]).toEqual({ firstName: 'John', lastName: 'Smith' });
      expect(result.names[1]).toEqual({ firstName: 'Jane', lastName: 'Doe' });
      expect(result.names[2]).toEqual({ firstName: 'Alice', lastName: 'Johnson' });
      expect(result.duplicateCount).toBe(0);
    });

    it('should deduplicate identical attendee records and report duplicate count', () => {
      const pasted = `
2026-09-13\tJohn\tSmith
2026-09-13\tJohn\tSmith
2026-09-13\tJane\tDoe
      `.trim();

      const result = parsePastedAttendance(pasted);

      expect(result.names.length).toBe(2);
      expect(result.duplicateCount).toBe(1);
    });

    it('should parse comma-separated 2-column format and assign fallback date', () => {
      const pasted = `
First Name,Last Name
John,Smith
Jane,Doe
      `.trim();

      const result = parsePastedAttendance(pasted, '2026-09-13');

      expect(result.names.length).toBe(2);
      expect(result.targetDate).toBe('2026-09-13');
      expect(result.names[0]).toEqual({ firstName: 'John', lastName: 'Smith' });
      expect(result.names[1]).toEqual({ firstName: 'Jane', lastName: 'Doe' });
    });

    it('should parse single column full names with fuzzy parse', () => {
      const pasted = `
Smith, John
Jane Doe
      `.trim();

      const result = parsePastedAttendance(pasted, '2026-09-13');

      expect(result.names.length).toBe(2);
      expect(result.names[0].firstName).toBe('John');
      expect(result.names[0].lastName).toBe('Smith');
      expect(result.names[1].firstName).toBe('Jane');
      expect(result.names[1].lastName).toBe('Doe');
    });

    it('should return empty result for blank input', () => {
      const result = parsePastedAttendance('');
      expect(result.names.length).toBe(0);
      expect(result.targetDate).toBeNull();
      expect(result.hasMixedDates).toBe(false);
    });

    it('should accept the same calendar date with different timestamps', () => {
      const pasted = `
2026-09-13 09:30:00\tJohn\tSmith
2026-09-13 10:15:00\tJane\tDoe
      `.trim();

      const result = parsePastedAttendance(pasted);

      expect(result.hasMixedDates).toBe(false);
      expect(result.targetDate).toBe('2026-09-13');
      expect(result.names.length).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject roster rows that use more than one date', () => {
      const pasted = `
Timestamp\tFirst Name\tLast Name
2026-09-13 09:30:00\tJohn\tSmith
2026-09-20 09:31:00\tJane\tDoe
      `.trim();

      const result = parsePastedAttendance(pasted);

      expect(result.hasMixedDates).toBe(true);
      expect(result.targetDate).toBeNull();
      expect(result.names.length).toBe(2);
      expect(result.errors.some((err) => err.includes('same date'))).toBe(true);
      expect(result.errors.some((err) => err.includes('2026-09-13'))).toBe(true);
      expect(result.errors.some((err) => err.includes('2026-09-20'))).toBe(true);
    });
  });
});
