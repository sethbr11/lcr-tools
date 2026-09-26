import { escapeHtml } from '../utils';
import { Dom, Types } from '../types';

/* ==========================================================================
   COMPLETION MODAL
   ========================================================================== */

/**
 * Generates the post-Continue completion modal HTML.
 *
 * @param metrics - Final summary counts, including whether the run was aborted.
 * @param targetClass - Display name of the class processed.
 * @param targetDate - Sunday date processed.
 * @param isSimulation - Whether results are from a dry-run developer simulation.
 * @returns HTML string for the completion dialog.
 */
export function getCompletionModalHtml(
  metrics: Types.AttendanceCompletionMetrics,
  targetClass: string,
  targetDate: string,
  isSimulation: boolean = false
): string {
  const aborted = metrics.aborted;
  const simBadge = isSimulation
    ? `<span class="${Dom.SIMULATION_BADGE}">${aborted ? 'SIMULATION STOPPED (DRY RUN)' : 'SIMULATION COMPLETE (DRY RUN)'}</span>`
    : '';
  const title = aborted ? 'Attendance Processing Stopped' : 'Attendance Process Complete';
  const body = aborted
    ? 'You stopped processing with Escape. Nothing further was written to LCR. Open View Logs to see what completed before the abort.'
    : isSimulation
      ? 'Simulation finished. No lasting visitor changes should remain on LCR.'
      : 'Matched members were marked and visitor counts were saved to LCR in one pass.';

  return `
    <div class="lcrx-modal-backdrop" id="${Dom.COMPLETION_OVERLAY_ID}">
      <div class="lcrx-modal-card lcrx-results-card" style="max-width: 520px;">
        <div class="lcrx-modal-header">
          <div>
            <div style="display: flex; align-items: center;">
              <h2 class="lcrx-modal-title">${title}</h2>
              ${simBadge}
            </div>
            <div class="lcrx-modal-subtitle">${escapeHtml(targetClass)} &bull; ${escapeHtml(targetDate)}</div>
          </div>
          <button type="button" class="lcrx-close-btn" id="${Dom.COMPLETION_CLOSE_ID}" aria-label="Close">&times;</button>
        </div>
        <div class="lcrx-modal-body">
          <p style="margin: 0 0 14px; color: #334155; font-size: 14px;">
            ${body}
          </p>
          <div class="lcrx-metrics-row">
            <div class="lcrx-metric-pill lcrx-metric-total">
              <span class="lcrx-metric-num">${metrics.total}</span>
              <span class="lcrx-metric-lbl">Total</span>
            </div>
            <div class="lcrx-metric-pill lcrx-metric-marked">
              <span class="lcrx-metric-num">${metrics.marked}</span>
              <span class="lcrx-metric-lbl">Marked</span>
            </div>
            <div class="lcrx-metric-pill lcrx-metric-already">
              <span class="lcrx-metric-num">${metrics.already}</span>
              <span class="lcrx-metric-lbl">Already</span>
            </div>
            <div class="lcrx-metric-pill">
              <span class="lcrx-metric-num">${metrics.visitorsSaved}</span>
              <span class="lcrx-metric-lbl">Visitors</span>
            </div>
          </div>
          ${
            metrics.unmatchedRemaining > 0
              ? `<p style="margin: 12px 0 0; font-size: 13px; color: #64748b;">${metrics.unmatchedRemaining} unmatched attendee(s) were skipped or left unresolved.</p>`
              : ''
          }
        </div>
        <div class="lcrx-modal-footer lcrx-footer-between">
          <button type="button" id="${Dom.COMPLETION_LOGS_ID}" class="lcrx-btn lcrx-btn-secondary">View Logs</button>
          <button type="button" id="${Dom.COMPLETION_DONE_ID}" class="lcrx-btn lcrx-btn-primary">Finish</button>
        </div>
      </div>
    </div>
  `;
}
