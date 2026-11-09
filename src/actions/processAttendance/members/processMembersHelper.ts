import * as Utils from '../utils';
import { Constants, Types } from '../types';
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

  // prettier-ignore
  Utils.showLoadingIndicator(`Processing ${attendees.length} attendees on LCR...`, 'Press ESC to cancel');

  // Step 1: Match every attendee first (no clicks), collecting exact single matches to mark
  const toMark: Types.BatchMarkEntry[] = [];
  for (const attendee of attendees) {
    const fullName = `${attendee.firstName} ${attendee.lastName}`.trim();
    const exactIndices = Utils.findExactMemberIndices(fullName, wardMembers);
    if (exactIndices.length === 1) {
      toMark.push({
        member: wardMembers[exactIndices[0]],
        firstName: attendee.firstName,
        lastName: attendee.lastName,
      });
      continue;
    }

    // prettier-ignore
    Utils.recordUnmatchedAttendee(attendee, exactIndices, wardMembers, targetDate, false, unmatchedList, logs);
  }

  // Step 2: Click quickly, then verify every mark and re-click any LCR dropped
  const batch = await markMembersInBatch(toMark, targetDate, logs);
  newlyMarked = batch.newlyMarked;
  alreadyMarked = batch.alreadyMarked;
  if (batch.aborted) return { newlyMarked, alreadyMarked, unmatchedList, logs, aborted: true };

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

  if (isSimulation) {
    for (const pending of sorted) {
      if (Utils.isAborted()) return { newlyMarked, alreadyMarked, aborted: true };
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
    }
    return { newlyMarked, alreadyMarked, aborted: false };
  }

  const batch = await markMembersInBatch(
    sorted.map((pending) => ({
      member: pending.member,
      firstName: pending.unmatched.firstName,
      lastName: pending.unmatched.lastName,
    })),
    targetDate,
    logs,
    'review match'
  );
  return {
    newlyMarked: batch.newlyMarked,
    alreadyMarked: batch.alreadyMarked,
    aborted: batch.aborted,
  };
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/**
 * Marks members present quickly, then verifies.
 * Clicks every button with a short fixed gap without waiting for each save, then waits for LCR to
 * settle, confirms each button shows present, and re-clicks any that did not register (LCR
 * sometimes drops clicks), up to Constants.MARK_RETRY_ROUNDS times.
 */
