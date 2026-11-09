import { Dom } from '../types';

/* ==========================================================================
   ACTION LOGS MODAL
   ========================================================================== */

/**
 * Generates the Action Execution Logs modal card HTML (backdrop is created by the caller).
 *
 * @param targetClassEscaped - HTML-escaped class or quorum title.
 * @param targetDate - Sunday date processed (YYYY-MM-DD).
 * @param rowsHtml - Pre-rendered table body rows for each log entry.
 * @returns HTML string for the logs dialog card.
 */
export function getLogsModalHtml(
  targetClassEscaped: string,
  targetDate: string,
  rowsHtml: string
): string {
  return `
    <div class="lcrx-modal-card lcrx-edit-card" style="max-width: 840px;">
      <div class="lcrx-modal-header">
        <h2 class="lcrx-modal-title">Action Execution Logs &bull; ${targetClassEscaped} (${targetDate})</h2>
        <button type="button" class="lcrx-close-btn" id="${Dom.LOGS_CLOSE_ID}">&times;</button>
      </div>
      <div class="lcrx-modal-body">
        <div class="lcrx-table-scroll lcrx-edit-scroll" style="max-height: 440px;">
          <table class="lcrx-table">
            <thead>
              <tr>
                <th style="width: 85px;">Time</th>
                <th style="width: 95px;">Action</th>
                <th style="width: 180px;">Target</th>
                <th>Details / Status</th>
              </tr>
            </thead>
            <tbody>${rowsHtml || '<tr><td colspan="4">No actions logged.</td></tr>'}</tbody>
          </table>
        </div>
      </div>
      <div class="lcrx-modal-footer lcrx-footer-between">
        <button type="button" class="lcrx-btn lcrx-btn-secondary" id="${Dom.LOGS_DOWNLOAD_ID}">Download</button>
        <button type="button" class="lcrx-btn lcrx-btn-primary" id="${Dom.LOGS_DONE_ID}">Done</button>
      </div>
    </div>
  `;
}

/**
 * Generates a single attendance audit log table row.
 *
 * @param timeEscaped - HTML-escaped timestamp display string.
 * @param actionEscaped - HTML-escaped action label, or empty for default badge.
 * @param targetEscaped - HTML-escaped target label.
 * @param detailEscaped - HTML-escaped detail / status text.
 * @returns HTML string for one logs table row.
 */
export function getLogsTableRowHtml(
  timeEscaped: string,
  actionEscaped: string,
  targetEscaped: string,
  detailEscaped: string
): string {
  const actionBadge = actionEscaped
    ? `<span class="lcrx-badge" style="font-size: 10px; font-weight: 700; text-transform: uppercase; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px;">${actionEscaped}</span>`
    : `<span class="lcrx-badge" style="font-size: 10px; font-weight: 700; text-transform: uppercase; background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px;">ACTION</span>`;

  return `
    <tr>
      <td style="white-space: nowrap; font-family: monospace; font-size: 12px; color: #64748b;">${timeEscaped}</td>
      <td>${actionBadge}</td>
      <td><strong>${targetEscaped}</strong></td>
      <td>${detailEscaped}</td>
    </tr>
  `;
}
