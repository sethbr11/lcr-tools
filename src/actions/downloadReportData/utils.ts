/**
 * Action-specific utilities for downloadReportData, re-exporting all base utilities.
 */

export * from '@/utils';
import { requestTables } from '@/utils/table/tableUtils';
import { Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Prompts user to select which tables to export when multiple tables exist on page.
 *
 * @param tables - List of candidate tables detected on page.
 * @returns Promise resolving to array of chosen tables or null if user cancelled.
 */
export async function promptTableSelection(
  tables: Types.TableInfo[]
): Promise<Types.TableInfo[] | null> {
  return requestTables(tables, true);
}

export { promptSaveFilenameModal, normalizeExportFilename } from './downloadDataHelper';
