import * as Utils from '../utils';
import { Constants, Dom, Types } from '../types';
import { switchToMembersTab } from '../lcr/syncHelper';
import { isButtonBusy, isButtonPresent } from '../lcr/markHelper';
import { clickSaveButton, setNativeInputValue, switchToVisitorsTab } from '../lcr/visitorsHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Simulates processing attendee records against the LCR ward roll.
 * Scrolls through matched rows without clicking buttons, except for toggling
 * the first unmarked member ON and immediately OFF to test functionality.
 *
 * @param attendees - List of parsed attendee names to process.
 * @param wardMembers - Discovered ward members from active roll.
 * @param targetDate - ISO target Sunday date string (YYYY-MM-DD).
 * @returns Object containing simulation metrics, unmatched attendees, and audit logs.
 */
export async function simulateMemberRollProcessing(
  attendees: Types.AttendeeName[],
  wardMembers: Types.WardMember[],
  targetDate: string
): Promise<Types.SimulatedRollResult> {
  return Utils.withEscapeAbort(async () => {
    let newlyMarked = 0;
    let alreadyMarked = 0;
    let hasTestedToggle = false;
    const unmatchedList: Types.UnmatchedRecord[] = [];
    const logs: Types.AttendanceLogEntry[] = [];
    const wardNames = wardMembers.map((m) => m.fullName);

    for (let i = 0; i < attendees.length; i++) {
      if (Utils.isAborted()) break;

      const attendee = attendees[i];
      const fullName = `${attendee.firstName} ${attendee.lastName}`.trim();
      // prettier-ignore
      Utils.showLoadingIndicator(`Simulating ${i + 1} of ${attendees.length} attendees...`, 'Press ESC to cancel simulation');
      const matchedWardName = Utils.matchMemberName(fullName, wardNames);

      if (matchedWardName) {
        const member = wardMembers.find((m) => m.fullName === matchedWardName);
        if (member) {
          if (typeof member.row?.scrollIntoView === 'function') {
            member.row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await Utils.sleep(Constants.SIM_VISUAL_PAUSE_MS);
          }

          if (Utils.isAborted()) break;

          if (member.isPresent) {
            alreadyMarked++;
            Utils.pushAttendanceLog(logs, {
              date: targetDate,
              action: 'VERIFY',
              target: member.fullName,
              firstName: attendee.firstName,
              lastName: attendee.lastName,
              lcrUpdateStatus: 'Simulated - Already Present (No Click)',
            });
          } else if (!hasTestedToggle) {
            const toggleSuccess = await testMemberToggle(member);
            hasTestedToggle = true;
            newlyMarked++;
            Utils.pushAttendanceLog(logs, {
              date: targetDate,
              action: 'CLICK',
              target: member.fullName,
              firstName: attendee.firstName,
              lastName: attendee.lastName,
              lcrUpdateStatus: toggleSuccess
                ? 'Simulated - Toggle Tested ON/OFF (Restored)'
                : 'Simulated - Toggle Test Error',
            });
          } else {
            newlyMarked++;
            Utils.pushAttendanceLog(logs, {
              date: targetDate,
              action: 'VERIFY',
              target: member.fullName,
              firstName: attendee.firstName,
              lastName: attendee.lastName,
              lcrUpdateStatus: 'Simulated - Match Confirmed (Did Not Click)',
            });
          }
        }
      } else {
        unmatchedList.push({
          firstName: attendee.firstName,
          lastName: attendee.lastName,
          fullName,
          date: targetDate,
        });
        Utils.pushAttendanceLog(logs, {
          date: targetDate,
          action: 'UNMATCHED',
          target: fullName,
          firstName: attendee.firstName,
          lastName: attendee.lastName,
          lcrUpdateStatus: 'Unmatched (Simulated)',
        });
      }
    }

    return { newlyMarked, alreadyMarked, unmatchedList, logs };
  });
}

/**
 * Probes the target Sunday visitor field: writes 1, saves, then writes the original value back.
 * Re-queries a live, enabled input before every write because LCR remounts fields after save.
 *
 * @param targetDate - ISO target Sunday date string (YYYY-MM-DD).
 * @returns Result object indicating simulation status and audit message.
 */
