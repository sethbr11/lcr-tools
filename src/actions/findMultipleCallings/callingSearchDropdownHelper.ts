import { Dom } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

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
