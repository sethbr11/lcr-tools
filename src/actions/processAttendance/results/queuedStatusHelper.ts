import * as Utils from '../utils';
import { Dom, Types } from '../types';
import { getUnmatchedQueuedStatusHtml } from '../templates';
import { decrementUnmatchedCount, incrementUnmatchedCount } from './unmatchedSkipHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Queues a deferred ward-member match, shows status with Undo, and logs the queue.
 *
 * @param ctx - Row, overlay, logs, and restore callback for the unmatched attendee.
 * @param pendingMatches - Accumulator of matches applied after Continue.
 * @param member - Ward member selected for marking.
 * @param saveNickname - Whether a nickname mapping should be saved when marking.
 * @param usedNickname - Whether status copy should mention a saved nickname.
 * @param statusDetail - Audit-log detail for the queued match.
 */
export function applyQueuedMatch(
  ctx: Types.QueuedRowContext,
  pendingMatches: Types.PendingMemberMatch[],
  member: Types.WardMember,
  saveNickname: boolean,
  usedNickname: boolean,
  statusDetail: string
): void {
  pendingMatches.push({ unmatched: ctx.rec, member, saveNickname });
  const suffix = usedNickname
    ? ' (using saved nickname) — queued to mark after Continue'
    : ' — queued to mark after Continue';
  applyQueuedStatus(
    ctx,
    `Matched to ${Utils.escapeHtml(member.fullName)}${suffix}`,
    Dom.QUEUED_MATCH_CELL,
    `Undid match queue for ${ctx.rec.fullName}`,
    () => {
      const idx = pendingMatches.findIndex(
        (p) => p.unmatched.fullName === ctx.rec.fullName && p.unmatched.date === ctx.rec.date
      );
      if (idx >= 0) pendingMatches.splice(idx, 1);
    }
  );
  Utils.pushAttendanceLog(ctx.logs, {
    date: ctx.rec.date,
    action: 'MATCH',
    target: member.fullName,
    firstName: ctx.rec.firstName,
    lastName: ctx.rec.lastName,
    lcrUpdateStatus: statusDetail,
  });
}

/**
 * Queues an unmatched attendee as a visitor, shows status with Undo, and logs the queue.
 *
 * @param ctx - Row, overlay, logs, and restore callback for the unmatched attendee.
 * @param category - Visitor category assigned.
 * @param visitorCounts - Counts of visitors per category (mutated in place).
 * @param visitorAssigned - Accumulator of attendees queued as visitors.
 * @param onVisitorCountChanged - Callback invoked when visitor counts update.
 */
export function queueVisitorAssignment(
  ctx: Types.QueuedRowContext,
  category: Types.VisitorCategory,
  visitorCounts: Types.VisitorCounts,
  visitorAssigned: Types.UnmatchedRecord[],
  onVisitorCountChanged: () => void
): void {
  visitorCounts[category] = (visitorCounts[category] || 0) + 1;
  onVisitorCountChanged();
  visitorAssigned.push(ctx.rec);
  applyQueuedStatus(
    ctx,
    `${Utils.escapeHtml(ctx.rec.fullName)} — queued as ${category} visitor (saved after Continue)`,
    Dom.QUEUED_VISITOR_CELL,
    `Undid visitor queue for ${ctx.rec.fullName}`,
    () => {
      const assignedIdx = visitorAssigned.findIndex(
        (r) => r.fullName === ctx.rec.fullName && r.date === ctx.rec.date
      );
      if (assignedIdx >= 0) visitorAssigned.splice(assignedIdx, 1);
      visitorCounts[category] = Math.max(0, (visitorCounts[category] || 0) - 1);
      onVisitorCountChanged();
    }
  );
  Utils.pushAttendanceLog(ctx.logs, {
    date: ctx.rec.date,
    action: 'INPUT',
    target: ctx.rec.fullName,
    firstName: ctx.rec.firstName,
    lastName: ctx.rec.lastName,
    lcrUpdateStatus: `Queued ${ctx.rec.fullName} as ${category} visitor`,
  });
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Replaces a row with queued status HTML and binds Undo to restore the original row. */
function applyQueuedStatus(
  ctx: Types.QueuedRowContext,
  messageEscaped: string,
  cellClass: string,
  undoDetail: string,
  onUndo: () => void
): void {
  Utils.setHtml(ctx.tr, getUnmatchedQueuedStatusHtml(messageEscaped, cellClass));
  decrementUnmatchedCount(ctx.overlay);
  ctx.tr
    .querySelector<HTMLButtonElement>(`.${Dom.QUEUED_UNDO_BTN}`)
    ?.addEventListener('click', () => {
      onUndo();
      incrementUnmatchedCount(ctx.overlay);
      Utils.pushAttendanceLog(ctx.logs, {
        date: ctx.rec.date,
        action: 'UNDO',
        target: ctx.rec.fullName,
        firstName: ctx.rec.firstName,
        lastName: ctx.rec.lastName,
        lcrUpdateStatus: undoDetail,
      });
      ctx.rebindRow();
    });
}
