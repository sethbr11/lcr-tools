import { sleep } from './coreUtils';
import { Dom, Constants, Regex, Types } from '@/types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Navigates table pagination back to the first page if not already there.
 *
 * @param delay - Milliseconds to pause following button click.
 */
export async function navigateToFirstPage(
  delay: number = Constants.DEFAULT_PAGINATION_DELAY_MS
): Promise<void> {
  const firstBtn = findFirstAvailableButton(Dom.PAGINATION_SELECTORS.firstPageButtons);
  if (firstBtn && !firstBtn.disabled && firstBtn.offsetParent !== null) {
    firstBtn.click();
    await sleep(delay);
  }
}

/**
 * Evaluates whether the currently displayed table view represents the final page of data.
 *
 * @returns True if pagination buttons indicate the last page has been reached.
 */
export function isLastPage(): boolean {
  const nextBtn = findFirstAvailableButton(Dom.PAGINATION_SELECTORS.nextPageButtons);
  if (nextBtn) {
    const isDisabled = nextBtn.disabled || nextBtn.hasAttribute('disabled');
    if (isDisabled) return true;
  }

  const lastBtn = findFirstAvailableButton(Dom.PAGINATION_SELECTORS.lastPageButtons);
  if (lastBtn) {
    const isHidden = lastBtn.offsetParent === null;
    const isDisabled = lastBtn.disabled || lastBtn.hasAttribute('disabled');
    if (isHidden || isDisabled) return true;
  }

  const indicator = document.querySelector(Dom.PAGINATION_SELECTORS.pageIndicatorText);
  if (indicator) {
    const text = indicator.textContent || '';
    const match = text.match(Regex.PAGE_STATUS_COUNT);
    if (match && match[1] === match[2]) return true;
  }

  return false;
}

/**
 * Advances the active table view to the subsequent page.
 *
 * @param delay - Milliseconds to pause following button click.
 * @returns Promise resolving to true if next page clicked, false if already at last page.
 */
export async function goToNextPage(
  delay: number = Constants.DEFAULT_PAGINATION_DELAY_MS
): Promise<boolean> {
  if (isLastPage()) return false;

  const nextBtn = findFirstAvailableButton(Dom.PAGINATION_SELECTORS.nextPageButtons);
  if (nextBtn && !nextBtn.disabled) {
    nextBtn.click();
    await sleep(delay);
    return true;
  }

  return false;
}

/**
 * Sets a value on a HTML select element and fires change and input events.
 *
 * @param selectElement - Target HTMLSelectElement.
 * @param value - Value string to assign.
 * @returns True if value was successfully updated, false otherwise.
 */
export function setSelectValue(selectElement: HTMLSelectElement | null, value: string): boolean {
  if (!selectElement) return false;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
  if (setter) {
    setter.call(selectElement, value);
  } else {
    selectElement.value = value;
  }
  selectElement.dispatchEvent(new Event('change', { bubbles: true }));
  selectElement.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

/**
 * Detects special needs required to read all rows from an LCR table (pagination, scrolling).
 *
 * @param targetTable - Target table element to examine.
 * @returns Array of detected need identifiers (e.g. ['pagination', 'scroll']).
 */
export function getNeeds(targetTable?: HTMLElement | null): string[] {
  const needs: string[] = [];

  const hasNextPage = !!findFirstAvailableButton(Dom.PAGINATION_SELECTORS.nextPageButtons);
  if (hasNextPage) needs.push('pagination');

  const scrollContainer =
    targetTable?.closest(Dom.PAGINATION_SELECTORS.infiniteScrollElement) ||
    document.querySelector(Dom.PAGINATION_SELECTORS.infiniteScrollElement);

  if (scrollContainer && scrollContainer.scrollHeight > scrollContainer.clientHeight) {
    needs.push('scroll');
  }

  return needs;
}

/**
 * Switches the active UI view to a designated tab link or button.
 *
 * @param tabElementOrSelector - Tab DOM element or string selector.
 * @returns True if tab was found and activated.
 */
export function navigateToTab(tabElementOrSelector: HTMLElement | string): boolean {
  const tab =
    typeof tabElementOrSelector === 'string'
      ? document.querySelector<HTMLElement>(tabElementOrSelector)
      : tabElementOrSelector;
  if (!tab) return false;

  // Check if already active
  if (tab.classList.contains('active') || tab.getAttribute('aria-selected') === 'true') {
    return true;
  }

  tab.click();
  return true;
}

/**
 * Matches a URL against include and exclude pattern sets.
 *
 * @param url - URL string to check.
 * @param patterns - Object with include and exclude pattern arrays.
 * @returns True if URL passes all include and exclude rules.
 */
export function isUrlMatching(url: string, patterns: Types.UrlPatternConfig): boolean {
  if (!url) return false;

  const matchesAny = (list: (string | RegExp)[]) =>
    list.some((item) => (typeof item === 'string' ? url.includes(item) : item.test(url)));

  const isIncluded = patterns.include.length === 0 || matchesAny(patterns.include);
  const isExcluded = patterns.exclude.length > 0 && matchesAny(patterns.exclude);

  return isIncluded && !isExcluded;
}

/**
 * Returns whether a URL is on a Church LCR host (lcr, lcrf, or lcrffe).
 *
 * @param url - Absolute URL of the active tab, if known.
 * @returns True when the host is an LCR-like Church domain.
 */
export function isLcrHostUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return Regex.LCR_HOST_URL.test(url);
}

