import { escapeHtml, formatCallingLabel, replaceTemplate } from './utils';
import { Constants, Dom, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * HTML templates for findMultipleCallings action UI components.
 */

export const Templates = {
  /** Template displayed when no members have multiple callings. */
  noIssues: (scopeText: string = ''): string => `
    <div style="text-align: center; padding: 24px; color: #2e7d32;">
      <h3 style="margin: 0 0 8px 0; color: #2e7d32;">✓ ${escapeHtml(Constants.NO_ISSUES_HEADING)}</h3>
      <p style="margin: 0; color: #555;">All members have only one ${escapeHtml(scopeText)}calling each.</p>
    </div>
  `,

  /** Template displaying list of members holding multiple callings. */
  multipleCallingsList: (count: number, memberCardsHtml: string): string => `
    <div style="margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="color: #d32f2f; margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 6px;">
          <span>⚠</span> ${escapeHtml(replaceTemplate(Constants.FOUND_MEMBERS_HEADING, { count }))}
        </h3>
      </div>
      <div style="max-height: 400px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; background: #fafafa;">
        ${memberCardsHtml}
      </div>
    </div>
  `,

  /** Template for individual member card in results list. */
  memberCard: (member: Types.MemberCallingsRecord): string => {
    const badges = member.callings.map(callingBadge).join('');
    return `
      <div style="margin-bottom: 12px; padding: 12px; background-color: #ffffff; border-radius: 6px; border-left: 4px solid #d32f2f; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
        <div style="font-weight: 600; color: #212529; margin-bottom: 6px;">${escapeHtml(member.name)}</div>
        <div>${badges}</div>
      </div>
    `;
  },

  /** Editor body containing the group list, ignored-callings list, and helper copy. */
  groupsEditor: (groupCardsHtml: string, ignoredRowsHtml: string): string => `
    <p style="margin: 0 0 12px 0; color: #555; font-size: 13px; line-height: 1.4;">
      ${escapeHtml(Constants.GROUPS_MODAL_SUBTITLE)}
    </p>
    <div id="${Dom.GROUPS_LIST_ID}" style="display: flex; flex-direction: column; gap: 12px; overflow: visible;">
      ${groupCardsHtml}
    </div>
    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
      <h3 style="margin: 0 0 6px 0; font-size: 15px; color: #212529;">${escapeHtml(Constants.IGNORE_SECTION_TITLE)}</h3>
      <p style="margin: 0 0 12px 0; color: #555; font-size: 13px; line-height: 1.4;">
        ${escapeHtml(Constants.IGNORE_SECTION_SUBTITLE)}
      </p>
      <div class="${Dom.IGNORE_SEARCH_WRAP}" style="position: relative; margin-bottom: 8px;">
        <input type="text" class="${Dom.IGNORE_SEARCH_INPUT}" placeholder="${escapeHtml(Constants.SEARCH_CALLINGS_PLACEHOLDER)}"
          autocomplete="off" style="width: 100%; padding: 6px 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 13px; box-sizing: border-box;" />
        <ul class="${Dom.IGNORE_SEARCH_DROPDOWN}"
          style="display: ${Dom.DISPLAY_NONE}; position: ${Dom.POSITION_FIXED}; z-index: ${Dom.GROUP_SEARCH_DROPDOWN_Z_INDEX}; margin: 0; padding: 4px 0; list-style: none; background: #fff; border: 1px solid #ccc; border-radius: 6px; max-height: 180px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.12);"></ul>
      </div>
      <div id="${Dom.IGNORE_LIST_ID}" style="display: flex; flex-direction: column; gap: 6px;">
        ${ignoredRowsHtml}
      </div>
    </div>
  `,

  /** One editable calling group card with name, chips, and search. */
  groupCard: (group: Types.CallingGroup): string => `
    <div class="${Dom.GROUP_CARD}" ${Dom.DATA_GROUP_ID}="${escapeHtml(group.id)}"
      style="position: relative; overflow: visible; padding: 12px; background: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
        <input type="text" class="${Dom.GROUP_NAME_INPUT}" value="${escapeHtml(group.name)}"
          style="flex: 1; padding: 6px 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; font-weight: 600;" />
        <button type="button" class="${Dom.GROUP_DELETE_BTN}"
          style="padding: 6px 10px; border: none; border-radius: 6px; background: #d32f2f; color: #fff; font-size: 12px; cursor: pointer;">
          ${escapeHtml(Constants.REMOVE_LABEL)}
        </button>
      </div>
      <div class="${Dom.GROUP_CHIPS}" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; min-height: 24px;">
        ${Templates.groupChips(group.members)}
      </div>
      <div class="${Dom.GROUP_SEARCH_WRAP}" style="position: relative;">
        <input type="text" class="${Dom.GROUP_SEARCH_INPUT}" placeholder="${escapeHtml(Constants.SEARCH_CALLINGS_PLACEHOLDER)}"
          autocomplete="off" style="width: 100%; padding: 6px 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 13px; box-sizing: border-box;" />
        <ul class="${Dom.GROUP_SEARCH_DROPDOWN}"
          style="display: ${Dom.DISPLAY_NONE}; position: ${Dom.POSITION_FIXED}; z-index: ${Dom.GROUP_SEARCH_DROPDOWN_Z_INDEX}; margin: 0; padding: 4px 0; list-style: none; background: #fff; border: 1px solid #ccc; border-radius: 6px; max-height: 180px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.12);"></ul>
      </div>
    </div>
  `,

  /** One calling search suggestion item. */
  searchItem: (assignment: Types.CallingAssignment): string => `
    <li class="${Dom.GROUP_SEARCH_ITEM}" ${Dom.DATA_CALLING}="${escapeHtml(assignment.calling)}"
      ${Dom.DATA_ORGANIZATION}="${escapeHtml(assignment.organization)}"
      style="padding: 6px 10px; cursor: pointer; font-size: 13px;">
      ${escapeHtml(formatCallingLabel(assignment))}
    </li>
  `,

  /** Selected calling chips for a group, or empty-state copy. */
  groupChips: (members: Types.CallingAssignment[]): string => {
    if (members.length === 0) {
      return `<span style="color: #888; font-size: 12px;">${escapeHtml(Constants.NO_CALLINGS_SELECTED)}</span>`;
    }
    return members.map(groupChip).join('');
  },

  /** Ignored-calling rows, or empty-state copy when the list is unused. */
  ignoredList: (ignored: Types.IgnoredCalling[]): string => {
    if (ignored.length === 0) {
      return `<span style="color: #888; font-size: 12px;">${escapeHtml(Constants.NO_IGNORED_CALLINGS)}</span>`;
    }
    return ignored.map(Templates.ignoredRow).join('');
  },

  /** One ignored calling with an on/off toggle and remove control. */
  ignoredRow: (item: Types.IgnoredCalling): string => `
    <div class="${Dom.IGNORE_ROW}" ${Dom.DATA_CALLING}="${escapeHtml(item.calling)}"
      ${Dom.DATA_ORGANIZATION}="${escapeHtml(item.organization)}"
      style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #fff; border: 1px solid #e0e0e0; border-radius: 6px; opacity: ${item.enabled ? Dom.IGNORE_ENABLED_OPACITY : Dom.IGNORE_DISABLED_OPACITY};">
      <label style="flex: 1; display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px;">
        <input type="checkbox" class="${Dom.IGNORE_TOGGLE}" ${item.enabled ? 'checked' : ''} />
        <span>${escapeHtml(formatCallingLabel(item))}</span>
      </label>
      <button type="button" class="${Dom.IGNORE_REMOVE}"
        style="padding: 4px 8px; border: none; border-radius: 6px; background: #d32f2f; color: #fff; font-size: 12px; cursor: pointer;">
        ${escapeHtml(Constants.REMOVE_LABEL)}
      </button>
    </div>
  `,
};

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Renders a report badge for a grouped or individual calling. */
function callingBadge(calling: Types.DisplayCalling): string {
  if (calling.isGroup) {
    return `<span class="${Dom.CALLING_GROUP_BADGE}" style="display: inline-block; margin: 3px 6px 3px 0; padding: 3px 10px; background-color: #fff3e0; color: #e65100; border-radius: 12px; font-size: 12px; font-weight: 600;">${escapeHtml(calling.label)}</span>`;
  }
  return `<span style="display: inline-block; margin: 3px 6px 3px 0; padding: 3px 10px; background-color: #e3f2fd; color: #0d47a1; border-radius: 12px; font-size: 12px;">${escapeHtml(formatCallingLabel({ calling: calling.label, organization: calling.organization }))}</span>`;
}

/** Renders one removable calling chip. */
function groupChip(member: Types.CallingAssignment): string {
  return `
    <span class="${Dom.GROUP_CHIP}" ${Dom.DATA_CALLING}="${escapeHtml(member.calling)}"
      ${Dom.DATA_ORGANIZATION}="${escapeHtml(member.organization)}"
      style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; background: #e3f2fd; color: #0d47a1; border-radius: 12px; font-size: 12px;">
      ${escapeHtml(formatCallingLabel(member))}
      <button type="button" class="${Dom.GROUP_CHIP_REMOVE}" aria-label="${escapeHtml(Constants.REMOVE_LABEL)}"
        style="border: none; background: none; cursor: pointer; color: #0d47a1; font-size: 14px; line-height: 1; padding: 0;">&times;</button>
    </span>
  `;
}
