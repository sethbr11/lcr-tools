import * as Utils from '../utils';
import { ensureAttendanceStylesInjected, getEditTableRowHtml, getEditViewHtml } from '../templates';
import { Dom, Types } from '../types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Mounts the interactive inline record editor modal for reviewing and modifying pasted rows.
 *
 * @param rows - Current parsed attendance rows.
 * @param onApply - Callback returning edited rows.
 */
export function displayEditView(
  rows: Types.ParsedAttendanceRow[],
  onApply: (updated: Types.ParsedAttendanceRow[]) => void
): void {
  ensureAttendanceStylesInjected();
  document.getElementById(Dom.EDIT_VIEW_CONTAINER_ID)?.remove();

  const container = document.createElement('div');
  Utils.setHtml(container, getEditViewHtml());
  const overlay = container.firstElementChild as HTMLElement;
  document.body.appendChild(overlay);

  const tbody = overlay.querySelector<HTMLTableSectionElement>(`#${Dom.EDIT_TABLE_BODY_ID}`);
  if (!tbody) return;

  const currentList = [...rows];

  const renderRows = () => {
    tbody.replaceChildren();
    currentList.forEach((r, idx) => {
      const tr = document.createElement('tr');
      // prettier-ignore
      Utils.setHtml(tr, getEditTableRowHtml(Utils.escapeHtml(r.normalizedDateStr || ''), Utils.escapeHtml(r.firstName), Utils.escapeHtml(r.lastName), idx));
      tbody.appendChild(tr);
    });
  };

  renderRows();

  tbody.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains(Dom.EDIT_DELETE)) {
      const idx = parseInt(target.dataset.idx || '-1', 10);
      if (idx >= 0) {
        currentList.splice(idx, 1);
        renderRows();
      }
    }
  });

  overlay
    .querySelector<HTMLButtonElement>(`#${Dom.EDIT_ADD_ROW_ID}`)
    ?.addEventListener('click', () => {
      currentList.push({
        rowNum: currentList.length + 1,
        rawTimestamp: '',
        datePortion: '',
        firstName: '',
        lastName: '',
        dateObj: null,
        normalizedDateStr: '',
      });
      renderRows();
    });

  overlay
    .querySelector<HTMLButtonElement>(`#${Dom.EDIT_CLEAR_ALL_ID}`)
    ?.addEventListener('click', () => {
      currentList.length = 0;
      renderRows();
    });

  const closeEdit = () => overlay.remove();
  overlay.querySelector(`#${Dom.EDIT_CLOSE_ID}`)?.addEventListener('click', closeEdit);

  overlay
    .querySelector<HTMLButtonElement>(`#${Dom.EDIT_DONE_ID}`)
    ?.addEventListener('click', () => {
      const trs = Array.from(tbody.querySelectorAll('tr'));
      const updatedRows: Types.ParsedAttendanceRow[] = trs.map((tr, i) => {
        const dateInput = tr.querySelector<HTMLInputElement>(`.${Dom.EDIT_DATE}`);
        const firstInput = tr.querySelector<HTMLInputElement>(`.${Dom.EDIT_FIRST}`);
        const lastInput = tr.querySelector<HTMLInputElement>(`.${Dom.EDIT_LAST}`);
        const dateStr = dateInput?.value.trim() || '';
        return {
          rowNum: i + 1,
          rawTimestamp: dateStr,
          datePortion: dateStr,
          firstName: firstInput?.value.trim() || '',
          lastName: lastInput?.value.trim() || '',
          dateObj: dateStr ? new Date(`${dateStr}T12:00:00`) : null,
          normalizedDateStr: dateStr,
        };
      });

      onApply(updatedRows.filter((r) => r.firstName || r.lastName));
      closeEdit();
    });
}
