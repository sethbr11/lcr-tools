import { Dom, Types } from '../types';

/* ==========================================================================
   SETUP & EDIT MODALS
   ========================================================================== */

/**
 * Generates the HTML for the compact, no-scroll attendance setup modal.
 *
 * @param classOptions - List of selectable classes from LCR.
 * @param defaultDate - Formatted YYYY-MM-DD string for most recent Sunday.
 * @param isSimulation - Whether running in dry-run developer simulation mode.
 * @returns HTML string for the setup dialog.
 */
export function getSetupModalHtml(
  classOptions: Types.ClassOption[],
  defaultDate: string,
  isSimulation: boolean = false
): string {
  const optionsHtml = classOptions
    .map((opt) => {
      if (opt.isHeader) {
        return `<option value="" disabled style="font-weight: 700; color: #64748b; background: #f1f5f9;">── ${opt.text} ──</option>`;
      }
      return `<option value="${opt.value}" ${opt.selected ? 'selected' : ''}>${opt.text}</option>`;
    })
    .join('');

  const simBadge = isSimulation
    ? `<span class="${Dom.SIMULATION_BADGE}">SIMULATION (DRY RUN)</span>`
    : '';
  const processBtnLabel = isSimulation ? 'Simulate Attendance' : 'Process Attendance';
  const initialStatus = isSimulation
    ? 'Dev Mode Simulation: tests toggle & visitors without altering live records.'
    : 'Ready for attendance records.';

  return `
    <div class="lcrx-modal-backdrop" id="${Dom.UI_OVERLAY_ID}">
      <div class="lcrx-modal-card lcrx-setup-card">
        <div class="lcrx-modal-header">
          <div style="display: flex; align-items: center;">
            <h2 class="lcrx-modal-title">Process Attendance</h2>
            ${simBadge}
          </div>
          <button type="button" class="lcrx-close-btn" id="${Dom.SETUP_CLOSE_ID}" aria-label="Close">&times;</button>
        </div>

        <div class="lcrx-modal-body">
          <!-- Row 1: Class, Date, and Total Headcount Pickers -->
          <div class="lcrx-grid-three">
            <div class="lcrx-field-group">
              <label for="${Dom.CLASS_SELECT_ID}" class="lcrx-label">Class or Quorum</label>
              <select id="${Dom.CLASS_SELECT_ID}" class="lcrx-select">
                ${optionsHtml}
              </select>
            </div>
            <div class="lcrx-field-group">
              <label for="${Dom.DATE_INPUT_ID}" class="lcrx-label">Target Sunday Date</label>
              <input type="date" id="${Dom.DATE_INPUT_ID}" class="lcrx-input" value="${defaultDate}" />
            </div>
            <div class="lcrx-field-group">
              <label for="${Dom.HEADCOUNT_INPUT_ID}" class="lcrx-label">Total Headcount</label>
              <input type="number" min="0" id="${Dom.HEADCOUNT_INPUT_ID}" class="lcrx-input" placeholder="e.g. 100" />
            </div>
          </div>

          <!-- Dynamic Visitor Calculation Box -->
          <div id="${Dom.VISITOR_SPLIT_CONTAINER_ID}" class="lcrx-visitor-calc-box" style="display: none;"></div>

          <!-- Row 2: Expected Format 3-Column Demonstration -->
          <div class="lcrx-format-hint">
            <span class="lcrx-format-title">Expected 3-Column Format:</span>
            <div class="lcrx-format-columns">
              <span class="lcrx-col-pill">1. Timestamp / Date</span>
              <span class="lcrx-col-pill">2. First Name</span>
              <span class="lcrx-col-pill">3. Last Name</span>
            </div>
            <span class="lcrx-format-example">e.g. <code>${defaultDate}</code> | <code>John</code> | <code>Smith</code></span>
          </div>

          <!-- Row 3: Paste Target Area -->
          <div id="${Dom.PASTE_TARGET_ID}" class="lcrx-paste-zone" tabindex="0">
            <div id="${Dom.PASTE_PROMPT_ID}" class="lcrx-paste-prompt">
              <span class="lcrx-paste-icon">&#128203;</span>
              <strong>Click here and paste (Cmd+V or Ctrl+V)</strong>
              <small>Copy columns directly from Google Sheets, Excel, or CSV text</small>
            </div>
            <div id="${Dom.PASTE_ACTIVE_ID}" class="lcrx-paste-active" style="display: none;">
              <div id="${Dom.RECORD_COUNT_ID}" class="lcrx-count-badge">0 records loaded</div>
              <div class="lcrx-paste-actions">
                <button type="button" id="${Dom.PASTE_MORE_ID}" class="lcrx-btn lcrx-btn-secondary">+ Add More</button>
                <button type="button" id="${Dom.VIEW_EDIT_ID}" class="lcrx-btn lcrx-btn-secondary">View / Edit</button>
              </div>
            </div>
            <textarea id="${Dom.PASTE_CATCHER_ID}" class="lcrx-paste-catcher" aria-hidden="true"></textarea>
          </div>

          <!-- Row 4: Status Banner -->
          <div id="${Dom.STATUS_ID}" class="lcrx-status-banner">${initialStatus}</div>
        </div>

        <div class="lcrx-modal-footer">
          <button type="button" id="${Dom.SETUP_CANCEL_ID}" class="lcrx-btn lcrx-btn-secondary">Cancel</button>
          <button type="button" id="${Dom.PROCESS_BTN_ID}" class="lcrx-btn lcrx-btn-primary" disabled>${processBtnLabel}</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generates the inline record editor modal HTML.
 *
 * @returns HTML string for the inline record editor.
 */
export function getEditViewHtml(): string {
  return `
    <div class="lcrx-modal-backdrop" id="${Dom.EDIT_VIEW_CONTAINER_ID}">
      <div class="lcrx-modal-card lcrx-edit-card">
        <div class="lcrx-modal-header">
          <h2 class="lcrx-modal-title">Edit Pasted Attendance Records</h2>
          <button type="button" class="lcrx-close-btn" id="${Dom.EDIT_CLOSE_ID}" aria-label="Close">&times;</button>
        </div>
        <div class="lcrx-modal-body">
          <div class="lcrx-table-scroll lcrx-edit-scroll">
            <table class="lcrx-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th style="width: 60px;">Action</th>
                </tr>
              </thead>
              <tbody id="${Dom.EDIT_TABLE_BODY_ID}"></tbody>
            </table>
          </div>
        </div>
        <div class="lcrx-modal-footer lcrx-footer-between">
          <div>
            <button type="button" id="${Dom.EDIT_ADD_ROW_ID}" class="lcrx-btn lcrx-btn-secondary">+ Add Row</button>
            <button type="button" id="${Dom.EDIT_CLEAR_ALL_ID}" class="lcrx-btn lcrx-btn-danger">Clear All</button>
          </div>
          <button type="button" id="${Dom.EDIT_DONE_ID}" class="lcrx-btn lcrx-btn-primary">Apply Changes</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generates one editable attendance record row for the paste edit view.
 *
 * @param dateEscaped - HTML-escaped date value.
 * @param firstEscaped - HTML-escaped first name value.
 * @param lastEscaped - HTML-escaped last name value.
 * @param idx - Zero-based row index for the delete button data attribute.
 * @returns HTML string for a table row with date/first/last inputs and delete control.
 */
export function getEditTableRowHtml(
  dateEscaped: string,
  firstEscaped: string,
  lastEscaped: string,
  idx: number
): string {
  return `
    <td><input type="text" class="lcrx-input ${Dom.EDIT_DATE}" value="${dateEscaped}" style="width: 110px;" /></td>
    <td><input type="text" class="lcrx-input ${Dom.EDIT_FIRST}" value="${firstEscaped}" /></td>
    <td><input type="text" class="lcrx-input ${Dom.EDIT_LAST}" value="${lastEscaped}" /></td>
    <td style="text-align: center;"><button type="button" class="lcrx-btn lcrx-btn-danger lcrx-btn-sm ${Dom.EDIT_DELETE}" data-idx="${idx}">&times;</button></td>
  `;
}

/**
 * Generates one visitor-category counter control for the setup headcount split UI.
 *
 * @param category - Visitor category display label.
 * @param inputId - DOM id for the number input.
 * @param value - Current count value.
 * @returns HTML string for a labeled +/- counter control.
 */
export function getVisitorCalcItemHtml(category: string, inputId: string, value: number): string {
  return `
    <div class="lcrx-calc-item">
      <label for="${inputId}">${category}:</label>
      <div class="lcrx-counter-control">
        <button type="button" class="lcrx-counter-btn lcrx-calc-dec" data-cat="${category}">&minus;</button>
        <input type="number" min="0" value="${value}" id="${inputId}" class="lcrx-visitor-val lcrx-calc-val" data-cat="${category}" />
        <button type="button" class="lcrx-counter-btn lcrx-calc-inc" data-cat="${category}">+</button>
      </div>
    </div>
  `;
}

/**
 * Generates the multi-category visitor calculation panel in the setup modal.
 *
 * @param diff - Calculated visitor count (headcount minus attendees).
 * @param rawHeadcount - User-entered total headcount.
 * @param attendeeCount - Parsed attendee count.
 * @param itemsHtml - Pre-rendered counter controls for each category.
 * @returns HTML string for the visitor split calculator box contents.
 */
export function getVisitorCalcSplitHtml(
  diff: number,
  rawHeadcount: number,
  attendeeCount: number,
  itemsHtml: string
): string {
  return `
    <div class="lcrx-visitor-calc-header">
      <span>Calculated Visitors: <strong>${diff}</strong> (${rawHeadcount} headcount &minus; ${attendeeCount} attendees)</span>
      <small style="color: #64748b;">Split evenly &bull; Adjust below if needed:</small>
    </div>
    <div class="lcrx-visitor-calc-inputs">
      ${itemsHtml}
    </div>
  `;
}

/**
 * Generates the single-category visitor calculation banner in the setup modal.
 *
 * @param diff - Calculated visitor count.
 * @param rawHeadcount - User-entered total headcount.
 * @param attendeeCount - Parsed attendee count.
 * @param category - Sole visitor category for the selected class.
 * @returns HTML string for the single-category visitor banner.
 */
export function getVisitorCalcSingleHtml(
  diff: number,
  rawHeadcount: number,
  attendeeCount: number,
  category: string
): string {
  return `
    <div class="lcrx-visitor-calc-header">
      <span>Calculated Visitors: <strong>${diff}</strong> (${rawHeadcount} headcount &minus; ${attendeeCount} attendees)</span>
      <span class="lcrx-visitor-badge">Marking ${diff} for ${category}</span>
    </div>
  `;
}

/**
 * Generates the zero-visitors message when headcount is fully accounted for by attendees.
 *
 * @param attendeeCount - Parsed attendee count.
 * @param rawHeadcount - User-entered total headcount.
 * @returns HTML string for the zero-visitors banner.
 */
export function getVisitorCalcZeroHtml(attendeeCount: number, rawHeadcount: number): string {
  return `
    <div class="lcrx-visitor-calc-header" style="color: #475569;">
      <span>All ${attendeeCount} attendees accounted for in headcount (${rawHeadcount}). 0 visitors calculated.</span>
    </div>
  `;
}
