/**
 * Shared utility Types, Constants, Regex, and Classes re-exported from base types.
 * Serves as the central type definition entrypoint for all utility modules.
 */
import * as Base from '@/types';

export namespace Types {
  /** Metadata descriptor and element reference for a detected Church LCR DOM data table. */
  export type TableInfo = Base.Types.TableInfo;
  /** Result payload of table to CSV conversion containing CSV string and filename. */
  export type TableCsvResult = Base.Types.TableCsvResult;
  /** Structured member identity attributes extracted from a directory table row. */
  export type MemberRowInfo = Base.Types.MemberRowInfo;
  /** Structured diagnostic log record representing an action event. */
  export type LogEntry = Base.Types.LogEntry;
  /** Diagnostic tracking logger instance equipped with structured logging and CSV export methods. */
  export type ActionLogger = Base.Types.ActionLogger;
  /** Action button configuration for modal dialogs. */
  export type ModalButton = Base.Types.ModalButton;
  /** Alert banner item configuration inside modal headers. */
  export type ModalAlert = Base.Types.ModalAlert;
  /** Configuration options for standard center-screen modal dialogs. */
  export type StandardModalOptions = Base.Types.StandardModalOptions;
  /** Configuration options for the LCR layout update maintenance modal. */
  export type MaintenanceModalOptions = Base.Types.MaintenanceModalOptions;
  /** Configuration options for side-sliding drawer modals. */
  export type SideModalOptions = Base.Types.SideModalOptions;
  /** Configuration options for confirmation prompt dialogs. */
  export type ConfirmationOptions = Base.Types.ConfirmationOptions;
  /** Key-value dictionary of member IDs to cached photo metadata records. */
  export type PhotoCache = Base.Types.PhotoCache;
  /** Individual cached member record containing portrait image information. */
  export type PhotoCacheEntry = Base.Types.PhotoCacheEntry;
  /** User preference settings for photo caching behavior. */
  export type CacheSettings = Base.Types.CacheSettings;
  /** Stored nickname to canonical ward member name mapping. */
  export type NicknameMapping = Base.Types.NicknameMapping;
  /** Dictionary of saved nickname mappings keyed by normalized alias. */
  export type NicknameDictionary = Base.Types.NicknameDictionary;
  /** Aliases grouped under one canonical ward member for the popup viewer. */
  export type NicknamePersonGroup = Base.Types.NicknamePersonGroup;
  /** Named popup screen shown in the extension action popup. */
  export type PopupView = Base.Types.PopupView;
  /** Structured first and last name components of a member. */
  export type MemberNameParts = Base.Types.MemberNameParts;
  /** Structured representation of a calendar month and day without year context. */
  export type MonthDay = Base.Types.MonthDay;
  /** Configuration options controlling automatic scrolling behavior. */
  export type AutoScrollOptions = Base.Types.AutoScrollOptions;
  /** Column header titles and their associated 0-based column indices. */
  export type RelevantHeadersResult = Base.Types.RelevantHeadersResult;
  /** Configuration options for the diagnostic action logger. */
  export type ActionLoggerOptions = Base.Types.ActionLoggerOptions;
  /** Structure defining parsed geographic coordinate latitude and longitude. */
  export type CoordinatePoint = Base.Types.CoordinatePoint;
  /** Structure of Church member card API payload. */
  export type LcrMemberCardData = Base.Types.LcrMemberCardData;
  /** Representation of an exported CSV file payload. */
  export type GeneratedCsvFile = Base.Types.GeneratedCsvFile;
  /** Visual theme variants for toast alerts. */
  export type ToastType = Base.Types.ToastType;
  /** Screen corner or edge positioning for toast containers. */
  export type ToastPosition = Base.Types.ToastPosition;
  /** Configuration options for toast notification display. */
  export type ToastOptions = Base.Types.ToastOptions;
  /** Privacy settings for an individual Church Directory member. */
  export interface DirectoryMemberPrivacy {
    /** Privacy level for member portrait photo. */
    photo?: string;
  }
  /** Member payload returned within Directory household record. */
  export interface DirectoryHouseholdMember {
    /** Unique member UUID identifier. */
    uuid: string;
    /** Full name formatted as Surname, GivenName. */
    name?: string;
    /** Formatted display name (GivenName Surname). */
    displayName?: string;
    /** Given or first name component. */
    givenName?: string;
    /** Surname or last name component. */
    surname?: string;
    /** Member privacy preferences. */
    privacy?: DirectoryMemberPrivacy;
    /** Direct portrait URL if provided by directory payload. */
    photoUrl?: string;
    /** Explicit photo availability flag if returned by directory payload. */
    hasPhoto?: boolean;
    /** Photo object if returned by directory payload. */
    photo?: { url?: string; tokenUrl?: string } | null;
    /** Individual photo property if returned by directory payload. */
    individualPhoto?: string | { url?: string; tokenUrl?: string } | null;
  }
  /** Household entry payload returned by Directory households API. */
  export interface DirectoryHousehold {
    /** Members belonging to this household. */
    members?: DirectoryHouseholdMember[];
  }
  /** Member photo availability record produced by a directory photo scan. */
  export type MemberPhotoStatus = Base.Types.MemberPhotoStatus;
  /** Classified photo-scan result for a unit directory. */
  export type MemberPhotoScanResult = Base.Types.MemberPhotoScanResult;
  /** Dictionary mapping passive action IDs or storage keys to enabled boolean flags. */
  export type PassiveActionStateMap = Base.Types.PassiveActionStateMap;
}

export const Constants = {
  ...Base.Constants,
} as const;

export const Regex = {
  ...Base.Regex,
} as const;

export const Dom = {
  ...Base.Dom,
} as const;
