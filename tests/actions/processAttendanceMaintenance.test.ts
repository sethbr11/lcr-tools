import { describe, it, expect, beforeEach } from 'vitest';
import { runProcessAttendance } from '@/actions/processAttendance';
import { Dom, Constants } from '@/actions/processAttendance/types';

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

  it('should abort and display maintenance modal if 0 ward members are discovered on roll', async () => {
    const tbody = document.querySelector('#attendance-table tbody');
    if (tbody) tbody.innerHTML = '';

    const actionPromise = runProcessAttendance();

    const overlay = document.querySelector(`#${Dom.UI_OVERLAY_ID}`);
    expect(overlay).not.toBeNull();

    const pasteCatcher = overlay?.querySelector('#lcr-tools-paste-catcher') as HTMLTextAreaElement;
    const pasteEvent = Object.assign(new Event('paste', { bubbles: true }), {
      clipboardData: { getData: () => '2026-09-13\tJohn\tSmith' },
    }) as unknown as ClipboardEvent;
    pasteCatcher.dispatchEvent(pasteEvent);

    const processBtn = overlay?.querySelector(`#${Dom.PROCESS_BTN_ID}`) as HTMLButtonElement;
    processBtn.click();

    const result = await actionPromise;

    expect(result.success).toBe(false);
    expect(result.error).toBe('LCR setup mismatch - no members found');

    const modal = document.querySelector(`#${Dom.MAINTENANCE_MODAL_ID}`);
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('LCR Maintenance Required');
    expect(modal?.textContent).toContain(Constants.MAINTENANCE_EMAIL);
  }, 10000);
});
