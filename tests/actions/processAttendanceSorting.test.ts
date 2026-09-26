import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runProcessAttendance } from '@/actions/processAttendance';
import * as MarkHelper from '@/actions/processAttendance/lcr/markHelper';
import { sortAttendeesAlphabetically } from '@/actions/processAttendance/utils';
import { Dom, Types } from '@/actions/processAttendance/types';

describe('processAttendance - alphabetical sorting and live scrolling', () => {
  describe('sortAttendeesAlphabetically', () => {
    it('should sort attendees alphabetically by surname / last name', () => {
      const attendees = [
        { firstName: 'John', lastName: 'Smith' },
        { firstName: 'Jane', lastName: 'Doe' },
        { firstName: 'Abigail', lastName: 'Adams' },
      ];

      const sorted = sortAttendeesAlphabetically(attendees);

      expect(sorted.map((a) => a.lastName)).toEqual(['Adams', 'Doe', 'Smith']);
    });

    it('should secondary-sort identical surnames by first name', () => {
      const attendees = [
        { firstName: 'John', lastName: 'Smith' },
        { firstName: 'Alice', lastName: 'Smith' },
        { firstName: 'Bob', lastName: 'Smith' },
      ];

      const sorted = sortAttendeesAlphabetically(attendees);

      expect(sorted.map((a) => `${a.firstName} ${a.lastName}`)).toEqual([
        'Alice Smith',
        'Bob Smith',
        'John Smith',
      ]);
    });

    it('should handle case differences and extra whitespace during sort', () => {
      const attendees = [
        { firstName: '  John ', lastName: ' smith' },
        { firstName: 'Jane', lastName: 'DOE' },
        { firstName: 'Aaron', lastName: 'adams  ' },
      ];

      const sorted = sortAttendeesAlphabetically(attendees);

      expect(sorted.map((a) => a.lastName.trim().toLowerCase())).toEqual(['adams', 'doe', 'smith']);
    });
  });

  describe('markMemberPresent scrolling behavior', () => {
    it('should smoothly scroll to member row and center it before marking', async () => {
      const tr = document.createElement('tr');
      const btn = document.createElement('button');
      btn.className = 'attendanceButton';
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', () => {
        btn.setAttribute('aria-pressed', 'true');
      });
      tr.appendChild(btn);

      const scrollSpy = vi.fn();
      tr.scrollIntoView = scrollSpy;

      const member: Types.WardMember = {
        fullName: 'Smith, John',
        firstName: 'John',
        lastName: 'Smith',
        isPresent: false,
        pageNum: 1,
        row: tr,
      };

      const outcome = await MarkHelper.markMemberPresent(member);

      expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
      expect(outcome).toBe('marked');
      expect(member.isPresent).toBe(true);
    });

    it('should allow suppressing scroll behavior when shouldScroll is false', async () => {
      const tr = document.createElement('tr');
      const btn = document.createElement('button');
      btn.className = 'attendanceButton';
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', () => {
        btn.setAttribute('aria-pressed', 'true');
      });
      tr.appendChild(btn);

      const scrollSpy = vi.fn();
      tr.scrollIntoView = scrollSpy;

      const member: Types.WardMember = {
        fullName: 'Smith, John',
        firstName: 'John',
        lastName: 'Smith',
        isPresent: false,
        pageNum: 1,
        row: tr,
      };

      const outcome = await MarkHelper.markMemberPresent(member, false);

      expect(scrollSpy).not.toHaveBeenCalled();
      expect(outcome).toBe('marked');
    });
  });

  describe('runProcessAttendance alphabetical scroll sequence', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      document.body.innerHTML = `
        <div class="eden-tabs">
          <button id="tab-MEMBERS" role="tab" aria-selected="true">Members</button>
        </div>

        <select class="eden-form-part-input__control">
          <option value="2026-09" selected>September 2026</option>
        </select>

        <select class="eden-form-part-input__control" id="class-dropdown">
          <option value="ALL">All Classes and Quorums</option>
          <option value="adult-ss">Adult Sunday School</option>
        </select>

        <div class="eden-button-bar">
          <button class="eden-button-bar__button" aria-selected="true">13 Sep</button>
        </div>

        <table id="attendance-table">
          <tbody>
            <tr role="row" id="row-adams">
              <td><button class="member-card__styled-ghost">Adams, Abigail</button></td>
              <td>
                <button class="attendanceButton" id="btn-adams" aria-pressed="false">
                  <svg><path d="M12 3.5a8.5" /></svg>
                </button>
              </td>
            </tr>
            <tr role="row" id="row-doe">
              <td><button class="member-card__styled-ghost">Doe, Jane</button></td>
              <td>
                <button class="attendanceButton" id="btn-doe" aria-pressed="false">
                  <svg><path d="M12 3.5a8.5" /></svg>
                </button>
              </td>
            </tr>
            <tr role="row" id="row-smith">
              <td><button class="member-card__styled-ghost">Smith, John</button></td>
              <td>
                <button class="attendanceButton" id="btn-smith" aria-pressed="false">
                  <svg><path d="M12 3.5a8.5" /></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <button class="eden-button--primary">Save</button>
      `;

      // Wire buttons to toggle active on click
      ['btn-adams', 'btn-doe', 'btn-smith'].forEach((id) => {
        const btn = document.getElementById(id) as HTMLButtonElement;
        btn?.addEventListener('click', () => {
          btn.setAttribute('aria-pressed', 'true');
          btn.classList.add('active');
          btn.innerHTML = '<svg><path d="M12 22c5.523" /></svg>';
        });
      });
    });

    it('processes and scrolls rows in alphabetical order by last name even if pasted in reverse order', async () => {
      const scrollOrder: string[] = [];

      const rowAdams = document.getElementById('row-adams') as HTMLTableRowElement;
      const rowDoe = document.getElementById('row-doe') as HTMLTableRowElement;
      const rowSmith = document.getElementById('row-smith') as HTMLTableRowElement;

      rowAdams.scrollIntoView = vi.fn(() => scrollOrder.push('Adams, Abigail'));
      rowDoe.scrollIntoView = vi.fn(() => scrollOrder.push('Doe, Jane'));
      rowSmith.scrollIntoView = vi.fn(() => scrollOrder.push('Smith, John'));

      const actionPromise = runProcessAttendance();

      const overlay = document.querySelector(`#${Dom.UI_OVERLAY_ID}`);
      expect(overlay).not.toBeNull();

      // Paste records in REVERSE alphabetical order
      const pasteCatcher = overlay?.querySelector(
        '#lcr-tools-paste-catcher'
      ) as HTMLTextAreaElement;
      const pasteData = [
        'Timestamp\tFirst Name\tLast Name',
        '2026-09-13 09:30:00\tJohn\tSmith',
        '2026-09-13 09:31:00\tJane\tDoe',
        '2026-09-13 09:32:00\tAbigail\tAdams',
      ].join('\n');

      const pasteEvent = new Event('paste', { bubbles: true }) as ClipboardEvent;
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: { getData: (type: string) => (type === 'text' ? pasteData : '') },
      });
      pasteCatcher.dispatchEvent(pasteEvent);

      // Start processing
      const processBtn = overlay?.querySelector(`#${Dom.PROCESS_BTN_ID}`) as HTMLButtonElement;
      processBtn.click();

      await new Promise((r) => setTimeout(r, 80));
      (document.querySelector(`#${Dom.REVIEW_CONTINUE_ID}`) as HTMLButtonElement)?.click();
      await new Promise((r) => setTimeout(r, 80));
      (document.querySelector(`#${Dom.COMPLETION_DONE_ID}`) as HTMLButtonElement)?.click();

      const result = await actionPromise;

      expect(result.success).toBe(true);
      expect(result.data?.marked).toBe(3);

      // Scroll order MUST be alphabetical by last name: Adams -> Doe -> Smith
      expect(scrollOrder).toEqual(['Adams, Abigail', 'Doe, Jane', 'Smith, John']);
    });

    it('aborts live marking immediately when ESC key is pressed during execution', async () => {
      const rowAdams = document.getElementById('row-adams') as HTMLTableRowElement;
      const rowSmith = document.getElementById('row-smith') as HTMLTableRowElement;

      rowAdams.scrollIntoView = vi.fn();
      rowSmith.scrollIntoView = vi.fn();

      // Hold the first mark open so Escape can fire mid-run (no arbitrary race on finished work).
      let releaseMark: (() => void) | undefined;
      const markGate = new Promise<void>((resolve) => {
        releaseMark = resolve;
      });
      const markSpy = vi.spyOn(MarkHelper, 'markMemberPresent').mockImplementation(async () => {
        await markGate;
        return 'marked';
      });

      const actionPromise = runProcessAttendance();

      const overlay = document.querySelector(`#${Dom.UI_OVERLAY_ID}`);
      expect(overlay).not.toBeNull();

      const pasteCatcher = overlay?.querySelector(
        '#lcr-tools-paste-catcher'
      ) as HTMLTextAreaElement;
      const pasteData = [
        'Timestamp\tFirst Name\tLast Name',
        '2026-09-13 09:30:00\tAbigail\tAdams',
        '2026-09-13 09:31:00\tJohn\tSmith',
      ].join('\n');

      const pasteEvent = new Event('paste', { bubbles: true }) as ClipboardEvent;
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: { getData: (type: string) => (type === 'text' ? pasteData : '') },
      });
      pasteCatcher.dispatchEvent(pasteEvent);

      const processBtn = overlay?.querySelector(`#${Dom.PROCESS_BTN_ID}`) as HTMLButtonElement;
      processBtn.click();

      await vi.waitFor(() => expect(markSpy).toHaveBeenCalled());
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      releaseMark?.();

      await vi.waitFor(() =>
        expect(document.getElementById(Dom.COMPLETION_OVERLAY_ID)).not.toBeNull()
      );
      const completion = document.getElementById(Dom.COMPLETION_OVERLAY_ID);
      expect(completion?.textContent).toContain('Attendance Processing Stopped');
      expect(completion?.textContent).toContain('View Logs');
      (completion?.querySelector(`#${Dom.COMPLETION_DONE_ID}`) as HTMLButtonElement)?.click();

      const result = await actionPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Processing cancelled by user');
      expect(document.getElementById(Dom.REVIEW_OVERLAY_ID)).toBeNull();
      expect(document.getElementById(Dom.COMPLETION_OVERLAY_ID)).toBeNull();

      markSpy.mockRestore();
    });
  });
});
