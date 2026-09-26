/* ==========================================================================
   TEMPLATE BARREL
   ========================================================================== */

export {
  getSetupModalHtml,
  getEditViewHtml,
  getEditTableRowHtml,
  getVisitorCalcItemHtml,
  getVisitorCalcSplitHtml,
  getVisitorCalcSingleHtml,
  getVisitorCalcZeroHtml,
} from './setup';

export {
  getUnmatchedReviewModalHtml,
  getUnmatchedVisitorButtonHtml,
  getUnmatchedVisitorSelectHtml,
  getUnmatchedNicknameSuggestHtml,
  getUnmatchedTableRowHtml,
  getUnmatchedQueuedStatusHtml,
  getMemberDropdownItemHtml,
} from './review';

export { getCompletionModalHtml } from './completion';

export {
  getManageNicknamesModalHtml,
  getNicknameEmptyListHtml,
  getNicknameListItemHtml,
  getNicknameGroupHtml,
  getNicknameAliasRowHtml,
} from './nicknames';

export { getLogsModalHtml, getLogsTableRowHtml } from './logs';

export { ATTENDANCE_STYLES, ensureAttendanceStylesInjected } from './styles';
