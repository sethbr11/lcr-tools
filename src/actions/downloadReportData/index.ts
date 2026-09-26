// prettier-ignore
import { generateFilename, getPageTables, hideLoadingIndicator, isAborted,
  promptTableSelection, resetAborted, showToast } from './utils';
import { exportCsvPayloads, extractPaginatedTableData } from './downloadDataHelper';
import { Regex, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Main entrypoint orchestrating the Download Report Data action pipeline.
 * Steps:
 *   1. Discover tables on current LCR page.
 *   2. Prompt user selection if multiple tables are present.
 *   3. Scrape table rows across pagination.
 *   4. Export CSV or compressed ZIP archive.
 *
 * @returns Promise resolving to execution outcome.
 */
export async function runDownloadReportData(): Promise<
  Types.ActionResult<Types.DownloadReportDataResult>
> {
  resetAborted();

  // Step 1: Detect tables on page
  const tables = getPageTables();
  if (tables.length === 0) {
    showToast('No tables found on this page.', { type: 'warning' });
    return { success: false, error: 'No tables found' };
  }

  // Step 2: Select tables to export
  const selectedTables = await promptTableSelection(tables);
  if (!selectedTables || selectedTables.length === 0) {
    return { success: false, error: 'Cancelled by user' };
  }

  try {
    // Step 3: Extract rows from each selected table
    const csvFiles: Types.GeneratedCsvFile[] = [];
    for (const table of selectedTables) {
      if (isAborted()) break;

      const rows = await extractPaginatedTableData(table);
      if (rows.length > 0) {
        const filename =
          selectedTables.length > 1
            ? `${table.name.replace(Regex.MULTIPLE_SPACES, '_').toLowerCase()}.csv`
            : generateFilename('csv', table.name.replace(Regex.MULTIPLE_SPACES, '_'));

        csvFiles.push({
          filename,
          csvContent: rows.join('\r\n'),
        });
      }
    }

    if (isAborted()) {
      showToast('Export cancelled by user.', { type: 'info' });
      return { success: false, error: 'Aborted' };
    }

    // Step 4: Export generated files
    const exported = await exportCsvPayloads(csvFiles);
    if (!exported) {
      return { success: false, error: 'Cancelled by user' };
    }

    return { success: true, data: { exportedCount: csvFiles.length } };
  } finally {
    hideLoadingIndicator();
  }
}
