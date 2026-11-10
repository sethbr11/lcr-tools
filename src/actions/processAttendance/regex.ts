import * as Base from '@/types';

/* ==========================================================================
   REGULAR EXPRESSIONS
   ========================================================================== */

export const Regex = {
  ...Base.Regex,
  /** Context: Splitting tab delimiter. */
  TAB_DELIMITER: /\t/,
  /** Context: Stripping punctuation (keeping letters, digits, spaces, commas) from names. */
  NAME_PUNCTUATION: /[^\p{L}\p{N}\s,]/gu,
  /** Context: Splitting comma delimiter. */
  COMMA_DELIMITER: /,/,
  /** Context: Stripping time suffix from timestamps (e.g. 14:01:02 PM). */
  TIMESTAMP_TIME_STRIP: /\s+\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?$/i,
  /** Context: Splitting date parts by slash or dash. */
  DATE_PARTS_SPLIT: /[-/]/,
  /** Context: YYYY-MM date prefix matching. */
  YEAR_MONTH_VALUE: /^\d{4}-\d{2}$/,
  /** Context: Date and class at the end of an attendance button label ("Last, First, 2026-11-01, Elders Quorum"). */
  ATTENDANCE_BUTTON_LABEL: /,\s*(\d{4}-\d{2}-\d{2}),\s*([^,]+)$/,
  /** Context: Detecting youth Sunday School classes (starts with Course). */
  YOUTH_COURSE_CLASS: /^course\b/i,
  /** Context: Detecting Primary classes. */
  PRIMARY_CLASSES: /^(valiant|ctr|sunbeam|nursery)\b/i,
  /** Context: Detecting Young Women classes. */
  YOUNG_WOMEN_CLASSES: /^(gatherers of light|messengers of hope|builders of faith|young women)\b/i,
  /** Context: Detecting Aaronic Priesthood quorums. */
  AARONIC_QUORUMS: /^(priests quorum|teachers quorum|deacons quorum|aaronic)\b/i,
  /** Context: Detecting Elders Quorum class. */
  ELDERS_QUORUM_CLASS: /^elders quorum\b/i,
  /** Context: Detecting Relief Society class. */
  RELIEF_SOCIETY_CLASS: /^relief society\b/i,
  /** Context: Detecting Adult Sunday School class. */
  ADULT_SUNDAY_SCHOOL_CLASS: /^adult sunday school\b/i,
  /** Context: Matching Young Men visitor row labels. */
  VISITOR_LABEL_YOUNG_MEN: /young\s*men/i,
  /** Context: Matching Young Women visitor row labels. */
  VISITOR_LABEL_YOUNG_WOMEN: /young\s*women/i,
  /** Context: Matching Children visitor row labels. */
  VISITOR_LABEL_CHILDREN: /children/i,
  /** Context: Matching Women visitor row labels (also matches Young Women). */
  VISITOR_LABEL_WOMEN: /women/i,
  /** Context: Matching Men visitor row labels (also matches Women and Young Men). */
  VISITOR_LABEL_MEN: /men/i,
  /** Context: Day and month abbreviation in visitor column labels (e.g. '4 Jan', '04 Jan'), not preceded by a digit. */
  DAY_MONTH_LABEL: /(?:^|[^0-9])0?(\d{1,2})\s+([a-z]{3})\b/gi,
} as const;
