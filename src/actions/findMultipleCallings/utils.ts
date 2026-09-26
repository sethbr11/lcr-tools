/**
 * Action-specific utilities for findMultipleCallings, re-exporting all base utilities.
 */

export * from '@/utils';
import { sleep } from '@/utils';
import { Constants, Dom, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/** Navigates table view to the 'With Callings' tab button on Member Callings pages. */
export async function navigateToWithCallingsTab(): Promise<void> {
  const btn = document.querySelector<HTMLButtonElement>(Dom.WITH_CALLINGS_TAB_SELECTOR);
  if (btn) {
    btn.click();
    await sleep(Constants.PAGE_PREPARE_MS);
  }
}

/**
 * Checks All Organizations when that filter exists, without touching the unit picker.
 * Leaves the page unchanged when the checkbox is missing or already selected.
 */
export async function navigateToAllOrganizations(): Promise<void> {
  const allOrgsCheckbox = document.querySelector<HTMLInputElement>(Dom.ALL_ORGS_CHECKBOX_SELECTOR);
  if (!allOrgsCheckbox || allOrgsCheckbox.checked) return;

  const orgsDropdown = findOrganizationsDropdownTrigger(allOrgsCheckbox);
  if (!orgsDropdown) return;

  if (orgsDropdown.getAttribute(Dom.ARIA_EXPANDED) !== Dom.ARIA_EXPANDED_TRUE) {
    orgsDropdown.click();
    await sleep(Constants.PAGE_PREPARE_MS);
  }

  if (!allOrgsCheckbox.checked) {
    allOrgsCheckbox.click();
    await sleep(Constants.ORG_FILTER_APPLY_MS);
  }

  if (orgsDropdown.getAttribute(Dom.ARIA_EXPANDED) === Dom.ARIA_EXPANDED_TRUE) {
    orgsDropdown.click();
    await sleep(Constants.ORG_DROPDOWN_CLOSE_MS);
  }
}

/**
 * Builds a case-insensitive match key from a calling title and organization.
 *
 * @param assignment - Calling-and-organization pair to key.
 * @returns Normalized key used for grouping and catalog uniqueness.
 */
export function callingAssignmentKey(assignment: Types.CallingAssignment): string {
  return `${assignment.calling.trim().toLowerCase()}${Constants.CALLING_KEY_SEPARATOR}${assignment.organization.trim().toLowerCase()}`;
}

/**
 * Formats a calling title with its organization for chips, search results, and filters.
 *
 * @param assignment - Calling-and-organization pair to display.
 * @returns Display string in `Calling (Organization)` form.
 */
export function formatCallingLabel(assignment: Types.CallingAssignment): string {
  return `${assignment.calling} (${assignment.organization})`;
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Resolves the dropdown button that controls the panel containing the All Organizations checkbox. */
function findOrganizationsDropdownTrigger(checkbox: HTMLInputElement): HTMLButtonElement | null {
  const panel = checkbox.closest<HTMLElement>(Dom.ORGS_FILTER_PANEL_SELECTOR);
  const panelId = panel?.id;
  if (!panelId) return null;
  return document.querySelector<HTMLButtonElement>(
    `button[${Dom.ARIA_CONTROLS}="${CSS.escape(panelId)}"]`
  );
}
