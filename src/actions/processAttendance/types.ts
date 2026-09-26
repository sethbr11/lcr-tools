import * as Base from '@/types';

/* ==========================================================================
   TYPES
   ========================================================================== */

export namespace Types {
  /** Re-export base ActionResult */
  export type ActionResult<T = unknown> = Base.Types.ActionResult<T>;
  /** Re-export base ActionDefinition */
  export type ActionDefinition = Base.Types.ActionDefinition;
  /** Re-export base StandardModalOptions */
  export type StandardModalOptions = Base.Types.StandardModalOptions;
  /** Re-export base ActionLogger */
  export type ActionLogger = Base.Types.ActionLogger;
  /** Action log entry unified with centralized LogEntry. */
  export type AttendanceLogEntry = Base.Types.LogEntry;

  /** Counts of visitors keyed by category. */
  export type VisitorCounts = Partial<Record<VisitorCategory, number>>;
  /** Supported visitor categories. */
  export type VisitorCategory = 'Men' | 'Women' | 'Young Men' | 'Young Women' | 'Children';
  /** Outcome of synchronizing LCR attendance page controls. */
  export type SyncAttendancePageStatus = 'ok' | 'aborted';
  /** Outcome of attempting to mark a ward member present on the roll. */
  export type MarkPresentOutcome = 'marked' | 'already' | 'error';
  /** Stored nickname to canonical ward member name mapping. */
  export type NicknameMapping = Base.Types.NicknameMapping;
  /** Dictionary of saved nickname mappings keyed by normalized alias. */
  export type NicknameDictionary = Base.Types.NicknameDictionary;
  /** Grouped nickname mappings by canonical member name. */
  export type NicknamePersonGroup = Base.Types.NicknamePersonGroup;
  /** Rebuilds unresolved unmatched rows after nickname dictionary changes. */
  export type RefreshUnmatchedNicknames = (nicknames: NicknameDictionary) => void;
  /** Callback invoked when a ward member is chosen from the unmatched search dropdown. */
  export type UnmatchedMemberSelectHandler = (member: WardMember) => Promise<void>;

  /** Attendee entry parsed from uploaded CSV or spreadsheet clipboard paste. */
  export interface AttendeeRecord {
    /** First name of attendee. */
    firstName: string;
    /** Last name of attendee. */
    lastName: string;
    /** Formatted full name for search and display. */
    fullName: string;
    /** Optional Sunday date string associated with the attendance record. */
    date?: string;
  }

  /** First and last name pair used for roll matching, sorting, and parse output. */
  export interface AttendeeName {
    /** First name of attendee. */
    firstName: string;
    /** Last name of attendee. */
    lastName: string;
  }

  /** Intermediate parsed row structure from clipboard paste. */
  export interface ParsedAttendanceRow {
    /** 1-based row number from the pasted text. */
    rowNum: number;
    /** Raw timestamp text prior to stripping time components. */
    rawTimestamp: string;
    /** Date portion string extracted from timestamp. */
    datePortion: string;
    /** Parsed attendee first name. */
    firstName: string;
    /** Parsed attendee last name. */
    lastName: string;
    /** Validated JavaScript date instance, or null if invalid. */
    dateObj: Date | null;
    /** ISO date string formatted as YYYY-MM-DD. */
    normalizedDateStr: string | null;
  }

  /** Unmatched attendee requiring manual review or visitor assignment. */
  export interface UnmatchedRecord {
    /** First name of attendee. */
    firstName: string;
    /** Last name of attendee. */
    lastName: string;
    /** Full name for search and display. */
    fullName: string;
    /** Date of the meeting (YYYY-MM-DD). */
    date: string;
  }

  /** Skipped unmatched attendee retained for undo in the results modal. */
  export interface SkippedUnmatchedItem {
    /** Unmatched attendee record associated with the skipped row. */
    rec: UnmatchedRecord;
    /** Table row element restored when the skip is undone. */
    rowEl: HTMLTableRowElement;
  }

