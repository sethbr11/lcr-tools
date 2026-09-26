import Papa from 'papaparse';
// prettier-ignore
import { autoScrollToLoadContent, confirmDataStewardshipDownload, downloadCsv, downloadCsvZip,
  formatCSVCell, generateFilename, goToNextPage, hideLoadingIndicator, isAborted, isLastPage,
  navigateToFirstPage, scrollToTop, showLoadingIndicator, showToast, tableToCSV,
  Templates } from './utils';
import { Constants, Dom, Regex, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Scrapes data from a table across all paginated views until the final page is reached.
 *
 * @param table - Target table information descriptor.
 * @returns Array of CSV line strings combining all paginated records.
 */
export async function extractPaginatedTableData(table: Types.TableInfo): Promise<string[]> {
  const combinedCsvRows: string[] = [];
  let hasHeaders = false;

  showLoadingIndicator(`Extracting ${table.name}...`, 'Press ESC to abort');

  // Handle infinite scroll container if present
  if (table.needs.includes('scroll')) {
    await autoScrollToLoadContent();
    await scrollToTop();
  }

  if (isAborted()) return combinedCsvRows;

  // Step A: Rewind to first page
  if (table.needs.includes('pagination')) await navigateToFirstPage();

  // Step B: Loop across pages
  let hasMore = true;
  let pageCount = 0;
  const maxPages = Constants.MAX_PAGINATION_PAGES;

  while (hasMore && pageCount < maxPages) {
    if (isAborted()) break;

    // Process table on the current page
    const result = tableToCSV(table);
    if (result && result.csvContent) {
      const parsed = Papa.parse<string[]>(result.csvContent, { skipEmptyLines: 'greedy' });
      const rows = (parsed.data || []).map((row) => row.map(formatCSVCell).join(','));
      if (rows.length > 0) {
        if (!hasHeaders) {
          combinedCsvRows.push(...rows);
          hasHeaders = true;
        } else {
          combinedCsvRows.push(...rows.slice(1));
        }
      }
    }

    pageCount++;

    // Handle pagination
    if (table.needs.includes('pagination') && !isLastPage()) {
      hasMore = await goToNextPage();
    } else {
      hasMore = false;
    }
  }

  return combinedCsvRows;
}

/**
 * Dispatches file downloads for processed CSV documents as single files or a ZIP bundle after data stewardship confirmation and user filename selection.
 *
 * @param csvFiles - Array of generated CSV file objects containing filename and text content.
 * @returns Promise resolving to boolean indicating whether files were exported.
 */
export async function exportCsvPayloads(csvFiles: Types.GeneratedCsvFile[]): Promise<boolean> {
  hideLoadingIndicator();

  if (csvFiles.length === 0) {
    showToast('No table data available to download.', { type: 'warning' });
    return false;
  }

  const confirmed = await confirmDataStewardshipDownload();
  if (!confirmed) {
    showToast(Constants.STEWARDSHIP_CANCELLED_TOAST, { type: 'info' });
    return false;
  }

  const isZip = csvFiles.length > 1;
  const defaultFilename = isZip ? generateFilename('zip', 'reports') : csvFiles[0].filename;

  const chosenFilename = await promptSaveFilenameModal(defaultFilename, isZip);
  if (!chosenFilename) {
    showToast('Export cancelled by user.', { type: 'info' });
    return false;
  }

  if (isZip) {
    await downloadCsvZip(csvFiles, chosenFilename);
  } else {
    downloadCsv(csvFiles[0].csvContent, chosenFilename);
  }

  return true;
}

/**
 * Normalizes raw user input into a safe filename with appropriate extension.
 *
 * @param rawInput - User-entered filename string.
 * @param isZip - Whether the target archive is a ZIP file.
 * @param fallbackDefault - Fallback filename if input is blank.
 * @returns Cleaned filename with guaranteed extension.
 */
export function normalizeExportFilename(
  rawInput: string,
  isZip: boolean,
  fallbackDefault: string
): string {
  let cleaned = rawInput.trim();
  if (!cleaned) {
    cleaned = fallbackDefault.trim();
  }

  cleaned = cleaned.replace(Regex.ILLEGAL_FILENAME_CHARS, '_');

  const targetExt = isZip ? '.zip' : '.csv';

  if (isZip) {
    if (Regex.ZIP_EXTENSION.test(cleaned)) return cleaned;
    if (Regex.CSV_EXTENSION.test(cleaned)) cleaned = cleaned.replace(Regex.CSV_EXTENSION, '');
    if (Regex.TXT_EXTENSION.test(cleaned)) cleaned = cleaned.replace(Regex.TXT_EXTENSION, '');
  } else {
    if (Regex.CSV_EXTENSION.test(cleaned)) return cleaned;
    if (Regex.ZIP_EXTENSION.test(cleaned)) cleaned = cleaned.replace(Regex.ZIP_EXTENSION, '');
    if (Regex.TXT_EXTENSION.test(cleaned)) cleaned = cleaned.replace(Regex.TXT_EXTENSION, '');
  }

  return `${cleaned}${targetExt}`;
}

/**
 * Displays a modal prompting the user to name the export file, supporting cancel and auto-extension.
 *
 * @param defaultFilename - Suggested default file name.
 * @param isZip - True when saving a multi-table ZIP bundle, false for single CSV.
 * @returns Promise resolving to normalized filename, or null if cancelled.
 */
export function promptSaveFilenameModal(
  defaultFilename: string,
  isZip: boolean
): Promise<string | null> {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.id = Dom.FILENAME_MODAL_ID;
    backdrop.className = 'lcr-tools-modal-backdrop';
    Object.assign(backdrop.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      zIndex: String(Dom.CONFIRM_MODAL_Z_INDEX),
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    });

    backdrop.innerHTML = Templates.filenamePromptDialog({
      title: Constants.FILENAME_MODAL_TITLE,
      prompt: Constants.FILENAME_MODAL_PROMPT,
      defaultValue: defaultFilename,
      hint: isZip ? Constants.FILENAME_MODAL_ZIP_HINT : Constants.FILENAME_MODAL_CSV_HINT,
      cancelText: Constants.FILENAME_CANCEL_BTN_TEXT,
      confirmText: Constants.FILENAME_CONFIRM_BTN_TEXT,
    });

    document.body.appendChild(backdrop);

    const input = backdrop.querySelector<HTMLInputElement>(`#${Dom.FILENAME_INPUT_ID}`);
    const confirmBtn = backdrop.querySelector<HTMLButtonElement>(`#${Dom.FILENAME_CONFIRM_BTN_ID}`);
    const cancelBtn = backdrop.querySelector<HTMLButtonElement>(`#${Dom.FILENAME_CANCEL_BTN_ID}`);

    const cleanup = (result: string | null) => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      resolve(result);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const finalName = normalizeExportFilename(input?.value || '', isZip, defaultFilename);
        cleanup(finalName);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    cancelBtn?.addEventListener('click', () => cleanup(null));
    confirmBtn?.addEventListener('click', () => {
      const finalName = normalizeExportFilename(input?.value || '', isZip, defaultFilename);
      cleanup(finalName);
    });

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) cleanup(null);
    });

    if (input) {
      input.focus();
      const dotIdx = defaultFilename.lastIndexOf('.');
      if (dotIdx > 0) {
        input.setSelectionRange(0, dotIdx);
      } else {
        input.select();
      }
    }
  });
}
