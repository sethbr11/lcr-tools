import { describe, it, expect, beforeEach } from 'vitest';
import { processMembersAgainstRoll } from '@/actions/processAttendance/members/processMembersHelper';
import { setAttendanceTarget } from '@/actions/processAttendance/lcr/markHelper';
import { Types } from '@/actions/processAttendance/types';

/**
 * Builds a roll row whose attendance button behaves like LCR's: a click shows a saving spinner,
 * then turns present after `saveMs` — unless `dropClicks` is set, in which case that many clicks
 * are silently lost (LCR occasionally fails to register a click).
 */
function buildMember(fullName: string, options: { saveMs?: number; dropClicks?: number } = {}) {
  const [lastName, firstName] = fullName.split(', ');
  const row = document.createElement('tr');
  row.setAttribute('role', 'row');
  const button = document.createElement('button');
  button.className = 'yPPawG_attendanceButton';
  button.setAttribute('aria-label', `${fullName}, 2026-11-01, Elders Quorum`);
  button.setAttribute('aria-pressed', 'false');
  let dropsLeft = options.dropClicks ?? 0;
  let clicks = 0;
  button.addEventListener('click', () => {
    clicks++;
    if (dropsLeft > 0) {
      dropsLeft--;
      return;
    }
    button.disabled = true;
    setTimeout(() => {
      button.disabled = false;
      button.setAttribute('aria-pressed', 'true');
    }, options.saveMs ?? 30);
  });
  const cell = document.createElement('td');
  cell.appendChild(button);
  row.appendChild(cell);
  document.querySelector('tbody')?.appendChild(row);
  row.scrollIntoView = () => {};

  const member: Types.WardMember = {
    fullName,
    firstName,
    lastName,
    isPresent: false,
    pageNum: 1,
    row,
  };
  return { member, button, clickCount: () => clicks };
}

describe('processAttendance - fast batch marking with verification', () => {
  beforeEach(() => {
    document.body.innerHTML = '<table><tbody></tbody></table>';
    setAttendanceTarget('2026-11-01', 'Elders Quorum');
  });

  it('clicks every match without waiting for each save, then confirms them all', async () => {
    const adams = buildMember('Adams, Abby', { saveMs: 150 });
    const brown = buildMember('Brown, Ben', { saveMs: 150 });
    const logs: Types.AttendanceLogEntry[] = [];
    const started = Date.now();

    const result = await processMembersAgainstRoll(
      [
        { firstName: 'Abby', lastName: 'Adams' },
        { firstName: 'Ben', lastName: 'Brown' },
      ],
      [adams.member, brown.member],
      '2026-11-01',
      logs
    );

    // Both saves overlap, so the run takes about one save, not two back to back
    expect(Date.now() - started).toBeLessThan(290);
    expect(result.newlyMarked).toBe(2);
    expect(adams.clickCount()).toBe(1);
    expect(brown.clickCount()).toBe(1);
    expect(logs.filter((l) => l.action === 'CLICK')).toHaveLength(2);
  });

  it('re-clicks a member whose first click did not register', async () => {
    const adams = buildMember('Adams, Abby', { dropClicks: 1 });
    const logs: Types.AttendanceLogEntry[] = [];

    const result = await processMembersAgainstRoll(
      [{ firstName: 'Abby', lastName: 'Adams' }],
      [adams.member],
      '2026-11-01',
      logs
    );

    expect(result.newlyMarked).toBe(1);
    expect(adams.clickCount()).toBe(2);
    expect(adams.button.getAttribute('aria-pressed')).toBe('true');
    expect(logs.map((l) => l.action)).toEqual(['RETRY', 'CLICK']);
    expect(logs[1].lcrUpdateStatus).toContain('after 1 retry');
  });

  it('reports an error after the retries are used up', async () => {
    const adams = buildMember('Adams, Abby', { dropClicks: 99 });
    const logs: Types.AttendanceLogEntry[] = [];

    const result = await processMembersAgainstRoll(
      [{ firstName: 'Abby', lastName: 'Adams' }],
      [adams.member],
      '2026-11-01',
      logs
    );

    expect(result.newlyMarked).toBe(0);
    expect(adams.clickCount()).toBe(3); // first click + 2 retries
    const last = logs[logs.length - 1];
    expect(last.action).toBe('ERROR');
    expect(last.lcrUpdateStatus).toContain('did not register');
  });

  it('clicks a member once even when two roster rows match them', async () => {
    const adams = buildMember('Adams, Abby', { saveMs: 400 });
    const logs: Types.AttendanceLogEntry[] = [];

    const result = await processMembersAgainstRoll(
      [
        { firstName: 'Abby', lastName: 'Adams' },
        { firstName: 'Abby J.', lastName: 'Adams' },
      ],
      [adams.member],
      '2026-11-01',
      logs
    );

    expect(adams.clickCount()).toBe(1);
    expect(adams.button.getAttribute('aria-pressed')).toBe('true');
    expect(result.newlyMarked).toBe(1);
    expect(logs.some((l) => l.lcrUpdateStatus?.includes('duplicate row skipped'))).toBe(true);
  });

  it('does not click members who are already present', async () => {
    const adams = buildMember('Adams, Abby');
    adams.button.setAttribute('aria-pressed', 'true');
    const logs: Types.AttendanceLogEntry[] = [];

    const result = await processMembersAgainstRoll(
      [{ firstName: 'Abby', lastName: 'Adams' }],
      [adams.member],
      '2026-11-01',
      logs
    );

    expect(result.alreadyMarked).toBe(1);
    expect(adams.clickCount()).toBe(0);
  });
});