  /** Complete parsing result bundle returned by parser helper. */
  export interface ParsedAttendanceResult {
    /** Deduplicated list of attendee objects. */
    names: AttendeeName[];
    /** Shared meeting date from roster rows, or fallback when rows omit dates. */
    targetDate: string | null;
    /** Attendees grouped by ISO date string. */
    namesByDate: Record<string, AttendeeName[]>;
    /** Raw row metadata preserved for the interactive edit view. */
    rawRows: ParsedAttendanceRow[];
    /** List of row-by-row validation error messages. */
    errors: string[];
    /** Count of duplicate rows omitted during parsing. */
    duplicateCount: number;
    /** True when the date column contains more than one distinct date. */
    hasMixedDates: boolean;
  }

  /** Fields accepted when appending an attendance audit log entry. */
  export type AttendanceLogFields = Omit<AttendanceLogEntry, 'originalIndex' | 'timestamp'> & {
    /** Optional preformatted timestamp; auto-filled when omitted. */
    timestamp?: string;
  };

  /** Option item discovered from the LCR Class/Quorum dropdown. */
  export interface ClassOption {
    /** HTML option value attribute. */
    value: string;
    /** User-visible option display text. */
    text: string;
    /** Whether option is currently marked selected in the DOM. */
    selected: boolean;
    /** Whether this item represents a non-selectable category section header. */
    isHeader?: boolean;
  }

  /** Ward member discovered on the active LCR attendance roll. */
  export interface WardMember {
    /** Display full name (e.g. "Smith, John"). */
    fullName: string;
    /** Parsed first name. */
    firstName: string;
    /** Parsed last name. */
    lastName: string;
    /** Whether member is currently marked present in LCR. */
    isPresent: boolean;
    /** Virtual page number or index. */
    pageNum: number;
    /** Optional reference to the host table row element. */
    row?: HTMLTableRowElement;
  }

  /** Parameters passed into core attendance processor. */
  export interface ProcessAttendanceOptions {
    /** Class dropdown option value. */
    targetClassValue: string | null;
    /** Class display name. */
    targetClassText: string | null;
    /** Target Sunday date (YYYY-MM-DD). */
    targetDate: string;
    /** Optional total headcount entered by the user. */
    totalHeadcount?: number;
    /** Initial category visitor counts calculated or adjusted from setup modal. */
    visitorCounts?: VisitorCounts;
    /** Whether execution is a simulation dry-run without mutating live records. */
    isSimulation?: boolean;
  }

  /** Subset of options required to synchronize LCR month, class, and Sunday controls. */
  export interface SyncAttendancePageOptions {
    /** Target Sunday date (YYYY-MM-DD). */
    targetDate: string;
    /** Class dropdown option value. */
    targetClassValue: string | null;
    /** Class display name. */
    targetClassText: string | null;
  }

  /** Result payload returned by attendance processing action execution. */
  export interface ProcessAttendanceResult {
    /** Total attendee records processed. */
    total: number;
    /** Count of members newly marked present. */
    marked: number;
    /** Count of members already marked present before run. */
    already: number;
    /** Count of attendee names that could not be matched to a ward member. */
    unmatched: number;
  }

  /** Result of applying visitor counts to LCR visitor inputs. */
  export interface ProcessVisitorCountsResult {
    /** Whether visitor counts were successfully applied and saved. */
    success: boolean;
    /** Formatted descriptions of updated category counts. */
    updated: string[];
    /** Error message if applying visitor counts failed. */
    error?: string;
  }

  /** Setup configuration and parsed attendees returned by initial input prompt. */
  export interface AttendanceSetupResult {
    /** Processing options configured in setup modal. */
    options: ProcessAttendanceOptions;
    /** Parsed attendance records from clipboard or CSV input. */
    parsedResult: ParsedAttendanceResult;
  }

  /** Outcome of simulated dry-run roll processing. */
  export interface SimulatedRollResult {
    /** Count of members that would be newly marked present. */
    newlyMarked: number;
    /** Count of members that were already marked present. */
    alreadyMarked: number;
    /** Attendees that could not be matched on the roll during simulation. */
    unmatchedList: UnmatchedRecord[];
    /** Action execution logs generated during simulation. */
    logs: AttendanceLogEntry[];
  }

  /** Outcome of simulated visitor input and restoration test. */
  export interface SimulatedVisitorResult {
    /** Whether simulated visitor input and restore succeeded. */
    success: boolean;
    /** Descriptive log message detailing simulation outcome. */
    logMessage: string;
  }

