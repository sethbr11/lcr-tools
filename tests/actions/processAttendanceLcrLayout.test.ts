import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { synchronizeAttendancePage } from '@/actions/processAttendance/lcr/syncHelper';
import {
  findAttendanceButton,
  markMemberPresent,
  setAttendanceTarget,
} from '@/actions/processAttendance/lcr/markHelper';
import { Types } from '@/actions/processAttendance/types';

/*
 * Fixtures mirror the anonymized November 2026 LCR attendance markup: the Sunday button bar marks
 * the active week with a CSS class (no aria-selected), and in "All Classes" view each member row
 * holds one attendance button per meeting, labelled "Last, First, YYYY-MM-DD, Class Name".
 */

const SELECTED = 'eden-button-bar__button--selected';

/** Builds the page header controls: tabs, class + month selects, and the Sunday button bar. */
function buildControls(sundays: { value: string; label: string }[], selected: string): string {
  const buttons = sundays
    .map(
      (s) =>
        `<button type="button" class="eden-button eden-button--secondary eden-button-bar__button${s.value === selected ? ` ${SELECTED}` : ''}" data-value="${s.value}"> ${s.label}</button>`
    )
    .join('');
  const options = sundays.map((s) => `<option value="${s.value}">${s.label}</option>`).join('');
  return `
    <div role="tablist">
      <button id="tab-MEMBERS" role="tab" aria-selected="true">Members</button>
      <button id="tab-VISITORS" role="tab" aria-selected="false">Visitors</button>
    </div>
    <select class="eden-form-part-input__control" id="class-select">
      <option value="ALL">All Classes and Quorums</option>
      <option value="eq-uuid">Elders Quorum</option>
      <option value="ass-uuid">Adult Sunday School</option>
    </select>
    <select class="eden-form-part-input__control" id="month-select">
      <option value="" disabled>2026</option>
      <option value="2026-10">October</option>
      <option value="2026-11">November</option>
    </select>
    <div class="eden-button-bar__mobile">
      <select class="eden-form-part-input__control" aria-label="Options">${options}<option value="ALL">All</option></select>
    </div>
    <div class="eden-button-bar__desktop"><div class="eden-button-bar__buttons">${buttons}</div></div>
  `;
}

/** Builds one member row with an attendance button per meeting. */
function buildRow(name: string, meetings: { date: string; className: string }[]): string {
  const buttons = meetings
    .map(
      (m) =>
        `<button type="button" class="oHlBPq_attendanceButton yPPawG_attendanceButton" aria-label="${name}, ${m.date}, ${m.className}" aria-pressed="false" data-class="${m.className}"><svg><path d="M12 3.5a8.5"></path></svg></button>`
    )
    .join('');
  return `
    <tr role="row">
      <td><button class="member-card__styled-ghost">${name}</button></td>
      <td>M</td>
      <td>${buttons}</td>
      <td></td>
    </tr>`;
}

/** Makes Sunday buttons move the selected class on click, like LCR's React button bar. */
function wireSundayButtons(): void {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.eden-button-bar__button')
  );
  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove(SELECTED));
      btn.classList.add(SELECTED);
    })
  );
}

/** Makes attendance buttons toggle aria-pressed on click. */
function wireAttendanceButtons(): void {
  document
    .querySelectorAll<HTMLButtonElement>('button[class*="attendanceButton"]')
    .forEach((b) =>
      b.addEventListener('click', () =>
        b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true')
      )
    );
}

