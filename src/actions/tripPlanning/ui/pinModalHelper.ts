import { browser } from 'wxt/browser';
import {
  establishSecurityPin,
  getStoredApiKeys,
  hasSecurityPin,
  setHtml,
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
 * Unlocks stored API keys for autofill, creating a PIN first when none exists (which also
 * encrypts any keys saved before PINs were required).
 *
 * @param onUnlocked - Callback invoked with decrypted API keys after the PIN is unlocked.
 */
export function showTripPinModal(
  onUnlocked: (keys: Types.StoredApiKeys) => Promise<void> | void
): void {
  void (async () => {
    const mode: Types.TripPinMode = (await hasSecurityPin()) ? 'unlock' : 'setup';
    if (!(await requestTripPin(mode))) return;
    await onUnlocked(await getStoredApiKeys());
    showToast(Constants.TRIP_PIN_MODAL_SUCCESS, { type: 'success' });
  })();
}

/**
 * Shows the PIN dialog for one purpose and resolves once the user finishes or cancels.
 * 'unlock' and 'save' unlock the session; 'setup' creates a PIN (with confirmation) and unlocks;
 * 'verify' only checks the PIN (used before revealing a saved key) without other side effects.
 *
 * @param mode - Why the PIN is being requested.
 * @returns True when the PIN was accepted (or created), false when cancelled.
 */
export function requestTripPin(mode: Types.TripPinMode): Promise<boolean> {
  return new Promise((resolve) => {
    document.getElementById(Dom.PIN_MODAL_OVERLAY_ID)?.remove();
    const copy = getModeCopy(mode);
    const overlay = document.createElement('div');
    overlay.id = Dom.PIN_MODAL_OVERLAY_ID;
    overlay.className = 'trip-modal-backdrop';
    setHtml(overlay, buildPinModalHtml(copy, mode === 'setup'));
    document.body.appendChild(overlay);

    const input = document.getElementById(Dom.PIN_MODAL_INPUT_ID) as HTMLInputElement | null;
    const confirmInput = document.getElementById(
      Dom.PIN_MODAL_CONFIRM_INPUT_ID
    ) as HTMLInputElement | null;
    const statusBanner = document.getElementById(Dom.PIN_MODAL_STATUS_ID);

    const finish = (accepted: boolean): void => {
      document.removeEventListener('keydown', handleKeyDown);
      overlay.remove();
      resolve(accepted);
    };
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') finish(false);
      if (e.key === 'Enter') void handleSubmit();
    };
    const fail = (message: string, field: HTMLInputElement | null): void => {
      showPinError(statusBanner, message);
      field?.focus();
    };

    const handleSubmit = async (): Promise<void> => {
      const pin = (input?.value || '').trim();
      if (!validatePinFormat(pin)) return fail(Constants.PIN_INVALID_LENGTH, input);
      try {
        if (mode === 'setup') {
          if (pin !== (confirmInput?.value || '').trim()) {
            return fail(Constants.PIN_MISMATCH, confirmInput);
          }
          await establishSecurityPin(pin);
          return finish(true);
        }
        if (!(await isCorrectPin(pin))) return fail(Constants.PIN_INCORRECT, input);
        if (mode !== 'verify') await setUnlockedPin(pin);
        finish(true);
      } catch (error) {
        console.error('LCR Tools: PIN verification error:', error);
        fail(Constants.PIN_INCORRECT, input);
      }
    };

    document.getElementById(Dom.PIN_MODAL_SUBMIT_ID)?.addEventListener('click', () => {
      void handleSubmit();
    });
    document.getElementById(Dom.PIN_MODAL_CLOSE_ID)?.addEventListener('click', () => finish(false));
    document
      .getElementById(Dom.PIN_MODAL_CANCEL_ID)
      ?.addEventListener('click', () => finish(false));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) finish(false);
    });
    document.addEventListener('keydown', handleKeyDown);
    input?.focus();
  });
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Title, description, and submit label for each PIN dialog purpose. */
function getModeCopy(mode: Types.TripPinMode): { title: string; desc: string; submit: string } {
  switch (mode) {
    case 'setup':
      return {
        title: Constants.TRIP_PIN_SETUP_TITLE,
        desc: Constants.TRIP_PIN_SETUP_DESC,
        submit: Constants.TRIP_PIN_SETUP_SUBMIT,
      };
    case 'verify':
      return {
        title: Constants.TRIP_PIN_VERIFY_TITLE,
        desc: Constants.TRIP_PIN_VERIFY_DESC,
        submit: Constants.TRIP_PIN_VERIFY_SUBMIT,
      };
    case 'save':
      return {
        title: Constants.TRIP_PIN_SAVE_TITLE,
        desc: Constants.TRIP_PIN_SAVE_DESC,
        submit: Constants.TRIP_PIN_SAVE_SUBMIT,
      };
    default:
      return {
        title: Constants.TRIP_PIN_MODAL_TITLE,
        desc: Constants.TRIP_PIN_MODAL_DESC,
        submit: Constants.TRIP_PIN_MODAL_SUBMIT,
      };
  }
}

/** Builds the PIN dialog markup, adding a confirmation field when creating a PIN. */
function buildPinModalHtml(
  copy: { title: string; desc: string; submit: string },
  withConfirm: boolean
): string {
  const pinField = (id: string, label: string) => `
        <div class="trip-pin-input-group">
          <label for="${id}">${label}</label>
          <input type="password" id="${id}" class="trip-pin-input" inputmode="numeric"
            maxlength="${Constants.PIN_MAX_LENGTH}" placeholder="••••" autocomplete="off" />
        </div>`;
  return `
    <div class="trip-modal-card trip-pin-card">
      <div class="trip-modal-header">
        <h2 class="trip-modal-title" id="${Dom.PIN_MODAL_TITLE_ID}">${copy.title}</h2>
        <button type="button" class="trip-close-btn" id="${Dom.PIN_MODAL_CLOSE_ID}">&times;</button>
      </div>
      <div class="trip-modal-body">
        <p class="trip-pin-desc">${copy.desc}</p>
        <div id="${Dom.PIN_MODAL_STATUS_ID}" class="status-banner error" style="display: none;"></div>
        ${pinField(Dom.PIN_MODAL_INPUT_ID, 'Security PIN:')}
        ${withConfirm ? pinField(Dom.PIN_MODAL_CONFIRM_INPUT_ID, Constants.TRIP_PIN_CONFIRM_LABEL) : ''}
      </div>
      <div class="trip-modal-footer">
        <button type="button" class="lcr-tools-btn lcr-tools-btn-tertiary" id="${Dom.PIN_MODAL_CANCEL_ID}" style="width: auto; margin: 0;">Cancel</button>
        <button type="button" class="lcr-tools-btn lcr-tools-btn-primary" id="${Dom.PIN_MODAL_SUBMIT_ID}" style="width: auto; margin: 0;">${copy.submit}</button>
      </div>
    </div>
  `;
}

/** Checks a PIN against the stored verification sentinel. */
async function isCorrectPin(pin: string): Promise<boolean> {
  const res = browser?.storage?.local
    ? await browser.storage.local.get(Constants.PIN_STORAGE_KEY)
    : {};
  const sentinel = res[Constants.PIN_STORAGE_KEY] as Types.EncryptedPayload | undefined;
  return sentinel ? verifyPin(pin, sentinel) : false;
}

/** Displays an error message banner on the Trip Planner PIN modal. */
function showPinError(element: HTMLElement | null, message: string): void {
  if (!element) return;
  element.textContent = message;
  element.style.display = message ? 'block' : 'none';
}