  /** Outcome of live member roll marking against the ward attendance table. */
  export interface ProcessMembersResult {
    /** Count of members newly marked present during this run. */
    newlyMarked: number;
    /** Count of members already marked present before this run. */
    alreadyMarked: number;
    /** Attendees that could not be matched to a ward member on the roll. */
    unmatchedList: UnmatchedRecord[];
    /** Action execution logs generated while marking members. */
    logs: AttendanceLogEntry[];
    /** Whether the user aborted processing mid-loop. */
    aborted: boolean;
  }

  /** Shared unmatched-row context for applying a queued match or visitor status cell. */
  export interface QueuedRowContext {
    /** Table row being replaced with queued status. */
    tr: HTMLTableRowElement;
    /** Unmatched attendee represented by the row. */
    rec: UnmatchedRecord;
    /** Review overlay used for unmatched-count updates. */
    overlay: HTMLElement;
    /** Running attendance audit log. */
    logs: AttendanceLogEntry[];
    /** Restores the original unmatched row after Undo. */
    rebindRow: () => void;
  }

  /** Queued ward-member match from the unmatched review modal (marked on LCR after Continue). */
  export interface PendingMemberMatch {
    /** Original unmatched attendee record. */
    unmatched: UnmatchedRecord;
    /** Ward member selected for marking after Continue. */
    member: WardMember;
    /** Whether a nickname mapping should be saved when marking. */
    saveNickname: boolean;
  }

  /** Outcome returned when the user presses Continue on the unmatched review modal. */
  export interface UnmatchedReviewResult {
    /** Member matches queued during review (not yet marked on LCR). */
    pendingMatches: PendingMemberMatch[];
    /** Combined visitor counts from setup headcount and unmatched visitor designations. */
    visitorCounts: VisitorCounts;
    /** Attendees the user skipped without matching or marking as visitors. */
    skipped: UnmatchedRecord[];
    /** Attendees queued as visitors during review (not yet written to LCR). */
    visitorAssigned: UnmatchedRecord[];
    /** Audit logs appended during review interactions. */
    logs: AttendanceLogEntry[];
  }

  /** Final summary metrics shown on the completion modal after Continue processing. */
  export interface AttendanceCompletionMetrics {
    /** Total attendee records from the roster. */
    total: number;
    /** Members newly marked present across auto-mark and deferred review batches. */
    marked: number;
    /** Members already present before this run. */
    already: number;
    /** Unmatched attendees remaining after review (skipped or unresolved). */
    unmatchedRemaining: number;
    /** Total visitors written to LCR in the single post-Continue save. */
    visitorsSaved: number;
    /** Whether the run stopped early because the user pressed Escape. */
    aborted: boolean;
  }

  /** Mounted floating member-search dropdown used by the unmatched review table. */
  export interface MemberSearchDropdownMount {
    /** Floating autocomplete list attached to the review overlay. */
    floatingDropdown: HTMLUListElement;
    /** Replaces the handler invoked when a dropdown item is chosen. */
    setActiveSelection: (handler: UnmatchedMemberSelectHandler | null) => void;
  }

  /** Outcome of marking deferred review matches on the LCR roll. */
  export interface MarkPendingMatchesResult {
    /** Count of members newly marked present in this batch. */
    newlyMarked: number;
    /** Count of members already present when the deferred mark ran. */
    alreadyMarked: number;
    /** Whether the user aborted mid-batch. */
    aborted: boolean;
  }
}

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

export { Constants } from './constants';

/* ==========================================================================
   REGULAR EXPRESSIONS
   ========================================================================== */

export const Regex = {
  ...Base.Regex,
  /** Context: Splitting tab delimiter. */
  TAB_DELIMITER: /\t/,
  /** Context: Splitting comma delimiter. */
  COMMA_DELIMITER: /,/,
  /** Context: Stripping time suffix from timestamps (e.g. 14:01:02 PM). */
  TIMESTAMP_TIME_STRIP: /\s+\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?$/i,
  /** Context: Splitting date parts by slash or dash. */
  DATE_PARTS_SPLIT: /[-/]/,
  /** Context: YYYY-MM date prefix matching. */
  YEAR_MONTH_VALUE: /^\d{4}-\d{2}$/,
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
} as const;

/* ==========================================================================
   DOM
   ========================================================================== */

export { Dom } from './dom';