async function markMembersInBatch(
  entries: Types.BatchMarkEntry[],
  targetDate: string,
  logs: Types.AttendanceLogEntry[],
  label: string = 'attendee'
): Promise<Types.MarkPendingMatchesResult> {
  let newlyMarked = 0;
  let alreadyMarked = 0;
  const log: Types.BatchMarkLogFn = (entry, action, status) =>
    Utils.pushAttendanceLog(logs, {
      date: targetDate,
      action,
      target: entry.member.fullName,
      firstName: entry.firstName,
      lastName: entry.lastName,
      lcrUpdateStatus: status,
    });

  // A member can match more than one roster row (e.g. "John Smith" and "John A. Smith") or be
  // queued twice in review. Clicking twice before the first save shows would toggle them back
  // off, so each member is clicked once and the extra rows are only logged.
  const seen = new Set<Types.WardMember>();
  const uniqueEntries = entries.filter((entry) => {
    if (!seen.has(entry.member)) return seen.add(entry.member);
    log(
      entry,
      'VERIFY',
      `${entry.firstName} ${entry.lastName} also matched ${entry.member.fullName}, who is already being marked (duplicate row skipped)`
    );
    return false;
  });

  // Pass 1: click every button, paced but without waiting for each save
  let pending: Types.BatchMarkEntry[] = [];
  for (let i = 0; i < uniqueEntries.length; i++) {
    if (Utils.isAborted()) {
      newlyMarked += await settleAbortedClicks(pending, log);
      return { newlyMarked, alreadyMarked, aborted: true };
    }
    const entry = uniqueEntries[i];
    // prettier-ignore
    Utils.showLoadingIndicator(`Marking ${label} ${i + 1} of ${uniqueEntries.length}...`, `${entry.member.fullName} (Press ESC to cancel)`);

    const outcome = MarkHelper.clickAttendanceButton(entry.member);
    if (outcome === 'already') {
      alreadyMarked++;
      log(
        entry,
        'VERIFY',
        `Verified already marked present for ${entry.member.fullName} (No click needed)`
      );
      continue;
    }
    if (outcome === 'error') {
      log(entry, 'ERROR', `Could not find the attendance button for ${entry.member.fullName}`);
      continue;
    }
    // 'busy' means a save is already in flight; verify it like a fresh click
    pending.push(entry);
    await Utils.sleep(Constants.MARK_CLICK_GAP_MS);
  }

  // Pass 2+: wait for saves, confirm, and re-click anything LCR dropped
  for (let round = 0; pending.length > 0; round++) {
    // prettier-ignore
    Utils.showLoadingIndicator(`Checking ${pending.length} marks saved in LCR...`, 'Press ESC to cancel');
    const stillPending = pending;
    await Utils.waitForCondition(
      () =>
        Utils.isAborted() || stillPending.every((e) => MarkHelper.isMemberMarkedPresent(e.member)),
      Constants.MARK_VERIFY_SETTLE_MS,
      Constants.MARK_PRESENT_POLL_MS
    );

    const notYet: Types.BatchMarkEntry[] = [];
    for (const entry of pending) {
      if (!MarkHelper.isMemberMarkedPresent(entry.member)) {
        notYet.push(entry);
        continue;
      }
      newlyMarked++;
      entry.member.isPresent = true;
      const retryNote = round > 0 ? ` after ${round} retr${round === 1 ? 'y' : 'ies'}` : '';
      log(
        entry,
        'CLICK',
        `Clicked attendance checkbox for ${entry.member.fullName} (Newly Marked Present${retryNote})`
      );
    }
    if (Utils.isAborted()) {
      newlyMarked += await settleAbortedClicks(notYet, log);
      return { newlyMarked, alreadyMarked, aborted: true };
    }

    if (notYet.length === 0) break;
    if (round >= Constants.MARK_RETRY_ROUNDS) {
      for (const entry of notYet) {
        log(
          entry,
          'ERROR',
          `Attendance for ${entry.member.fullName} did not register after ${round} retries`
        );
      }
      break;
    }

    // prettier-ignore
    Utils.showLoadingIndicator(`Re-marking ${notYet.length} that didn't register...`, 'Press ESC to cancel');
    for (const entry of notYet) {
      if (Utils.isAborted()) {
        newlyMarked += await settleAbortedClicks(notYet, log);
        return { newlyMarked, alreadyMarked, aborted: true };
      }
      // Leave buttons that are still saving alone; another click would undo the mark
      if (MarkHelper.isMemberMarkBusy(entry.member)) continue;
      if (MarkHelper.clickAttendanceButton(entry.member) === 'clicked') {
        log(
          entry,
          'RETRY',
          `Re-clicked attendance for ${entry.member.fullName} (previous click didn't register)`
        );
      }
      await Utils.sleep(Constants.MARK_CLICK_GAP_MS);
    }
    pending = notYet;
  }

  return { newlyMarked, alreadyMarked, aborted: false };
}

/**
 * Accounts for clicks already sent when the user stops a run.
 * Waits briefly for in-flight saves to settle, then logs each entry as marked or as sent but
 * unconfirmed. Never clicks anything.
 *
 * @returns Number of entries confirmed present.
 */
async function settleAbortedClicks(
  clicked: Types.BatchMarkEntry[],
  log: Types.BatchMarkLogFn
): Promise<number> {
  await Utils.waitForCondition(
    () => clicked.every((e) => !MarkHelper.isMemberMarkBusy(e.member)),
    Constants.MARK_ABORT_SETTLE_MS,
    Constants.MARK_PRESENT_POLL_MS
  );

  let confirmed = 0;
  for (const entry of clicked) {
    if (MarkHelper.isMemberMarkedPresent(entry.member)) {
      confirmed++;
      entry.member.isPresent = true;
      log(
        entry,
        'CLICK',
        `Clicked attendance checkbox for ${entry.member.fullName} (Newly Marked Present)`
      );
      continue;
    }
    log(
      entry,
      'ERROR',
      `Click sent for ${entry.member.fullName} but the save was not confirmed before the run was stopped`
    );
  }
  return confirmed;
}
