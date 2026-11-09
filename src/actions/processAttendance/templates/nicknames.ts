import { Dom } from '../types';

/* ==========================================================================
   NICKNAME MANAGER
   ========================================================================== */

/**
 * Generates the Manage Nicknames modal card HTML (backdrop is created by the caller).
 *
 * @returns HTML string for the nickname manager dialog card.
 */
export function getManageNicknamesModalHtml(): string {
  return `
    <div class="lcrx-modal-card lcrx-edit-card" style="max-width: 500px;">
      <div class="lcrx-modal-header">
        <div>
          <h2 class="lcrx-modal-title">Saved Nickname Mappings</h2>
          <div class="lcrx-modal-subtitle">Stored locally on this device &bull; Zero external transmission</div>
        </div>
        <button type="button" class="lcrx-close-btn" id="${Dom.NICKNAMES_CLOSE_ID}" aria-label="Close">&times;</button>
      </div>
      <div class="lcrx-modal-body">
        <div style="font-size: 11px; color: #475569; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 8px 10px; line-height: 1.4;">
          Saved nicknames allow the Attendance Results window to suggest 1-click matches when processing future rosters.
        </div>
        <div class="lcrx-table-scroll" style="max-height: 300px;">
          <div id="${Dom.NICKNAMES_LIST_ID}" style="display: flex; flex-direction: column; gap: 6px; padding: 4px;"></div>
        </div>
      </div>
      <div class="lcrx-modal-footer lcrx-footer-between">
        <button type="button" class="lcrx-btn lcrx-btn-danger" id="${Dom.CLEAR_NICKNAMES_BTN_ID}">Clear All</button>
        <button type="button" class="lcrx-btn lcrx-btn-primary" id="${Dom.NICKNAMES_DONE_ID}">Done</button>
      </div>
    </div>
  `;
}

/**
 * Generates empty-state copy when no nickname mappings are stored.
 *
 * @returns HTML string for the empty nickname list placeholder.
 */
export function getNicknameEmptyListHtml(): string {
  return `
    <div style="text-align: center; color: #64748b; font-size: 12px; padding: 24px 8px;">
      No saved nickname mappings found.<br>
      <small style="color: #94a3b8; margin-top: 4px; display: inline-block;">
        When resolving unmatched attendees, check &ldquo;Save nickname&rdquo; to save them here.
      </small>
    </div>
  `;
}

/**
 * Generates a member group card for the manage-nicknames modal containing all nicknames for that person.
 *
 * @param canonicalEscaped - HTML-escaped canonical member name.
 * @param aliasRowsHtml - HTML string containing the nickname rows for this member.
 * @returns HTML string for the member nickname group card.
 */
export function getNicknameGroupHtml(canonicalEscaped: string, aliasRowsHtml: string): string {
  return `
    <div class="${Dom.NICKNAME_GROUP}">
      <div class="${Dom.NICKNAME_GROUP_NAME}">${canonicalEscaped}</div>
      ${aliasRowsHtml}
    </div>
  `;
}

/**
 * Generates an alias row inside a member group card.
 *
 * @param aliasEscaped - HTML-escaped informal alias text.
 * @param aliasAttrEscaped - HTML-escaped alias for the delete button data attribute.
 * @returns HTML string for one alias row with delete button.
 */
export function getNicknameAliasRowHtml(aliasEscaped: string, aliasAttrEscaped: string): string {
  return `
    <div class="${Dom.NICKNAME_ITEM} ${Dom.NICKNAME_ALIAS_ROW}">
      <span style="font-weight: 600; color: #0284c7;">${aliasEscaped}</span>
      <button type="button" class="lcrx-btn lcrx-btn-danger lcrx-btn-sm ${Dom.NICKNAME_DELETE_BTN}" data-alias="${aliasAttrEscaped}" title="Delete nickname" style="padding: 2px 8px;">&times;</button>
    </div>
  `;
}

/**
 * Generates a single nickname mapping row for the manage-nicknames list.
 *
 * @param aliasEscaped - HTML-escaped informal alias text.
 * @param canonicalEscaped - HTML-escaped canonical ward member name.
 * @param aliasAttrEscaped - HTML-escaped alias for the delete button data attribute.
 * @returns HTML string for one nickname list item.
 */
export function getNicknameListItemHtml(
  aliasEscaped: string,
  canonicalEscaped: string,
  aliasAttrEscaped: string
): string {
  return `
    <div class="${Dom.NICKNAME_ITEM}" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px;">
      <div>
        <span style="font-weight: 700; color: #0284c7;">${aliasEscaped}</span>
        <span style="color: #64748b; margin: 0 6px;">&rarr;</span>
        <span style="font-weight: 600; color: #1e293b;">${canonicalEscaped}</span>
      </div>
      <button type="button" class="lcrx-btn lcrx-btn-danger lcrx-btn-sm ${Dom.NICKNAME_DELETE_BTN}" data-alias="${aliasAttrEscaped}" title="Delete mapping" style="padding: 2px 8px;">&times;</button>
    </div>
  `;
}
