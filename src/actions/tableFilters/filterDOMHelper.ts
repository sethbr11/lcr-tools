import { getCellValue, getRelevantHeaderCells } from './utils';
import { evaluateRuleMatch, isRuleActive } from './filterRuleEvaluator';
import { Dom, Regex, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Scans table rows and toggles display style based on active filter rules.
 * Supports filtering either a single table or multiple tables simultaneously.
 *
 * @param target - Target HTML table element or array of candidate table elements.
 * @param rules - Map of column indices or rule keys to active FilterRule objects.
 * @returns Summary of visible and total rows after filter application.
 */
export function applyFilterRules(
  target: HTMLTableElement | HTMLTableElement[],
  rules: Map<number, Types.FilterRule>
): Types.FilterApplicationResult {
  const isMulti = Array.isArray(target);
  const tables = isMulti
    ? target
    : [target.isConnected ? target : document.querySelector<HTMLTableElement>('table') || target];
  const hasActiveRule = Array.from(rules.values()).some(isRuleActive);

  let totalVisible = 0;
  let totalRows = 0;

  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    totalRows += rows.length;

    let visibleInThisTable = 0;
    const { headers, indices } = getRelevantHeaderCells(table);

    // Map each rule to this specific table's corresponding column index
    const ruleColMap = new Map<Types.FilterRule, number>();
    for (const rule of rules.values()) {
      if (isMulti) {
        const hIdx = headers.findIndex(
          (h) => h.trim().toLowerCase() === rule.columnName.trim().toLowerCase()
        );
        ruleColMap.set(rule, hIdx !== -1 ? indices[hIdx] : -1);
      } else {
        ruleColMap.set(rule, rule.columnIndex);
      }
    }

    const activeRulesList = Array.from(rules.values()).filter(isRuleActive);
    const tableHasActiveRule = activeRulesList.some(
      (r) => r.type === 'vacancy' || (ruleColMap.get(r) !== undefined && ruleColMap.get(r) !== -1)
    );

    if (activeRulesList.length > 0 && !tableHasActiveRule) {
      for (const row of rows) {
        (row as HTMLElement).style.display = 'none';
      }
    } else {
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td'));
        let matchesAll = true;

        for (const rule of activeRulesList) {
          if (rule.type === 'vacancy') {
            if (!evaluateRuleMatch('', rule, undefined, row as HTMLElement)) {
              matchesAll = false;
              break;
            }
            continue;
          }

          const colIdx = ruleColMap.get(rule);
          if (colIdx === undefined || colIdx === -1) {
            // Table does not possess this column; do not disqualify the row (permissive OR across tables)
            continue;
          }

          const cell = cells[colIdx];
          const cellVal = cell ? getCellValue(cell as HTMLElement).trim() : '';

          if (!evaluateRuleMatch(cellVal, rule, cell as HTMLElement, row as HTMLElement)) {
            matchesAll = false;
            break;
          }
        }

        if (matchesAll) {
          (row as HTMLElement).style.display = '';
          visibleInThisTable++;
          totalVisible++;
        } else {
          (row as HTMLElement).style.display = 'none';
        }
      }
    }

    // In multi-table mode, hide empty card sections when filters are active
    if (isMulti) {
      const card = table.closest(Dom.EDEN_TABLE_CONTAINER_SELECTOR) || table;
      const section =
        card.parentElement?.classList.contains(Dom.EDEN_STACK_CLASS) &&
        card.parentElement.querySelectorAll('table').length === 1
          ? card.parentElement
          : (card as HTMLElement);

      if (hasActiveRule && visibleInThisTable === 0) {
        (section as HTMLElement).style.display = 'none';
      } else {
        (section as HTMLElement).style.display = '';
      }
    }

    // Update table footer count display if footer count element is present
    updateTableFooterCount(table, visibleInThisTable, rows.length, hasActiveRule);
  }

  updateFilterStatusBar(totalVisible, totalRows, false, isMulti ? tables.length : undefined);
  return {
    visible: totalVisible,
    total: totalRows,
    tableCount: isMulti ? tables.length : undefined,
  };
}

/**
 * Restores visibility for all hidden table rows and resets filter input elements.
 * Supports resetting either a single table or multiple tables simultaneously.
 *
 * @param target - Target HTML table element or array of candidate table elements.
 */
export function resetAllFilters(target: HTMLTableElement | HTMLTableElement[]): void {
  const isMulti = Array.isArray(target);
  const tables = isMulti
    ? target
    : [target.isConnected ? target : document.querySelector<HTMLTableElement>('table') || target];
  let totalRows = 0;

  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    totalRows += rows.length;
    for (const row of rows) {
      (row as HTMLElement).style.display = '';
    }

    if (isMulti) {
      const card = table.closest(Dom.EDEN_TABLE_CONTAINER_SELECTOR) || table;
      const section =
        card.parentElement?.classList.contains(Dom.EDEN_STACK_CLASS) &&
        card.parentElement.querySelectorAll('table').length === 1
          ? card.parentElement
          : (card as HTMLElement);
      (section as HTMLElement).style.display = '';
    }

    // Restore table footer count to original
    updateTableFooterCount(table, rows.length, rows.length, false);
  }

  const selects = document.querySelectorAll<HTMLSelectElement>(
    `select[id^="${Dom.FILTER_SELECT_PREFIX}"]`
  );
  selects.forEach((s) => (s.value = ''));

  const inputs = document.querySelectorAll<HTMLInputElement>(
    `input[id^="${Dom.FILTER_SELECT_PREFIX}"]`
  );
  inputs.forEach((i) => (i.value = ''));

  updateFilterStatusBar(totalRows, totalRows, true, isMulti ? tables.length : undefined);
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/**
 * Locates the footer count element within an HTML table or its enclosing card container.
 *
 * @param table - Target HTML table element.
 * @returns Found count HTMLElement or null if not found.
 */
