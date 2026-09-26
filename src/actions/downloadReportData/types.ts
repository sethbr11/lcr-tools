import * as Base from '@/types';

/* ==========================================================================
   TYPES
   ========================================================================== */

export namespace Types {
  /** Re-export base ActionResult */
  export type ActionResult<T = unknown> = Base.Types.ActionResult<T>;
  /** Re-export base ActionDefinition */
  export type ActionDefinition = Base.Types.ActionDefinition;
  /** Re-export base ToastOptions */
  export type ToastOptions = Base.Types.ToastOptions;
  /** Re-export base StandardModalOptions */
  export type StandardModalOptions = Base.Types.StandardModalOptions;
  /** Re-export base TableInfo */
  export type TableInfo = Base.Types.TableInfo;

  /** Generated CSV file payload representation. */
  export interface GeneratedCsvFile {
    /** File name including extension. */
    filename: string;
    /** Raw comma-separated values string content. */
    csvContent: string;
  }

  /** Result payload returned by download report data action execution. */
  export interface DownloadReportDataResult {
    /** Total count of CSV files generated and downloaded. */
    exportedCount: number;
    /** Output filename of the downloaded single CSV or ZIP archive. */
    filename?: string;
  }
}

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

export const Constants = {
  ...Base.Constants,
  /** Title for the filename prompt modal dialog. */
  FILENAME_MODAL_TITLE: 'Save Report As',
  /** Prompt label asking user for report filename. */
  FILENAME_MODAL_PROMPT: 'Enter a filename for the exported data:',
  /** Helper subtitle for single CSV file export prompt. */
  FILENAME_MODAL_CSV_HINT: 'File will be saved as a .csv file (extension added automatically).',
  /** Helper subtitle for multi-table ZIP archive export prompt. */
  FILENAME_MODAL_ZIP_HINT: 'Archive will be saved as a .zip file (extension added automatically).',
  /** Button label for confirming filename and proceeding with download. */
  FILENAME_CONFIRM_BTN_TEXT: 'Download',
  /** Button label for cancelling the filename prompt. */
  FILENAME_CANCEL_BTN_TEXT: 'Cancel',
  /** Default filename for multi-table ZIP export archives. */
  DEFAULT_ZIP_EXPORT_NAME: 'reports.zip',
  /** Safety upper bound on total paginated page requests. */
  MAX_PAGINATION_PAGES: 25,
} as const;

/* ==========================================================================
   REGULAR EXPRESSIONS
   ========================================================================== */

export const Regex = {
  ...Base.Regex,
  /** Matches illegal characters in filesystem filenames across major operating systems. */
  ILLEGAL_FILENAME_CHARS: /[\\/:*?"<>|]/g,
  /** Matches .csv file extension at end of filename string. */
  CSV_EXTENSION: /\.csv$/i,
  /** Matches .zip file extension at end of filename string. */
  ZIP_EXTENSION: /\.zip$/i,
  /** Matches .txt file extension at end of filename string. */
  TXT_EXTENSION: /\.txt$/i,
} as const;

/* ==========================================================================
   DOM
   ========================================================================== */

export const Dom = {
  ...Base.Dom,
  /** DOM element ID for the filename prompt modal container. */
  FILENAME_MODAL_ID: 'lcr-tools-filename-modal',
  /** DOM element ID for the filename text input field. */
  FILENAME_INPUT_ID: 'lcr-filename-input',
  /** DOM element ID for confirming filename save. */
  FILENAME_CONFIRM_BTN_ID: 'lcr-filename-confirm-btn',
  /** DOM element ID for cancelling filename save. */
  FILENAME_CANCEL_BTN_ID: 'lcr-filename-cancel-btn',
} as const;
