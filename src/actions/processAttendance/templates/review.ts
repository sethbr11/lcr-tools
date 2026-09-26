import { escapeHtml } from '../utils';
import { Dom, Types } from '../types';

/* ==========================================================================
   UNMATCHED REVIEW MODAL & TABLE FRAGMENTS
   ========================================================================== */

/**
 * Generates the unmatched-attendee review modal HTML.
 *
 * @param metrics - Total, newly marked, already marked, and unmatched counts.
 * @param targetClass - Display name of the class processed.
 * @param targetDate - Sunday date processed.
 * @param isSimulation - Whether results are from a dry-run developer simulation.
 * @returns HTML string for unmatched review dialog.
 */
export function getUnmatchedReviewModalHtml(
  metrics: Types.ProcessAttendanceResult,
  targetClass: string,
  targetDate: string,
  isSimulation: boolean = false
): string {
  const simBadge = isSimulation
    ? `<span class="${Dom.SIMULATION_BADGE}">SIMULATION RESULTS (DRY RUN)</span>`
    : '';

  return `
    <div class="lcrx-modal-backdrop" id="${Dom.REVIEW_OVERLAY_ID}">
      <div class="lcrx-modal-card lcrx-results-card">
        <div class="lcrx-modal-header">
          <div>
            <div style="display: flex; align-items: center;">
              <h2 class="lcrx-modal-title">Review Unmatched Attendees</h2>
              ${simBadge}
            </div>
            <div class="lcrx-modal-subtitle">${escapeHtml(targetClass)} &bull; ${escapeHtml(targetDate)}</div>
          </div>
          <button type="button" class="lcrx-close-btn" id="${Dom.REVIEW_CLOSE_ID}" aria-label="Close">&times;</button>
        </div>

        <div class="lcrx-modal-body">
          <!-- Summary Metrics Banner -->
          <div class="lcrx-metrics-row">
            <div class="lcrx-metric-pill lcrx-metric-total">
              <span class="lcrx-metric-num">${metrics.total}</span>
              <span class="lcrx-metric-lbl">Total Processed</span>
            </div>
            <div class="lcrx-metric-pill lcrx-metric-marked">
              <span class="lcrx-metric-num">${metrics.marked}</span>
              <span class="lcrx-metric-lbl">Newly Marked</span>
            </div>
            <div class="lcrx-metric-pill lcrx-metric-already">
              <span class="lcrx-metric-num">${metrics.already}</span>
              <span class="lcrx-metric-lbl">Already Present</span>
            </div>
            <div class="lcrx-metric-pill lcrx-metric-unmatched ${metrics.unmatched > 0 ? 'has-unmatched' : ''}">
              <span class="lcrx-metric-num" id="${Dom.UNMATCHED_STAT_ID}">${metrics.unmatched}</span>
              <span class="lcrx-metric-lbl">Unmatched</span>
            </div>
          </div>

          <!-- STREAMLINED VISITOR SUMMARY STRIP -->
          <div class="lcrx-visitor-bar" id="lcr-tools-visitor-card">
            <div class="lcrx-visitor-summary">
              <span style="font-weight: 600;">Visitor Counts:</span>
              <div class="lcrx-visitor-chips" id="${Dom.VISITOR_CHIPS_ID}">
                <span class="lcrx-visitor-desc">Calculating...</span>
              </div>
            </div>
            <span class="lcrx-visitor-note" style="font-size: 11px; color: #64748b;">Written to LCR after you press Continue</span>
          </div>

          <!-- Skipped Undo Bar -->
          <div id="${Dom.REVIEW_SKIPPED_BAR_ID}" class="lcrx-skipped-bar" style="display: none;">
            <span class="lcrx-skipped-title">Skipped:</span>
            <div id="${Dom.SKIPPED_CHIPS_ID}" class="lcrx-chips-container"></div>
          </div>

          <!-- Unmatched Attendees Resolution Section -->
          <div id="${Dom.UNMATCHED_SECTION_ID}" class="lcrx-unmatched-container" style="${metrics.unmatched === 0 ? 'display: none;' : ''}">
            <div class="lcrx-unmatched-header">
              <h3 class="lcrx-section-heading">Unmatched Attendees (<span id="${Dom.UNMATCHED_COUNT_ID}">${metrics.unmatched}</span>)</h3>
              <div style="display: flex; align-items: center; gap: 8px;">
                <small>Queue a ward match or record as visitors, then Continue:</small>
                <button type="button" id="${Dom.MANAGE_NICKNAMES_BTN_ID}" class="lcrx-btn lcrx-btn-secondary lcrx-btn-sm" style="font-size: 11px; padding: 3px 8px;">Saved Nicknames</button>
              </div>
            </div>
            <div class="lcrx-table-scroll">
              <table class="lcrx-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Unmatched Name</th>
                    <th>Match to Ward Roll</th>
                    <th>Visitor Action</th>
                    <th>Skip</th>
                  </tr>
                </thead>
                <tbody id="${Dom.UNMATCHED_TABLE_BODY_ID}"></tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="lcrx-modal-footer lcrx-footer-between">
          <button type="button" id="${Dom.REVIEW_LOGS_ID}" class="lcrx-btn lcrx-btn-secondary">View Logs</button>
          <button type="button" id="${Dom.REVIEW_CONTINUE_ID}" class="lcrx-btn lcrx-btn-primary">${isSimulation ? 'Continue Simulation' : 'Continue'}</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generates a one-click visitor button for single-category unmatched rows.
 *
 * @param idx - Unmatched row index.
 * @param category - Visitor category to assign.
 * @returns HTML string for the visitor action button.
 */
export function getUnmatchedVisitorButtonHtml(idx: number, category: string): string {
  return `<button type="button" class="lcrx-btn lcrx-btn-primary lcrx-btn-sm ${Dom.GUEST_INPUT}" data-idx="${idx}" data-cat="${category}">+ Visitor</button>`;
}

/**
 * Generates a visitor category select for multi-category unmatched rows.
 *
 * @param idx - Unmatched row index.
 * @param categories - Available visitor categories.
 * @returns HTML string for the visitor category select control.
 */
export function getUnmatchedVisitorSelectHtml(idx: number, categories: readonly string[]): string {
  const options = categories.map((c) => `<option value="${c}">${c}</option>`).join('');
  return `
    <select class="lcrx-select lcrx-btn-sm ${Dom.GUEST_INPUT}" data-idx="${idx}">
      <option value="">+ Visitor...</option>
      ${options}
    </select>
  `;
}

/**
 * Generates the saved-nickname suggestion box for an unmatched row.
 *
 * @param idx - Unmatched row index.
 * @param memberNameEscaped - HTML-escaped suggested ward member name.
 * @returns HTML string for the nickname suggestion controls.
 */
export function getUnmatchedNicknameSuggestHtml(idx: number, memberNameEscaped: string): string {
  return `
    <div class="lcrx-nickname-suggest-box" id="${Dom.NICK_BOX_ID_PREFIX}${idx}" style="display: flex; flex-direction: column; gap: 3px;">
      <div style="display: flex; align-items: center; gap: 4px;">
        <button type="button" class="lcrx-btn lcrx-btn-primary lcrx-btn-sm ${Dom.NICKNAME_BTN}" data-idx="${idx}" title="Click to match and mark present">
          &starf; Match: ${memberNameEscaped}
        </button>
        <span class="${Dom.NICKNAME_BADGE}">Saved</span>
      </div>
      <button type="button" class="${Dom.SEARCH_TOGGLE}" data-idx="${idx}">Search other &rarr;</button>
    </div>
  `;
}

/**
 * Generates a full unmatched attendee table row.
 *
 * @param idx - Unmatched row index.
 * @param date - Meeting date string.
 * @param fullNameEscaped - HTML-escaped attendee full name.
 * @param nicknameBoxHtml - Optional nickname suggestion markup (may be empty).
 * @param autoBoxDisplay - CSS display value for the autocomplete box.
 * @param visitorActionHtml - Visitor button or select markup.
 * @returns HTML string for the unmatched table row cells.
 */
export function getUnmatchedTableRowHtml(
  idx: number,
  date: string,
  fullNameEscaped: string,
  nicknameBoxHtml: string,
  autoBoxDisplay: string,
  visitorActionHtml: string
): string {
  return `
    <td>${date}</td>
    <td><strong>${fullNameEscaped}</strong></td>
    <td style="min-width: 190px;">
      ${nicknameBoxHtml}
      <div class="lcrx-autocomplete-box" id="${Dom.AUTO_BOX_ID_PREFIX}${idx}" style="display: ${autoBoxDisplay};">
        <input type="text" class="${Dom.SEARCH_INPUT}" placeholder="Search ward member..." data-idx="${idx}" />
        <label class="${Dom.NICKNAME_OPT}" title="Remember this nickname for future attendance rosters">
          <input type="checkbox" class="${Dom.NICKNAME_CHECK}" checked /> Save nickname
        </label>
      </div>
    </td>
    <td>
      ${visitorActionHtml}
    </td>
    <td>
      <button type="button" class="lcrx-btn lcrx-btn-secondary lcrx-btn-sm ${Dom.SKIP_BTN}" data-idx="${idx}">Skip</button>
    </td>
  `;
}

/**
 * Generates a queued match or visitor status cell with a far-right Undo control.
 *
 * @param messageEscaped - HTML-escaped status message shown beside the check mark.
 * @param cellClass - Cell CSS class (`QUEUED_MATCH_CELL` or `QUEUED_VISITOR_CELL`).
 * @returns HTML string for a colspan status cell with an undo button.
 */
export function getUnmatchedQueuedStatusHtml(messageEscaped: string, cellClass: string): string {
  return `
    <td colspan="5" class="${cellClass}">
      <div class="${Dom.QUEUED_STATUS}">
        <span>&check; ${messageEscaped}</span>
        <button type="button" class="lcrx-btn lcrx-btn-secondary lcrx-btn-sm ${Dom.QUEUED_UNDO_BTN}">Undo</button>
      </div>
    </td>
  `;
}

/**
 * Generates one floating autocomplete dropdown list item.
 *
 * @param nameEscaped - HTML-escaped ward member full name.
 * @returns HTML string for a dropdown list item.
 */
export function getMemberDropdownItemHtml(nameEscaped: string): string {
  return `<li class="${Dom.DROPDOWN_ITEM}" data-name="${nameEscaped}">${nameEscaped}</li>`;
}
