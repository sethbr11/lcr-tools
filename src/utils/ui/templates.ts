import { Dom, Types } from '@/types';
import { escapeHtml } from '../coreUtils';

/* ==========================================================================
   EXPORTED TEMPLATES
   ========================================================================== */

/**
 * Shared HTML templates for utility dialogs, modals, loading overlays, and alerts.
 */
export const Templates = {
  /**
   * Constructs the inner HTML for the confirmation modal dialog.
   *
   * @param options - Title, body message, and button label options.
   * @returns Rendered HTML string.
   */
  confirmationModal: (options: {
    title: string;
    message: string;
    cancelText: string;
    confirmText: string;
    confirmColor: string;
  }): string => {
    const safeColor = ['primary', 'secondary', 'danger', 'success'].includes(options.confirmColor)
      ? options.confirmColor
      : 'primary';

    return `
    ${
      options.title
        ? `<div class="lcr-tools-modal-header">
            <h3>${escapeHtml(options.title)}</h3>
          </div>`
        : ''
    }
    <div class="lcr-tools-modal-body">
      <p>${escapeHtml(options.message)}</p>
    </div>
    <div class="lcr-tools-modal-footer">
      <button class="lcr-tools-btn lcr-tools-btn-secondary" id="lcr-tools-cancel-btn">${escapeHtml(
        options.cancelText
      )}</button>
      <button class="lcr-tools-btn lcr-tools-btn-${safeColor}" id="lcr-tools-confirm-btn">${escapeHtml(
        options.confirmText
      )}</button>
    </div>
  `;
  },

  /**
   * Constructs the inner HTML for the full-screen loading overlay.
   *
   * @param message - Primary status message text.
   * @param subheader - Supporting instruction or cancellation subtitle.
   * @returns Rendered HTML string.
   */
  loadingOverlay: (message: string, subheader: string): string => `
    <div class="${Dom.LOADING_SPINNER}"></div>
    <p>${escapeHtml(message)}</p>
    <span>${escapeHtml(subheader)}</span>
  `,

  /**
   * Constructs the HTML label choice item for table selection modals.
   *
   * @param options - Table index, name, type, and selection state.
   * @returns Rendered HTML string for radio or checkbox row.
   */
  tableOptionItem: (options: {
    idx: number;
    name: string;
    type: string;
    allowMultiple: boolean;
    isChecked: boolean;
  }): string => `
    <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; background: #fafafa;">
      <input type="${options.allowMultiple ? 'checkbox' : 'radio'}" name="lcr-table-choice" value="${
        options.idx
      }" ${options.isChecked ? 'checked' : ''} class="lcr-table-choice" />
      <div>
        <strong style="display: block;">${escapeHtml(options.name)}</strong>
        <span style="font-size: 0.85em; color: #666;">Type: ${escapeHtml(options.type)}</span>
      </div>
    </label>
  `,

  /**
   * Constructs the dialog container HTML for the table selection modal.
   *
   * @param options - Dialog title, prompt instructions, and candidate list HTML.
   * @returns Rendered HTML string for table picker modal.
   */
  tableSelectionDialog: (options: {
    title: string;
    prompt: string;
    listHtml: string;
    allowMultiple?: boolean;
  }): string => `
    <div style="background:#fff;padding:24px;border-radius:8px;max-width:480px;width:90%;box-sizing:border-box;">
      <h3 style="margin-top:0;color:#00509e;">${escapeHtml(options.title)}</h3>
      <p style="font-size: 13px; color: #555; margin-bottom: 12px;">
        ${escapeHtml(options.prompt)}
      </p>
      ${
        options.allowMultiple
          ? `
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <button type="button" id="lcr-select-all-tables" style="padding:4px 10px;font-size:12px;background:#e3f2fd;color:#0d47a1;border:1px solid #90caf9;border-radius:4px;cursor:pointer;">Select All</button>
        <button type="button" id="lcr-deselect-all-tables" style="padding:4px 10px;font-size:12px;background:#f5f5f5;color:#616161;border:1px solid #ccc;border-radius:4px;cursor:pointer;">Deselect All</button>
      </div>`
          : ''
      }
      <div style="max-height:300px;overflow-y:auto;margin:12px 0 16px 0;">${options.listHtml}</div>
      <div style="display:flex;justify-content:flex-end;gap:10px;">
        <button id="lcr-cancel-tables" class="lcr-tools-btn lcr-tools-btn-secondary" style="padding:8px 16px;border:1px solid #ccc;background:#f5f5f5;border-radius:4px;cursor:pointer;">Cancel</button>
        <button id="lcr-confirm-tables" class="lcr-tools-btn lcr-tools-btn-primary" style="padding:8px 16px;border:none;background:#00509e;color:#fff;border-radius:4px;cursor:pointer;">Select</button>
      </div>
    </div>
  `,

  /**
   * Constructs dialog container HTML for the export filename prompt modal.
   *
   * @param options - Dialog title, prompt instructions, input value, hint, and button labels.
   * @returns Rendered HTML string for the filename prompt modal.
   */
  filenamePromptDialog: (options: {
    title: string;
    prompt: string;
    defaultValue: string;
    hint: string;
    cancelText: string;
    confirmText: string;
  }): string => `
    <div style="background:#fff;padding:24px;border-radius:8px;max-width:480px;width:90%;box-sizing:border-box;">
      <h3 style="margin-top:0;color:#00509e;">${escapeHtml(options.title)}</h3>
      <p style="font-size: 13px; color: #555; margin-bottom: 12px;">
        ${escapeHtml(options.prompt)}
      </p>
      <input
        type="text"
        id="lcr-filename-input"
        value="${escapeHtml(options.defaultValue)}"
        style="width: 100%; padding: 8px 12px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; outline: none;"
      />
      <div style="font-size: 12px; color: #666; margin-top: 6px; margin-bottom: 18px;">
        ${escapeHtml(options.hint)}
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;">
        <button id="lcr-filename-cancel-btn" class="lcr-tools-btn lcr-tools-btn-secondary" style="padding:8px 16px;border:1px solid #ccc;background:#f5f5f5;border-radius:4px;cursor:pointer;">${escapeHtml(
          options.cancelText
        )}</button>
        <button id="lcr-filename-confirm-btn" class="lcr-tools-btn lcr-tools-btn-primary" style="padding:8px 16px;border:none;background:#00509e;color:#fff;border-radius:4px;cursor:pointer;">${escapeHtml(
          options.confirmText
        )}</button>
      </div>
    </div>
  `,

  /**
   * Constructs a styled alert notification banner HTML string.
   *
   * @param alert - Alert type and message payload.
   * @returns Rendered HTML string.
   */
  modalAlert: (alert: Types.ModalAlert): string => `
    <div class="lcr-tools-alert lcr-tools-alert-${alert.type}" style="padding: 10px 14px; border-radius: 4px; margin-bottom: 8px; font-size: 0.9rem; background-color: ${
      alert.type === 'error' ? '#ffebee' : '#e3f2fd'
    }; color: ${alert.type === 'error' ? '#c62828' : '#0d47a1'};">
      ${escapeHtml(alert.message)}
    </div>
  `,

  /**
   * Constructs modal dialog header inner HTML with title and close button.
   *
   * @param title - Modal header title string.
   * @returns Rendered HTML string.
   */
  modalHeader: (title: string): string => `
    <h2 style="margin: 0; color: #00509e; font-size: 1.3rem; font-weight: 600;">${escapeHtml(
      title
    )}</h2>
    <button class="lcr-tools-modal-close-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; line-height: 1;" aria-label="Close modal">×</button>
  `,
};
