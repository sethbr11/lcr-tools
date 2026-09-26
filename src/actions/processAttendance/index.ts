import * as Utils from './utils';
import { Types } from './types';
import * as Setup from './setup/setupHelper';
import * as Sync from './lcr/syncHelper';
import * as Roll from './lcr/rollHelper';
import * as ProcessMembers from './members/processMembersHelper';
import * as Simulate from './members/simulateHelper';
import * as ClassHelper from './setup/classHelper';
import * as Visitors from './lcr/visitorsHelper';
import * as Review from './results/reviewHelper';
import * as Completion from './results/completionHelper';

/**
 * Main entrypoint orchestrating the Process Attendance action.
 *
 * Pipeline Steps:
 *   1. Verify LCR attendance page structure matches expected setup.
 *   2. Present compact setup modal to select class, Sunday, headcount, and paste records.
 *   3. Synchronize LCR page state (Members tab, Month, Class, Sunday view).
 *   4. Wait for and scan the ward members roll.
 *   5. Auto-match and mark (or simulate) attendees against the ward roll.
 *   6. Present unmatched review modal (queue matches/visitors; Continue).
 *   7. Mark deferred matches alphabetically, then write visitor counts once.
 *   8. Present completion modal (View Logs / Finish).
 *
 * @param overrideOptions - Optional pre-configured execution options.
 * @returns ActionResult indicating overall success and metrics.
 */