export function findFooterCountElement(table: HTMLTableElement): HTMLElement | null {
  const tfoot = table.querySelector('tfoot');
  if (tfoot) {
    const edenText = tfoot.querySelector<HTMLElement>('.table-container__footer-row .eden-text');
    if (edenText && Regex.TABLE_FOOTER_COUNT.test(edenText.textContent || '')) {
      return edenText;
    }
    const footerDiv = tfoot.querySelector<HTMLElement>('.table-container__footer-row > div');
    if (footerDiv && Regex.TABLE_FOOTER_COUNT.test(footerDiv.textContent || '')) {
      return footerDiv;
    }
    const footerRow = tfoot.querySelector<HTMLElement>('.table-container__footer-row');
    if (footerRow && Regex.TABLE_FOOTER_COUNT.test(footerRow.textContent || '')) {
      return footerRow;
    }
    const elements = Array.from(tfoot.querySelectorAll<HTMLElement>('*'));
    for (const el of elements) {
      if (el.children.length === 0 && Regex.GENERIC_FOOTER_COUNT.test(el.textContent || '')) {
        return el;
      }
    }
  }

  const container = table.closest(Dom.EDEN_TABLE_CONTAINER_SELECTOR) || table.parentElement;
  if (container) {
    const edenText = container.querySelector<HTMLElement>(
      '.table-container__footer-row .eden-text'
    );
    if (edenText && Regex.TABLE_FOOTER_COUNT.test(edenText.textContent || '')) {
      return edenText;
    }
    const footerDiv = container.querySelector<HTMLElement>('.table-container__footer-row > div');
    if (footerDiv && Regex.TABLE_FOOTER_COUNT.test(footerDiv.textContent || '')) {
      return footerDiv;
    }
    const footerRow = container.querySelector<HTMLElement>('.table-container__footer-row');
    if (footerRow && Regex.TABLE_FOOTER_COUNT.test(footerRow.textContent || '')) {
      return footerRow;
    }
  }

  return null;
}

/**
 * Updates the table footer row count to reflect the number of visible filtered rows.
 *
 * @param table - Target HTML table element.
 * @param visible - Count of visible matching rows.
 * @param total - Total row count in this table.
 * @param hasActiveRule - Whether filter rules are currently actively applied.
 */
export function updateTableFooterCount(
  table: HTMLTableElement,
  visible: number,
  total: number,
  hasActiveRule: boolean
): void {
  const countEl = findFooterCountElement(table);
  if (!countEl) return;

  const isAlreadyModified = countEl.hasAttribute(Dom.ORIGINAL_FOOTER_COUNT_ATTR);

  if (!hasActiveRule) {
    if (!isAlreadyModified) return;

    const origText = countEl.getAttribute(Dom.ORIGINAL_FOOTER_TEXT_ATTR) || `Count: ${total}`;
    countEl.textContent = origText;
    countEl.removeAttribute(Dom.ORIGINAL_FOOTER_COUNT_ATTR);
    countEl.removeAttribute(Dom.ORIGINAL_FOOTER_TEXT_ATTR);
    return;
  }

  if (!isAlreadyModified) {
    const match = (countEl.textContent || '').match(Regex.TABLE_FOOTER_COUNT);
    const origNum = match && match[1] ? match[1] : String(total);
    countEl.setAttribute(Dom.ORIGINAL_FOOTER_COUNT_ATTR, origNum);
    countEl.setAttribute(
      Dom.ORIGINAL_FOOTER_TEXT_ATTR,
      countEl.textContent?.trim() || `Count: ${origNum}`
    );
  }

  const origCount = countEl.getAttribute(Dom.ORIGINAL_FOOTER_COUNT_ATTR) || String(total);
  countEl.innerHTML = `<span style="color: #00509e; font-weight: 700;">Count: ${visible}</span> of ${origCount} (filtered)`;
}

/** Updates counter text inside filter status message container. */
function updateFilterStatusBar(
  visible: number,
  total: number,
  isReset: boolean = false,
  tableCount?: number
): void {
  const statusEl = document.getElementById(Dom.STATUS_ELEMENT_ID);
  if (!statusEl) return;

  statusEl.style.display = 'block';
  const tableSuffix =
    tableCount !== undefined && tableCount > 1 ? ` across ${tableCount} tables.` : '.';

  if (isReset) {
    statusEl.style.backgroundColor = '#e8f5e9';
    statusEl.style.color = '#2e7d32';
    statusEl.textContent = `All filters reset. Showing all ${total} rows${tableSuffix}`;
  } else {
    statusEl.style.backgroundColor = '#e3f2fd';
    statusEl.style.color = '#0d47a1';
    statusEl.textContent = `Showing ${visible} of ${total} rows${tableSuffix}`;
  }
}
