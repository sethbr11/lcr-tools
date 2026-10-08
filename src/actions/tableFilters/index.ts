import {
  createSideModal,
  escapeHtml,
  getPageTables,
  isTableFilterable,
  setHtml,
  showToast,
} from './utils';
import { applyFilterRules } from './filterDOMHelper';
import { buildTableFilterControls } from './filterControlsHelper';
import {
  handleResetFilters,
  setupLoadAllDataButton,
  setupTableFilterHandlers,
  setupTableSelector,
} from './filterEventsHelper';
import { Constants, Dom, Types } from './types';
import { Templates } from './templates';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Main entrypoint orchestrating the Table Filters action pipeline.
 * Steps:
 *   1. Discover candidate tables on page.
 *   2. Identify filterable columns and collect unique values for target table.
 *   3. Build filter control UI HTML (including table selector and pagination banner if needed).
 *   4. Open side drawer modal and bind filter, table selection, and pagination handlers.
 *
 * @returns Promise resolving to execution outcome.
 */
export async function runTableFilters(): Promise<Types.ActionResult<Types.TableFiltersResult>> {
  // Step 1: Detect tables on current page
  const discovered = getPageTables();
  if (discovered.length === 0) {
    showToast('No tables found on this page.', { type: 'warning' });
    return { success: false, error: 'No tables found' };
  }

  const tables = discovered.filter((t) => isTableFilterable(t.table as HTMLTableElement));
  if (tables.length === 0) {
    showToast('No filterable tables found on this page.', { type: 'warning' });
    return { success: false, error: 'No filterable tables found' };
  }

  const allTables = tables.map((t) => t.table as HTMLTableElement);
  let selectedMode: 'all' | number = tables.length > 1 ? 'all' : 0;
  let targetInfo = tables[0];
  let tableEl = targetInfo.table as HTMLTableElement;

  // Step 2: Build initial filter controls
  let { rules, controlsHtml } = buildTableFilterControls(
    selectedMode === 'all' ? allTables : tableEl,
    window.__LCR_TABLE_FILTERS_STATE__
  );
  if (rules.size === 0) {
    showToast('No filterable columns found in this table.', { type: 'warning' });
    return { success: false, error: 'No filterable columns found' };
  }

  // Step 3: Compose modal elements
  const allOptionHtml = `<option value="${Constants.ALL_TABLES_OPTION_VALUE}"${
    selectedMode === 'all' ? ' selected' : ''
  }>${Constants.ALL_TABLES_LABEL} (${tables.length})</option>`;
  const individualOptionsHtml = tables
    .map(
      (t, idx) =>
        `<option value="${idx}"${
          selectedMode === idx ? ' selected' : ''
        }>${escapeHtml(t.name)}</option>`
    )
    .join('');

  const tableSelectorHtml =
    tables.length > 1
      ? Templates.tableSelectorContainer(allOptionHtml + individualOptionsHtml)
      : '';

  const initialDisplayName =
    selectedMode === 'all' ? `${Constants.ALL_TABLES_LABEL} (${tables.length})` : targetInfo.name;

  const hasMoreData =
    Boolean(targetInfo.needs?.includes('pagination')) ||
    Boolean(targetInfo.needs?.includes('scroll'));
  const paginationBannerHtml =
    hasMoreData && selectedMode !== 'all' ? Templates.loadAllDataBanner() : '';

  const modalContent = Templates.sideModalBody(
    initialDisplayName,
    controlsHtml,
    tableSelectorHtml,
    paginationBannerHtml
  );

  const getTarget = (): HTMLTableElement | HTMLTableElement[] => {
    if (selectedMode === 'all') return allTables;
    if (tableEl && tableEl.isConnected) return tableEl;
    const freshTables = getPageTables().filter((t) =>
      isTableFilterable(t.table as HTMLTableElement)
    );
    if (typeof selectedMode === 'number' && freshTables[selectedMode]) {
      targetInfo = freshTables[selectedMode];
      tableEl = targetInfo.table as HTMLTableElement;
      return tableEl;
    }
    const fallback = document.querySelector<HTMLTableElement>('table');
    if (fallback) {
      tableEl = fallback;
      return fallback;
    }
    return tableEl;
  };

  // Step 4: Launch side modal with controls
  createSideModal({
    id: Dom.FILTER_MODAL_ID,
    title: 'Filter Table Data',
    content: modalContent,
    width: '380px',
    side: 'right',
    buttons: [
      {
        text: 'Reset Filters',
        type: 'secondary',
        onClick: async () => {
          const primaryTable = selectedMode === 'all' ? allTables[0] : tableEl;
          return handleResetFilters(rules, getTarget, primaryTable);
        },
      },
    ],
  });

  // Step 5: Attach event listeners
  setupTableFilterHandlers(getTarget, rules);

  if (tables.length > 1) {
    const tableSelectEl = document.getElementById(
      Dom.TABLE_SELECTOR_ID
    ) as HTMLSelectElement | null;
    if (tableSelectEl) {
      setupTableSelector(tableSelectEl, tables, allTables, getTarget, (newMode, newRules) => {
        selectedMode = newMode;
        rules = newRules;
        if (typeof newMode === 'number') {
          targetInfo = tables[newMode];
          tableEl = targetInfo.table as HTMLTableElement;
        }
      });
    }
  }

  if (selectedMode !== 'all') {
    setupLoadAllDataButton(
      targetInfo,
      () => tableEl,
      () => {
        const updated = buildTableFilterControls(tableEl);
        rules = updated.rules;
        const controlsContainer = document.getElementById(Dom.FILTER_CONTROLS_ID);
        if (controlsContainer) {
          setHtml(controlsContainer, updated.controlsHtml);
        }
        setupTableFilterHandlers(getTarget, rules);
        window.__LCR_TABLE_FILTERS_STATE__ = rules;
        applyFilterRules(getTarget(), rules);
      }
    );
  }

  // Persist current rules to window and sync filter display
  window.__LCR_TABLE_FILTERS_STATE__ = rules;
  applyFilterRules(getTarget(), rules);

  return { success: true, data: { columnsFiltered: rules.size } };
}
