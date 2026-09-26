import { describe, it, expect, beforeEach } from 'vitest';
import { parseAttendanceText } from '@/actions/processAttendance/setup/parseHelper';
import { matchMemberName } from '@/actions/processAttendance/utils';
import { inferColumnFilterType } from '@/actions/tableFilters/utils';
import { shuffleArray } from '@/actions/memberFlashcards/utils';

describe('Action Helpers & Logic', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('processAttendance parser & matcher', () => {
    it('should parse tab and comma separated attendees', () => {
      const raw = `John\tSmith\nJane\tDoe\nBob Jones`;
      const attendees = parseAttendanceText(raw);
      expect(attendees.length).toBe(3);
      expect(attendees[0].firstName).toBe('John');
      expect(attendees[0].lastName).toBe('Smith');
      expect(attendees[1].fullName).toBe('Jane Doe');
    });

    it('should match member name exactly or with fuzzy fallback', () => {
      const ward = ['John Smith', 'Jane Doe', 'Michael Johnson'];
      expect(matchMemberName('John Smith', ward)).toBe('John Smith');
      expect(matchMemberName('john smith', ward)).toBe('John Smith');
      expect(matchMemberName('Unknown Person', ward)).toBeNull();
    });
  });

  describe('tableFilters inference', () => {
    it('should infer filter types from column header names', () => {
      expect(inferColumnFilterType('Gender')).toBe('gender');
      expect(inferColumnFilterType('Member Status')).toBe('status');
      expect(inferColumnFilterType('Active Recommend')).toBe('boolean');
      expect(inferColumnFilterType('Calling Name')).toBe('select');
    });
  });

  describe('memberFlashcards shuffle', () => {
    it('should shuffle array preserving all elements', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = shuffleArray(original);
      expect(shuffled.length).toBe(original.length);
      expect(shuffled.sort()).toEqual(original.sort());
    });
  });
});
