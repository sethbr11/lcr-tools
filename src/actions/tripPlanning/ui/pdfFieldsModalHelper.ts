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
    overlay.className = Dom.TRIP_MODAL_BACKDROP_CLASS;
    setHtml(
      overlay,
      `
      <div class="${Dom.TRIP_MODAL_CARD_CLASS} ${Dom.PDF_CARD_CLASS}">
        <div class="${Dom.TRIP_MODAL_HEADER_CLASS}">
          <h2 class="${Dom.TRIP_MODAL_TITLE_CLASS}">${Constants.PDF_FIELDS_TITLE}</h2>
          <button type="button" class="${Dom.TRIP_MODAL_CLOSE_CLASS}" ${Dom.PDF_ACTION_ATTR}="${Dom.PDF_ACTION_CANCEL}">&times;</button>
        </div>
        <div class="${Dom.TRIP_MODAL_BODY_CLASS}">
          <p class="${Dom.PDF_DESC_CLASS}">${Constants.PDF_FIELDS_DESC}</p>
          <div class="${Dom.PDF_QUICK_CLASS}">
            <button type="button" class="${Dom.CLUSTER_START_LINK_CLASS}" ${Dom.PDF_ACTION_ATTR}="${Dom.PDF_ACTION_ALL}">${Constants.PDF_FIELDS_SELECT_ALL}</button>
            <button type="button" class="${Dom.CLUSTER_START_LINK_CLASS}" ${Dom.PDF_ACTION_ATTR}="${Dom.PDF_ACTION_NONE}">${Constants.CLUSTER_START_CLEAR}</button>
          </div>
          <div class="${Dom.PDF_FIELDS_CLASS}">
            ${fields
              .map(
                (field, index) => `
              <label class="${Dom.PDF_FIELD_CLASS}">
                <input type="checkbox" ${Dom.PDF_FIELD_INDEX_ATTR}="${index}" ${initial.has(field) ? 'checked' : ''} />
                <span>${escapeHtml(field)}</span>
              </label>`
              )
              .join('')}
          </div>
        </div>
        <div class="${Dom.TRIP_MODAL_FOOTER_CLASS}">
          <button type="button" class="${Dom.TRIP_BTN_CLASS} ${Dom.TRIP_BTN_TERTIARY_CLASS}" ${Dom.PDF_ACTION_ATTR}="${Dom.PDF_ACTION_CANCEL}" style="${Dom.TRIP_MODAL_BTN_STYLE}">${Constants.CONFIRM_CANCEL_TEXT}</button>
          <button type="button" class="${Dom.TRIP_BTN_CLASS} ${Dom.TRIP_BTN_PRIMARY_CLASS}" ${Dom.PDF_ACTION_ATTR}="${Dom.PDF_ACTION_EXPORT}" style="${Dom.TRIP_MODAL_BTN_STYLE}">${Constants.PDF_FIELDS_EXPORT}</button>
        </div>
      </div>
    `
    );
    document.body.appendChild(overlay);

    const boxes = Array.from(
      overlay.querySelectorAll<HTMLInputElement>(Dom.PDF_FIELD_CHECKBOX_SELECTOR)
    );
    const exportBtn = overlay.querySelector<HTMLButtonElement>(Dom.PDF_EXPORT_ACTION_SELECTOR);
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

    overlay.querySelectorAll<HTMLButtonElement>(Dom.PDF_ANY_ACTION_SELECTOR).forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.getAttribute(Dom.PDF_ACTION_ATTR);
        if (action === Dom.PDF_ACTION_CANCEL) finish(null);
        if (action === Dom.PDF_ACTION_ALL || action === Dom.PDF_ACTION_NONE) {
          boxes.forEach((box) => (box.checked = action === Dom.PDF_ACTION_ALL));
          syncExportState();
        }
        if (action === Dom.PDF_ACTION_EXPORT) {
          const chosen = boxes
            .filter((box) => box.checked)
            .map((box) => fields[Number(box.getAttribute(Dom.PDF_FIELD_INDEX_ATTR))]);
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
