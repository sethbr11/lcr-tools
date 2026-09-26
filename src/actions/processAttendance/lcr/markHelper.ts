import * as Utils from '../utils';
import { Constants, Dom, Types } from '../types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Marks attendance for a specific ward member row in LCR.
 * Scrolls the member row into view without a settle sleep, then waits for button state.
 *
 * @param member - Target ward member structure.
 * @param shouldScroll - Whether to smoothly scroll to the member row before marking.
 * @returns MarkPresentOutcome of marked, already, or error.
 */
export async function markMemberPresent(
  member: Types.WardMember,
  shouldScroll: boolean = true
): Promise<Types.MarkPresentOutcome> {
  if (!member.row || Utils.isAborted()) return 'error';

  if (shouldScroll && typeof member.row.scrollIntoView === 'function') {
    member.row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (Utils.isAborted()) return 'error';

  const btn = member.row.querySelector<HTMLButtonElement>(Dom.ATTENDANCE_BUTTON);
  if (!btn) return 'error';

  if (isButtonPresent(btn)) return 'already';

  btn.click();

  const updatedState = await waitForAttendanceButtonState(btn, true);
  if (updatedState && !Utils.isAborted()) {
    member.isPresent = true;
    return 'marked';
  }

  return 'error';
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

/** Polls until the attendance button is idle and matches the expected present state. */
async function waitForAttendanceButtonState(
  btn: HTMLButtonElement,
  expectPresent: boolean
): Promise<boolean> {
  return Utils.waitForCondition(
    () => Utils.isAborted() || (!isButtonBusy(btn) && isButtonPresent(btn) === expectPresent),
    Constants.MARK_PRESENT_TIMEOUT_MS,
    Constants.MARK_PRESENT_POLL_MS
  );
}
