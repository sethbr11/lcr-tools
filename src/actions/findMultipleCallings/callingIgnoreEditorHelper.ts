import { callingAssignmentKey, escapeHtml, formatCallingLabel, setHtml } from './utils';
import { Constants, Dom, Types } from './types';
import { Templates } from './templates';
import { hideFixedSearchDropdown, showFixedSearchDropdown } from './callingSearchDropdownHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Wires ignored-calling search, toggles, and removal inside the groups editor modal.
 *
 * @param draft - Mutable ignored-calling list saved when the editor closes.
 * @param catalog - Unique calling-and-organization pairs from the current page.
 */
export function bindIgnoredCallingsEditor(
  draft: Types.IgnoredCalling[],
  catalog: Types.CallingAssignment[]
): void {
  bindIgnoreSearch(draft, catalog);
  bindIgnoreRows(draft, catalog);
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Rebuilds ignored-calling rows and rebinds toggle and remove handlers. */
function renderIgnoreList(draft: Types.IgnoredCalling[], catalog: Types.CallingAssignment[]): void {
  const list = document.getElementById(Dom.IGNORE_LIST_ID);
  if (!list) return;
  setHtml(list, Templates.ignoredList(draft));
  bindIgnoreRows(draft, catalog);
}

/** Attaches searchable autocomplete used to add callings to the ignore list. */
function bindIgnoreSearch(draft: Types.IgnoredCalling[], catalog: Types.CallingAssignment[]): void {
  const wrap = document.querySelector<HTMLElement>(`.${Dom.IGNORE_SEARCH_WRAP}`);
  const input = wrap?.querySelector<HTMLInputElement>(`.${Dom.IGNORE_SEARCH_INPUT}`);
  const dropdown = wrap?.querySelector<HTMLElement>(`.${Dom.IGNORE_SEARCH_DROPDOWN}`);
  if (!wrap || !input || !dropdown) return;

  const hide = () => hideFixedSearchDropdown(dropdown, wrap);

  const showMatches = () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      hide();
      return;
    }

    const selected = new Set(draft.map(callingAssignmentKey));
    const matches = catalog
      .filter((item) => {
        if (selected.has(callingAssignmentKey(item))) return false;
        return formatCallingLabel(item).toLowerCase().includes(query);
      })
      .slice(0, Constants.CALLING_SEARCH_MAX_RESULTS);

    if (matches.length === 0) {
      setHtml(
        dropdown,
        `<li style="padding: 6px 10px; color: #888; font-size: 13px;">${escapeHtml(Constants.NO_MATCHING_CALLINGS)}</li>`
      );
      showFixedSearchDropdown(dropdown, input);
      return;
    }

    setHtml(dropdown, matches.map(Templates.searchItem).join(''));
    showFixedSearchDropdown(dropdown, input);
    dropdown.querySelectorAll<HTMLElement>(`.${Dom.GROUP_SEARCH_ITEM}`).forEach((item) => {
      item.addEventListener('click', () => {
        const calling = item.getAttribute(Dom.DATA_CALLING) || '';
        const organization = item.getAttribute(Dom.DATA_ORGANIZATION) || '';
        if (!calling) return;
        draft.push({ calling, organization, enabled: true });
        input.value = '';
        hide();
        renderIgnoreList(draft, catalog);
      });
    });
  };

  input.addEventListener('input', showMatches);
  input.addEventListener('focus', showMatches);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hide();
  });
}

/** Wires per-row ignore toggles and remove buttons. */
function bindIgnoreRows(draft: Types.IgnoredCalling[], catalog: Types.CallingAssignment[]): void {
  const list = document.getElementById(Dom.IGNORE_LIST_ID);
  if (!list) return;

  list.querySelectorAll<HTMLElement>(`.${Dom.IGNORE_ROW}`).forEach((row) => {
    const item = findIgnoredRow(draft, row);
    if (!item) return;

    row
      .querySelector<HTMLInputElement>(`.${Dom.IGNORE_TOGGLE}`)
      ?.addEventListener('change', (event) => {
        item.enabled = (event.target as HTMLInputElement).checked;
        row.style.opacity = item.enabled ? Dom.IGNORE_ENABLED_OPACITY : Dom.IGNORE_DISABLED_OPACITY;
      });

    row.querySelector(`.${Dom.IGNORE_REMOVE}`)?.addEventListener('click', () => {
      const index = draft.indexOf(item);
      if (index === -1) return;
      draft.splice(index, 1);
      renderIgnoreList(draft, catalog);
    });
  });
}

/** Resolves the draft ignored calling that matches a rendered row. */
function findIgnoredRow(
  draft: Types.IgnoredCalling[],
  row: HTMLElement
): Types.IgnoredCalling | undefined {
  const key = callingAssignmentKey({
    calling: row.getAttribute(Dom.DATA_CALLING) || '',
    organization: row.getAttribute(Dom.DATA_ORGANIZATION) || '',
  });
  return draft.find((item) => callingAssignmentKey(item) === key);
}
