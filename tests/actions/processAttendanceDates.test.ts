import { describe, it, expect, beforeEach } from 'vitest';
import { runProcessAttendance } from '@/actions/processAttendance';
import { Constants, Dom } from '@/actions/processAttendance/types';

describe('processAttendance - single-date roster requirement', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="eden-tabs">
        <button id="tab-MEMBERS" role="tab" aria-selected="true">Members</button>
      </div>
      <select class="eden-form-part-input__control">
        <option value="2026-09" selected>September 2026</option>
      </select>
      <select class="eden-form-part-input__control" id="class-dropdown">
        <option value="adult-ss" selected>Adult Sunday School</option>
      </select>
      <div class="eden-button-bar">
        <button class="eden-button-bar__button" aria-selected="true">13 Sep</button>
      </div>
      <table>
        <tbody>
          <tr role="row">
            <td><button class="member-card__styled-ghost">Smith, John</button></td>
            <td><button class="attendanceButton" aria-pressed="false"></button></td>
          </tr>
        </tbody>
      </table>
    `;
  });

  it('disables Process and shows an error when pasted rows use more than one date', async () => {
    const actionPromise = runProcessAttendance();

    const overlay = document.querySelector(`#${Dom.UI_OVERLAY_ID}`);
    const pasteCatcher = overlay?.querySelector(`#${Dom.PASTE_CATCHER_ID}`) as HTMLTextAreaElement;
    const pasteEvent = Object.assign(new Event('paste', { bubbles: true }), {
      clipboardData: {
        getData: () => '2026-09-13\tJohn\tSmith\n2026-09-20\tJane\tDoe',
      },
    }) as unknown as ClipboardEvent;
    pasteCatcher.dispatchEvent(pasteEvent);

    const processBtn = overlay?.querySelector(`#${Dom.PROCESS_BTN_ID}`) as HTMLButtonElement;
    const statusBanner = overlay?.querySelector(`#${Dom.STATUS_ID}`);
    expect(processBtn.disabled).toBe(true);
    expect(statusBanner?.textContent).toContain(Constants.MIXED_DATES_ERROR);
    expect(statusBanner?.textContent).toContain('2026-09-13');
    expect(statusBanner?.textContent).toContain('2026-09-20');
    expect(statusBanner?.textContent).toContain(Constants.MIXED_DATES_FIX_HINT);
    expect(overlay?.querySelector(`#${Dom.RECORD_COUNT_ID}`)?.textContent).toContain('2');

    (overlay?.querySelector(`#${Dom.SETUP_CANCEL_ID}`) as HTMLButtonElement).click();
    await expect(actionPromise).resolves.toEqual({ success: false, error: 'Cancelled by user' });
  });
});
