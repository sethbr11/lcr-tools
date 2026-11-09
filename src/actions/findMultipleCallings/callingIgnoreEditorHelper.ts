import { callingAssignmentKey, setHtml } from './utils';
import { Dom, Types } from './types';
import { Templates } from './templates';
import { bindCallingSearchInput } from './callingSearchDropdownHelper';

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

  bindCallingSearchInput(
    input,
    wrap,
    dropdown,
    catalog,
    () => draft,
    (assignment) => {
      draft.push({ ...assignment, enabled: true });
      renderIgnoreList(draft, catalog);
    }
  );
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
