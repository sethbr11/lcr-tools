import * as Utils from '../utils';
import { Constants, Dom, Types } from '../types';
import { isButtonPresent } from './markHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Polls until ward members appear on the roll or the user aborts, then returns the scan.
 *
 * @returns Discovered ward members, or an empty array on timeout/abort.
 */
export async function waitAndLoadWardMembers(): Promise<Types.WardMember[]> {
  await Utils.waitForCondition(
    () => Utils.isAborted() || getWardMembersOnRoll().length > 0,
    Constants.ATTENDANCE_ROLL_LOAD_TIMEOUT_MS,
    Constants.ATTENDANCE_ROLL_POLL_INTERVAL_MS
  );

  if (Utils.isAborted()) return [];
  return getWardMembersOnRoll();
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Scans the active LCR attendance table and maps all ward members on the roll. */
function getWardMembersOnRoll(table?: HTMLTableElement): Types.WardMember[] {
  const targetTable = table || document.querySelector<HTMLTableElement>(Dom.ATTENDANCE_TABLE);
  if (!targetTable) return [];

  const rows = Array.from(targetTable.querySelectorAll<HTMLTableRowElement>(Dom.MEMBER_ROWS));
  const members: Types.WardMember[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameBtn = row.querySelector<HTMLElement>(Dom.NAME_BUTTON);
    const fullName = (nameBtn?.textContent || row.cells[0]?.textContent || '').trim();
    if (!fullName) continue;

    const { firstName, lastName } = Utils.parseFullName(fullName);
    const isPresent = isRowMarkedPresent(row);

    members.push({ fullName, firstName, lastName, isPresent, pageNum: 1, row });
  }

  return members;
}

/** Checks whether a row currently has attendance marked via button or checkbox. */
function isRowMarkedPresent(row: HTMLTableRowElement): boolean {
  const btn = row.querySelector<HTMLButtonElement>(Dom.ATTENDANCE_BUTTON);
  if (btn && isButtonPresent(btn)) return true;

  const checkbox = row.querySelector<HTMLInputElement>(Dom.ATTENDANCE_CHECKBOX);
  if (checkbox && checkbox.checked) return true;

  return false;
}
