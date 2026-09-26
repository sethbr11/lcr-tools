import { hideLoadingIndicator, showLoadingIndicator, showToast } from './utils';
import { displayAuditResults, extractDirectoryHouseholds } from './boundaryAuditHelper';
import { Constants, Types } from './types';

let isExecuting = false;

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Main entrypoint orchestrating the Ward Boundary Audit action.
 * Steps:
 *   1. Clean up legacy reload flags and display loading indicator.
 *   2. Extract boundary polygons and household records from directory APIs or DOM.
 *   3. Compute inside, outside, and unmapped classification summary.
 *   4. Render interactive audit dialog.
 *
 * @param _options - Optional configuration options for audit execution.
 * @returns Promise resolving to action result.
 */
export async function runMembersOutsideBoundary(
  _options?: Types.BoundaryAuditOptions
): Promise<Types.ActionResult<Types.BoundaryAuditActionResult>> {
  if (isExecuting) return { success: true };
  isExecuting = true;

  try {
    sessionStorage.removeItem(Constants.AUDIT_PENDING_KEY);
    showLoadingIndicator(
      'Auditing Ward Boundaries...',
      'Please wait while we capture member locations'
    );

    const households = await extractDirectoryHouseholds();

    if (households.length === 0) {
      showToast('No household coordinate data found.', { type: 'warning' });
      return { success: false, error: 'No data' };
    }

    const inside = households.filter((h) => h.status === 'inside').length;
    const outside = households.filter((h) => h.status === 'outside').length;
    const unmapped = households.filter((h) => h.status === 'unmapped').length;

    const summary: Types.AuditSummary = {
      totalCount: households.length,
      insideCount: inside,
      outsideCount: outside,
      unmappedCount: unmapped,
      households,
    };

    displayAuditResults(summary);
    return { success: true, data: summary };
  } finally {
    hideLoadingIndicator();
    isExecuting = false;
  }
}
