import { callingAssignmentKey, escapeHtml, formatCallingLabel, setHtml } from './utils';
import { Constants, Dom, Types } from './types';
import { Templates } from './templates';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Wires a calling autocomplete: typing lists catalog callings not already chosen, Escape
 * closes the list, and clicking a suggestion clears the field and hands it to `onPick`.
 *
 * @param input - Search field.
 * @param wrap - Wrapper that owns the dropdown while it is closed.
 * @param dropdown - Suggestion list element.
 * @param catalog - Unique calling-and-organization pairs from the current page.
 * @param getSelected - Returns the callings already chosen, which are left out of suggestions.
 * @param onPick - Called with the calling the user clicked.
 */
export function bindCallingSearchInput(
  input: HTMLInputElement,
  wrap: HTMLElement,
  dropdown: HTMLElement,
  catalog: Types.CallingAssignment[],
  getSelected: () => Types.CallingAssignment[],
  onPick: (assignment: Types.CallingAssignment) => void
): void {
  const hide = () => hideFixedSearchDropdown(dropdown, wrap);

  const showMatches = () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      hide();
      return;
    }

    const selected = new Set(getSelected().map(callingAssignmentKey));
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
        input.value = '';
        hide();
        onPick({ calling, organization });
      });
    });
  };

  input.addEventListener('input', showMatches);
  input.addEventListener('focus', showMatches);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hide();
  });
}

/**
 * Moves a search dropdown onto the groups modal backdrop and pins it below the input.
 * Later modal sections and overflow clipping cannot cover a fixed, portaled list.
 *
 * @param dropdown - Suggestion list to show.
 * @param input - Search field used as the anchor for left, top, and width.
 */
export function showFixedSearchDropdown(dropdown: HTMLElement, input: HTMLInputElement): void {
  const modal = document.getElementById(Dom.GROUPS_MODAL_ID);
  if (modal && dropdown.parentElement !== modal) modal.appendChild(dropdown);

  const rect = input.getBoundingClientRect();
  dropdown.style.position = Dom.POSITION_FIXED;
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.top = `${rect.bottom}px`;
  dropdown.style.width = `${rect.width}px`;
  dropdown.style.right = 'auto';
  dropdown.style.zIndex = Dom.GROUP_SEARCH_DROPDOWN_Z_INDEX;
  dropdown.style.display = Dom.DISPLAY_BLOCK;
}

/**
 * Hides a portaled search dropdown and returns it to its original wrapper.
 *
 * @param dropdown - Suggestion list to hide.
 * @param home - Original parent wrapper that owns the list when it is closed.
 */
export function hideFixedSearchDropdown(dropdown: HTMLElement, home: HTMLElement): void {
  dropdown.style.display = Dom.DISPLAY_NONE;
  dropdown.replaceChildren();
  dropdown.style.position = '';
  dropdown.style.left = '';
  dropdown.style.top = '';
  dropdown.style.width = '';
  dropdown.style.right = '';
  dropdown.style.zIndex = '';
  if (home.isConnected) home.appendChild(dropdown);
  else dropdown.remove();
}

/**
 * Removes search lists that were moved onto the modal so rebuilt cards can mount clean copies.
 */
export function clearPortaledSearchDropdowns(): void {
  const modal = document.getElementById(Dom.GROUPS_MODAL_ID);
  if (!modal) return;
  modal
    .querySelectorAll(
      `:scope > .${Dom.GROUP_SEARCH_DROPDOWN}, :scope > .${Dom.IGNORE_SEARCH_DROPDOWN}`
    )
    .forEach((dropdown) => dropdown.remove());
}
