import * as Utils from '../utils';
import { Constants, Dom, Regex, Types } from '../types';
import { getLogsModalHtml, getLogsTableRowHtml } from '../templates';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Displays the execution audit log modal with each recorded attendance change.
 *
 * @param logs - Array of logged attendance events.
 * @param targetClass - Active class or quorum title.
 * @param targetDate - Sunday date processed.
 */
export function displayLogsModal(
  logs: Types.AttendanceLogEntry[],
  targetClass: string,
  targetDate: string
): void {
  document.getElementById(Dom.LOGS_OVERLAY_ID)?.remove();
  const overlay = document.createElement('div');
  overlay.id = Dom.LOGS_OVERLAY_ID;
  overlay.className = 'lcrx-modal-backdrop';

  const rowsHtml = logs
    .map((l) => {
      const targetLabel = l.target || `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'System';
      const timeStr = l.timestamp
        ? l.timestamp.includes('T')
          ? l.timestamp.split('T')[1].slice(0, 8)
          : l.timestamp
        : l.date || '';
      const detailStr =
        l.lcrUpdateStatus ||
        (typeof l.details === 'object' ? JSON.stringify(l.details) : l.details) ||
        '';

      // prettier-ignore
      return getLogsTableRowHtml(Utils.escapeHtml(timeStr), l.action ? Utils.escapeHtml(l.action) : '', Utils.escapeHtml(targetLabel), Utils.escapeHtml(detailStr));
    })
    .join('');

  overlay.innerHTML = getLogsModalHtml(Utils.escapeHtml(targetClass), targetDate, rowsHtml);
  document.body.appendChild(overlay);

  const close = () => {
    window.removeEventListener('keydown', handleKeyDown);
    overlay.remove();
  };
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
    }
  };
  window.addEventListener('keydown', handleKeyDown);

  overlay.querySelector(`#${Dom.LOGS_CLOSE_ID}`)?.addEventListener('click', close);
  overlay.querySelector(`#${Dom.LOGS_DONE_ID}`)?.addEventListener('click', close);
  overlay.querySelector(`#${Dom.LOGS_DOWNLOAD_ID}`)?.addEventListener('click', () => {
    void downloadAttendanceReport(logs, targetClass, targetDate);
  });
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Generates and triggers download of the attendance execution report as a CSV file. @internal */
export async function downloadAttendanceReport(
  logs: Types.AttendanceLogEntry[],
  targetClass: string,
  targetDate: string
): Promise<void> {
  const confirmed = await Utils.confirmDataStewardshipDownload();
  if (!confirmed) {
    Utils.showToast(Constants.STEWARDSHIP_CANCELLED_TOAST, { type: 'info' });
    return;
  }

  const filename = `attendance-actions-${targetClass.toLowerCase().replace(Regex.MULTIPLE_SPACES, '-')}-${targetDate}.csv`;
  Utils.exportLogsToCSV(filename, logs);
  Utils.showToast('Attendance action log downloaded', { type: 'success' });
}
