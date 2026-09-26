import * as Utils from '../utils';
import { Types } from '../types';
import * as MarkHelper from '../lcr/markHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Matches attendees against the ward roll and marks unmatched present members in LCR.
 *
 * @param attendees - Sorted attendee first/last name records to process.
 * @param wardMembers - Discovered ward members from the active attendance roll.
 * @param targetDate - ISO target Sunday date string (YYYY-MM-DD).
 * @param logs - Optional running audit log array (mutated and returned).
 * @returns ProcessMembersResult with mark counts, unmatched list, logs, and abort flag.
 */
export async function processMembersAgainstRoll(
  attendees: Types.AttendeeName[],
  wardMembers: Types.WardMember[],
  targetDate: string,
  logs: Types.AttendanceLogEntry[] = []
): Promise<Types.ProcessMembersResult> {
  let newlyMarked = 0;
  let alreadyMarked = 0;
  const unmatchedList: Types.UnmatchedRecord[] = [];
  const wardNames = wardMembers.map((m) => m.fullName);

  // prettier-ignore
  Utils.showLoadingIndicator(`Processing ${attendees.length} attendees on LCR...`, 'Press ESC to cancel');

  for (let i = 0; i < attendees.length; i++) {
    if (Utils.isAborted()) {
      return { newlyMarked, alreadyMarked, unmatchedList, logs, aborted: true };
    }

    const attendee = attendees[i];
    const fullName = `${attendee.firstName} ${attendee.lastName}`.trim();
    // prettier-ignore
    Utils.showLoadingIndicator(`Processing ${i + 1} of ${attendees.length} attendees...`, `Marking: ${attendee.lastName}, ${attendee.firstName} (Press ESC to cancel)`);

    const matchedWardName = Utils.matchMemberName(fullName, wardNames);
    if (matchedWardName) {
      const member = wardMembers.find((m) => m.fullName === matchedWardName);
      if (member) {
        const markOutcome = await MarkHelper.markMemberPresent(member);
        if (Utils.isAborted()) {
          return { newlyMarked, alreadyMarked, unmatchedList, logs, aborted: true };
        }

        if (markOutcome === 'marked') {
          newlyMarked++;
          Utils.pushAttendanceLog(logs, {
            date: targetDate,
            action: 'CLICK',
            target: member.fullName,
            firstName: attendee.firstName,
            lastName: attendee.lastName,
            lcrUpdateStatus: `Clicked attendance checkbox for ${member.fullName} (Newly Marked Present)`,
          });
        } else if (markOutcome === 'already') {
          alreadyMarked++;
          Utils.pushAttendanceLog(logs, {
            date: targetDate,
            action: 'VERIFY',
            target: member.fullName,
            firstName: attendee.firstName,
            lastName: attendee.lastName,
            lcrUpdateStatus: `Verified already marked present for ${member.fullName} (No click needed)`,
          });
        } else {
          Utils.pushAttendanceLog(logs, {
            date: targetDate,
            action: 'ERROR',
            target: member.fullName,
            firstName: attendee.firstName,
            lastName: attendee.lastName,
            lcrUpdateStatus: `Error clicking attendance checkbox for ${member.fullName}`,
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
        lcrUpdateStatus: `Attendee not found on roll: ${fullName}`,
      });
    }
  }

  return { newlyMarked, alreadyMarked, unmatchedList, logs, aborted: false };
}

/**
 * Marks deferred review matches on LCR in alphabetical order by ward member name.
 *
 * @param pendingMatches - Queued matches from the unmatched review modal.
 * @param targetDate - ISO target Sunday date string (YYYY-MM-DD).
 * @param logs - Running audit log array (mutated).
 * @param isSimulation - When true, scrolls only and does not click attendance buttons.
 * @returns Mark counts and abort flag for the deferred batch.
 */
export async function markPendingMatches(
  pendingMatches: Types.PendingMemberMatch[],
  targetDate: string,
  logs: Types.AttendanceLogEntry[],
  isSimulation: boolean = false
): Promise<Types.MarkPendingMatchesResult> {
  let newlyMarked = 0;
  let alreadyMarked = 0;

  const sorted = [...pendingMatches].sort((a, b) => {
    const lastCmp = a.member.lastName.localeCompare(b.member.lastName, undefined, {
      sensitivity: 'base',
    });
    if (lastCmp !== 0) return lastCmp;
    return a.member.firstName.localeCompare(b.member.firstName, undefined, {
      sensitivity: 'base',
    });
  });

  for (let i = 0; i < sorted.length; i++) {
    if (Utils.isAborted()) return { newlyMarked, alreadyMarked, aborted: true };

    const pending = sorted[i];
    // prettier-ignore
    Utils.showLoadingIndicator(`Marking review match ${i + 1} of ${sorted.length}...`, `${pending.member.fullName} (Press ESC to cancel)`);

    if (isSimulation) {
      if (typeof pending.member.row?.scrollIntoView === 'function') {
        pending.member.row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      newlyMarked++;
      Utils.pushAttendanceLog(logs, {
        date: targetDate,
        action: 'VERIFY',
        target: pending.member.fullName,
        firstName: pending.unmatched.firstName,
        lastName: pending.unmatched.lastName,
        lcrUpdateStatus: `Simulated deferred mark for ${pending.member.fullName}`,
      });
      continue;
    }

    const markOutcome = await MarkHelper.markMemberPresent(pending.member);
    if (Utils.isAborted()) return { newlyMarked, alreadyMarked, aborted: true };

    if (markOutcome === 'marked') {
      newlyMarked++;
      Utils.pushAttendanceLog(logs, {
        date: targetDate,
        action: 'CLICK',
        target: pending.member.fullName,
        firstName: pending.unmatched.firstName,
        lastName: pending.unmatched.lastName,
        lcrUpdateStatus: `Deferred match marked present: ${pending.member.fullName}`,
      });
    } else if (markOutcome === 'already') {
      alreadyMarked++;
      Utils.pushAttendanceLog(logs, {
        date: targetDate,
        action: 'VERIFY',
        target: pending.member.fullName,
        firstName: pending.unmatched.firstName,
        lastName: pending.unmatched.lastName,
        lcrUpdateStatus: `Deferred match already present: ${pending.member.fullName}`,
      });
    } else {
      Utils.pushAttendanceLog(logs, {
        date: targetDate,
        action: 'ERROR',
        target: pending.member.fullName,
        firstName: pending.unmatched.firstName,
        lastName: pending.unmatched.lastName,
        lcrUpdateStatus: `Deferred match failed to mark: ${pending.member.fullName}`,
      });
    }
  }

  return { newlyMarked, alreadyMarked, aborted: false };
}
