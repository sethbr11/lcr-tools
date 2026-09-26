import { Dom, Types } from '../types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Decrements unmatched counter badges in the review modal.
 *
 * @param overlay - Review modal overlay containing unmatched count badges.
 */
export function decrementUnmatchedCount(overlay: HTMLElement): void {
  adjustUnmatchedCount(overlay, -1);
}

/**
 * Increments unmatched counter badges in the review modal.
 *
 * @param overlay - Review modal overlay containing unmatched count badges.
 */
export function incrementUnmatchedCount(overlay: HTMLElement): void {
  adjustUnmatchedCount(overlay, 1);
}

/**
 * Rebuilds the skipped-attendee undo chip bar in the review modal.
 *
 * @param overlay - Review modal overlay containing the skipped bar.
 * @param skippedList - Skip entries with row elements for undo restore.
 * @param skippedRecords - Accumulator of skipped unmatched attendees.
 */
export function updateSkippedBar(
  overlay: HTMLElement,
  skippedList: Types.SkippedUnmatchedItem[],
  skippedRecords: Types.UnmatchedRecord[]
): void {
  const bar = overlay.querySelector<HTMLElement>(`#${Dom.REVIEW_SKIPPED_BAR_ID}`);
  const chipsContainer = overlay.querySelector<HTMLElement>(`#${Dom.SKIPPED_CHIPS_ID}`);
  if (!bar || !chipsContainer) return;

  if (skippedList.length === 0) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  chipsContainer.innerHTML = '';

  skippedList.forEach((item, idx) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = Dom.SKIP_CHIP;
    chip.textContent = `${item.rec.fullName} (undo)`;
    chip.addEventListener('click', () => {
      item.rowEl.style.display = '';
      skippedList.splice(idx, 1);
      const recIdx = skippedRecords.findIndex(
        (r) => r.fullName === item.rec.fullName && r.date === item.rec.date
      );
      if (recIdx >= 0) skippedRecords.splice(recIdx, 1);
      incrementUnmatchedCount(overlay);
      updateSkippedBar(overlay, skippedList, skippedRecords);
    });
    chipsContainer.appendChild(chip);
  });
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Adjusts unmatched counter badges in the review modal by a relative delta. */
function adjustUnmatchedCount(overlay: HTMLElement, delta: number): void {
  const badge = overlay.querySelector<HTMLElement>(`#${Dom.UNMATCHED_STAT_ID}`);
  const countSpan = overlay.querySelector<HTMLElement>(`#${Dom.UNMATCHED_COUNT_ID}`);
  const cur = parseInt(badge?.textContent || '0', 10);
  const next = Math.max(0, cur + delta);
  if (badge) badge.textContent = String(next);
  if (countSpan) countSpan.textContent = String(next);
}
