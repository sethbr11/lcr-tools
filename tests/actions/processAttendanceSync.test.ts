import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runProcessAttendance } from '@/actions/processAttendance';
import { synchronizeAttendancePage } from '@/actions/processAttendance/lcr/syncHelper';
import { Dom, Types } from '@/actions/processAttendance/types';

// LCR waits are long in production; shrink them so "not found" paths fail fast in tests.
vi.mock('@/actions/processAttendance/constants', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/actions/processAttendance/constants')>();
  return {
    ...mod,
    Constants: {
      ...mod.Constants,
      ATTENDANCE_ROLL_LOAD_TIMEOUT_MS: 300,
      TAB_SWITCH_TIMEOUT_MS: 300,
      DROPDOWN_SETTLE_TIMEOUT_MS: 300,
      SUNDAY_BUTTON_TIMEOUT_MS: 300,
      SUNDAY_RECLICK_MS: 50,
    },
  };
});

const visitorMocks = vi.hoisted(() => ({ processClassVisitorCounts: vi.fn() }));
const reviewMocks = vi.hoisted(() => ({ displayUnmatchedReviewModal: vi.fn() }));

vi.mock('@/actions/processAttendance/lcr/visitorsHelper', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  processClassVisitorCounts: visitorMocks.processClassVisitorCounts,
}));
vi.mock('@/actions/processAttendance/results/reviewHelper', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  displayUnmatchedReviewModal: reviewMocks.displayUnmatchedReviewModal,
}));

/** Builds an LCR-like attendance page with the given Sunday button labels. */
function buildAttendancePage(sundayLabels: string[], monthValue = '2026-09'): void {
  const sundayButtons = sundayLabels
    .map(
      (label) => `<button class="eden-button-bar__button" aria-selected="true">${label}</button>`
    )
    .join('');
  document.body.innerHTML = `
    <div class="eden-tabs">
      <button id="tab-MEMBERS" role="tab" aria-selected="true">Members</button>
      <button id="tab-VISITORS" role="tab" aria-selected="false">Visitors</button>
    </div>
    <select class="eden-form-part-input__control">
      <option value="${monthValue}" selected>Month</option>
    </select>
    <select class="eden-form-part-input__control" id="class-dropdown">
      <option value="ALL">All Classes and Quorums</option>
      <option value="adult-ss" selected>Adult Sunday School</option>
    </select>
    <div class="eden-button-bar">${sundayButtons}</div>
    <table id="attendance-table">
      <tbody>
        <tr role="row">
          <td><button class="member-card__styled-ghost">Smith, John</button></td>
          <td>
            <button class="attendanceButton" id="btn-john" aria-pressed="false">
              <svg><path d="M12 3.5a8.5" /></svg>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  `;
  document.getElementById('btn-john')?.addEventListener('click', (e) => {
    (e.currentTarget as HTMLElement).setAttribute('aria-pressed', 'true');
  });
}

/** Pastes a single roster row into the setup modal and clicks Process. */
function pasteRosterAndProcess(row: string): void {
  const overlay = document.querySelector(`#${Dom.UI_OVERLAY_ID}`);
  const pasteCatcher = overlay?.querySelector(`#${Dom.PASTE_CATCHER_ID}`) as HTMLTextAreaElement;
  const pasteEvent = Object.assign(new Event('paste', { bubbles: true }), {
    clipboardData: { getData: () => row },
  }) as unknown as ClipboardEvent;
  pasteCatcher.dispatchEvent(pasteEvent);
  (overlay?.querySelector(`#${Dom.PROCESS_BTN_ID}`) as HTMLButtonElement).click();
}

const syncOptions: Types.SyncAttendancePageOptions = {
  targetDate: '2026-09-13',
  targetClassValue: 'adult-ss',
  targetClassText: 'Adult Sunday School',
};