/**
 * Progressively scrolls page downwards to trigger lazy loading of infinite scroll tables.
 *
 * @param options - Configuration options for scrolling speed and termination conditions.
 * @returns Promise resolving once scrolling is complete.
 */
export async function autoScrollToLoadContent(
  options: Types.AutoScrollOptions = {}
): Promise<void> {
  const {
    scrollStep = 400,
    scrollInterval = 200,
    maxConsecutiveNoChange = 5,
    maxTotalIterations = 100,
  } = options;

  let lastHeight = 0;
  let consecutiveNoChange = 0;
  let iterations = 0;

  return new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      const currentScroll = window.scrollY;
      const clientHeight = window.innerHeight;
      const scrollHeight = document.body.scrollHeight;
      iterations++;

      if (scrollHeight === lastHeight) {
        consecutiveNoChange++;
      } else {
        consecutiveNoChange = 0;
        lastHeight = scrollHeight;
      }

      if (
        consecutiveNoChange >= maxConsecutiveNoChange ||
        iterations >= maxTotalIterations ||
        currentScroll + clientHeight >= scrollHeight - 10
      ) {
        clearInterval(timer);
        resolve();
        return;
      }

      window.scrollBy({ top: scrollStep, behavior: 'smooth' });
    }, scrollInterval);
  });
}

/**
 * Smoothly scrolls page back to top.
 *
 * @param delay - Milliseconds to pause following scroll.
 */
export async function scrollToTop(delay: number = 500): Promise<void> {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  await sleep(delay);
}

/**
 * Iterates through all subsequent pages of a paginated table and appends rows into a single tbody.
 *
 * @param table - Target HTML table element.
 * @param maxPages - Safety limit on maximum pages to traverse.
 * @returns Total rows now present in the table.
 */
export async function loadAllPaginatedTableRows(
  table: HTMLTableElement,
  maxPages: number = 20
): Promise<number> {
  const tbody = table.querySelector('tbody');
  if (!tbody) return 0;

  const collectedRows: HTMLTableRowElement[] = [];
  let pageCount = 0;

  while (!isLastPage() && pageCount < maxPages) {
    const currentRows = Array.from(tbody.querySelectorAll('tr'));
    for (const row of currentRows) {
      collectedRows.push(row.cloneNode(true) as HTMLTableRowElement);
    }

    const firstRowText = currentRows[0]?.textContent || '';
    const advanced = await goToNextPage(400);
    if (!advanced) break;

    // Wait for tbody rows to update
    for (let i = 0; i < 15; i++) {
      await sleep(200);
      const newFirstRow = tbody.querySelector('tr')?.textContent || '';
      if (newFirstRow && newFirstRow !== firstRowText) break;
    }

    pageCount++;
  }

  // Prepend collected previous pages' rows into tbody
  if (collectedRows.length > 0) {
    const firstCurrent = tbody.firstChild;
    for (const row of collectedRows) {
      tbody.insertBefore(row, firstCurrent);
    }
  }

  // Hide pagination controls since all rows are now in view
  const paginationControls = document.querySelectorAll(
    'button[data-testid="next"], button[data-testid="first"], button[data-testid="last"], [data-testid="pagination-count"]'
  );
  paginationControls.forEach((el) => {
    const parent = el.closest('div, nav, section');
    if (parent && parent !== table && !parent.contains(table)) {
      (parent as HTMLElement).style.display = 'none';
    }
  });

  return tbody.querySelectorAll('tr').length;
}

/**
 * Detects and expands a 'Months to show' dropdown (such as on Birthday List) to display all months.
 *
 * @param targetCount - Target number of months to display (default: 12).
 * @param targetTable - Optional HTML table to observe for row expansion.
 * @param timeoutMs - Maximum milliseconds to wait for table row updates (default: 2000).
 * @returns Promise resolving to true if dropdown was found and adjusted, false otherwise.
 */
export async function expandMonthsToShow(
  targetCount: number = 12,
  targetTable?: HTMLTableElement | null,
  timeoutMs: number = 2000
): Promise<boolean> {
  const selects = Array.from(document.querySelectorAll<HTMLSelectElement>('select'));
  const monthsSelect = selects.find((s) =>
    Array.from(s.options).some((opt) => Regex.MONTHS_TO_SHOW.test(opt.text))
  );
  if (!monthsSelect) return false;

  const targetValue = String(targetCount);
  if (monthsSelect.value === targetValue) return false;

  const hasTargetOption = Array.from(monthsSelect.options).some((opt) => opt.value === targetValue);
  if (!hasTargetOption) return false;

  const getLiveTable = (): HTMLTableElement | null => {
    if (targetTable && targetTable.isConnected) return targetTable;
    if (typeof document !== 'undefined') {
      return document.querySelector<HTMLTableElement>('table');
    }
    return null;
  };

  const initialRows = getLiveTable()?.querySelectorAll('tbody tr').length ?? 0;
  setSelectValue(monthsSelect, targetValue);

  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    await sleep(100);
    const liveTable = getLiveTable();
    const currentRows = liveTable?.querySelectorAll('tbody tr').length ?? 0;
    if (currentRows !== initialRows && currentRows > 0) break;
  }

  return true;
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Locates first matching button from selector list. */
function findFirstAvailableButton(selectors: readonly string[]): HTMLButtonElement | null {
  for (const sel of selectors) {
    const btn = document.querySelector<HTMLButtonElement>(sel);
    if (btn) return btn;
  }
  return null;
}
