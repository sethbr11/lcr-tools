import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runProcessAttendance } from '@/actions/processAttendance';
import { Dom, Constants } from '@/actions/processAttendance/types';

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
    },
  };
});

describe('processAttendance - maintenance and defensive verification', () => {
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
        <option value="eq">Elders Quorum</option>
      </select>

      <div class="eden-button-bar">
        <button class="eden-button-bar__button" aria-selected="true">13 Sep</button>
      </div>

      <table id="attendance-table">
        <tbody>
          <tr role="row" id="member-row-1">
            <td><button class="member-card__styled-ghost">Smith, John</button></td>
            <td>
              <button class="attendanceButton" id="btn-john" aria-pressed="false">
                <svg><path d="M12 3.5a8.5" /></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <table id="visitors-table">
        <tbody>
          <tr>
            <td>Men</td>
            <td><input type="number" name="uuid-1::men::2026-09-13" value="" /></td>
          </tr>
        </tbody>
      </table>
    `;
  });

  it('should abort and display maintenance modal if LCR page setup is not present or altered', async () => {
    document.body.innerHTML = '<div class="unrelated-page">Not attendance</div>';

    const result = await runProcessAttendance();

    expect(result.success).toBe(false);
    expect(result.error).toBe('LCR setup mismatch');

    const modal = document.querySelector(`#${Dom.MAINTENANCE_MODAL_ID}`);
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('LCR Maintenance Required');
    expect(modal?.textContent).toContain(Constants.MAINTENANCE_EMAIL);

    const mailLink = modal?.querySelector('a[href^="mailto:"]') as HTMLAnchorElement;
    expect(mailLink).not.toBeNull();
    expect(mailLink.href).toContain(Constants.MAINTENANCE_EMAIL);
  });

  /** Pastes one roster row into the setup modal and clicks Process. */
  const pasteAndProcess = () => {
    const overlay = document.querySelector(`#${Dom.UI_OVERLAY_ID}`);
    const pasteCatcher = overlay?.querySelector('#lcr-tools-paste-catcher') as HTMLTextAreaElement;
    const pasteEvent = Object.assign(new Event('paste', { bubbles: true }), {
      clipboardData: { getData: () => '2026-09-13\tJohn\tSmith' },
    }) as unknown as ClipboardEvent;
    pasteCatcher.dispatchEvent(pasteEvent);
    (overlay?.querySelector(`#${Dom.PROCESS_BTN_ID}`) as HTMLButtonElement).click();
  };

  /** Waits for the "LCR isn't ready yet" prompt and clicks the button with the given label. */
  const answerRetryPrompt = async (label: 'Try again' | 'Cancel') => {
    const findButton = () =>
      Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => b.textContent?.trim() === label
      );
    await vi.waitFor(() => expect(findButton()).toBeDefined(), { timeout: 3000 });
    expect(document.body.textContent).toContain("LCR isn't ready yet");
    findButton()?.click();
  };

  it('offers a retry when no ward members load, and cancelling marks nothing', async () => {
    const tbody = document.querySelector('#attendance-table tbody');
    const savedRows = tbody?.innerHTML ?? '';
    if (tbody) tbody.innerHTML = '';

    const actionPromise = runProcessAttendance();
    pasteAndProcess();
    await answerRetryPrompt('Cancel');
    const result = await actionPromise;

    expect(result.success).toBe(false);
    expect(result.error).toBe('No ward members appeared on the attendance roll.');
    expect(savedRows).toContain('aria-pressed="false"');
  });

  it('retries page setup without re-pasting once the roll finishes loading', async () => {
    const tbody = document.querySelector('#attendance-table tbody') as HTMLElement;
    const savedRows = tbody.innerHTML;
    tbody.innerHTML = '';

    const actionPromise = runProcessAttendance({ isSimulation: true });
    pasteAndProcess();
    await answerRetryPrompt('Try again');
    tbody.innerHTML = savedRows;

    // Past the roll step, the run reaches the review/completion UI instead of the retry prompt
    await vi.waitFor(
      () =>
        expect(
          document.querySelector(`#${Dom.REVIEW_OVERLAY_ID}, #${Dom.COMPLETION_OVERLAY_ID}`)
        ).not.toBeNull(),
      { timeout: 5000 }
    );
    expect(document.body.textContent).not.toContain("LCR isn't ready yet");
    void actionPromise;
  }, 10000);
});
