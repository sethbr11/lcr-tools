import { browser } from 'wxt/browser';
import { escapeHtml, setHtml } from '../utils';
import { Constants, Dom, Regex } from '../types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Asks which columns to print in each group's table, remembering the choice for next time.
 * The stop number column is always included because it matches the numbered dots on the map.
 *
 * @param fields - Column headers available from the LCR report.
 * @returns Chosen headers in report order, or null when cancelled.
 */
export async function promptPdfFields(fields: string[]): Promise<string[] | null> {
  const saved = await loadSavedFields();
  const savedAvailable = saved.filter((field) => fields.includes(field));
  const initial = new Set(
    savedAvailable.length > 0
      ? savedAvailable
      : fields.filter((f) => Regex.PDF_DEFAULT_FIELD.test(f))
  );

  return new Promise((resolve) => {
    document.getElementById(Dom.PDF_FIELDS_MODAL_ID)?.remove();
    const overlay = document.createElement('div');
    overlay.id = Dom.PDF_FIELDS_MODAL_ID;
    overlay.className = 'trip-modal-backdrop';
    setHtml(
      overlay,
      `
      <div class="trip-modal-card trip-pdf-card">
        <div class="trip-modal-header">
          <h2 class="trip-modal-title">${Constants.PDF_FIELDS_TITLE}</h2>
          <button type="button" class="trip-close-btn" data-pdf-action="cancel">&times;</button>
        </div>
        <div class="trip-modal-body">
          <p class="trip-pdf-desc">${Constants.PDF_FIELDS_DESC}</p>
          <div class="trip-pdf-quick">
            <button type="button" class="cluster-start-link" data-pdf-action="all">${Constants.PDF_FIELDS_SELECT_ALL}</button>
            <button type="button" class="cluster-start-link" data-pdf-action="none">${Constants.CLUSTER_START_CLEAR}</button>
          </div>
          <div class="trip-pdf-fields">
            ${fields
              .map(
                (field, index) => `
              <label class="trip-pdf-field">
                <input type="checkbox" data-field-index="${index}" ${initial.has(field) ? 'checked' : ''} />
                <span>${escapeHtml(field)}</span>
              </label>`
              )
              .join('')}
          </div>
        </div>
        <div class="trip-modal-footer">
          <button type="button" class="lcr-tools-btn lcr-tools-btn-tertiary" data-pdf-action="cancel" style="width: auto; margin: 0;">${Constants.CONFIRM_CANCEL_TEXT}</button>
          <button type="button" class="lcr-tools-btn lcr-tools-btn-primary" data-pdf-action="export" style="width: auto; margin: 0;">${Constants.PDF_FIELDS_EXPORT}</button>
        </div>
      </div>
    `
    );
    document.body.appendChild(overlay);

    const boxes = Array.from(overlay.querySelectorAll<HTMLInputElement>('input[data-field-index]'));
    const exportBtn = overlay.querySelector<HTMLButtonElement>('[data-pdf-action="export"]');
    const syncExportState = () => {
      if (exportBtn) exportBtn.disabled = !boxes.some((box) => box.checked);
    };
    boxes.forEach((box) => box.addEventListener('change', syncExportState));
    syncExportState();

    const finish = (result: string[] | null) => {
      window.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      resolve(result);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(null);
    };
    window.addEventListener('keydown', onKeyDown);

    overlay.querySelectorAll<HTMLButtonElement>('[data-pdf-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.pdfAction;
        if (action === 'cancel') finish(null);
        if (action === 'all' || action === 'none') {
          boxes.forEach((box) => (box.checked = action === 'all'));
          syncExportState();
        }
        if (action === 'export') {
          const chosen = boxes
            .filter((box) => box.checked)
            .map((box) => fields[Number(box.dataset.fieldIndex)]);
          void saveFields(chosen);
          finish(chosen);
        }
      });
    });
  });
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Reads the previously chosen PDF columns, or [] when none are saved. */
async function loadSavedFields(): Promise<string[]> {
  try {
    const stored = await browser?.storage?.local?.get(Constants.STORAGE_PDF_FIELDS_KEY);
    const fields = stored?.[Constants.STORAGE_PDF_FIELDS_KEY];
    return Array.isArray(fields) ? fields.filter((f): f is string => typeof f === 'string') : [];
  } catch {
    return [];
  }
}

/** Saves the chosen PDF columns for the next export. */
async function saveFields(fields: string[]): Promise<void> {
  try {
    await browser?.storage?.local?.set({ [Constants.STORAGE_PDF_FIELDS_KEY]: fields });
  } catch {
    // Remembering the choice is a convenience; the export still proceeds
  }
}
