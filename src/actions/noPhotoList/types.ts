import * as Base from '@/types';

/* ==========================================================================
   TYPES
   ========================================================================== */

export namespace Types {
  /** Re-export base ActionResult */
  export type ActionResult<T = unknown> = Base.Types.ActionResult<T>;
  /** Re-export base ActionDefinition */
  export type ActionDefinition = Base.Types.ActionDefinition;
  /** Re-export base MemberPhotoScanResult */
  export type MemberPhotoScanResult = Base.Types.MemberPhotoScanResult;

  /** Member missing portrait photograph in directory. */
  export interface MemberWithoutPhoto {
    /** First name of the member. */
    firstName: string;
    /** Last name of the member. */
    lastName: string;
  }

  /** Result payload returned by no photo list action execution. */
  export interface NoPhotoListResult {
    /** Total count of ward members identified without uploaded directory photos. */
    missingCount: number;
  }
}

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

export const Constants = {
  ...Base.Constants,
  /** Display name used in no-photo list toasts and maintenance notifications. */
  ACTION_NAME: 'Members with No Photo',
  /** Toast shown when the active page is not an LCR or Church Directory member list. */
  NOT_ON_DIRECTORY:
    'Please visit the Member Directory or Church Directory to download a no-photo list.',
  /** Toast shown when every scanned member has a portrait photo. */
  ALL_HAVE_PHOTOS: 'All members in this view have photos!',
  /** Toast shown after a missing-photo CSV download. */
  FOUND_MISSING_PHOTOS: 'Found {{count}} members without photos. Report downloaded!',
  /** Toast shown when the LCR directory table could not be read. */
  NO_MEMBERS_FOUND: 'No member records were found on this page.',
} as const;

/* ==========================================================================
   REGULAR EXPRESSIONS
   ========================================================================== */

export const Regex = {
  ...Base.Regex,
} as const;

/* ==========================================================================
   DOM
   ========================================================================== */

export const Dom = {
  ...Base.Dom,
} as const;
