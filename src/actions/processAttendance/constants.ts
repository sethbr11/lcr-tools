import * as Base from '@/types';

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

export const Constants = {
  ...Base.Constants,
  /** Adult Sunday School class label prioritized to the top of dropdown. */
  ADULT_SUNDAY_SCHOOL_LABEL: 'Adult Sunday School',
  /** Section header option names in LCR class dropdown that should not be selectable options. */
  // prettier-ignore
  CLASS_SECTION_HEADERS: ['All Classes and Quorums', 'Aaronic Priesthood Quorums', 'Young Women', 'Sunday School', 'Primary'] as readonly string[],
  /** Icon SVG path substrings for determining checkbox state. */
  ICON_PATHS: {
    /** SVG path segment indicating present attendance state. */
    present: 'M12 22c5.523',
    /** SVG path segment indicating not present attendance state. */
    notPresent: 'M12 3.5a8.5',
  },
  /** Timeout in milliseconds to wait for the ward members roll table to load after date or tab switch. */
  ATTENDANCE_ROLL_LOAD_TIMEOUT_MS: 10000,
  /** Polling interval in milliseconds when waiting for the attendance roll table to render. */
  ATTENDANCE_ROLL_POLL_INTERVAL_MS: 150,
  /** Timeout in milliseconds waiting for an attendance tab to report aria-selected true. */
  TAB_SWITCH_TIMEOUT_MS: 6000,
  /** Polling interval in milliseconds while waiting for a tab aria-selected state. */
  TAB_SWITCH_POLL_MS: 50,
  /** Timeout in milliseconds waiting for a select dropdown value to settle after change. */
  DROPDOWN_SETTLE_TIMEOUT_MS: 6000,
  /** Polling interval in milliseconds while waiting for a select value to match. */
  DROPDOWN_SETTLE_POLL_MS: 100,
  /** Timeout in milliseconds waiting for the target Sunday button to appear and activate. */
  SUNDAY_BUTTON_TIMEOUT_MS: 10000,
  /** Polling interval in milliseconds while waiting for Sunday button presence or selection. */
  SUNDAY_BUTTON_POLL_MS: 150,
  /** Minimum milliseconds between repeated clicks on the Sunday control while waiting for it to select. */
  SUNDAY_RECLICK_MS: 1500,
  /** Timeout in milliseconds waiting for an attendance button to finish saving and show present. */
  MARK_PRESENT_TIMEOUT_MS: 2000,
  /** Polling interval in milliseconds while waiting for attendance button present state. */
  MARK_PRESENT_POLL_MS: 100,
  /** Pause in milliseconds between attendance clicks in a batch (fast, but paced for LCR). */
  MARK_CLICK_GAP_MS: 750,
  /** Maximum milliseconds to wait for a batch of clicks to show present before re-checking. */
  MARK_VERIFY_SETTLE_MS: 4000,
  /** Times to re-click members whose attendance did not register before reporting an error. */
  MARK_RETRY_ROUNDS: 2,
  /** Timeout in milliseconds waiting for visitor save to complete and inputs to re-enable. */
  SAVE_COMPLETE_TIMEOUT_MS: 2000,
  /** Polling interval in milliseconds while waiting for visitor save completion. */
  SAVE_COMPLETE_POLL_MS: 100,
  /** Settle delay in milliseconds between applying sequential visitor category inputs. */
  VISITOR_INPUT_SETTLE_MS: 150,
  /** Settle delay in milliseconds after all visitor inputs are populated before clicking save. */
  VISITOR_SAVE_PREPARE_MS: 200,
  /** Delay in milliseconds after clicking save on visitors tab before inspecting spinner state. */
  VISITOR_SAVE_TRIGGER_MS: 250,
  /** Default timeout in milliseconds for generic waitForCondition polling. */
  WAIT_CONDITION_DEFAULT_TIMEOUT_MS: 2000,
  /** Default polling interval in milliseconds for generic waitForCondition polling. */
  WAIT_CONDITION_DEFAULT_POLL_MS: 100,
  /** Visual pause duration in milliseconds used only during simulation demos. */
  SIM_VISUAL_PAUSE_MS: 350,
  /** Probe value written to the target Sunday visitor input during simulation. */
  SIM_VISITOR_PROBE_VALUE: 1,
  /** Error shown when pasted attendance rows contain more than one distinct date. */
  MIXED_DATES_ERROR: 'All roster rows must use the same date.',
  /** Setup status hint after a mixed-date paste, pointing users to the record editor. */
  MIXED_DATES_FIX_HINT: 'Use View / Edit to correct dates.',
  /** Minimum surname length (both sides) before one typo is tolerated in a name suggestion. */
  FUZZY_LAST_NAME_MIN_LENGTH: 5,
  /** Minimum given-name length (both sides) before one typo is tolerated in a name suggestion. */
  FUZZY_FIRST_NAME_MIN_LENGTH: 4,
  /** Minimum length of the shorter given name for a prefix match to count as a suggestion. */
  FUZZY_PREFIX_MIN_LENGTH: 3,
  /** Maximum milliseconds to wait for in-flight saves to settle after the user presses Escape. */
  MARK_ABORT_SETTLE_MS: 2000,
  /** Completion modal body shown when the user stopped processing with Escape. */
  ABORTED_COMPLETION_BODY:
    'You stopped processing with Escape. No further clicks were sent, but clicks already sent may have saved to LCR. Open View Logs to see what was marked or left unconfirmed.',
  /** Title of the prompt shown when the attendance roll did not load. */
  ROLL_RETRY_TITLE: "LCR isn't ready yet",
  /** Text appended to the failure reason in the roll retry prompt. */
  ROLL_RETRY_MESSAGE_SUFFIX:
    "The page may still be loading. Nothing has been marked yet. If this keeps happening, LCR's layout may have changed.",
  /** Confirm button label of the roll retry prompt. */
  ROLL_RETRY_CONFIRM: 'Try again',
  /** Cancel button label of the roll retry prompt. */
  ROLL_RETRY_CANCEL: 'Cancel',
  /** Toast shown when the user cancels instead of retrying. */
  ROLL_RETRY_CANCELLED_TOAST: 'Process Attendance cancelled. Nothing was marked.',
  /** Failure reason when no ward members appear on the attendance roll. */
  ROLL_EMPTY_FAILURE: 'No ward members appeared on the attendance roll.',
} as const;
