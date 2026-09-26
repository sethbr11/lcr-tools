import { browser } from 'wxt/browser';
import {
  getStoredApiKeys,
  setUnlockedPin,
  showToast,
  validatePinFormat,
  verifyPin,
} from '../utils';
import { Constants, Dom, Types } from '../types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Displays the security PIN modal to unlock and autofill stored API keys in Trip Planner.
 *
 * @param onUnlocked - Callback invoked with decrypted API keys after successful PIN verification.
 */
export function showTripPinModal(
  onUnlocked: (keys: Types.StoredApiKeys) => Promise<void> | void
): void {
  document.getElementById(Dom.PIN_MODAL_OVERLAY_ID)?.remove();

  const overlay = document.createElement('div');
  overlay.id = Dom.PIN_MODAL_OVERLAY_ID;
  overlay.className = 'trip-modal-backdrop';

  overlay.innerHTML = `
    <div class="trip-modal-card trip-pin-card">
      <div class="trip-modal-header">
        <h2 class="trip-modal-title">${Constants.TRIP_PIN_MODAL_TITLE}</h2>
        <button type="button" class="trip-close-btn" id="${Dom.PIN_MODAL_CLOSE_ID}">&times;</button>
      </div>
      <div class="trip-modal-body">
        <p class="trip-pin-desc">${Constants.TRIP_PIN_MODAL_DESC}</p>
        <div id="${Dom.PIN_MODAL_STATUS_ID}" class="status-banner error" style="display: none;"></div>
        <div class="trip-pin-input-group">
          <label for="${Dom.PIN_MODAL_INPUT_ID}">Security PIN:</label>
          <input
            type="password"
            id="${Dom.PIN_MODAL_INPUT_ID}"
            class="trip-pin-input"
            maxlength="${Constants.PIN_MAX_LENGTH}"
            placeholder="••••"
            autocomplete="off"
          />
        </div>
      </div>
      <div class="trip-modal-footer">
        <button type="button" class="lcr-tools-btn lcr-tools-btn-tertiary" id="${Dom.PIN_MODAL_CANCEL_ID}" style="width: auto; margin: 0;">Cancel</button>
        <button type="button" class="lcr-tools-btn lcr-tools-btn-primary" id="${Dom.PIN_MODAL_SUBMIT_ID}" style="width: auto; margin: 0;">${Constants.TRIP_PIN_MODAL_SUBMIT}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = document.getElementById(Dom.PIN_MODAL_INPUT_ID) as HTMLInputElement | null;
  const statusBanner = document.getElementById(Dom.PIN_MODAL_STATUS_ID);
  const submitBtn = document.getElementById(Dom.PIN_MODAL_SUBMIT_ID) as HTMLButtonElement | null;
  const closeBtn = document.getElementById(Dom.PIN_MODAL_CLOSE_ID) as HTMLButtonElement | null;
  const cancelBtn = document.getElementById(Dom.PIN_MODAL_CANCEL_ID) as HTMLButtonElement | null;

  const closeModal = (): void => {
    document.removeEventListener('keydown', handleKeyDown);
    overlay.remove();
  };

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter') void handleSubmit();
  };

  const handleSubmit = async (): Promise<void> => {
    const pin = (input?.value || '').trim();

    if (!validatePinFormat(pin)) {
      showPinError(statusBanner, Constants.PIN_INVALID_LENGTH);
      input?.focus();
      return;
    }

    try {
      const res = browser?.storage?.local
        ? await browser.storage.local.get(Constants.PIN_STORAGE_KEY)
        : {};
      const sentinel = res[Constants.PIN_STORAGE_KEY] as Types.EncryptedPayload;
      const valid = sentinel ? await verifyPin(pin, sentinel) : false;

      if (!valid) {
        showPinError(statusBanner, Constants.PIN_INCORRECT);
        input?.focus();
        return;
      }

      await setUnlockedPin(pin);
      const keys = await getStoredApiKeys();
      closeModal();
      await onUnlocked(keys);
      showToast(Constants.TRIP_PIN_MODAL_SUCCESS, { type: 'success' });
    } catch (error) {
      console.error('LCR Tools: PIN verification error:', error);
      showPinError(statusBanner, Constants.PIN_INCORRECT);
      input?.focus();
    }
  };

  submitBtn?.addEventListener('click', () => void handleSubmit());
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', handleKeyDown);

  input?.focus();
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Displays an error message banner on the Trip Planner PIN modal. */
function showPinError(element: HTMLElement | null, message: string): void {
  if (!element) return;
  element.textContent = message;
  element.style.display = message ? 'block' : 'none';
}
