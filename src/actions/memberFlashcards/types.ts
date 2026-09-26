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
  /** Re-export base MemberPhotoStatus */
  export type MemberPhotoStatus = Base.Types.MemberPhotoStatus;

  /** Member data record prepared for flashcard quizzing. */
  export interface FlashcardMember {
    /** Unique member ID string. */
    memberId: string;
    /** Full display name of the member. */
    fullName: string;
    /** First name component. */
    firstName?: string;
    /** Last name component. */
    lastName?: string;
    /** URL pointing to the member portrait photo. */
    photoUrl: string;
    /** Flag indicating whether a portrait photo is available. */
    hasPhoto: boolean;
  }

  /** Result payload returned by member flashcards action execution. */
  export interface MemberFlashcardsResult {
    /** Total count of member flashcards rendered or retrieved. */
    count: number;
    /** Source origin of member card data (e.g. 'cache' or 'network'). */
    source?: string;
  }
}

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

export const Constants = {
  ...Base.Constants,
  /** Display name used in flashcard toasts and maintenance notifications. */
  ACTION_NAME: 'Member Flashcards',
  /** Number of neighboring flashcards whose portraits are preloaded around the current card. */
  FLASHCARD_PRELOAD_RADIUS: 2,
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
  /** ID assigned to the flashcard modal dialog. */
  MODAL_ID: 'lcr-tools-flashcard-modal',
  /** ID for card progress counter text. */
  CARD_PROGRESS_ID: 'lcr-card-progress',
  /** ID for card deck shuffle badge indicator. */
  SHUFFLE_BADGE_ID: 'lcr-shuffle-badge',
  /** ID for progress bar fill element. */
  PROGRESS_BAR_FILL_ID: 'lcr-progress-bar-fill',
  /** ID for 3D flip card outer container. */
  FLASHCARD_CONTAINER_ID: 'lcr-flashcard',
  /** ID for 3D card inner rotating wrapper. */
  CARD_INNER_ID: 'lcr-card-inner',
  /** ID for front card face container. */
  CARD_FRONT_ID: 'lcr-card-front',
  /** ID for member portrait image element. */
  CARD_IMG_ID: 'lcr-card-img',
  /** ID for placeholder avatar container when no photo exists. */
  CARD_PLACEHOLDER_ID: 'lcr-card-placeholder',
  /** ID for back card face container. */
  CARD_BACK_ID: 'lcr-card-back',
  /** ID for member full name header on backface. */
  CARD_NAME_ID: 'lcr-card-name',
  /** ID for member unit or designation subtitle. */
  CARD_UNIT_ID: 'lcr-card-unit',
  /** ID for previous card navigation button. */
  PREV_CARD_BTN_ID: 'lcr-prev-card',
  /** ID for flip card action button. */
  FLIP_CARD_BTN_ID: 'lcr-flip-card',
  /** ID for next card navigation button. */
  NEXT_CARD_BTN_ID: 'lcr-next-card',
  /** ID for shuffle card deck action button. */
  SHUFFLE_DECK_BTN_ID: 'lcr-shuffle-deck',
  /** ID for clear photo cache button. */
  CLEAR_CACHE_BTN_ID: 'lcr-clear-cache',
} as const;
