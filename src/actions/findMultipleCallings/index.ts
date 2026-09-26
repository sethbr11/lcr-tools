import { navigateToAllOrganizations, navigateToWithCallingsTab, showToast, sleep } from './utils';
import { analyzeMembersWithMultipleCallings } from './callingAnalysisHelper';
import { getCallingGroups } from './callingGroupStorageHelper';
import { getIgnoredCallings } from './callingIgnoreStorageHelper';
import { showMultipleCallingsReport } from './callingReportHelper';
import { Constants, Dom, Regex, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Main entrypoint orchestrating the Find Members with Multiple Callings action.
 * Steps:
 *   1. Detect whether on Callings by Org or Member Callings page.
 *   2. Navigate to appropriate sub-tab ('All Organizations' or 'With Callings').
 *   3. Load calling groups and ignored callings, then analyze assignments across all members.
 *   4. Render interactive report modal with group management and CSV export.
 *
 * @returns Promise resolving to action result.
 */
export async function runFindMultipleCallings(): Promise<
  Types.ActionResult<Types.MultipleCallingsResult>
> {
  const currentUrl = window.location.href;

  // Step 1: Detect page type
  let pageType: Types.CallingsPageType | null = null;
  const hasOrgsHeading = Array.from(document.querySelectorAll(Dom.PAGE_TITLE_SELECTOR)).some((h) =>
    h.textContent?.includes(Constants.ORGS_HEADING_TEXT)
  );

  if (Regex.MEMBER_CALLINGS_URL.test(currentUrl)) {
    pageType = Constants.PAGE_TYPE_MEMBER;
  } else if (Regex.ORGS_CALLINGS_URL.test(currentUrl) || hasOrgsHeading) {
    pageType = Constants.PAGE_TYPE_ORGS;
  }

  if (!pageType) {
    showToast(Constants.UNSUPPORTED_PAGE_TOAST, { type: 'warning' });
    return { success: false, error: Constants.UNSUPPORTED_PAGE_ERROR };
  }

  // Step 2: Prepare page view
  if (pageType === Constants.PAGE_TYPE_MEMBER) await navigateToWithCallingsTab();
  else await navigateToAllOrganizations();
  await sleep(Constants.PAGE_PREPARE_MS);

  // Step 3: Load groups and ignored callings, then analyze assignments
  const [groups, ignored] = await Promise.all([getCallingGroups(), getIgnoredCallings()]);
  const analysis = analyzeMembersWithMultipleCallings(groups, ignored);

  // Step 4: Render results dialog
  showMultipleCallingsReport(pageType, analysis);

  return { success: true, data: { count: analysis.holders.length } };
}
