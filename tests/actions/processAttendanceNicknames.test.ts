import { describe, it, expect, beforeEach, vi } from 'vitest';
import { browser } from 'wxt/browser';
import {
  displayManageNicknamesModal,
  getNicknameMatch,
} from '@/actions/processAttendance/results/nicknameHelper';
import {
  clearAllNicknames,
  getSavedNicknames,
  removeNicknameMapping,
  saveNicknameMapping,
} from '@/utils/security/storageUtils';
import { displayUnmatchedReviewModal } from '@/actions/processAttendance/results/reviewHelper';
import { Dom, Types } from '@/actions/processAttendance/types';

describe('processAttendance - persistent nickname mapping', () => {
  let memoryStorage: Record<string, unknown> = {};

  beforeEach(() => {
    document.body.innerHTML = '';
    memoryStorage = {};
    vi.restoreAllMocks();

    vi.spyOn(browser.storage.local, 'get').mockImplementation(async (key) => {
      const k = typeof key === 'string' ? key : String(key);
      return { [k]: memoryStorage[k] };
    });

    vi.spyOn(browser.storage.local, 'set').mockImplementation(async (items) => {
      Object.assign(memoryStorage, items);
    });

    vi.spyOn(browser.storage.local, 'remove').mockImplementation(async (key) => {
      const k = typeof key === 'string' ? key : String(key);
      delete memoryStorage[k];
    });
  });

  describe('nickname storage and retrieval operations', () => {
    it('should save and retrieve a nickname mapping', async () => {
      await saveNicknameMapping('Jon Smith', 'Smith, Jonathan');

      const nicknames = await getSavedNicknames();
      expect(nicknames['jon smith']).toBeDefined();
      expect(nicknames['jon smith']?.canonicalName).toBe('Smith, Jonathan');
      expect(nicknames['jon smith']?.alias).toBe('Jon Smith');
    });

    it('should resolve nickname match for both direct and reversed name formats', async () => {
      await saveNicknameMapping('Jon Smith', 'Smith, Jonathan');
      const nicknames = await getSavedNicknames();

      // Direct name match
      expect(getNicknameMatch('Jon Smith', nicknames)).toBe('Smith, Jonathan');
      expect(getNicknameMatch('  jon smith  ', nicknames)).toBe('Smith, Jonathan');

      // Reversed name match (e.g. "Smith, Jon")
      expect(getNicknameMatch('Smith, Jon', nicknames)).toBe('Smith, Jonathan');

      // Non-matching name returns null
      expect(getNicknameMatch('Unrelated Person', nicknames)).toBeNull();
    });

    it('should remove a single nickname mapping', async () => {
      await saveNicknameMapping('Jon Smith', 'Smith, Jonathan');
      await saveNicknameMapping('Bob Jones', 'Jones, Robert');

      await removeNicknameMapping('Jon Smith');

      const nicknames = await getSavedNicknames();
      expect(nicknames['jon smith']).toBeUndefined();
      expect(nicknames['bob jones']?.canonicalName).toBe('Jones, Robert');
    });

    it('should clear all saved nicknames', async () => {
      await saveNicknameMapping('Jon Smith', 'Smith, Jonathan');
      await saveNicknameMapping('Bob Jones', 'Jones, Robert');

      await clearAllNicknames();

      const nicknames = await getSavedNicknames();
      expect(Object.keys(nicknames).length).toBe(0);
    });

    it('should avoid saving trivial self-mappings', async () => {
      await saveNicknameMapping('John Smith', 'John Smith');
      const nicknames = await getSavedNicknames();
      expect(Object.keys(nicknames).length).toBe(0);
    });
  });

  describe('results modal nickname suggestions and matching', () => {
    const mockWardMembers: Types.WardMember[] = [
      {
        fullName: 'Smith, Jonathan',
        firstName: 'Jonathan',
        lastName: 'Smith',
        isPresent: false,
        pageNum: 1,
        row: document.createElement('tr'),
      },
      {
        fullName: 'Jones, Robert',
        firstName: 'Robert',
        lastName: 'Jones',
        isPresent: false,
        pageNum: 1,
        row: document.createElement('tr'),
      },
    ];

    it('should display one-click suggested match button when nickname exists in storage', async () => {
      await saveNicknameMapping('Jon Smith', 'Smith, Jonathan');

      const unmatchedList: Types.UnmatchedRecord[] = [
        {
          firstName: 'Jon',
          lastName: 'Smith',
          fullName: 'Jon Smith',
          date: '2026-09-13',
        },
      ];

      const logs: Types.AttendanceLogEntry[] = [];
      const metrics = { total: 1, marked: 0, already: 0, unmatched: 1 };

      void displayUnmatchedReviewModal(
        metrics,
        'Adult Sunday School',
        '2026-09-13',
        ['Men', 'Women'],
        unmatchedList,
        mockWardMembers,
        logs
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      const overlay = document.getElementById(Dom.REVIEW_OVERLAY_ID);
      expect(overlay).not.toBeNull();

      // Suggested button should be rendered
      const suggestBtn = overlay?.querySelector(`.${Dom.NICKNAME_BTN}`) as HTMLButtonElement;
      expect(suggestBtn).not.toBeNull();
      expect(suggestBtn.textContent).toContain('Smith, Jonathan');

      // Click the suggested match button
      suggestBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Row should be queued (not marked on LCR yet)
      const row = overlay?.querySelector('#lcrx-unmatched-row-0');
      expect(row?.textContent).toContain('Matched to Smith, Jonathan (using saved nickname)');
      expect(row?.querySelector(`.${Dom.QUEUED_UNDO_BTN}`)?.textContent).toBe('Undo');

      // Log entry should state saved nickname was queued
      expect(logs).toHaveLength(1);
      expect(logs[0]?.lcrUpdateStatus).toBe('Queued match using saved nickname: Smith, Jonathan');

      const unmatchedStat = overlay?.querySelector(`#${Dom.UNMATCHED_STAT_ID}`);
      expect(unmatchedStat?.textContent).toBe('0');

      (row?.querySelector(`.${Dom.QUEUED_UNDO_BTN}`) as HTMLButtonElement).click();
      expect(overlay?.querySelector(`.${Dom.NICKNAME_BTN}`)).not.toBeNull();
      expect(unmatchedStat?.textContent).toBe('1');
      expect(logs[1]?.action).toBe('UNDO');
      expect(logs[1]?.lcrUpdateStatus).toBe('Undid match queue for Jon Smith');
    });

    it('should toggle to search input when "Search other" is clicked', async () => {
      await saveNicknameMapping('Jon Smith', 'Smith, Jonathan');

      const unmatchedList: Types.UnmatchedRecord[] = [
        {
          firstName: 'Jon',
          lastName: 'Smith',
          fullName: 'Jon Smith',
          date: '2026-09-13',
        },
      ];

      void displayUnmatchedReviewModal(
        { total: 1, marked: 0, already: 0, unmatched: 1 },
        'Adult Sunday School',
        '2026-09-13',
        ['Men', 'Women'],
        unmatchedList,
        mockWardMembers,
        []
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      const overlay = document.getElementById(Dom.REVIEW_OVERLAY_ID);
      const toggleBtn = overlay?.querySelector('.lcrx-search-toggle') as HTMLButtonElement;
      expect(toggleBtn).not.toBeNull();

      // Click "Search other"
      toggleBtn.click();

      const nickBox = overlay?.querySelector('#lcrx-nick-box-0') as HTMLElement;
      const autoBox = overlay?.querySelector('#lcrx-auto-box-0') as HTMLElement;
      expect(nickBox.style.display).toBe('none');
      expect(autoBox.style.display).toBe('block');
    });

    it('should save nickname mapping when user manually matches with remember checkbox enabled', async () => {
      const unmatchedList: Types.UnmatchedRecord[] = [
        {
          firstName: 'Bob',
          lastName: 'Jones',
          fullName: 'Bob Jones',
          date: '2026-09-13',
        },
      ];

      const logs: Types.AttendanceLogEntry[] = [];

      void displayUnmatchedReviewModal(
        { total: 1, marked: 0, already: 0, unmatched: 1 },
        'Adult Sunday School',
        '2026-09-13',
        ['Men', 'Women'],
        unmatchedList,
        mockWardMembers,
        logs
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      const overlay = document.getElementById(Dom.REVIEW_OVERLAY_ID);
      const searchInput = overlay?.querySelector(`.${Dom.SEARCH_INPUT}`) as HTMLInputElement;
      expect(searchInput).not.toBeNull();

      // Trigger autocomplete
      searchInput.value = 'jones';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Select member from dropdown
      const dropdown = overlay?.querySelector(
        `#${Dom.MEMBER_SEARCH_DROPDOWN_ID}`
      ) as HTMLUListElement;
      expect(dropdown).not.toBeNull();
      const firstItem = dropdown.querySelector(`.${Dom.DROPDOWN_ITEM}`) as HTMLElement;
      expect(firstItem).not.toBeNull();
      firstItem.click();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Nickname should be saved to local storage
      const nicknames = await getSavedNicknames();
      expect(nicknames['bob jones']?.canonicalName).toBe('Jones, Robert');

      // Audit log should confirm queued match with saved mapping
      expect(logs).toHaveLength(1);
      expect(logs[0]?.lcrUpdateStatus).toBe(
        'Queued match to Jones, Robert (saved nickname mapping)'
      );
    });
  });

  describe('unmatched visitor queue and undo', () => {
    const mockWardMembers: Types.WardMember[] = [
      {
        fullName: 'Smith, Jonathan',
        firstName: 'Jonathan',
        lastName: 'Smith',
        isPresent: false,
        pageNum: 1,
        row: document.createElement('tr'),
      },
    ];

    it('queues a visitor with the attendee name, logs it, and restores the row on undo', async () => {
      const unmatchedList: Types.UnmatchedRecord[] = [
        {
          firstName: 'Pat',
          lastName: 'Guest',
          fullName: 'Pat Guest',
          date: '2026-09-13',
        },
      ];
      const logs: Types.AttendanceLogEntry[] = [];

      void displayUnmatchedReviewModal(
        { total: 1, marked: 0, already: 0, unmatched: 1 },
        'Adult Sunday School',
        '2026-09-13',
        ['Men'],
        unmatchedList,
        mockWardMembers,
        logs
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      const overlay = document.getElementById(Dom.REVIEW_OVERLAY_ID);
      const visitorBtn = overlay?.querySelector(`.${Dom.GUEST_INPUT}`) as HTMLButtonElement;
      expect(visitorBtn).not.toBeNull();
      visitorBtn.click();

      const row = overlay?.querySelector(`#${Dom.UNMATCHED_ROW_ID_PREFIX}0`);
      expect(row?.textContent).toContain('Pat Guest');
      expect(row?.textContent).toContain('queued as Men visitor');
      expect(logs[0]?.target).toBe('Pat Guest');
      expect(logs[0]?.lcrUpdateStatus).toBe('Queued Pat Guest as Men visitor');

      const unmatchedStat = overlay?.querySelector(`#${Dom.UNMATCHED_STAT_ID}`);
      expect(unmatchedStat?.textContent).toBe('0');

      const undoBtn = overlay?.querySelector(`.${Dom.QUEUED_UNDO_BTN}`) as HTMLButtonElement;
      expect(undoBtn).not.toBeNull();
      undoBtn.click();

      expect(overlay?.querySelector(`.${Dom.GUEST_INPUT}`)).not.toBeNull();
      expect(unmatchedStat?.textContent).toBe('1');
      expect(logs[1]?.action).toBe('UNDO');
      expect(logs[1]?.target).toBe('Pat Guest');
      expect(logs[1]?.lcrUpdateStatus).toBe('Undid visitor queue for Pat Guest');
    });

    it('keeps queued visitors after nickname manager updates', async () => {
      const unmatchedList: Types.UnmatchedRecord[] = [
        {
          firstName: 'Pat',
          lastName: 'Guest',
          fullName: 'Pat Guest',
          date: '2026-09-13',
        },
      ];
      const logs: Types.AttendanceLogEntry[] = [];

      void displayUnmatchedReviewModal(
        { total: 1, marked: 0, already: 0, unmatched: 1 },
        'Adult Sunday School',
        '2026-09-13',
        ['Men'],
        unmatchedList,
        mockWardMembers,
        logs
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      const overlay = document.getElementById(Dom.REVIEW_OVERLAY_ID);
      overlay?.querySelector<HTMLButtonElement>(`.${Dom.GUEST_INPUT}`)?.click();
      expect(overlay?.textContent).toContain('queued as Men visitor');

      overlay?.querySelector<HTMLButtonElement>(`#${Dom.MANAGE_NICKNAMES_BTN_ID}`)?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      document.querySelector<HTMLButtonElement>(`#${Dom.CLEAR_NICKNAMES_BTN_ID}`)?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(document.getElementById(Dom.REVIEW_OVERLAY_ID)?.textContent).toContain(
        'queued as Men visitor'
      );
      expect(document.querySelectorAll(`#${Dom.MEMBER_SEARCH_DROPDOWN_ID}`)).toHaveLength(1);
    });
  });

  describe('nickname management modal', () => {
    it('should display saved nicknames, allow deleting an entry, and clearing all', async () => {
      await saveNicknameMapping('Jon Smith', 'Smith, Jonathan');
      await saveNicknameMapping('Bob Jones', 'Jones, Robert');

      const onUpdated = vi.fn();
      await displayManageNicknamesModal(onUpdated);

      const modal = document.getElementById(Dom.NICKNAMES_MODAL_ID);
      expect(modal).not.toBeNull();

      const items = modal?.querySelectorAll(`.${Dom.NICKNAME_ITEM}`);
      expect(items).toHaveLength(2);

      // Delete one mapping
      const firstDeleteBtn = modal?.querySelector(
        `.${Dom.NICKNAME_DELETE_BTN}`
      ) as HTMLButtonElement;
      expect(firstDeleteBtn).not.toBeNull();
      firstDeleteBtn.click();

      // Wait a tick for async storage update
      await new Promise((r) => setTimeout(r, 50));
      expect(onUpdated).toHaveBeenCalled();

      // Clear all
      const clearBtn = modal?.querySelector(`#${Dom.CLEAR_NICKNAMES_BTN_ID}`) as HTMLButtonElement;
      expect(clearBtn).not.toBeNull();
      clearBtn.click();

      await new Promise((r) => setTimeout(r, 50));
      const nicknames = await getSavedNicknames();
      expect(Object.keys(nicknames)).toHaveLength(0);
    });
  });
});