export async function simulateVisitorEntryAndRestore(
  targetDate: string
): Promise<Types.SimulatedVisitorResult> {
  if (Utils.isAborted()) {
    return { success: false, logMessage: 'Visitor simulation cancelled by user' };
  }

  await switchToVisitorsTab();

  const targetInput = findVisitorInputForDate(targetDate);
  if (!targetInput) {
    await switchToMembersTab();
    return {
      success: false,
      logMessage: `Simulated Visitor Test: No visitor input found for ${targetDate}.`,
    };
  }

  const inputName = targetInput.getAttribute('name') || '';
  const originalValue = targetInput.value;
  const probeValue = String(Constants.SIM_VISITOR_PROBE_VALUE);
  targetInput.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  await Utils.sleep(Constants.SIM_VISUAL_PAUSE_MS);

  const probed = await writeVisitorValueByName(inputName, probeValue);
  if (!probed) {
    await switchToMembersTab();
    return {
      success: false,
      logMessage: 'Simulated Visitor Test: Could not write probe value to visitor input.',
    };
  }

  const savedProbe = await clickSaveButton(Constants.SAVE_COMPLETE_TIMEOUT_MS);
  if (!savedProbe) {
    await switchToMembersTab();
    return {
      success: false,
      logMessage: `Simulated Visitor Test: Failed to save visitor probe value ${probeValue}.`,
    };
  }

  const probeConfirmed = await waitForVisitorInputValue(inputName, probeValue);
  if (!probeConfirmed) {
    await switchToMembersTab();
    return {
      success: false,
      logMessage: 'Simulated Visitor Test: Probe value did not persist on the live visitor input.',
    };
  }

  await Utils.sleep(Constants.SIM_VISUAL_PAUSE_MS);

  const restoredField = await writeVisitorValueByName(inputName, originalValue);
  if (!restoredField) {
    await switchToMembersTab();
    return {
      success: false,
      logMessage: 'Simulated Visitor Test: Could not write original visitor value after probe.',
    };
  }

  const savedRestore = await clickSaveButton(Constants.SAVE_COMPLETE_TIMEOUT_MS);
  if (!savedRestore) {
    await switchToMembersTab();
    return {
      success: false,
      logMessage: 'Simulated Visitor Test: Failed to save after restoring original visitor value.',
    };
  }

  const restored = await waitForVisitorInputValue(inputName, originalValue);
  await switchToMembersTab();

  if (!restored) {
    return {
      success: false,
      logMessage:
        'Simulated Visitor Test: Original visitor value was not restored on the target Sunday.',
    };
  }

  const restoredLabel = originalValue === '' ? 'blank' : originalValue;
  return {
    success: true,
    logMessage: `Simulated Visitor Test: Entered ${probeValue} on ${targetDate}, saved, restored ${restoredLabel}, and re-saved.`,
  };
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Tests toggling a member button ON then immediately back OFF to verify interactivity. */
async function testMemberToggle(member: Types.WardMember): Promise<boolean> {
  if (!member.row || Utils.isAborted()) return false;
  const btn = member.row.querySelector<HTMLButtonElement>(Dom.ATTENDANCE_BUTTON);
  if (!btn) return false;

  await Utils.sleep(Constants.SIM_VISUAL_PAUSE_MS);
  if (Utils.isAborted()) return false;

  btn.click();
  const stateOn = await Utils.waitForCondition(
    () => Utils.isAborted() || (!isButtonBusy(btn) && isButtonPresent(btn)),
    Constants.MARK_PRESENT_TIMEOUT_MS,
    Constants.MARK_PRESENT_POLL_MS
  );
  if (!stateOn || Utils.isAborted()) return false;

  await Utils.sleep(Constants.SIM_VISUAL_PAUSE_MS);
  if (Utils.isAborted()) return false;

  btn.click();
  const stateOff = await Utils.waitForCondition(
    () => Utils.isAborted() || (!isButtonBusy(btn) && !isButtonPresent(btn)),
    Constants.MARK_PRESENT_TIMEOUT_MS,
    Constants.MARK_PRESENT_POLL_MS
  );

  return stateOff && !Utils.isAborted();
}

/** Locates the first visitor number input whose name ends with the target Sunday ISO date. */
function findVisitorInputForDate(targetDate: string): HTMLInputElement | null {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(Dom.NUMBER_INPUT));
  return (
    inputs.find((input) => (input.getAttribute('name') || '').endsWith(`::${targetDate}`)) || null
  );
}

/** Re-queries a live, editable visitor input and writes a value (string or number). */
async function writeVisitorValueByName(
  nameAttr: string,
  value: string
): Promise<HTMLInputElement | null> {
  const input = await waitForEnabledVisitorInput(nameAttr);
  if (!input) return null;
  setNativeInputValue(input, value);
  return input;
}

/** Waits until the named visitor input exists in the live DOM and is not disabled or read-only. */
async function waitForEnabledVisitorInput(nameAttr: string): Promise<HTMLInputElement | null> {
  return waitForVisitorInput(nameAttr, () => true);
}

/** Waits until the live named visitor input is enabled and its value matches expected. */
async function waitForVisitorInputValue(
  nameAttr: string,
  expected: string
): Promise<HTMLInputElement | null> {
  return waitForVisitorInput(nameAttr, (input) => input.value.trim() === expected.trim());
}

/** Re-queries a visitor input by name after LCR may have remounted the field. */
async function waitForVisitorInput(
  nameAttr: string,
  predicate: (input: HTMLInputElement) => boolean
): Promise<HTMLInputElement | null> {
  if (!nameAttr) return null;
  let found: HTMLInputElement | null = null;
  await Utils.waitForCondition(
    () => {
      const live = document.querySelector<HTMLInputElement>(
        `${Dom.NUMBER_INPUT}[name="${nameAttr}"]`
      );
      if (live && !live.disabled && !live.readOnly && predicate(live)) {
        found = live;
        return true;
      }
      return Utils.isAborted();
    },
    Constants.SAVE_COMPLETE_TIMEOUT_MS,
    Constants.SAVE_COMPLETE_POLL_MS
  );
  return found;
}
