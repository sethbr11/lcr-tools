import * as Base from '@/types';

/* ==========================================================================
   DOM IDENTIFIERS AND SELECTORS
   ========================================================================== */

export const Dom = {
  ...Base.Dom,
  /** ID assigned to the attendance setup modal. */
  UI_OVERLAY_ID: 'lcr-tools-attendance-ui-overlay',
  /** ID assigned to the unmatched-attendee review modal. */
  REVIEW_OVERLAY_ID: 'lcr-tools-attendance-review-overlay',
  /** ID assigned to the attendance processing logs modal. */
  LOGS_OVERLAY_ID: 'lcr-tools-attendance-logs-overlay',
  /** DOM element ID for style tag injecting attendance styles. */
  ATTENDANCE_STYLES_ID: 'lcr-tools-attendance-styles',

  /** DOM element ID for class or quorum selection dropdown in setup modal. */
  CLASS_SELECT_ID: 'lcr-tools-class-select',
  /** DOM element ID for target Sunday date picker input in setup modal. */
  DATE_INPUT_ID: 'lcr-tools-attendance-date',
  /** DOM element ID for total headcount number input in setup modal. */
  HEADCOUNT_INPUT_ID: 'lcr-tools-headcount-input',
  /** DOM element ID for container displaying dynamic visitor count calculations in setup modal. */
  VISITOR_SPLIT_CONTAINER_ID: 'lcr-tools-visitor-split-container',
  /** DOM element ID for clipboard paste target zone in setup modal. */
  PASTE_TARGET_ID: 'lcr-tools-paste-target',
  /** DOM element ID for setup modal paste prompt section. */
  PASTE_PROMPT_ID: 'lcr-tools-paste-prompt',
  /** DOM element ID for setup modal active pasted records section. */
  PASTE_ACTIVE_ID: 'lcr-tools-paste-active',
  /** DOM element ID for setup modal paste catcher textarea. */
  PASTE_CATCHER_ID: 'lcr-tools-paste-catcher',
  /** DOM element ID for button to add additional clipboard records in setup modal. */
  PASTE_MORE_ID: 'lcr-tools-paste-more',
  /** DOM element ID for button to view and edit parsed records in setup modal. */
  VIEW_EDIT_ID: 'lcr-tools-view-edit-data',
  /** DOM element ID for record count badge in setup modal. */
  RECORD_COUNT_ID: 'lcr-tools-record-count',
  /** DOM element ID for process attendance submission button in setup modal. */
  PROCESS_BTN_ID: 'lcr-tools-process-attendance-btn',
  /** DOM element ID for status message banner in setup modal. */
  STATUS_ID: 'lcr-tools-attendance-status',
  /** DOM element ID for setup modal close button. */
  SETUP_CLOSE_ID: 'lcr-tools-setup-close',
  /** DOM element ID for setup modal cancel button. */
  SETUP_CANCEL_ID: 'lcr-tools-setup-cancel',

  /** DOM element ID for inline record editor modal container. */
  EDIT_VIEW_CONTAINER_ID: 'lcr-tools-edit-view-container',
  /** DOM element ID for table body inside inline record editor modal. */
  EDIT_TABLE_BODY_ID: 'lcr-tools-edit-table-body',
  /** DOM element ID for button adding a new empty row in edit view. */
  EDIT_ADD_ROW_ID: 'lcr-tools-edit-add-row',
  /** DOM element ID for button clearing all rows in edit view. */
  EDIT_CLEAR_ALL_ID: 'lcr-tools-edit-clear-all',
  /** DOM element ID for button confirming and applying edited records in edit view. */
  EDIT_DONE_ID: 'lcr-tools-edit-done',
  /** DOM element ID for close button in edit view modal. */
  EDIT_CLOSE_ID: 'lcr-tools-edit-close',

  /** DOM element ID for unmatched attendee resolution section in review modal. */
  UNMATCHED_SECTION_ID: 'lcr-tools-unmatched-section',
  /** DOM element ID for table body containing unmatched attendees in review modal. */
  UNMATCHED_TABLE_BODY_ID: 'lcr-tools-unmatched-table-body',
  /** DOM element ID for unmatched count stat badge in review modal. */
  UNMATCHED_STAT_ID: 'lcr-tools-unmatched-stat',
  /** DOM element ID for unmatched count text span in review modal. */
  UNMATCHED_COUNT_ID: 'lcr-tools-unmatched-count',
  /** DOM element ID for visitor badges container in review modal. */
  VISITOR_CHIPS_ID: 'lcr-tools-visitor-chips',
  /** DOM element ID for ward member autocomplete dropdown container. */
  MEMBER_SEARCH_DROPDOWN_ID: 'lcr-tools-member-search-dropdown',
  /** DOM element ID for View Logs button on the unmatched review modal. */
  REVIEW_LOGS_ID: 'lcr-tools-review-view-logs-btn',
  /** DOM element ID for Continue button on the unmatched review modal. */
  REVIEW_CONTINUE_ID: 'lcr-tools-review-continue-btn',
  /** DOM element ID for close button on the unmatched review modal header. */
  REVIEW_CLOSE_ID: 'lcr-tools-review-close-btn',
  /** DOM element ID for button downloading CSV report from execution logs modal. */
  LOGS_DOWNLOAD_ID: 'lcr-tools-logs-download-btn',
  /** DOM element ID for the post-Continue completion modal overlay. */
  COMPLETION_OVERLAY_ID: 'lcr-tools-attendance-completion-overlay',
  /** DOM element ID for View Logs button on the completion modal. */
  COMPLETION_LOGS_ID: 'lcr-tools-completion-logs-btn',
  /** DOM element ID for Finish button on the completion modal. */
  COMPLETION_DONE_ID: 'lcr-tools-completion-done-btn',
  /** DOM element ID for close button on the completion modal header. */
  COMPLETION_CLOSE_ID: 'lcr-tools-completion-close-btn',
  /** DOM element ID for close button in logs modal header. */
  LOGS_CLOSE_ID: 'lcr-tools-logs-close-btn',
  /** DOM element ID for done button in execution logs modal. */
  LOGS_DONE_ID: 'lcr-tools-logs-done',
  /** DOM element ID for container displaying undo chips for skipped attendees. */
  REVIEW_SKIPPED_BAR_ID: 'lcr-tools-review-skipped-bar',
  /** DOM element ID for skipped attendee chips container in review modal. */
  SKIPPED_CHIPS_ID: 'lcr-tools-skipped-chips',

  /** DOM element ID for button opening the nickname manager modal. */
  MANAGE_NICKNAMES_BTN_ID: 'lcr-tools-manage-nicknames-btn',
  /** DOM element ID for nickname manager modal overlay. */
  NICKNAMES_MODAL_ID: 'lcr-tools-nicknames-modal',
  /** DOM element ID for nickname list container inside manager modal. */
  NICKNAMES_LIST_ID: 'lcr-tools-nicknames-list',
  /** DOM element ID for clear all nicknames button in manager modal. */
  CLEAR_NICKNAMES_BTN_ID: 'lcr-tools-clear-nicknames-btn',
  /** DOM element ID for done button in nickname manager modal. */
  NICKNAMES_DONE_ID: 'lcr-tools-nicknames-done',
  /** DOM element ID for close button in nickname manager modal. */
  NICKNAMES_CLOSE_ID: 'lcr-tools-nicknames-close',

  /** CSS selector matching active progress spinner inside an attendance button. */
  PROGRESS_SPINNER: '.eden-progress-progress-icon, [role="progressbar"]',
  /** CSS selector for the Members tab button on LCR attendance page. */
  MEMBERS_TAB: '#tab-MEMBERS',
  /** CSS selector for the Visitors tab button on LCR attendance page. */
  VISITORS_TAB: '#tab-VISITORS',
  /** CSS selector for the primary save button on LCR attendance page. */
  SAVE_BUTTON: 'button.eden-button--primary:not([disabled])',
  /** CSS selector matching ward member table rows. */
  MEMBER_ROWS: "tbody tr[role='row']",
  /** CSS selector for the member name button within a table row. */
  NAME_BUTTON: 'td:first-child button.member-card__styled-ghost',
  /** CSS selector matching attendance toggle buttons in member rows. */
  ATTENDANCE_BUTTON:
    "button[class*='attendanceButton'], button.useClassQuorumAttendanceMembers_attendanceButton__toNdf",
  /** CSS selector matching form select control elements on LCR page. */
  SELECT_CONTROL: 'select.eden-form-part-input__control, select',
  /** CSS selector matching single Sunday tab buttons in button bar. */
  SUNDAY_TAB_BUTTONS: 'button.eden-button-bar__button, button',

  /** CSS selector for the primary attendance data table on the LCR page. */
  ATTENDANCE_TABLE: 'table',
  /** CSS selector for checkbox inputs used as fallback attendance markers. */
  ATTENDANCE_CHECKBOX: 'input[type="checkbox"]',
  /** CSS selector for numeric visitor count inputs. */
  NUMBER_INPUT: 'input[type="number"]',
  /** CSS selector matching all table body rows. */
  TABLE_BODY_ROWS: 'tbody tr',
  /** CSS selector for optgroup elements inside select dropdowns. */
  OPTGROUP: 'optgroup',
  /** CSS selector for the inner header content of an LCR Tools modal. */
  MODAL_HEADER_INNER: '.lcrx-modal-header > div',
  /** CSS selector for decrement buttons on visitor calculator controls. */
  CALC_DEC: '.lcrx-calc-dec',
  /** CSS selector for increment buttons on visitor calculator controls. */
  CALC_INC: '.lcrx-calc-inc',
  /** CSS selector for the numeric value display on visitor calculator controls. */
  CALC_VAL: '.lcrx-calc-val',
  /** ID prefix for nickname save checkbox elements in unmatched rows. */
  NICK_BOX_ID_PREFIX: 'lcrx-nick-box-',
  /** ID prefix for auto-match checkbox elements in unmatched rows. */
  AUTO_BOX_ID_PREFIX: 'lcrx-auto-box-',
  /** ID prefix for unmatched attendee table rows. */
  UNMATCHED_ROW_ID_PREFIX: 'lcrx-unmatched-row-',
  /** aria-selected attribute value indicating an active tab or button. */
  ARIA_SELECTED_TRUE: 'true',

  /** CSS class identifier for active attendance button state. */
  ACTIVE_STATE: 'active',
  /** CSS class for dropdown item in member autocomplete. */
  DROPDOWN_ITEM: 'lcrx-dropdown-item',
  /** CSS class for floating dropdown list container. */
  DROPDOWN_LIST: 'lcrx-dropdown-list',
  /** CSS class for delete button in edit view. */
  EDIT_DELETE: 'lcrx-edit-delete',
  /** CSS class for date input in edit view. */
  EDIT_DATE: 'lcrx-edit-date',
  /** CSS class for first name input in edit view. */
  EDIT_FIRST: 'lcrx-edit-first',
  /** CSS class for last name input in edit view. */
  EDIT_LAST: 'lcrx-edit-last',
  /** CSS class for guest category inputs. */
  GUEST_INPUT: 'lcrx-guest-input',
  /** CSS class identifier for present attendance state. */
  IS_PRESENT: 'is-present',
  /** CSS class for search input in unmatched table. */
  SEARCH_INPUT: 'lcrx-search-input',
  /** CSS class for toggle button switching from nickname match to search input. */
  SEARCH_TOGGLE: 'lcrx-search-toggle',
  /** CSS class identifier for the simulation mode banner and badge. */
  SIMULATION_BADGE: 'lcrx-simulation-badge',
  /** CSS class for skip name button in unmatched table. */
  SKIP_BTN: 'lcrx-skip-btn',
  /** CSS class for chip button in skipped bar. */
  SKIP_CHIP: 'lcrx-skip-chip',
  /** CSS class for visitor badge in unmatched review modal. */
  VISITOR_BADGE: 'lcrx-visitor-badge',
  /** CSS class for the queued-visitor status table cell. */
  QUEUED_VISITOR_CELL: 'lcrx-queued-visitor-cell',
  /** CSS class for the queued-match status table cell. */
  QUEUED_MATCH_CELL: 'lcrx-queued-match-cell',
  /** CSS class for the flex row holding queued status text and undo. */
  QUEUED_STATUS: 'lcrx-queued-status',
  /** CSS class for undo button on a queued visitor or match status row. */
  QUEUED_UNDO_BTN: 'lcrx-queued-undo',
  /** CSS class for one-click suggested nickname match button. */
  NICKNAME_BTN: 'lcrx-nickname-btn',
  /** CSS class for save nickname checkbox wrapper in unmatched row. */
  NICKNAME_OPT: 'lcrx-nickname-opt',
  /** CSS class for save nickname checkbox element. */
  NICKNAME_CHECK: 'lcrx-nickname-check',
  /** CSS class for saved nickname badge pill. */
  NICKNAME_BADGE: 'lcrx-nickname-badge',
  /** CSS class for item row inside nickname management modal. */
  NICKNAME_ITEM: 'lcrx-nickname-item',
  /** CSS class for delete button inside nickname management modal. */
  NICKNAME_DELETE_BTN: 'lcrx-nickname-del-btn',
  /** CSS class for grouped member card inside nickname management modal. */
  NICKNAME_GROUP: 'lcrx-nickname-group',
  /** CSS class for member name heading inside nickname group card. */
  NICKNAME_GROUP_NAME: 'lcrx-nickname-group-name',
  /** CSS class for individual alias row inside nickname group card. */
  NICKNAME_ALIAS_ROW: 'lcrx-nickname-alias-row',
} as const;