describe('processAttendance - LCR page synchronization guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('confirms every step and returns ok', async () => {
    buildAttendancePage(['06 Sep', '13 Sep']);
    const logs: Types.AttendanceLogEntry[] = [];

    const result = await synchronizeAttendancePage(syncOptions, logs);

    expect(result).toEqual({ status: 'ok' });
    expect(logs.map((l) => l.target)).toEqual([
      'Members Tab',
      'Month Dropdown',
      'Class Dropdown',
      'Sunday Button',
    ]);
  });

  it('accepts an unpadded Sunday button label such as "1 Nov"', async () => {
    buildAttendancePage(['1 Nov', '8 Nov'], '2026-11');
    const result = await synchronizeAttendancePage(
      { ...syncOptions, targetDate: '2026-11-01' },
      []
    );
    expect(result.status).toBe('ok');
  });

  it('fails at the month step when the month option is missing', async () => {
    buildAttendancePage(['13 Sep'], '2026-08');
    const logs: Types.AttendanceLogEntry[] = [];

    const result = await synchronizeAttendancePage(syncOptions, logs);

    expect(result).toEqual({
      status: 'failed',
      step: 'month',
      message: "Could not find 2026-09 in LCR's month dropdown.",
    });
    expect(logs.some((l) => l.action === 'ERROR' && l.target === 'Month Dropdown')).toBe(true);
    expect(logs.some((l) => l.lcrUpdateStatus?.startsWith('Selected month'))).toBe(false);
  });

  it('fails at the class step when the class option is missing', async () => {
    buildAttendancePage(['13 Sep']);
    const result = await synchronizeAttendancePage(
      { ...syncOptions, targetClassValue: 'eq', targetClassText: 'Elders Quorum' },
      []
    );
    expect(result).toMatchObject({ status: 'failed', step: 'class' });
  });

  it('fails at the Sunday step without substring-matching a different day', async () => {
    vi.useFakeTimers();
    // "3 Sep" must not match "13 Sep"; target 2026-09-03 has no button.
    buildAttendancePage(['13 Sep', '23 Sep']);
    const logs: Types.AttendanceLogEntry[] = [];

    const promise = synchronizeAttendancePage({ ...syncOptions, targetDate: '2026-09-03' }, logs);
    await vi.advanceTimersByTimeAsync(5000);
    const result = await promise;

    expect(result).toEqual({
      status: 'failed',
      step: 'sunday',
      message: "Could not find the 'Sunday 03 Sep' button.",
    });
    expect(logs.some((l) => l.action === 'ERROR' && l.target === 'Sunday Button')).toBe(true);
  });

  it('never clicks an attendance button when the Sunday button is missing', async () => {
    buildAttendancePage(['20 Sep']);
    const attendanceClick = vi.fn();
    document.getElementById('btn-john')?.addEventListener('click', attendanceClick);

    const actionPromise = runProcessAttendance();
    pasteRosterAndProcess('2026-09-13\tJohn\tSmith');

    // The failure is offered as a retry prompt; cancel it
    const findCancel = () =>
      Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => b.textContent?.trim() === 'Cancel'
      );
    await vi.waitFor(() => expect(findCancel()).toBeDefined(), { timeout: 3000 });
    expect(document.body.textContent).toContain('Sunday 13 Sep');
    findCancel()?.click();
    const result = await actionPromise;

    expect(result).toEqual({
      success: false,
      error: "Could not find the 'Sunday 13 Sep' button.",
    });
    expect(attendanceClick).not.toHaveBeenCalled();
    expect(document.getElementById('btn-john')?.getAttribute('aria-pressed')).toBe('false');
    expect(reviewMocks.displayUnmatchedReviewModal).not.toHaveBeenCalled();
  }, 10000);

  it('still shows the completion modal with the error when the visitor save fails', async () => {
    buildAttendancePage(['13 Sep']);
    reviewMocks.displayUnmatchedReviewModal.mockResolvedValue({
      pendingMatches: [],
      visitorCounts: { Men: 2 },
      skipped: [],
      visitorAssigned: [],
      logs: [],
    });
    visitorMocks.processClassVisitorCounts.mockResolvedValue({
      success: false,
      updated: [],
      error: 'Visitor inputs not found for: <Men>',
    });

    const actionPromise = runProcessAttendance();
    pasteRosterAndProcess('2026-09-13\tJohn\tSmith');

    await vi.waitFor(() => {
      expect(document.querySelector(`#${Dom.COMPLETION_OVERLAY_ID}`)).not.toBeNull();
    });
    const overlay = document.querySelector(`#${Dom.COMPLETION_OVERLAY_ID}`);
    expect(overlay?.textContent).toContain(
      'Visitor counts were not saved: Visitor inputs not found for: <Men>'
    );
    expect(overlay?.querySelector('men')).toBeNull();
    (document.querySelector(`#${Dom.COMPLETION_DONE_ID}`) as HTMLButtonElement).click();

    const result = await actionPromise;
    expect(result.success).toBe(false);
    expect(result.error).toBe('Visitor inputs not found for: <Men>');
    expect(result.data?.marked).toBe(1);
  }, 10000);
});
