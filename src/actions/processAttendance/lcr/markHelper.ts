import { Constants, Dom, Regex, Types } from '../types';

/** Sunday and class the run is marking; null until sync confirms them. */
let attendanceTarget: { date: string; className: string | null } | null = null;

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Records the confirmed Sunday and class so attendance buttons can be matched by their aria-label.
 *
 * @param date - ISO target Sunday date (YYYY-MM-DD), or null to clear the target.
 * @param className - Display name of the selected class or quorum.
 */
export function setAttendanceTarget(date: string | null, className: string | null = null): void {
  attendanceTarget = date ? { date, className } : null;
}

/**
 * Finds the attendance button in a member row for the target Sunday and class.
 * LCR labels each button "Last, First, YYYY-MM-DD, Class Name", and a row can hold one button per
 * meeting, so the button is chosen by date (then class) rather than taking the first one.
 *
 * @param row - Ward member table row.
 * @returns The matching button, or null when none (or more than one) matches.
 */
export function findAttendanceButton(row: HTMLElement): HTMLButtonElement | null {
  const buttons = Array.from(row.querySelectorAll<HTMLButtonElement>(Dom.ATTENDANCE_BUTTON));
  const labelled = buttons
    .map((btn) => ({
      btn,
      match: (btn.getAttribute('aria-label') || '').match(Regex.ATTENDANCE_BUTTON_LABEL),
    }))
    .filter((entry): entry is { btn: HTMLButtonElement; match: RegExpMatchArray } => !!entry.match);

  // Legacy markup without dated labels: only safe when the row has a single button
  if (!attendanceTarget || labelled.length === 0) return buttons.length === 1 ? buttons[0] : null;

  const { date, className } = attendanceTarget;
  const onDate = labelled.filter((entry) => entry.match[1] === date);
  const wantedClass = (className || '').trim().toLowerCase();
  const inClass = onDate.filter((entry) => entry.match[2].trim().toLowerCase() === wantedClass);
  if (inClass.length === 1) return inClass[0].btn;
  return onDate.length === 1 ? onDate[0].btn : null;
}

/**
 * Clicks a member's attendance button without waiting for LCR to save, for fast batch marking.
 * Callers confirm the result later with isMemberMarkedPresent.
 *
 * @param member - Target ward member structure.
 * @returns 'clicked'; 'already' when the button shows present; 'busy' when it is still saving, so a
 *   click would toggle it back off; or 'error' when the button can't be found.
 */
export function clickAttendanceButton(
  member: Types.WardMember
): 'clicked' | 'already' | 'busy' | 'error' {
  if (!member.row) return 'error';
  const btn = findAttendanceButton(member.row);
  if (!btn) return 'error';
  if (isButtonPresent(btn)) return 'already';
  // A button mid-save would be toggled back off by another click
  if (isButtonBusy(btn)) return 'busy';

  if (typeof member.row.scrollIntoView === 'function') {
    member.row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  btn.click();
  return 'clicked';
}

/**
 * Reports whether a member's attendance button currently shows present and has finished saving.
 *
 * @param member - Target ward member structure.
 * @returns True when present and idle, false otherwise (including when the button is missing).
 */
export function isMemberMarkedPresent(member: Types.WardMember): boolean {
  const btn = member.row ? findAttendanceButton(member.row) : null;
  return !!btn && !isButtonBusy(btn) && isButtonPresent(btn);
}

/**
 * Reports whether a member's attendance button is still saving.
 *
 * @param member - Target ward member structure.
 * @returns True when the button is disabled or showing a progress spinner.
 */
export function isMemberMarkBusy(member: Types.WardMember): boolean {
  const btn = member.row ? findAttendanceButton(member.row) : null;
  return !!btn && isButtonBusy(btn);
}

/**
 * Checks whether an attendance toggle button is currently in a loading or saving transition state.
 *
 * @param btn - Attendance toggle button element.
 * @returns True if button is disabled or displaying an active progress indicator.
 */
export function isButtonBusy(btn: HTMLButtonElement): boolean {
  if (btn.disabled) return true;
  if (btn.querySelector(Dom.PROGRESS_SPINNER)) return true;
  return false;
}

/**
 * Checks whether an attendance button indicates present state.
 *
 * @param btn - Attendance toggle button element.
 * @returns True if button represents present state.
 */
export function isButtonPresent(btn: HTMLElement): boolean {
  if (btn.getAttribute('aria-pressed') === Dom.ARIA_SELECTED_TRUE) return true;
  if (btn.classList.contains(Dom.ACTIVE_STATE) || btn.classList.contains(Dom.IS_PRESENT)) {
    return true;
  }

  const svgHtml = btn.innerHTML;
  if (svgHtml.includes(Constants.ICON_PATHS.present)) return true;

  return false;
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */
