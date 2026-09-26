import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runProcessAttendance } from '@/actions/processAttendance';
import { displayCompletionModal } from '@/actions/processAttendance/results/completionHelper';
import { downloadAttendanceReport } from '@/actions/processAttendance/results/logsHelper';
import { processClassVisitorCounts } from '@/actions/processAttendance/lcr/visitorsHelper';
import { Dom, Types } from '@/actions/processAttendance/types';
import * as fileUtils from '@/utils/fileUtils';
import * as utils from '@/actions/processAttendance/utils';

describe('processAttendance - action execution logs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('formatLogTimestamp', () => {
    it('formats hours, minutes, and seconds with zero-padding', () => {
      const fixedDate = new Date(2026, 8, 13, 9, 5, 7); // 09:05:07
      expect(utils.formatLogTimestamp(fixedDate)).toBe('09:05:07');
    });
  });

  describe('runProcessAttendance action logging', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="eden-tabs">
          <button id="tab-MEMBERS" role="tab" aria-selected="true">Members</button>
          <button id="tab-VISITORS" role="tab" aria-selected="false">Visitors</button>
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
            <tr role="row" id="row-doe">
              <td><button class="member-card__styled-ghost">Doe, Jane</button></td>
              <td>
                <button class="attendanceButton active" id="btn-doe" aria-pressed="true">
                  <svg><path d="M12 22c5.523" /></svg>
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

      const btnSmith = document.getElementById('btn-smith') as HTMLButtonElement;
      btnSmith?.addEventListener('click', () => {
        btnSmith.setAttribute('aria-pressed', 'true');
        btnSmith.classList.add('active');
      });
    });

    it('records action logs for navigation, dropdown selection, clicks, and verifications', async () => {
      const actionPromise = runProcessAttendance();

      const overlay = document.querySelector(`#${Dom.UI_OVERLAY_ID}`);
      expect(overlay).not.toBeNull();

      // Paste 1 already-present, 1 unmarked, and 1 unmatched attendee
      const pasteCatcher = overlay?.querySelector(
        '#lcr-tools-paste-catcher'
      ) as HTMLTextAreaElement;
      const pasteData = [
        'Timestamp\tFirst Name\tLast Name',
        '2026-09-13 09:30:00\tJane\tDoe',
        '2026-09-13 09:31:00\tJohn\tSmith',
        '2026-09-13 09:32:00\tUnmatched\tGuest',
      ].join('\n');

      const pasteEvent = new Event('paste', { bubbles: true }) as ClipboardEvent;
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: { getData: () => pasteData },
      });
      pasteCatcher.dispatchEvent(pasteEvent);

      const processBtn = overlay?.querySelector(`#${Dom.PROCESS_BTN_ID}`) as HTMLButtonElement;
      processBtn.click();

      await new Promise((r) => setTimeout(r, 80));

      // Open View Logs modal from review dialog
      const resultsOverlay = document.querySelector(`#${Dom.REVIEW_OVERLAY_ID}`);
      const logsBtn = resultsOverlay?.querySelector(`#${Dom.REVIEW_LOGS_ID}`) as HTMLButtonElement;
      expect(logsBtn).not.toBeNull();
      logsBtn.click();

      const logsOverlay = document.querySelector(`#${Dom.LOGS_OVERLAY_ID}`);
      expect(logsOverlay).not.toBeNull();

      // Verify table headers include Time, Action, Target, and Details
      const headers = Array.from(logsOverlay?.querySelectorAll('th') || []).map(
        (th) => th.textContent
      );
      expect(headers).toEqual(['Time', 'Action', 'Target', 'Details / Status']);

      const rowsText = logsOverlay?.textContent || '';
      expect(rowsText).toContain('Members Tab');
      expect(rowsText).toContain('Doe, Jane');
      expect(rowsText).toContain('Smith, John');
      expect(rowsText).toContain('Unmatched Guest');

      const downloadSpy = vi.spyOn(fileUtils, 'downloadFile').mockImplementation(() => {});
      const downloadBtn = logsOverlay?.querySelector(
        `#${Dom.LOGS_DOWNLOAD_ID}`
      ) as HTMLButtonElement;
      expect(downloadBtn).not.toBeNull();
      downloadBtn.click();

      await vi.waitFor(() => {
        expect(document.querySelector('.lcr-tools-confirm-modal')).not.toBeNull();
      });
      expect(document.querySelector('.lcr-tools-confirm-modal')?.textContent).toContain(
        'Handbook Section 33.8'
      );
      expect(document.querySelector(`#${Dom.LOGS_OVERLAY_ID}`)).not.toBeNull();
      expect(downloadSpy).not.toHaveBeenCalled();

      (document.getElementById('lcr-tools-confirm-btn') as HTMLButtonElement).click();
      await vi.waitFor(() => {
        expect(downloadSpy).toHaveBeenCalled();
      });
      expect(document.querySelector('.lcr-tools-confirm-modal')).toBeNull();
      expect(document.querySelector(`#${Dom.LOGS_OVERLAY_ID}`)).not.toBeNull();
      downloadSpy.mockRestore();

      (logsOverlay?.querySelector(`#${Dom.LOGS_DONE_ID}`) as HTMLButtonElement)?.click();
      (resultsOverlay?.querySelector(`#${Dom.REVIEW_CONTINUE_ID}`) as HTMLButtonElement)?.click();
      await new Promise((r) => setTimeout(r, 80));
      (document.querySelector(`#${Dom.COMPLETION_DONE_ID}`) as HTMLButtonElement)?.click();

      const result = await actionPromise;
      expect(result.success).toBe(true);
    });
  });

  describe('processClassVisitorCounts action logging', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="eden-tabs">
          <button id="tab-MEMBERS" role="tab" aria-selected="false">Members</button>
          <button id="tab-VISITORS" role="tab" aria-selected="true">Visitors</button>
        </div>

        <select class="eden-form-part-input__control">
          <option value="2026-09" selected>September 2026</option>
        </select>

        <table>
          <thead>
            <tr><th>Class</th><th>13 Sep</th></tr>
          </thead>
          <tbody>
            <tr id="men_2026-09_ALL">
              <td><span>Visitors</span>Men</td>
              <td><input type="number" id="input-men-13" value="" name="uuid-1::men::2026-09-13" /></td>
            </tr>
            <tr id="women_2026-09_ALL">
              <td><span>Visitors</span>Women</td>
              <td><input type="number" id="input-women-13" value="" name="uuid-1::women::2026-09-13" /></td>
            </tr>
          </tbody>
        </table>

        <button class="eden-button--primary" id="save-btn">Save</button>
      `;
    });

    it('records logs for tab navigation, number input entry, and save button click', async () => {
      const logs: Types.AttendanceLogEntry[] = [];
      const visitorCounts: Types.VisitorCounts = { Men: 3, Women: 2 };

      const result = await processClassVisitorCounts(
        'Adult Sunday School',
        '2026-09-13',
        visitorCounts,
        logs
      );

      expect(result.success).toBe(true);

      // Verify action logs were recorded
      expect(logs.some((l) => l.action === 'NAVIGATE' && l.target === 'Visitors Tab')).toBe(true);
      expect(
        logs.some(
          (l) =>
            l.action === 'INPUT' && l.target === 'Visitors: Men' && l.lcrUpdateStatus?.includes('3')
        )
      ).toBe(true);
      expect(
        logs.some(
          (l) =>
            l.action === 'INPUT' &&
            l.target === 'Visitors: Women' &&
            l.lcrUpdateStatus?.includes('2')
        )
      ).toBe(true);
      expect(logs.some((l) => l.action === 'CLICK' && l.target === 'Save Button')).toBe(true);
    });
  });

  describe('downloadAttendanceReport', () => {
    it('formats CSV with Time, Action, Target, and Status Details', async () => {
      const logs: Types.AttendanceLogEntry[] = [
        {
          originalIndex: 0,
          timestamp: '10:15:30',
          date: '2026-09-13',
          action: 'CLICK',
          target: 'Smith, John',
          firstName: 'John',
          lastName: 'Smith',
          lcrUpdateStatus: 'Clicked attendance checkbox for Smith, John (Newly Marked Present)',
        },
        {
          originalIndex: 1,
          timestamp: '10:15:32',
          date: '2026-09-13',
          action: 'INPUT',
          target: 'Visitors: Men',
          lcrUpdateStatus: 'Entered visitor count: Men = 3',
        },
      ];

      const downloadSpy = vi.spyOn(fileUtils, 'downloadFile').mockImplementation(() => {});
      const downloadPromise = downloadAttendanceReport(logs, 'Adult Sunday School', '2026-09-13');

      await vi.waitFor(() => {
        expect(document.getElementById('lcr-tools-confirm-btn')).not.toBeNull();
      });
      (document.getElementById('lcr-tools-confirm-btn') as HTMLButtonElement).click();
      await downloadPromise;

      expect(downloadSpy).toHaveBeenCalled();
      const csvArg = downloadSpy.mock.calls[0][0];

      expect(csvArg).toContain('Timestamp,Action,Target,Level,Details');
      expect(csvArg).toContain('10:15:30,CLICK,"Smith, John"');
      expect(csvArg).toContain('10:15:32,INPUT,Visitors: Men');
    });

    it('keeps the logs modal open when stewardship download is cancelled', async () => {
      document.body.innerHTML = `<div id="${Dom.LOGS_OVERLAY_ID}" class="lcrx-modal-backdrop"></div>`;
      const downloadSpy = vi.spyOn(fileUtils, 'downloadFile').mockImplementation(() => {});
      const downloadPromise = downloadAttendanceReport([], 'Adult Sunday School', '2026-09-13');

      await vi.waitFor(() => {
        expect(document.getElementById('lcr-tools-cancel-btn')).not.toBeNull();
      });
      (document.getElementById('lcr-tools-cancel-btn') as HTMLButtonElement).click();
      await downloadPromise;

      expect(downloadSpy).not.toHaveBeenCalled();
      expect(document.getElementById(Dom.LOGS_OVERLAY_ID)).not.toBeNull();
    });

    it('returns from stewardship prompt to logs, then back to the completion modal', async () => {
      const downloadSpy = vi.spyOn(fileUtils, 'downloadFile').mockImplementation(() => {});
      const logs: Types.AttendanceLogEntry[] = [
        {
          originalIndex: 0,
          timestamp: '10:15:30',
          date: '2026-09-13',
          action: 'CLICK',
          target: 'Smith, John',
          firstName: 'John',
          lastName: 'Smith',
          lcrUpdateStatus: 'Clicked attendance checkbox for Smith, John',
        },
      ];
      const metrics: Types.AttendanceCompletionMetrics = {
        total: 1,
        marked: 1,
        already: 0,
        unmatchedRemaining: 0,
        visitorsSaved: 0,
        aborted: false,
      };

      const completionPromise = displayCompletionModal(
        metrics,
        'Adult Sunday School',
        '2026-09-13',
        logs
      );
      await vi.waitFor(() => {
        expect(document.getElementById(Dom.COMPLETION_OVERLAY_ID)).not.toBeNull();
      });

      (document.getElementById(Dom.COMPLETION_LOGS_ID) as HTMLButtonElement).click();
      expect(document.getElementById(Dom.LOGS_OVERLAY_ID)).not.toBeNull();
      expect(document.getElementById(Dom.COMPLETION_OVERLAY_ID)).not.toBeNull();

      (document.getElementById(Dom.LOGS_DOWNLOAD_ID) as HTMLButtonElement).click();
      await vi.waitFor(() => {
        expect(document.querySelector('.lcr-tools-confirm-modal')).not.toBeNull();
      });
      (document.getElementById('lcr-tools-confirm-btn') as HTMLButtonElement).click();
      await vi.waitFor(() => {
        expect(downloadSpy).toHaveBeenCalled();
      });

      expect(document.querySelector('.lcr-tools-confirm-modal')).toBeNull();
      expect(document.getElementById(Dom.LOGS_OVERLAY_ID)).not.toBeNull();
      expect(document.getElementById(Dom.COMPLETION_OVERLAY_ID)).not.toBeNull();

      (document.getElementById(Dom.LOGS_DONE_ID) as HTMLButtonElement).click();
      expect(document.getElementById(Dom.LOGS_OVERLAY_ID)).toBeNull();
      expect(document.getElementById(Dom.COMPLETION_OVERLAY_ID)).not.toBeNull();

      (document.getElementById(Dom.COMPLETION_DONE_ID) as HTMLButtonElement).click();
      await completionPromise;
      expect(document.getElementById(Dom.COMPLETION_OVERLAY_ID)).toBeNull();
    });
  });
});