export async function runProcessAttendance(
  overrideOptions?: Partial<Types.ProcessAttendanceOptions>
): Promise<Types.ActionResult<Types.ProcessAttendanceResult>> {
  Utils.resetAborted();

  // Step 1: Verify LCR page setup
  if (!Sync.verifyLcrAttendanceSetup()) {
    // prettier-ignore
    Utils.showLcrMaintenanceModal('Process Attendance', 'The attendance table or navigation controls could not be located on this page.');
    return { success: false, error: 'LCR setup mismatch' };
  }

  // Step 2: Prompt user with compact setup modal
  const setupData = await Setup.promptAttendanceSetup(overrideOptions?.isSimulation);
  if (!setupData) return { success: false, error: 'Cancelled by user' };

  const { options, parsedResult } = setupData;
  const isSimulation = options.isSimulation ?? overrideOptions?.isSimulation ?? false;
  const { targetClassValue, targetClassText, targetDate } = options;
  const rawAttendees = parsedResult.names;

  if (rawAttendees.length === 0) {
    Utils.showToast('No valid attendee names were found to process.', { type: 'warning' });
    return { success: false, error: 'No names' };
  }

  const attendees = Utils.sortAttendeesAlphabetically(rawAttendees);
  const logs: Types.AttendanceLogEntry[] = [];
  const activeClassName = targetClassText || 'Sunday Attendance';

  return Utils.withEscapeAbort(async () => {
    const showAbortCompletion = async (
      marked: number,
      already: number,
      unmatchedRemaining: number
    ): Promise<Types.ActionResult<Types.ProcessAttendanceResult>> => {
      Utils.hideLoadingIndicator();
      Utils.pushAttendanceLog(logs, {
        date: targetDate,
        action: 'ABORT',
        target: 'Process Attendance',
        lcrUpdateStatus:
          'User aborted with Escape. Open View Logs for work completed before the stop.',
      });
      await Completion.displayCompletionModal(
        {
          total: attendees.length,
          marked,
          already,
          unmatchedRemaining,
          visitorsSaved: 0,
          aborted: true,
        },
        activeClassName,
        targetDate,
        logs,
        isSimulation
      );
      return {
        success: false,
        error: 'Processing cancelled by user',
        data: { total: attendees.length, marked, already, unmatched: unmatchedRemaining },
      };
    };

    // Step 3: Synchronize LCR state
    Utils.showLoadingIndicator('Preparing LCR attendance roll...', 'Press ESC to cancel');
    // prettier-ignore
    const syncStatus = await Sync.synchronizeAttendancePage({ targetDate, targetClassValue, targetClassText }, logs);
    if (syncStatus === 'aborted' || Utils.isAborted()) {
      return showAbortCompletion(0, 0, attendees.length);
    }

    // Step 4: Wait for ward members roll to render
    // prettier-ignore
    Utils.showLoadingIndicator('Loading attendance roll...', 'Waiting for ward members (Press ESC to cancel)');
    const wardMembers = await Roll.waitAndLoadWardMembers();
    if (Utils.isAborted()) return showAbortCompletion(0, 0, attendees.length);

    if (wardMembers.length === 0) {
      Utils.hideLoadingIndicator();
      // prettier-ignore
      Utils.showLcrMaintenanceModal('Process Attendance', 'No ward members could be discovered on the active roll. Table row or member card selectors may have changed.');
      return { success: false, error: 'LCR setup mismatch - no members found' };
    }

    // Step 5: Auto-match attendees against ward roll
    let newlyMarked = 0;
    let alreadyMarked = 0;
    let unmatchedList: Types.UnmatchedRecord[] = [];

    if (isSimulation) {
      // prettier-ignore
      Utils.showLoadingIndicator(`Simulating ${attendees.length} attendees...`, 'Testing roll & toggle (Press ESC to cancel)');
      // prettier-ignore
      const simResult = await Simulate.simulateMemberRollProcessing(attendees, wardMembers, targetDate);
      if (Utils.isAborted()) {
        logs.push(...simResult.logs);
        return showAbortCompletion(
          simResult.newlyMarked,
          simResult.alreadyMarked,
          simResult.unmatchedList.length
        );
      }

      newlyMarked = simResult.newlyMarked;
      alreadyMarked = simResult.alreadyMarked;
      unmatchedList = simResult.unmatchedList;
      logs.push(...simResult.logs);
    } else {
      // prettier-ignore
      const markResult = await ProcessMembers.processMembersAgainstRoll(attendees, wardMembers, targetDate, logs);
      if (markResult.aborted) {
        return showAbortCompletion(
          markResult.newlyMarked,
          markResult.alreadyMarked,
          markResult.unmatchedList.length
        );
      }
      newlyMarked = markResult.newlyMarked;
      alreadyMarked = markResult.alreadyMarked;
      unmatchedList = markResult.unmatchedList;
    }

    Utils.hideLoadingIndicator();

    // Step 6: Unmatched review (queue matches/visitors; Continue)
    const categories = ClassHelper.getVisitorCategoriesForClass(activeClassName);
    const metrics: Types.ProcessAttendanceResult = {
      total: attendees.length,
      marked: newlyMarked,
      already: alreadyMarked,
      unmatched: unmatchedList.length,
    };

    // prettier-ignore
    const review = await Review.displayUnmatchedReviewModal(metrics, activeClassName, targetDate, categories, unmatchedList, wardMembers, logs, options.visitorCounts, isSimulation);
    if (!review) return { success: false, error: 'Cancelled by user' };

    // Step 7: Deferred alphabetical marks, then one visitor write (or sim probe)
    Utils.showLoadingIndicator('Applying review matches...', 'Press ESC to cancel');
    // prettier-ignore
    const deferred = await ProcessMembers.markPendingMatches(review.pendingMatches, targetDate, logs, isSimulation);
    if (deferred.aborted) {
      return showAbortCompletion(
        newlyMarked + deferred.newlyMarked,
        alreadyMarked + deferred.alreadyMarked,
        Math.max(0, unmatchedList.length - review.pendingMatches.length)
      );
    }
    newlyMarked += deferred.newlyMarked;
    alreadyMarked += deferred.alreadyMarked;

    let visitorsSaved = 0;
    if (isSimulation) {
      Utils.showLoadingIndicator('Testing visitor input...', 'Enter, save, clear, verify');
      const visitorSim = await Simulate.simulateVisitorEntryAndRestore(targetDate);
      if (Utils.isAborted()) {
        return showAbortCompletion(newlyMarked, alreadyMarked, unmatchedList.length);
      }

      Utils.pushAttendanceLog(logs, {
        date: targetDate,
        action: 'INPUT',
        target: 'Visitor Input',
        firstName: 'Visitors',
        lastName: 'Simulation Test',
        lcrUpdateStatus: visitorSim.logMessage,
      });
    } else {
      const totalVisitors = Object.values(review.visitorCounts).reduce(
        (sum, n) => sum + (n || 0),
        0
      );
      if (totalVisitors > 0) {
        Utils.showLoadingIndicator('Saving visitor counts to LCR...', 'One-time write');
        const visitorResult = await Visitors.processClassVisitorCounts(
          activeClassName,
          targetDate,
          review.visitorCounts,
          logs
        );
        if (!visitorResult.success) {
          Utils.hideLoadingIndicator();
          Utils.showToast(visitorResult.error || 'Failed to save visitor counts', {
            type: 'error',
          });
          return { success: false, error: visitorResult.error || 'Visitor save failed' };
        }
        visitorsSaved = totalVisitors;
      }
    }

    Utils.hideLoadingIndicator();

    // Step 8: Completion modal
    // prettier-ignore
    const unmatchedRemaining = Math.max(0, unmatchedList.length - review.pendingMatches.length - review.skipped.length - review.visitorAssigned.length);
    const completionMetrics: Types.AttendanceCompletionMetrics = {
      total: attendees.length,
      marked: newlyMarked,
      already: alreadyMarked,
      unmatchedRemaining,
      visitorsSaved,
      aborted: false,
    };

    // prettier-ignore
    await Completion.displayCompletionModal(completionMetrics, activeClassName, targetDate, logs, isSimulation);

    return {
      success: true,
      data: {
        total: attendees.length,
        marked: newlyMarked,
        already: alreadyMarked,
        unmatched: unmatchedRemaining,
      },
    };
  });
}
