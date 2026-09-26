import { clearPhotoCache, closeModal, createStandardModal, showToast, shuffleArray } from './utils';
import {
  isFlashcardPhotoPreloaded,
  preloadFlashcardDeck,
  resetFlashcardPhotoPreload,
} from './flashcardPhotoHelper';
import { Dom, Types } from './types';
import { Templates } from './templates';

let activeKeydownHandler: ((e: KeyboardEvent) => void) | null = null;

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Renders the interactive flashcard modal and binds flip, navigation, keyboard, and cache-clearing listeners.
 *
 * @param members - Array of member records equipped with photos and names.
 * @param onResetCache - Optional async callback invoked after user clears photo cache to re-scan page.
 */
export function mountFlashcardInterface(
  members: Types.FlashcardMember[],
  onResetCache?: () => Promise<void> | void
): void {
  if (!members || members.length === 0) {
    showToast('No members with photos available.', { type: 'warning' });
    return;
  }

  resetFlashcardPhotoPreload();

  // Remove any stale keydown listener from previous modal instance
  if (activeKeydownHandler) {
    document.removeEventListener('keydown', activeKeydownHandler);
    activeKeydownHandler = null;
  }

  let deck = [...members];
  let currentIndex = 0;
  let isFlipped = false;
  let isShuffled = false;

  const cleanupListeners = () => {
    if (activeKeydownHandler) {
      document.removeEventListener('keydown', activeKeydownHandler);
      activeKeydownHandler = null;
    }
  };

  const modalHtml = Templates.flashcardModalBody();

  createStandardModal({
    id: Dom.MODAL_ID,
    title: 'Member Flashcards',
    content: modalHtml,
    width: '460px',
    buttons: [
      {
        text: 'Done',
        type: 'secondary',
        onClick: () => {
          cleanupListeners();
          closeModal(Dom.MODAL_ID);
        },
      },
    ],
    onClose: () => {
      cleanupListeners();
    },
  });

  const cardInner = document.getElementById(Dom.CARD_INNER_ID);
  const cardImg = document.getElementById(Dom.CARD_IMG_ID) as HTMLImageElement | null;
  const cardPlaceholder = document.getElementById(Dom.CARD_PLACEHOLDER_ID);
  const cardName = document.getElementById(Dom.CARD_NAME_ID);
  const progressEl = document.getElementById(Dom.CARD_PROGRESS_ID);
  const progressBarFill = document.getElementById(Dom.PROGRESS_BAR_FILL_ID);
  const shuffleBadge = document.getElementById(Dom.SHUFFLE_BADGE_ID);

  const updateCardView = () => {
    isFlipped = false;
    if (cardInner) cardInner.style.transform = 'rotateY(0deg)';

    const currentMember = deck[currentIndex];
    showMemberPhoto(currentMember, cardImg, cardPlaceholder, () => deck[currentIndex]);
    preloadFlashcardDeck(deck, currentIndex);

    if (cardName) cardName.textContent = currentMember.fullName;
    if (progressEl) {
      progressEl.textContent = `Card ${currentIndex + 1} of ${deck.length}`;
    }
    if (progressBarFill) {
      const percentage = Math.round(((currentIndex + 1) / deck.length) * 100);
      progressBarFill.style.width = `${percentage}%`;
    }
    if (shuffleBadge) {
      shuffleBadge.style.display = isShuffled ? 'inline-block' : 'none';
    }
  };

  const toggleFlip = () => {
    isFlipped = !isFlipped;
    if (cardInner) {
      cardInner.style.transform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
    }
  };

  const goNext = () => {
    currentIndex = (currentIndex + 1) % deck.length;
    updateCardView();
  };

  const goPrev = () => {
    currentIndex = (currentIndex - 1 + deck.length) % deck.length;
    updateCardView();
  };

  const doShuffle = () => {
    deck = shuffleArray(deck);
    isShuffled = true;
    currentIndex = 0;
    updateCardView();
    showToast('Deck shuffled!', { type: 'info', duration: 1500 });
  };

  const doClearCache = async () => {
    cleanupListeners();
    closeModal(Dom.MODAL_ID);
    await clearPhotoCache();
    showToast('Photo cache cleared! Refreshing...', { type: 'info', duration: 1500 });
    if (onResetCache) {
      await onResetCache();
    }
  };

  // Bind mouse click events
  document.getElementById(Dom.FLASHCARD_CONTAINER_ID)?.addEventListener('click', toggleFlip);
  document.getElementById(Dom.FLIP_CARD_BTN_ID)?.addEventListener('click', toggleFlip);
  document.getElementById(Dom.NEXT_CARD_BTN_ID)?.addEventListener('click', goNext);
  document.getElementById(Dom.PREV_CARD_BTN_ID)?.addEventListener('click', goPrev);
  document.getElementById(Dom.SHUFFLE_DECK_BTN_ID)?.addEventListener('click', doShuffle);
  document.getElementById(Dom.CLEAR_CACHE_BTN_ID)?.addEventListener('click', doClearCache);

  // Keyboard navigation handler
  const keydownHandler = (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target instanceof HTMLElement && e.target.isContentEditable)
    ) {
      return;
    }

    if (e.key === 'Escape') {
      cleanupListeners();
      closeModal(Dom.MODAL_ID);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      goNext();
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      goPrev();
      e.preventDefault();
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      toggleFlip();
      e.preventDefault();
    } else if (e.key === 's' || e.key === 'S') {
      doShuffle();
      e.preventDefault();
    }
  };

  activeKeydownHandler = keydownHandler;
  document.addEventListener('keydown', keydownHandler);
  updateCardView();
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/**
 * Reveals a preloaded portrait immediately, or waits for load without flashing the no-photo silhouette.
 */
function showMemberPhoto(
  member: Types.FlashcardMember,
  cardImg: HTMLImageElement | null,
  cardPlaceholder: HTMLElement | null,
  currentMember: () => Types.FlashcardMember | undefined
): void {
  if (!cardImg || !cardPlaceholder) return;

  const isCurrent = () => currentMember()?.photoUrl === member.photoUrl;
  const revealPhoto = () => {
    cardImg.style.display = 'block';
    cardPlaceholder.style.display = 'none';
  };
  const showEmptyFrame = () => {
    cardImg.style.display = 'none';
    cardPlaceholder.style.display = 'none';
  };

  cardImg.onload = () => {
    if (!isCurrent()) return;
    revealPhoto();
  };
  cardImg.onerror = () => {
    if (!isCurrent()) return;
    cardImg.style.display = 'none';
    cardPlaceholder.style.display = 'flex';
  };

  cardPlaceholder.style.display = 'none';
  cardImg.src = member.photoUrl;

  if (
    isFlashcardPhotoPreloaded(member.photoUrl) ||
    (cardImg.complete && cardImg.naturalWidth > 0)
  ) {
    revealPhoto();
    return;
  }

  showEmptyFrame();
}
