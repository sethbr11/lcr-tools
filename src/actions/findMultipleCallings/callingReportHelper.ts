import { createStandardModal } from './utils';
import {
  analyzeMembersWithMultipleCallings,
  exportMultipleCallingsCsv,
} from './callingAnalysisHelper';
import { getCallingGroups } from './callingGroupStorageHelper';
import { getIgnoredCallings } from './callingIgnoreStorageHelper';
import { openCallingGroupEditor } from './callingGroupEditorHelper';
import { Constants, Dom, Types } from './types';
import { Templates } from './templates';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Renders the multiple-callings report modal with group management and optional CSV export.
 *
 * @param pageType - Detected callings report page variant.
 * @param analysis - Grouped holders and page calling catalog.
 */
export function showMultipleCallingsReport(
  pageType: Types.CallingsPageType,
  analysis: Types.CallingAnalysisResult
): void {
  const contentHtml =
    analysis.holders.length === 0
      ? Templates.noIssues(
          pageType === Constants.PAGE_TYPE_MEMBER
            ? Constants.PAGE_SCOPE_MEMBER
            : Constants.PAGE_SCOPE_WARD
        )
      : Templates.multipleCallingsList(
          analysis.holders.length,
          analysis.holders.map(Templates.memberCard).join('')
        );

  createStandardModal({
    id: Dom.MODAL_ID,
    title: Constants.REPORT_MODAL_TITLE,
    content: contentHtml,
    width: Constants.REPORT_MODAL_WIDTH,
    buttons: [
      {
        text: Constants.MANAGE_GROUPS_BTN,
        type: 'secondary',
        onClick: () => {
          void openCallingGroupEditor(analysis.catalog, () =>
            refreshMultipleCallingsReport(pageType)
          );
          return true;
        },
      },
      ...(analysis.holders.length > 0
        ? [
            {
              text: Constants.EXPORT_CSV_BTN,
              type: 'primary' as const,
              onClick: async () => exportMultipleCallingsCsv(analysis.holders),
            },
          ]
        : []),
      {
        text: Constants.CLOSE_BTN,
        type: 'secondary',
      },
    ],
  });
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Reloads saved groups and ignored callings, re-analyzes the page, and replaces the report modal. */
async function refreshMultipleCallingsReport(pageType: Types.CallingsPageType): Promise<void> {
  const [groups, ignored] = await Promise.all([getCallingGroups(), getIgnoredCallings()]);
  const analysis = analyzeMembersWithMultipleCallings(groups, ignored);
  showMultipleCallingsReport(pageType, analysis);
}
