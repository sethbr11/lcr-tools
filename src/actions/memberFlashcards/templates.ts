import { Dom } from './types';

/**
 * HTML templates for memberFlashcards action UI components.
 */

export const Templates = {
  /** Flashcard container HTML incorporating 3D flip card, progress bar, and control buttons. */
  flashcardModalBody: (): string => `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; user-select: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 2px 4px 6px 4px;">
      
      <!-- Top Progress & Count Header -->
      <div style="width: 100%; max-width: 320px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
          <span style="font-size: 13px; font-weight: 600; color: #334155;" id="${Dom.CARD_PROGRESS_ID}">Card 1 of 1</span>
          <span id="${Dom.SHUFFLE_BADGE_ID}" style="display: none; font-size: 11px; font-weight: 600; color: #2563eb; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 9999px; padding: 1px 7px;">Shuffled</span>
        </div>
        <!-- Progress Bar Track -->
        <div style="width: 100%; height: 5px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">
          <div id="${Dom.PROGRESS_BAR_FILL_ID}" style="width: 0%; height: 100%; background: linear-gradient(90deg, #3b82f6, #2563eb); border-radius: 9999px; transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);"></div>
        </div>
      </div>

      <!-- 3D Flip Card Container -->
      <div id="${Dom.FLASHCARD_CONTAINER_ID}" style="width: 300px; height: 320px; perspective: 1200px; cursor: pointer; margin-bottom: 14px;">
        <div id="${Dom.CARD_INNER_ID}" style="position: relative; width: 100%; height: 100%; text-align: center; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.08); border-radius: 16px;">
          
          <!-- Front Face (HD Portrait Photo) -->
          <div id="${Dom.CARD_FRONT_ID}" style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 14px; box-sizing: border-box; overflow: hidden;">
            <div style="width: 250px; height: 245px; border-radius: 12px; overflow: hidden; background: #f8fafc; display: flex; align-items: center; justify-content: center; border: 1px solid #f1f5f9; box-shadow: inset 0 2px 4px rgba(0,0,0,0.04); position: relative;">
              <img id="${Dom.CARD_IMG_ID}" src="" alt="Member Portrait" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
              <!-- Placeholder avatar silhouette fallback -->
              <div id="${Dom.CARD_PLACEHOLDER_ID}" style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; background: #f1f5f9; flex-direction: column;">
                <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span style="font-size: 11px; color: #94a3b8; margin-top: 6px; font-weight: 500;">No Photo Available</span>
              </div>
            </div>
            <div style="margin-top: 10px; font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 5px;">
              <span>Click or press</span>
              <kbd style="padding: 1px 5px; font-size: 11px; font-weight: 600; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; color: #334155; font-family: monospace;">Space</kbd>
              <span>to reveal name</span>
            </div>
          </div>

          <!-- Back Face (Member Name) -->
          <div id="${Dom.CARD_BACK_ID}" style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; transform: rotateY(180deg); background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.4);">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; margin-bottom: 14px;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <h2 id="${Dom.CARD_NAME_ID}" style="margin: 0 0 8px 0; font-size: 1.55rem; font-weight: 700; color: #ffffff; text-align: center; letter-spacing: -0.02em; line-height: 1.25; max-width: 250px; word-wrap: break-word;">Name</h2>
            <div id="${Dom.CARD_UNIT_ID}" style="font-size: 13px; color: rgba(255,255,255,0.8); margin-bottom: 20px; font-weight: 500;">Member</div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.75); display: flex; align-items: center; gap: 5px;">
              <kbd style="padding: 1px 5px; font-size: 11px; font-weight: 600; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; color: #ffffff; font-family: monospace;">Space</kbd>
              <span>to flip back</span>
            </div>
          </div>

        </div>
      </div>

      <!-- Navigation & Deck Actions -->
      <div style="display: flex; gap: 6px; align-items: center; justify-content: center; margin-bottom: 8px; flex-wrap: wrap;">
        <button id="${Dom.PREV_CARD_BTN_ID}" class="lcr-tools-btn lcr-tools-btn-secondary" style="padding: 7px 12px; font-size: 12px; font-weight: 600; border-radius: 8px;">◀ Prev</button>
        <button id="${Dom.FLIP_CARD_BTN_ID}" class="lcr-tools-btn lcr-tools-btn-primary" style="padding: 7px 18px; font-size: 12px; font-weight: 600; border-radius: 8px; background: #2563eb; color: #ffffff; box-shadow: 0 2px 6px rgba(37,99,235,0.3);">Flip Card</button>
        <button id="${Dom.NEXT_CARD_BTN_ID}" class="lcr-tools-btn lcr-tools-btn-secondary" style="padding: 7px 12px; font-size: 12px; font-weight: 600; border-radius: 8px;">Next ▶</button>
        <button id="${Dom.SHUFFLE_DECK_BTN_ID}" class="lcr-tools-btn lcr-tools-btn-secondary" style="padding: 7px 10px; font-size: 12px; font-weight: 600; border-radius: 8px;">🔀 Shuffle</button>
        <button id="${Dom.CLEAR_CACHE_BTN_ID}" class="lcr-tools-btn lcr-tools-btn-secondary" style="padding: 7px 10px; font-size: 12px; font-weight: 600; border-radius: 8px; color: #dc2626;" title="Clear cached member photos and re-scan this page">🗑 Clear Cache</button>
      </div>

      <!-- Keyboard shortcuts legend -->
      <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 6px;">
        <span><kbd style="padding: 1px 4px; font-size: 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 3px; font-family: monospace;">◀</kbd> <kbd style="padding: 1px 4px; font-size: 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 3px; font-family: monospace;">▶</kbd> Navigate</span>
        <span style="color: #cbd5e1;">•</span>
        <span><kbd style="padding: 1px 4px; font-size: 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 3px; font-family: monospace;">Space</kbd> Flip</span>
        <span style="color: #cbd5e1;">•</span>
        <span><kbd style="padding: 1px 4px; font-size: 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 3px; font-family: monospace;">S</kbd> Shuffle</span>
      </div>

    </div>
  `,
};
