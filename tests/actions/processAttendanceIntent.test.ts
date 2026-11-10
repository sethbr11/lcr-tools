import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runProcessAttendance } from '@/actions/processAttendance';
import { findExactMemberMatches, suggestMemberMatch } from '@/actions/processAttendance/utils';
import { Dom } from '@/actions/processAttendance/types';
import { waitForElement, waitForAssertion } from '../helpers/waitFor';

/* ==========================================================================
   INTENT TESTS — outcomes users/LCR care about, not helper internals
   ========================================================================== */

describe('processAttendance - intended matching and roll-load behavior', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
        <option value="adult-ss" selected>Adult Sunday School</option>
      </select>
      <div class="eden-button-bar">
        <button class="eden-button-bar__button" aria-selected="true">13 Sep</button>
      </div>
      <table id="attendance-table">
        <tbody>
          <tr role="row" id="row-jonathan">
            <td><button class="member-card__styled-ghost">Smith, Jonathan</button></td>
            <td>
              <button class="attendanceButton" id="btn-jonathan" aria-pressed="false"></button>
            </td>
          </tr>
          <tr role="row" id="row-elizabeth">
            <td><button class="member-card__styled-ghost">Doe, Elizabeth</button></td>
            <td>
              <button class="attendanceButton" id="btn-elizabeth" aria-pressed="false"></button>
            </td>
          </tr>
        </tbody>
      </table>
    `;

    document.querySelectorAll('.attendanceButton').forEach((btn) => {
      btn.addEventListener('click', () => {
        const el = btn as HTMLElement;
        const next = el.getAttribute('aria-pressed') === 'true' ? 'false' : 'true';
        el.setAttribute('aria-pressed', next);
      });
    });
  });

  it('auto-marks exact names and marks near-miss names only after the user confirms the suggestion', async () => {
    const wardNames = ['Smith, Jonathan', 'Doe, Elizabeth'];
    expect(findExactMemberMatches('Jon Smith', wardNames)).toEqual([]);
    expect(suggestMemberMatch('Jon Smith', wardNames)).toBe('Smith, Jonathan');
    expect(findExactMemberMatches('Elizabeth Doe', wardNames)).toEqual(['Doe, Elizabeth']);

    const actionPromise = runProcessAttendance();
    const overlay = document.querySelector(`#${Dom.UI_OVERLAY_ID}`);
    expect(overlay).not.toBeNull();

    const pasteCatcher = overlay?.querySelector(`#${Dom.PASTE_CATCHER_ID}`) as HTMLTextAreaElement;
    const pasteData = [
      'Timestamp\tFirst Name\tLast Name',
      '2026-09-13 09:30:00\tJon\tSmith',
      '2026-09-13 09:31:00\tElizabeth\tDoe',
    ].join('\n');
    const pasteEvent = new Event('paste', { bubbles: true }) as ClipboardEvent;
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: { getData: (type: string) => (type === 'text' ? pasteData : '') },
    });
    pasteCatcher.dispatchEvent(pasteEvent);

    (overlay?.querySelector(`#${Dom.PROCESS_BTN_ID}`) as HTMLButtonElement).click();

    await waitForAssertion(() =>
      expect(document.getElementById('btn-elizabeth')?.getAttribute('aria-pressed')).toBe('true')
    );
    expect(document.getElementById('btn-jonathan')?.getAttribute('aria-pressed')).toBe('false');
    (await waitForElement<HTMLButtonElement>(`.${Dom.FUZZY_BTN}`)).click();
    expect(document.getElementById('btn-jonathan')?.getAttribute('aria-pressed')).toBe('false');
    (document.querySelector(`#${Dom.REVIEW_CONTINUE_ID}`) as HTMLButtonElement)?.click();
    (await waitForElement<HTMLButtonElement>(`#${Dom.COMPLETION_DONE_ID}`)).click();

    const result = await actionPromise;

    expect(result.success).toBe(true);
    expect(result.data?.marked).toBeGreaterThanOrEqual(2);
    expect(document.getElementById('btn-jonathan')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('waits for delayed roll rows then processes attendees once members appear', async () => {
    const tbody = document.querySelector('#attendance-table tbody');
    if (tbody) tbody.innerHTML = '';

    const actionPromise = runProcessAttendance();
    const overlay = document.querySelector(`#${Dom.UI_OVERLAY_ID}`);
    expect(overlay).not.toBeNull();

    const pasteCatcher = overlay?.querySelector(`#${Dom.PASTE_CATCHER_ID}`) as HTMLTextAreaElement;
    const pasteEvent = new Event('paste', { bubbles: true }) as ClipboardEvent;
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: {
        getData: (type: string) =>
          type === 'text'
            ? 'Timestamp\tFirst Name\tLast Name\n2026-09-13 09:30:00\tJonathan\tSmith'
            : '',
      },
    });
    pasteCatcher.dispatchEvent(pasteEvent);
    (overlay?.querySelector(`#${Dom.PROCESS_BTN_ID}`) as HTMLButtonElement).click();

    // Roll appears after a short delay (simulates LCR async table load)
    await new Promise((r) => setTimeout(r, 200));
    if (tbody) {
      tbody.innerHTML = `
        <tr role="row">
          <td><button class="member-card__styled-ghost">Smith, Jonathan</button></td>
          <td>
            <button class="attendanceButton" id="btn-delayed" aria-pressed="false"></button>
          </td>
        </tr>
      `;
      document.getElementById('btn-delayed')?.addEventListener('click', () => {
        document.getElementById('btn-delayed')?.setAttribute('aria-pressed', 'true');
      });
    }

    (await waitForElement<HTMLButtonElement>(`#${Dom.REVIEW_CONTINUE_ID}`)).click();
    (await waitForElement<HTMLButtonElement>(`#${Dom.COMPLETION_DONE_ID}`)).click();

    const result = await actionPromise;
    expect(result.success).toBe(true);
    expect(document.getElementById('btn-delayed')?.getAttribute('aria-pressed')).toBe('true');
  }, 10000);

  it('simulation dry-run leaves matched attendance buttons unchanged after run', async () => {
    // Provide Visitors tab contract so visitor dry-run can complete without long aria waits
    const memTab = document.getElementById('tab-MEMBERS');
    const visTab = document.getElementById('tab-VISITORS');
    visTab?.addEventListener('click', () => {
      visTab.setAttribute('aria-selected', 'true');
      memTab?.setAttribute('aria-selected', 'false');
    });
    memTab?.addEventListener('click', () => {
      memTab.setAttribute('aria-selected', 'true');
      visTab?.setAttribute('aria-selected', 'false');
    });
    document.body.insertAdjacentHTML(
      'beforeend',
      `<table><tbody><tr><td>
        <input type="number" value="" name="uuid::men::2026-09-13" />
      </td></tr></tbody></table>
      <button class="eden-button--primary">Save</button>`
    );

    const actionPromise = runProcessAttendance({ isSimulation: true });
    const overlay = document.querySelector(`#${Dom.UI_OVERLAY_ID}`);
    expect(overlay).not.toBeNull();

    const pasteCatcher = overlay?.querySelector(`#${Dom.PASTE_CATCHER_ID}`) as HTMLTextAreaElement;
    const pasteEvent = new Event('paste', { bubbles: true }) as ClipboardEvent;
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: {
        getData: (type: string) =>
          type === 'text'
            ? [
                'Timestamp\tFirst Name\tLast Name',
                '2026-09-13 09:30:00\tJonathan\tSmith',
                '2026-09-13 09:31:00\tElizabeth\tDoe',
              ].join('\n')
            : '',
      },
    });
    pasteCatcher.dispatchEvent(pasteEvent);
    (overlay?.querySelector(`#${Dom.PROCESS_BTN_ID}`) as HTMLButtonElement).click();

    (await waitForElement<HTMLButtonElement>(`#${Dom.REVIEW_CONTINUE_ID}`)).click();
    (await waitForElement<HTMLButtonElement>(`#${Dom.COMPLETION_DONE_ID}`)).click();

    const result = await actionPromise;
    expect(result.success).toBe(true);

    expect(document.getElementById('btn-jonathan')?.getAttribute('aria-pressed')).toBe('false');
    expect(document.getElementById('btn-elizabeth')?.getAttribute('aria-pressed')).toBe('false');
  }, 15000);
});
