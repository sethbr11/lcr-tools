import { describe, it, expect, beforeEach } from 'vitest';
import {
  replaceTemplate,
  sleep,
  formatDate,
  parseDate,
  parseMonthDay,
  parseFullName,
  fuzzyNameMatch,
  levenshteinDistance,
  escapeHtml,
  formatCSVCell,
  toCSV,
  getNestedValue,
  isAborted,
  setAborted,
  resetAborted,
} from '@/utils/coreUtils';

describe('coreUtils', () => {
  beforeEach(() => {
    resetAborted();
  });

  describe('replaceTemplate', () => {
    it('should replace template variables correctly', () => {
      const template = 'Hello {{name}}, you have {{count}} messages.';
      const res = replaceTemplate(template, { name: 'John', count: '5' });
      expect(res).toBe('Hello John, you have 5 messages.');
    });

    it('should handle multiple occurrences of the same variable', () => {
      const template = '{{name}} is {{name}} and {{name}} is great.';
      const res = replaceTemplate(template, { name: 'LCR Tools' });
      expect(res).toBe('LCR Tools is LCR Tools and LCR Tools is great.');
    });

    it('should leave unreplaced variables as-is', () => {
      const template = 'Hello {{name}}, {{unknown}} variable.';
      const res = replaceTemplate(template, { name: 'John' });
      expect(res).toBe('Hello John, {{unknown}} variable.');
    });
  });

  describe('formatDate and parseDate', () => {
    it('should parse US standard date strings', () => {
      const date = parseDate('01/15/2024');
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(0);
      expect(date?.getDate()).toBe(15);
    });

    it('should format date objects as MM/DD/YYYY and YYYY-MM-DD', () => {
      const d = new Date(2024, 0, 15);
      expect(formatDate(d, 'MM/DD/YYYY')).toBe('01/15/2024');
      expect(formatDate(d, 'YYYY-MM-DD')).toBe('2024-01-15');
    });

    it('should return null for invalid date strings', () => {
      expect(parseDate('invalid-date')).toBeNull();
      expect(parseDate('')).toBeNull();
    });
  });

  describe('parseMonthDay', () => {
    it('should parse day and short month strings', () => {
      const res = parseMonthDay('1 Sep');
      expect(res).toEqual({ month: 9, day: 1 });

      const res2 = parseMonthDay('24 Dec');
      expect(res2).toEqual({ month: 12, day: 24 });
    });

    it('should parse full month names and reversed format', () => {
      const res = parseMonthDay('September 6');
      expect(res).toEqual({ month: 9, day: 6 });

      const res2 = parseMonthDay('15 January');
      expect(res2).toEqual({ month: 1, day: 15 });
    });

    it('should return null for invalid day-month strings', () => {
      expect(parseMonthDay('Not A Date')).toBeNull();
      expect(parseMonthDay('32 Jan')).toBeNull();
      expect(parseMonthDay('')).toBeNull();
    });
  });

  describe('parseFullName', () => {
    it('should parse comma-separated Last, First names', () => {
      const parsed = parseFullName('Smith, John');
      expect(parsed.lastName).toBe('Smith');
      expect(parsed.firstName).toBe('John');
    });

    it('should parse space-separated First Last names', () => {
      const parsed = parseFullName('John Smith');
      expect(parsed.firstName).toBe('John');
      expect(parsed.lastName).toBe('Smith');
    });

    it('should handle single names', () => {
      const parsed = parseFullName('Cher');
      expect(parsed.firstName).toBe('Cher');
      expect(parsed.lastName).toBe('');
    });
  });

  describe('fuzzyNameMatch & levenshteinDistance', () => {
    it('should match exact and near-match names', () => {
      expect(fuzzyNameMatch('John Smith', 'john smith')).toBe(true);
      expect(fuzzyNameMatch('Johnathan Smith', 'Johnathan Smith')).toBe(true);
      expect(fuzzyNameMatch('John Smith', 'Mary Jones')).toBe(false);
    });

    it('should compute exact Levenshtein distance', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('', 'test')).toBe(4);
      expect(levenshteinDistance('test', 'test')).toBe(0);
    });
  });

  describe('CSV helpers', () => {
    it('should escape CSV cells containing commas, quotes, or newlines', () => {
      expect(formatCSVCell('Simple')).toBe('Simple');
      expect(formatCSVCell('With,Comma')).toBe('"With,Comma"');
      expect(formatCSVCell('With "Quotes"')).toBe('"With ""Quotes"""');
      expect(formatCSVCell('Line1\nLine2')).toBe('"Line1\nLine2"');
    });

    it('should sanitize formula injection characters to prevent DDE attacks', () => {
      expect(formatCSVCell('=1+1')).toBe('"\'=1+1"');
      expect(formatCSVCell('@SUM(A1:A10)')).toBe('"\'@SUM(A1:A10)"');
      expect(formatCSVCell('+cmd|')).toBe('"\'+cmd|"');
      expect(formatCSVCell('-5')).toBe('-5'); // Numbers are preserved
    });

    it('should format multiple rows to CSV string', () => {
      const headers = ['Name', 'Age'];
      const rows = [
        ['John, Jr.', 30],
        ['Jane "Doe"', 28],
      ];
      const csv = toCSV(headers, rows);
      expect(csv).toContain('"John, Jr.",30');
      expect(csv).toContain('"Jane ""Doe""",28');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters to prevent XSS injections', () => {
      expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(escapeHtml('John & Jane')).toBe('John &amp; Jane');
      expect(escapeHtml('"quoted" and \'single\'')).toBe('&quot;quoted&quot; and &#39;single&#39;');
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml(123)).toBe('123');
    });
  });

  describe('abort state', () => {
    it('should manage aborted flag accurately', () => {
      expect(isAborted()).toBe(false);
      setAborted(true);
      expect(isAborted()).toBe(true);
      resetAborted();
      expect(isAborted()).toBe(false);
    });
  });

  describe('getNestedValue', () => {
    it('should resolve nested paths', () => {
      const obj = { user: { profile: { email: 'test@example.com' } } };
      expect(getNestedValue(obj, 'user.profile.email')).toBe('test@example.com');
      expect(getNestedValue(obj, 'user.missing.property')).toBeUndefined();
    });
  });

  describe('sleep', () => {
    it('should resolve after timeout', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });
  });
});
