import { confirmDataStewardshipDownload, downloadFile, escapeHtml, showToast } from '../utils';
import { Constants, Dom, Types } from '../types';
import { getTripLogs } from './stateHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Displays the Trip Planner execution log modal dialog.
 */
export function showTripLogsModal(): void {
  document.getElementById(Dom.LOGS_MODAL_OVERLAY_ID)?.remove();
  const overlay = document.createElement('div');
  overlay.id = Dom.LOGS_MODAL_OVERLAY_ID;
  overlay.className = 'trip-modal-backdrop';

  const logs = getTripLogs();
  const rowsHtml = logs
    .map(
      (log) => `
      <tr>
        <td class="trip-log-time">${escapeHtml(log.timestamp)}</td>
        <td class="trip-log-message">${escapeHtml(log.message)}</td>
      </tr>
    `
    )
    .join('');

  overlay.innerHTML = `
    <div class="trip-modal-card">
      <div class="trip-modal-header">
        <h2 class="trip-modal-title">${Constants.LOGS_MODAL_TITLE}</h2>
        <button type="button" class="trip-close-btn" id="${Dom.LOGS_MODAL_CLOSE_ID}">&times;</button>
      </div>
      <div class="trip-modal-body">
        <div class="trip-table-scroll">
          <table class="trip-table">
            <thead>
              <tr>
                <th style="width: 100px;">Time</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="2" class="trip-no-logs">${Constants.LOGS_NO_ENTRIES}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      <div class="trip-modal-footer">
        <button type="button" class="lcr-tools-btn lcr-tools-btn-tertiary" id="${Dom.LOGS_MODAL_DOWNLOAD_ID}" style="width: auto; margin: 0;">Download Log</button>
        <button type="button" class="lcr-tools-btn lcr-tools-btn-primary" id="${Dom.LOGS_MODAL_DONE_ID}" style="width: auto; margin: 0;">Done</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = (): void => {
    window.removeEventListener('keydown', handleKeyDown);
    overlay.remove();
  };

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') close();
  };

  window.addEventListener('keydown', handleKeyDown);
  overlay.querySelector(`#${Dom.LOGS_MODAL_CLOSE_ID}`)?.addEventListener('click', close);
  overlay.querySelector(`#${Dom.LOGS_MODAL_DONE_ID}`)?.addEventListener('click', close);
  overlay.querySelector(`#${Dom.LOGS_MODAL_DOWNLOAD_ID}`)?.addEventListener('click', () => {
    void downloadTripLogs(logs);
  });
}

/**
 * Downloads execution logs as a text file after Church data stewardship confirmation.
 *
 * @param logs - Array of trip log entries to download.
 */
export async function downloadTripLogs(logs: Types.TripLogEntry[]): Promise<void> {
  const confirmed = await confirmDataStewardshipDownload();
  if (!confirmed) {
    showToast(Constants.STEWARDSHIP_CANCELLED_TOAST, { type: 'info' });
    return;
  }

  const lines = logs.map((log) => `[${log.timestamp}] ${log.message}`).join('\n');
  downloadFile(lines, Constants.LOG_FILENAME, 'text/plain;charset=utf-8;');
  showToast(Constants.LOGS_DOWNLOADED_TOAST, { type: 'success' });
}
