import {
  hasSecurityPin,
  hasStoredApiKey,
  isSessionUnlocked,
  saveApiKey,
  showConfirmationModal,
  showToast,
} from '../utils';
import { Constants, Dom, Types } from '../types';
import { requestTripPin } from './pinModalHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Wires the planner API key box: typing marks the key as the user's own, Show reveals typed keys
 * freely but asks for the PIN before revealing an autofilled (saved) key, and Save stores the key
 * only when clicked, creating or unlocking the PIN first.
 *
 * @param getKeyId - Returns the catalog key for the selected provider, or null for keyless ones.
 * @param onChange - Called after the field changes or a key is saved, to refresh dependent controls.
 */
export function setupApiKeyField(
  getKeyId: () => Types.KnownApiKeyId | null,
  onChange: () => void
): void {
  const input = getKeyInput();
  const toggle = document.getElementById(Dom.API_KEY_TOGGLE_ID);
  input?.addEventListener('input', () => {
    input.removeAttribute(Dom.API_KEY_SOURCE_ATTR);
    onChange();
  });

  toggle?.addEventListener('click', () => {
    void toggleKeyVisibility();
  });

  document.getElementById(Dom.API_KEY_SAVE_BTN_ID)?.addEventListener('click', () => {
    const keyId = getKeyId();
    if (keyId) void savePlannerApiKey(keyId).then(onChange);
  });
}

/**
 * Puts a key from saved settings into the box, masked and without a Save button.
 *
 * @param value - Decrypted saved key.
 */
export function fillSavedApiKey(value: string): void {
  const input = getKeyInput();
  if (!input) return;
  input.value = value;
  input.setAttribute(Dom.API_KEY_SOURCE_ATTR, Dom.API_KEY_SOURCE_SAVED);
  setMasked(input, true);
}

/**
 * Shows the Save button only for a key the user typed, labelled Replace when a key is already
 * saved for this service. It never compares the typed key with the saved one.
 *
 * @param keyId - Catalog key for the selected provider, or null for keyless providers.
 */
export async function refreshApiKeySaveButton(keyId: Types.KnownApiKeyId | null): Promise<void> {
  const button = document.getElementById(Dom.API_KEY_SAVE_BTN_ID);
  const input = getKeyInput();
  if (!button || !input) return;
  const typed = Boolean(input.value.trim()) && !isAutofilled(input);
  if (!keyId || !typed) {
    button.style.display = 'none';
    return;
  }
  button.textContent = (await hasStoredApiKey(keyId))
    ? Constants.TRIP_KEY_REPLACE_LABEL
    : Constants.TRIP_KEY_SAVE_LABEL;
  button.style.display = 'inline-block';
}

/**
 * Saves the typed key after the user clicked Save: creates a PIN if none exists, unlocks a
 * locked session, and confirms before replacing an already-saved key. The key is stored
 * encrypted, and the box then behaves like an autofilled key.
 *
 * @param keyId - Catalog key to save under.
 * @returns True when the key was saved.
 */
export async function savePlannerApiKey(keyId: Types.KnownApiKeyId): Promise<boolean> {
  const input = getKeyInput();
  const value = input?.value.trim() || '';
  if (!input || !value) return false;

  if (!(await hasSecurityPin())) {
    if (!(await requestTripPin('setup'))) return false;
  } else if (!(await isSessionUnlocked())) {
    if (!(await requestTripPin('save'))) return false;
  }

  if (await hasStoredApiKey(keyId)) {
    const replace = await showConfirmationModal({
      title: Constants.TRIP_KEY_REPLACE_TITLE,
      message: Constants.TRIP_KEY_REPLACE_MESSAGE,
      confirmText: Constants.TRIP_KEY_REPLACE_LABEL,
      cancelText: Constants.CONFIRM_CANCEL_TEXT,
      confirmColor: 'danger',
    });
    if (!replace) return false;
  }

  if (!(await saveApiKey(keyId, value))) {
    showToast(Constants.TRIP_KEY_SAVE_FAILED_TOAST, { type: 'error' });
    return false;
  }
  fillSavedApiKey(value);
  showToast(Constants.TRIP_KEY_SAVED_TOAST, { type: 'success' });
  return true;
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Toggles masking; revealing an autofilled (saved) key asks for the PIN every time. */
async function toggleKeyVisibility(): Promise<void> {
  const input = getKeyInput();
  if (!input) return;
  const reveal = input.type === 'password';
  if (reveal && isAutofilled(input) && !(await requestTripPin('verify'))) return;
  setMasked(input, !reveal);
}

/** Masks or reveals the key input and updates the Show/Hide label. */
function setMasked(input: HTMLInputElement, masked: boolean): void {
  input.type = masked ? 'password' : 'text';
  const toggle = document.getElementById(Dom.API_KEY_TOGGLE_ID);
  if (toggle) {
    toggle.textContent = masked ? Constants.API_KEYS_SHOW_LABEL : Constants.API_KEYS_HIDE_LABEL;
  }
}

/** True when the key box holds a key autofilled from saved settings (not edited since). */
function isAutofilled(input: HTMLInputElement): boolean {
  return input.getAttribute(Dom.API_KEY_SOURCE_ATTR) === Dom.API_KEY_SOURCE_SAVED;
}

/** Returns the planner API key input element. */
function getKeyInput(): HTMLInputElement | null {
  return document.getElementById(Dom.API_KEY_ID) as HTMLInputElement | null;
}