describe('processAttendance - November 2026 LCR layout', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    setAttendanceTarget(null);
  });

  afterEach(() => {
    setAttendanceTarget(null);
  });

  describe('Sunday selection', () => {
    const sundays = [
      { value: '2026-11-01', label: '1 Nov' },
      { value: '2026-11-08', label: '8 Nov' },
    ];
    const options: Types.SyncAttendancePageOptions = {
      targetDate: '2026-11-08',
      targetClassValue: 'eq-uuid',
      targetClassText: 'Elders Quorum',
    };

    it('selects an unpadded Sunday button confirmed only by the selected CSS class', async () => {
      document.body.innerHTML = `${buildControls(sundays, '2026-11-01')}<table><tbody></tbody></table>`;
      wireSundayButtons();

      const status = await synchronizeAttendancePage(options, []);

      expect(status).toEqual({ status: 'ok' });
      const selected = document.querySelector(`.${SELECTED}`) as HTMLElement;
      expect(selected.dataset.value).toBe('2026-11-08');
    });

    it('re-finds the Sunday button when LCR redraws the button bar after a click', async () => {
      // Emulate React: clicking or changing class re-renders the bar with brand-new button nodes,
      // so any button reference held from before the redraw is detached and never shows selected.
      document.body.innerHTML = `${buildControls(sundays, 'ALL')}<table><tbody></tbody></table>`;
      let selectedSunday = 'ALL';
      const renderBar = () => {
        const bar = document.querySelector('.eden-button-bar__buttons') as HTMLElement;
        bar.replaceChildren(
          ...sundays.map((s) => {
            const btn = document.createElement('button');
            btn.className = `eden-button-bar__button${s.value === selectedSunday ? ` ${SELECTED}` : ''}`;
            btn.textContent = ` ${s.label}`;
            btn.addEventListener('click', () => {
              selectedSunday = s.value;
              setTimeout(renderBar, 20);
            });
            return btn;
          })
        );
      };
      renderBar();
      document.getElementById('class-select')?.addEventListener('change', () => {
        selectedSunday = 'ALL';
        setTimeout(renderBar, 20);
      });

      const status = await synchronizeAttendancePage(options, []);

      expect(status).toEqual({ status: 'ok' });
      expect(selectedSunday).toBe('2026-11-08');
    });

    it('treats an already-selected Sunday button as done without clicking', async () => {
      document.body.innerHTML = `${buildControls(sundays, '2026-11-08')}<table><tbody></tbody></table>`;

      const status = await synchronizeAttendancePage(options, []);

      expect(status).toEqual({ status: 'ok' });
    });

    it('falls back to the Sunday <select> when no button bar is rendered', async () => {
      document.body.innerHTML = `${buildControls(sundays, '2026-11-01')}<table><tbody></tbody></table>`;
      document.querySelector('.eden-button-bar__desktop')?.remove();

      const status = await synchronizeAttendancePage(options, []);

      expect(status).toEqual({ status: 'ok' });
      const sundaySelect = document.querySelector(
        'select[aria-label="Options"]'
      ) as HTMLSelectElement;
      expect(sundaySelect.value).toBe('2026-11-08');
    });
  });

  describe('attendance button choice', () => {
    const allClassesRow = (): HTMLTableRowElement => {
      document.body.innerHTML = `<table><tbody>${buildRow('Last, First Middle', [
        { date: '2026-11-01', className: 'Adult Sunday School' },
        { date: '2026-11-01', className: 'Elders Quorum' },
      ])}</tbody></table>`;
      return document.querySelector('tr') as HTMLTableRowElement;
    };

    it('picks the button for the target class instead of the first button in the row', () => {
      const row = allClassesRow();
      setAttendanceTarget('2026-11-01', 'Elders Quorum');

      expect(findAttendanceButton(row)?.dataset.class).toBe('Elders Quorum');
    });

    it('returns null when several meetings match the date and none matches the class', () => {
      const row = allClassesRow();
      setAttendanceTarget('2026-11-01', 'Relief Society');

      expect(findAttendanceButton(row)).toBeNull();
    });

    it('returns null when no button is for the target Sunday', () => {
      const row = allClassesRow();
      setAttendanceTarget('2026-11-08', 'Elders Quorum');

      expect(findAttendanceButton(row)).toBeNull();
    });

    it('uses the only dated button when the class label differs (single-class view)', () => {
      document.body.innerHTML = `<table><tbody>${buildRow('Last, First', [
        { date: '2026-09-27', className: 'Elders Quorum' },
      ])}</tbody></table>`;
      setAttendanceTarget('2026-09-27', 'Elders');

      expect(findAttendanceButton(document.querySelector('tr') as HTMLElement)).not.toBeNull();
    });

    it('marks only the target class button present', async () => {
      const row = allClassesRow();
      wireAttendanceButtons();
      setAttendanceTarget('2026-11-01', 'Elders Quorum');
      const member: Types.WardMember = {
        fullName: 'Last, First Middle',
        firstName: 'First Middle',
        lastName: 'Last',
        isPresent: false,
        pageNum: 1,
        row,
      };

      const outcome = await markMemberPresent(member, false);

      expect(outcome).toBe('marked');
      const pressed = Array.from(row.querySelectorAll('button[aria-pressed="true"]')).map(
        (b) => (b as HTMLElement).dataset.class
      );
      expect(pressed).toEqual(['Elders Quorum']);
    });
  });
});
