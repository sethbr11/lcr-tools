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
  ATTENDANCE_ROLL_LOAD_TIMEOUT_MS: 3500,
  /** Polling interval in milliseconds when waiting for the attendance roll table to render. */
  ATTENDANCE_ROLL_POLL_INTERVAL_MS: 150,
  /** Timeout in milliseconds waiting for an attendance tab to report aria-selected true. */
  TAB_SWITCH_TIMEOUT_MS: 2000,
  /** Polling interval in milliseconds while waiting for a tab aria-selected state. */
  TAB_SWITCH_POLL_MS: 50,
  /** Timeout in milliseconds waiting for a select dropdown value to settle after change. */
  DROPDOWN_SETTLE_TIMEOUT_MS: 2000,
  /** Polling interval in milliseconds while waiting for a select value to match. */
  DROPDOWN_SETTLE_POLL_MS: 100,
  /** Timeout in milliseconds waiting for the target Sunday button to appear and activate. */
  SUNDAY_BUTTON_TIMEOUT_MS: 4000,
  /** Polling interval in milliseconds while waiting for Sunday button presence or selection. */
  SUNDAY_BUTTON_POLL_MS: 150,
  /** Timeout in milliseconds waiting for an attendance button to finish saving and show present. */
  MARK_PRESENT_TIMEOUT_MS: 2000,
  /** Polling interval in milliseconds while waiting for attendance button present state. */
  MARK_PRESENT_POLL_MS: 100,
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
} as const;
