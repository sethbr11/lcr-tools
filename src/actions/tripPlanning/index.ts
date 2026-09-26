import { browser } from 'wxt/browser';
import {
  extractMembersForTripPlanning,
  getPageTables,
  hideLoadingIndicator,
  requestTables,
  showConfirmationModal,
  showLcrMaintenanceModal,
  showLoadingIndicator,
} from './utils';
import { attachChurchCoordinates } from './geocoding/churchCoordsHelper';
import { Constants, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Main entrypoint orchestrating the Trip Planning action.
 * Steps:
 *   1. Present confirmation prompt to open Trip Planner tab.
 *   2. Find candidate tables on page containing Name and Address fields.
 *   3. Extract member addresses and column mappings with loading overlay.
 *   4. Attach Church Directory household coordinates when a local name match exists.
 *   5. Persist data into local extension storage and open Trip Planner tab.
 *
 * @returns Promise resolving to execution outcome.
 */
export async function runTripPlanning(): Promise<Types.ActionResult<Types.TripPlanningResult>> {
  // Step 1: Confirmation prompt
  const confirmed = await showConfirmationModal({
    title: Constants.CONFIRM_TITLE,
    message: Constants.CONFIRM_MESSAGE,
    confirmText: Constants.CONFIRM_OPEN_TEXT,
    cancelText: Constants.CONFIRM_CANCEL_TEXT,
  });
  if (!confirmed) return { success: false, error: 'Cancelled by user' };

  // Step 2: Discover tables
  const tables = getPageTables();
  if (tables.length === 0) {
    showLcrMaintenanceModal(Constants.ACTION_DISPLAY_NAME, Constants.MAINTENANCE_NO_TABLES);
    return { success: false, error: 'No tables' };
  }

  let targetTable: HTMLTableElement;
  if (tables.length > 1) {
    const selected = await requestTables(tables, false);
    if (!selected) return { success: false, error: 'Cancelled by user' };
    targetTable = selected.table as HTMLTableElement;
  } else {
    targetTable = tables[0].table as HTMLTableElement;
  }

  showLoadingIndicator(Constants.LOADING_TITLE, Constants.LOADING_SUBHEADER);

  try {
    // Step 3: Extract member data
    const extraction = extractMembersForTripPlanning(targetTable);
    if (!extraction) {
      hideLoadingIndicator();
      showLcrMaintenanceModal(Constants.ACTION_DISPLAY_NAME, Constants.MAINTENANCE_MISSING_COLUMNS);
      return { success: false, error: 'Missing columns' };
    }

    // Step 4: Prefer Church Directory coordinates over third-party geocoding
    const members = await attachChurchCoordinates(extraction.members, window.location.href);
    const churchCoordCount = members.filter((member) => member.coordSource === 'church').length;

    // Step 5: Save to storage and open new tab
    if (browser?.storage?.local) {
      await browser.storage.local.set({
        [Constants.STORAGE_DATA_KEY]: members,
        [Constants.STORAGE_HEADERS_KEY]: extraction.headers,
      });
    }

    const pageUrl = browser?.runtime?.getURL
      ? browser.runtime.getURL(Constants.PAGE_PATH)
      : Constants.PAGE_PATH;

    if (browser?.tabs?.create) {
      await browser.tabs.create({ url: pageUrl });
    } else {
      window.open(pageUrl, '_blank');
    }

    return { success: true, data: { memberCount: members.length, churchCoordCount } };
  } catch (error) {
    console.error('LCR Tools: Failed to launch trip planning tab:', error);
    return { success: false, error: String(error) };
  } finally {
    hideLoadingIndicator();
  }
}
