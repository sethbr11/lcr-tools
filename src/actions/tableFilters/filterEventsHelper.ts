import {
  autoScrollToLoadContent,
  expandMonthsToShow,
  getCellValue,
  hideLoadingIndicator,
  loadAllPaginatedTableRows,
  parseMonthDay,
  showLoadingIndicator,
  showToast,
} from './utils';
import { applyFilterRules, resetAllFilters } from './filterDOMHelper';
import { buildTableFilterControls } from './filterControlsHelper';
import { Constants, Dom, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Sets up event handling for the 'Load All Data' pagination banner button.
 *
 * @param targetInfo - Table metadata descriptor.
 * @param tableOrGetter - Target table element or supplier function.
 * @param onLoaded - Callback invoked after all records are loaded.
 */
export function setupLoadAllDataButton(
  targetInfo: Types.TableInfo,
  tableOrGetter: HTMLTableElement | (() => HTMLTableElement),
  onLoaded: () => void
): void {
  const getTable = typeof tableOrGetter === 'function' ? tableOrGetter : () => tableOrGetter;
  const loadBtn = document.getElementById(Dom.LOAD_ALL_DATA_BTN_ID);
  if (!loadBtn) return;

  loadBtn.addEventListener('click', async () => {
    loadBtn.setAttribute('disabled', 'true');
    loadBtn.textContent = 'Loading...';
    showLoadingIndicator('Loading all data...', 'Paging through all report records');

    try {
      if (targetInfo.needs?.includes('scroll')) {
        await autoScrollToLoadContent();
      } else {
        await loadAllPaginatedTableRows(getTable());
      }
      hideLoadingIndicator();
      showToast('All table records loaded into view!', { type: 'success' });

      const bannerContainer = document.getElementById(Dom.LOAD_DATA_CONTAINER_ID);
      if (bannerContainer) bannerContainer.style.display = 'none';

      onLoaded();
    } catch {
      hideLoadingIndicator();
      loadBtn.removeAttribute('disabled');
      loadBtn.textContent = 'Load All Data';
      showToast('Could not load all pages automatically.', { type: 'warning' });
    }
  });
}

/**
 * Resets all filter rules and DOM controls to empty default states.
 *
 * @param rules - Active map of filter rules.
 * @param targetOrGetter - Target table(s) or supplier function.
 * @param primaryTable - Optional primary table for date expansion.
 * @returns Promise resolving to boolean indicating completion.
 */
export async function handleResetFilters(
  rules: Map<number, Types.FilterRule>,
  targetOrGetter:
    HTMLTableElement | HTMLTableElement[] | (() => HTMLTableElement | HTMLTableElement[]),
  primaryTable?: HTMLTableElement
): Promise<boolean> {
  const getTarget = typeof targetOrGetter === 'function' ? targetOrGetter : () => targetOrGetter;
  const hasMonthDayRule = Array.from(rules.values()).some((r) => r.type === 'month-day');
  if (hasMonthDayRule && primaryTable) {
    await expandMonthsToShow(12, primaryTable);
  }

  resetAllFilters(getTarget());
  for (const rule of rules.values()) {
    rule.selectedValue = '';
    rule.minValue = undefined;
    rule.maxValue = undefined;
    rule.fromDate = undefined;
    rule.toDate = undefined;
    rule.selectedMonth = undefined;
    rule.fromDay = undefined;
    rule.toDay = undefined;
  }
  window.__LCR_TABLE_FILTERS_STATE__ = rules;

  const controlsContainer = document.getElementById(Dom.FILTER_CONTROLS_ID);
  if (controlsContainer) {
    controlsContainer.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
      input.value = '';
    });
    controlsContainer.querySelectorAll<HTMLSelectElement>('select').forEach((select) => {
      select.value = '';
    });
  }

  const statusEl = document.getElementById(Dom.STATUS_ELEMENT_ID);
  if (statusEl) {
    statusEl.style.display = 'none';
    statusEl.textContent = '';
  }

  return true;
}

/**
 * Binds input and change event listeners to dynamically generated column filter controls.
 *
 * @param targetOrGetter - Target table(s) or supplier function.
 * @param rules - Map of filter rules to bind and update.
 */
export function setupTableFilterHandlers(
  targetOrGetter:
    HTMLTableElement | HTMLTableElement[] | (() => HTMLTableElement | HTMLTableElement[]),
  rules: Map<number, Types.FilterRule>
): void {
  const getTarget = typeof targetOrGetter === 'function' ? targetOrGetter : () => targetOrGetter;

  for (const [colIdx, rule] of rules.entries()) {
    if (rule.type === 'number') {
      bindNumberFilter(colIdx, rule, rules, getTarget);
    } else if (rule.type === 'date') {
      bindDateFilter(colIdx, rule, rules, getTarget);
    } else if (rule.type === 'month-day') {
      bindMonthDayFilter(colIdx, rule, rules, getTarget);
    } else {
      bindSelectFilter(colIdx, rule, rules, getTarget);
    }
  }
}

