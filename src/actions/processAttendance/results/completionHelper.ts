import { ensureAttendanceStylesInjected, getCompletionModalHtml } from '../templates';
import { setHtml } from '../utils';
import { Dom, Types } from '../types';
import { displayLogsModal } from './logsHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Mounts the post-Continue completion dialog with summary metrics, View Logs, and Finish.
 *
 * @param metrics - Final summary counts after deferred marks and visitor write.
 * @param targetClass - Display name of the active class/quorum.
 * @param targetDate - Sunday date processed.
 * @param logs - Full audit logs for the run.
 * @param isSimulation - Whether results are from a dry-run developer simulation.
 */
export async function displayCompletionModal(
  metrics: Types.AttendanceCompletionMetrics,
  targetClass: string,
  targetDate: string,
  logs: Types.AttendanceLogEntry[],
  isSimulation: boolean = false
): Promise<void> {
  ensureAttendanceStylesInjected();
  document.getElementById(Dom.COMPLETION_OVERLAY_ID)?.remove();

  const container = document.createElement('div');
  setHtml(container, getCompletionModalHtml(metrics, targetClass, targetDate, isSimulation));
  const overlay = container.firstElementChild as HTMLElement;
  document.body.appendChild(overlay);

  return new Promise((resolve) => {
    const closeModal = () => {
      window.removeEventListener('keydown', handleKeyDown);
      overlay.remove();
      resolve();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);

    overlay
      .querySelector<HTMLButtonElement>(`#${Dom.COMPLETION_LOGS_ID}`)
      ?.addEventListener('click', () => {
        displayLogsModal(logs, targetClass, targetDate);
      });

    overlay
      .querySelector<HTMLButtonElement>(`#${Dom.COMPLETION_DONE_ID}`)
      ?.addEventListener('click', closeModal);

    overlay
      .querySelector<HTMLButtonElement>(`#${Dom.COMPLETION_CLOSE_ID}`)
      ?.addEventListener('click', closeModal);
  });
}
