import { describe, it, expect, beforeEach, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { findExactMemberMatches, suggestMemberMatch } from '@/actions/processAttendance/utils';
import { processMembersAgainstRoll } from '@/actions/processAttendance/members/processMembersHelper';
import { displayUnmatchedReviewModal } from '@/actions/processAttendance/results/reviewHelper';
import { Dom, Types } from '@/actions/processAttendance/types';

const ROLL = ['Smith, Joan', 'Smith, John', 'Lee, Joann', 'Smith, Leeann'];

/** Builds a ward member whose row has a clickable attendance button. */
function buildMember(fullName: string): { member: Types.WardMember; button: HTMLButtonElement } {
  const [lastName, firstName] = fullName.split(', ');
  const row = document.createElement('tr');
  const button = document.createElement('button');
  button.className = 'attendanceButton';
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => button.setAttribute('aria-pressed', 'true'));
  row.appendChild(button);
  const member: Types.WardMember = {
    fullName,
    firstName,
    lastName,
    isPresent: false,
    pageNum: 1,
    row,
  };
  return { member, button };
}

describe('processAttendance - exact-only auto-matching', () => {
  describe('findExactMemberMatches and suggestMemberMatch', () => {
    it('does not auto-match or suggest unrelated near misses', () => {
      expect(findExactMemberMatches('Ann Lee', ROLL)).toEqual([]);
      expect(suggestMemberMatch('Ann Lee', ROLL)).toBeNull();
    });

    it('returns no suggestion when two candidates tie', () => {
      expect(findExactMemberMatches('Jon Smith', ROLL)).toEqual([]);
      expect(suggestMemberMatch('Jon Smith', ROLL)).toBeNull();
      expect(suggestMemberMatch('Jo Smith', ROLL)).toBeNull();
    });

    it('suggests the unique best prefix match', () => {
      expect(findExactMemberMatches('Johnny Smith', ROLL)).toEqual([]);
      expect(suggestMemberMatch('Johnny Smith', ROLL)).toBe('Smith, John');
    });

    it('matches exactly regardless of case, spacing, punctuation, or name order', () => {
      expect(findExactMemberMatches('john smith', ROLL)).toEqual(['Smith, John']);
      expect(findExactMemberMatches('Smith, John', ROLL)).toEqual(['Smith, John']);
      expect(findExactMemberMatches('  JOHN   Smith. ', ROLL)).toEqual(['Smith, John']);
    });

    it('returns every exact match when names are duplicated', () => {
      expect(findExactMemberMatches('John Smith', ['Smith, John', 'Smith, John'])).toHaveLength(2);
    });

    it('ignores middle names and initials on either side', () => {
      const roll = ['Smith, John Michael', 'Brown, Mary Ann', 'Lee, Ann'];
      expect(findExactMemberMatches('John Smith', roll)).toEqual(['Smith, John Michael']);
      expect(findExactMemberMatches('John M. Smith', roll)).toEqual(['Smith, John Michael']);
      expect(findExactMemberMatches('Smith, John', roll)).toEqual(['Smith, John Michael']);
      expect(findExactMemberMatches('Mary Brown', roll)).toEqual(['Brown, Mary Ann']);
      expect(findExactMemberMatches('Ann Lee', roll)).toEqual(['Lee, Ann']);
    });

    it('treats members who differ only by middle name as duplicates (never auto-marked)', () => {
      const roll = ['Smith, John Paul', 'Smith, John David'];
      expect(findExactMemberMatches('John Smith', roll)).toHaveLength(2);
    });

    it('suggests a one-typo surname with a matching first name', () => {
      expect(suggestMemberMatch('Jane Johnsen', ['Johnson, Jane'])).toBe('Johnson, Jane');
      expect(suggestMemberMatch('Jane Lee', ['Lea, Jane'])).toBeNull();
    });
  });

  describe('processMembersAgainstRoll', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('does not mark ward members that share a name and records the attendee as unmatched', async () => {
      const first = buildMember('Smith, John');
      const second = buildMember('Smith, John');
      const logs: Types.AttendanceLogEntry[] = [];

      const result = await processMembersAgainstRoll(
        [{ firstName: 'John', lastName: 'Smith' }],
        [first.member, second.member],
        '2026-09-13',
        logs
      );

      expect(first.button.getAttribute('aria-pressed')).toBe('false');
      expect(second.button.getAttribute('aria-pressed')).toBe('false');
      expect(result.newlyMarked).toBe(0);
      expect(result.unmatchedList).toHaveLength(1);
      expect(result.unmatchedList[0].suggestedMemberName).toBeUndefined();
      expect(logs[0].action).toBe('UNMATCHED');
      expect(logs[0].lcrUpdateStatus).toContain('Multiple ward members named Smith, John');
    });

    it('marks an exact match and queues a fuzzy match as a suggestion without clicking', async () => {
      const john = buildMember('Smith, John');
      const jane = buildMember('Doe, Jane');
      const logs: Types.AttendanceLogEntry[] = [];

      const result = await processMembersAgainstRoll(
        [
          { firstName: 'Jane', lastName: 'Doe' },
          { firstName: 'Johnny', lastName: 'Smith' },
        ],
        [john.member, jane.member],
        '2026-09-13',
        logs
      );

      expect(jane.button.getAttribute('aria-pressed')).toBe('true');
      expect(john.button.getAttribute('aria-pressed')).toBe('false');
      expect(result.newlyMarked).toBe(1);
      expect(result.unmatchedList).toHaveLength(1);
      expect(result.unmatchedList[0].suggestedMemberName).toBe('Smith, John');
      expect(logs[1].lcrUpdateStatus).toContain('possible match: Smith, John');
    });
  });

  describe('review modal fuzzy suggestions', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
      vi.restoreAllMocks();
      vi.spyOn(browser.storage.local, 'get').mockImplementation(async (key) => {
        const k = typeof key === 'string' ? key : String(key);
        return { [k]: undefined };
      });
    });

    it('renders a possible match that is queued only after the user confirms it', async () => {
      const ward = [buildMember('Smith, John').member, buildMember('Doe, Jane').member];
      const unmatchedList: Types.UnmatchedRecord[] = [
        {
          firstName: 'Johnny',
          lastName: 'Smith',
          fullName: 'Johnny Smith',
          date: '2026-09-13',
          suggestedMemberName: 'Smith, John',
        },
      ];
      const logs: Types.AttendanceLogEntry[] = [];

      void displayUnmatchedReviewModal(
        { total: 1, marked: 0, already: 0, unmatched: 1 },
        'Adult Sunday School',
        '2026-09-13',
        ['Men', 'Women'],
        unmatchedList,
        ward,
        logs
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      const overlay = document.getElementById(Dom.REVIEW_OVERLAY_ID) as HTMLElement;
      const row = overlay.querySelector('#lcrx-unmatched-row-0') as HTMLElement;
      expect(row.textContent).toContain('Possible match: Smith, John');
      expect(row.querySelector(`.${Dom.QUEUED_UNDO_BTN}`)).toBeNull();
      expect(logs).toHaveLength(0);
      const autoBox = overlay.querySelector(`#${Dom.AUTO_BOX_ID_PREFIX}0`) as HTMLElement;
      expect(autoBox.style.display).toBe('block');

      (row.querySelector(`.${Dom.FUZZY_BTN}`) as HTMLButtonElement).click();

      expect(row.textContent).toContain('Matched to Smith, John');
      expect(row.querySelector(`.${Dom.QUEUED_UNDO_BTN}`)).not.toBeNull();
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('MATCH');
    });

    it('does not render a suggestion when the suggested name is shared by several members', async () => {
      const ward = [buildMember('Smith, John').member, buildMember('Smith, John').member];
      void displayUnmatchedReviewModal(
        { total: 1, marked: 0, already: 0, unmatched: 1 },
        'Adult Sunday School',
        '2026-09-13',
        ['Men', 'Women'],
        [
          {
            firstName: 'Johnny',
            lastName: 'Smith',
            fullName: 'Johnny Smith',
            date: '2026-09-13',
            suggestedMemberName: 'Smith, John',
          },
        ],
        ward,
        []
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(document.querySelector(`.${Dom.FUZZY_BTN}`)).toBeNull();
    });

    it('selects the correct member from the search dropdown when names are duplicated', async () => {
      const ward = [buildMember('Smith, John').member, buildMember('Smith, John').member];
      void displayUnmatchedReviewModal(
        { total: 1, marked: 0, already: 0, unmatched: 1 },
        'Adult Sunday School',
        '2026-09-13',
        ['Men', 'Women'],
        [{ firstName: 'Jo', lastName: 'Smith', fullName: 'Jo Smith', date: '2026-09-13' }],
        ward,
        []
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      const input = document.querySelector(`.${Dom.SEARCH_INPUT}`) as HTMLInputElement;
      input.value = 'smith';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const items = document.querySelectorAll<HTMLElement>(`.${Dom.DROPDOWN_ITEM}`);
      expect(items).toHaveLength(2);
      expect(items[0].getAttribute(Dom.MEMBER_INDEX_ATTR)).toBe('0');
      expect(items[1].getAttribute(Dom.MEMBER_INDEX_ATTR)).toBe('1');
    });
  });
});