/**
 * Sets up change event handler for the table selector dropdown.
 *
 * @param tableSelectEl - Dropdown select element.
 * @param tables - Discovered table metadata list.
 * @param allTables - Array of all HTML table elements.
 * @param getTarget - Supplier returning current target table(s).
 * @param onModeChanged - Callback when mode or rules change.
 */
export function setupTableSelector(
  tableSelectEl: HTMLSelectElement,
  tables: Types.TableInfo[],
  allTables: HTMLTableElement[],
  getTarget: () => HTMLTableElement | HTMLTableElement[],
  onModeChanged: (mode: 'all' | number, newRules: Map<number, Types.FilterRule>) => void
): void {
  tableSelectEl.addEventListener('change', () => {
    const val = tableSelectEl.value;
    const tableNameEl = document.getElementById(Dom.CURRENT_TABLE_NAME_ID);
    const statusEl = document.getElementById(Dom.STATUS_ELEMENT_ID);
    if (statusEl) {
      statusEl.style.display = 'none';
      statusEl.textContent = '';
    }

    if (val === Constants.ALL_TABLES_OPTION_VALUE) {
      resetAllFilters(allTables);
      if (tableNameEl) {
        tableNameEl.textContent = `Table: ${Constants.ALL_TABLES_LABEL} (${tables.length})`;
      }
      const updated = buildTableFilterControls(allTables);
      const controlsContainer = document.getElementById(Dom.FILTER_CONTROLS_ID);
      if (controlsContainer) {
        controlsContainer.innerHTML = updated.controlsHtml;
      }
      setupTableFilterHandlers(getTarget, updated.rules);
      window.__LCR_TABLE_FILTERS_STATE__ = updated.rules;
      applyFilterRules(getTarget(), updated.rules);
      onModeChanged('all', updated.rules);
    } else {
      const newIdx = parseInt(val, 10);
      if (!isNaN(newIdx) && tables[newIdx]) {
        resetAllFilters(allTables);
        const targetInfo = tables[newIdx];
        const tableEl = targetInfo.table as HTMLTableElement;
        if (tableNameEl) {
          tableNameEl.textContent = `Table: ${targetInfo.name}`;
        }
        tableEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const updated = buildTableFilterControls(tableEl);
        const controlsContainer = document.getElementById(Dom.FILTER_CONTROLS_ID);
        if (controlsContainer) {
          controlsContainer.innerHTML = updated.controlsHtml;
        }
        setupTableFilterHandlers(getTarget, updated.rules);
        window.__LCR_TABLE_FILTERS_STATE__ = updated.rules;
        applyFilterRules(getTarget(), updated.rules);
        onModeChanged(newIdx, updated.rules);
      }
    }
  });
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Binds listeners for numeric min/max filter inputs. */
function bindNumberFilter(
  colIdx: number,
  rule: Types.FilterRule,
  rules: Map<number, Types.FilterRule>,
  getTarget: () => HTMLTableElement | HTMLTableElement[]
): void {
  const minId = `${Dom.FILTER_SELECT_PREFIX}${colIdx}${Dom.FILTER_MIN_SUFFIX}`;
  const maxId = `${Dom.FILTER_SELECT_PREFIX}${colIdx}${Dom.FILTER_MAX_SUFFIX}`;
  const minEl = document.getElementById(minId) as HTMLInputElement | null;
  const maxEl = document.getElementById(maxId) as HTMLInputElement | null;

  const handleNumberChange = (): void => {
    rule.minValue = minEl?.value ? parseFloat(minEl.value) : undefined;
    rule.maxValue = maxEl?.value ? parseFloat(maxEl.value) : undefined;
    window.__LCR_TABLE_FILTERS_STATE__ = rules;
    applyFilterRules(getTarget(), rules);
  };

  if (minEl) {
    minEl.addEventListener('input', handleNumberChange);
    minEl.addEventListener('change', handleNumberChange);
  }
  if (maxEl) {
    maxEl.addEventListener('input', handleNumberChange);
    maxEl.addEventListener('change', handleNumberChange);
  }
}

/** Binds listeners for date range filter inputs. */
function bindDateFilter(
  colIdx: number,
  rule: Types.FilterRule,
  rules: Map<number, Types.FilterRule>,
  getTarget: () => HTMLTableElement | HTMLTableElement[]
): void {
  const fromId = `${Dom.FILTER_SELECT_PREFIX}${colIdx}${Dom.FILTER_FROM_SUFFIX}`;
  const toId = `${Dom.FILTER_SELECT_PREFIX}${colIdx}${Dom.FILTER_TO_SUFFIX}`;
  const fromEl = document.getElementById(fromId) as HTMLInputElement | null;
  const toEl = document.getElementById(toId) as HTMLInputElement | null;

  const handleDateChange = (): void => {
    rule.fromDate = fromEl?.value || undefined;
    rule.toDate = toEl?.value || undefined;
    window.__LCR_TABLE_FILTERS_STATE__ = rules;
    applyFilterRules(getTarget(), rules);
  };

  if (fromEl) {
    fromEl.addEventListener('input', handleDateChange);
    fromEl.addEventListener('change', handleDateChange);
  }
  if (toEl) {
    toEl.addEventListener('input', handleDateChange);
    toEl.addEventListener('change', handleDateChange);
  }
}

/** Binds listeners for month/day calendar filter inputs. */
function bindMonthDayFilter(
  colIdx: number,
  rule: Types.FilterRule,
  rules: Map<number, Types.FilterRule>,
  getTarget: () => HTMLTableElement | HTMLTableElement[]
): void {
  const monthId = `${Dom.FILTER_SELECT_PREFIX}${colIdx}${Dom.FILTER_MONTH_SUFFIX}`;
  const fromDayId = `${Dom.FILTER_SELECT_PREFIX}${colIdx}${Dom.FILTER_FROM_DAY_SUFFIX}`;
  const toDayId = `${Dom.FILTER_SELECT_PREFIX}${colIdx}${Dom.FILTER_TO_DAY_SUFFIX}`;
  const monthEl = document.getElementById(monthId) as HTMLSelectElement | null;
  const fromDayEl = document.getElementById(fromDayId) as HTMLInputElement | null;
  const toDayEl = document.getElementById(toDayId) as HTMLInputElement | null;

  const handleMonthDayChange = async (): Promise<void> => {
    const newMonth = monthEl?.value ? parseInt(monthEl.value, 10) : undefined;
    rule.selectedMonth = newMonth;
    rule.fromDay = fromDayEl?.value ? parseInt(fromDayEl.value, 10) : undefined;
    rule.toDay = toDayEl?.value ? parseInt(toDayEl.value, 10) : undefined;

    const currentTarget = getTarget();
    const primaryTable = Array.isArray(currentTarget) ? currentTarget[0] : currentTarget;

    if (newMonth === undefined) {
      if (primaryTable) {
        const expanded = await expandMonthsToShow(12, primaryTable);
        if (expanded) {
          showToast('Expanded table to show all 12 months.', { type: 'info' });
        }
      }
    } else if (primaryTable) {
      const currentTableHasMonth = Array.from(primaryTable.querySelectorAll('tbody tr')).some(
        (row) => {
          const cell = row.querySelectorAll('td')[colIdx];
          if (!cell) return false;
          const md = parseMonthDay(getCellValue(cell as HTMLElement).trim());
          return md?.month === newMonth;
        }
      );
      if (!currentTableHasMonth) {
        await expandMonthsToShow(12, primaryTable);
      }
    }

    window.__LCR_TABLE_FILTERS_STATE__ = rules;
    applyFilterRules(getTarget(), rules);
  };

  if (monthEl) monthEl.addEventListener('change', handleMonthDayChange);
  if (fromDayEl) {
    fromDayEl.addEventListener('input', handleMonthDayChange);
    fromDayEl.addEventListener('change', handleMonthDayChange);
  }
  if (toDayEl) {
    toDayEl.addEventListener('input', handleMonthDayChange);
    toDayEl.addEventListener('change', handleMonthDayChange);
  }
}

/** Binds listeners for dropdown and vacancy select filters. */
function bindSelectFilter(
  colIdx: number,
  rule: Types.FilterRule,
  rules: Map<number, Types.FilterRule>,
  getTarget: () => HTMLTableElement | HTMLTableElement[]
): void {
  const selectId =
    rule.type === 'vacancy' ? Dom.VACANCY_FILTER_ID : `${Dom.FILTER_SELECT_PREFIX}${colIdx}`;
  const el = document.getElementById(selectId) as HTMLSelectElement | null;
  if (el) {
    el.addEventListener('change', () => {
      rule.selectedValue = el.value;
      window.__LCR_TABLE_FILTERS_STATE__ = rules;
      applyFilterRules(getTarget(), rules);
    });
  }
}
