import { ensureAttendanceStylesInjected, getUnmatchedReviewModalHtml } from '../templates';
import { getSavedNicknames, setHtml } from '../utils';
import { Dom, Regex, Types } from '../types';
import { displayLogsModal } from './logsHelper';
import { displayManageNicknamesModal } from './nicknameHelper';
import { renderUnmatchedTable } from './unmatchedTableHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Mounts the unmatched-attendee review dialog and resolves when the user presses Continue.
 * Match actions only queue intent; LCR marking and visitor writes happen after Continue.
 *
 * @param metrics - Counts of processed, marked, already present, and unmatched names.
 * @param targetClass - Display name of the active class/quorum.
 * @param targetDate - Sunday date processed.
 * @param categories - Tailored visitor categories for the class.
 * @param unmatchedList - Array of unmatched attendees needing resolution.
 * @param wardMembers - All ward members discovered on the attendance roll.
 * @param logs - Running audit logs of all actions performed (mutated during review).
 * @param initialVisitorCounts - Optional pre-calculated visitor counts from the setup modal.
 * @param isSimulation - Whether results are from a dry-run developer simulation.
 * @returns Review result on Continue, or null if the user cancelled/closed.
 */
export async function displayUnmatchedReviewModal(
  metrics: Types.ProcessAttendanceResult,
  targetClass: string,
  targetDate: string,
  categories: Types.VisitorCategory[],
  unmatchedList: Types.UnmatchedRecord[],
  wardMembers: Types.WardMember[],
  logs: Types.AttendanceLogEntry[],
  initialVisitorCounts?: Types.VisitorCounts,
  isSimulation: boolean = false
): Promise<Types.UnmatchedReviewResult | null> {
  ensureAttendanceStylesInjected();
  document.getElementById(Dom.REVIEW_OVERLAY_ID)?.remove();

  const container = document.createElement('div');
  setHtml(container, getUnmatchedReviewModalHtml(metrics, targetClass, targetDate, isSimulation));
  const overlay = container.firstElementChild as HTMLElement;
  document.body.appendChild(overlay);

  const visitorCounts: Types.VisitorCounts = {};
  categories.forEach((cat) => {
    visitorCounts[cat] = initialVisitorCounts?.[cat] ?? 0;
  });

  const pendingMatches: Types.PendingMemberMatch[] = [];
  const skippedRecords: Types.UnmatchedRecord[] = [];
  const visitorAssigned: Types.UnmatchedRecord[] = [];
  const reviewLogStart = logs.length;

  const continueBtn = overlay.querySelector<HTMLButtonElement>(`#${Dom.REVIEW_CONTINUE_ID}`);
  if (continueBtn) {
    continueBtn.textContent = isSimulation ? 'Continue Simulation' : 'Continue';
  }

  const updateVisitorChips = () => {
    const chipsContainer = overlay.querySelector<HTMLElement>(`#${Dom.VISITOR_CHIPS_ID}`);
    if (!chipsContainer) return;
    chipsContainer.replaceChildren();

    categories.forEach((cat) => {
      const count = visitorCounts[cat] || 0;
      const chip = document.createElement('span');
      chip.className = Dom.VISITOR_BADGE;
      chip.id = `lcr-visitor-${cat.replace(Regex.MULTIPLE_SPACES, '-').toLowerCase()}`;
      chip.textContent = `${cat}: ${count}`;
      chipsContainer.appendChild(chip);
    });
  };

  updateVisitorChips();

  let savedNicknames = await getSavedNicknames();
  let refreshNicknames: Types.RefreshUnmatchedNicknames | undefined;

  const tbody = overlay.querySelector<HTMLTableSectionElement>(`#${Dom.UNMATCHED_TABLE_BODY_ID}`);
  if (tbody) {
    // prettier-ignore
    refreshNicknames = renderUnmatchedTable(tbody, overlay, unmatchedList, wardMembers, categories, visitorCounts, logs, savedNicknames, pendingMatches, skippedRecords, visitorAssigned, updateVisitorChips);
  }

  overlay
    .querySelector<HTMLButtonElement>(`#${Dom.MANAGE_NICKNAMES_BTN_ID}`)
    ?.addEventListener('click', () => {
      displayManageNicknamesModal(async () => {
        savedNicknames = await getSavedNicknames();
        refreshNicknames?.(savedNicknames);
      });
    });

  return new Promise((resolve) => {
    const closeModal = (result: Types.UnmatchedReviewResult | null) => {
      window.removeEventListener('keydown', handleKeyDown);
      overlay.remove();
      resolve(result);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);

    overlay
      .querySelector<HTMLButtonElement>(`#${Dom.REVIEW_LOGS_ID}`)
      ?.addEventListener('click', () => {
        displayLogsModal(logs, targetClass, targetDate);
      });

    continueBtn?.addEventListener('click', () => {
      closeModal({
        pendingMatches: [...pendingMatches],
        visitorCounts: { ...visitorCounts },
        skipped: [...skippedRecords],
        visitorAssigned: [...visitorAssigned],
        logs: logs.slice(reviewLogStart),
      });
    });

    overlay
      .querySelector<HTMLButtonElement>(`#${Dom.REVIEW_CLOSE_ID}`)
      ?.addEventListener('click', () => closeModal(null));
  });
}
