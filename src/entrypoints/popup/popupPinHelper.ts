import { browser } from 'wxt/browser';
import { Constants, Dom, Types } from '@/types';
import {
  clearSecurityData,
  createPinVerificationSentinel,
  hasSecurityPin,
  isSessionUnlocked,
  lockSession,
  setUnlockedPin,
  validatePinFormat,
  verifyPin,
} from '@/utils/security/cryptoUtils';
import { migrateApiKeysToEncryption } from '@/utils/security/apiKeyStorageUtils';
import { migrateNicknamesToEncryption } from '@/utils/security/storageUtils';
import { showStatusMessage } from './popupActionHelper';

/** Active target view after PIN is validated or created. */
let pendingTargetView: Types.PinProtectedView = 'aliases';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Initializes the PIN authentication screen, binds submission actions, and sets up session lock button.
 *
 * @param switchView - Popup view navigator used to switch between screens.
 */
export function setupPinManager(switchView: (target: Types.PopupView) => void): void {
  const submitBtn = document.getElementById(Dom.PIN_SUBMIT_BTN_ID) as HTMLButtonElement | null;
  const backBtn = document.getElementById(Dom.PIN_BACK_BTN_ID) as HTMLButtonElement | null;
  const resetBtn = document.getElementById(Dom.PIN_RESET_BTN_ID) as HTMLButtonElement | null;
  const lockBtn = document.getElementById(Dom.LOCK_SESSION_BTN_ID) as HTMLButtonElement | null;

  submitBtn?.addEventListener('click', async () => {
    await handlePinSubmit(switchView);
  });

  document.getElementById(Dom.PIN_INPUT_ID)?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      await handlePinSubmit(switchView);
    }
  });

  document.getElementById(Dom.PIN_CONFIRM_INPUT_ID)?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      await handlePinSubmit(switchView);
    }
  });

  backBtn?.addEventListener('click', () => {
    clearPinInputs();
    switchView('settings');
  });

  resetBtn?.addEventListener('click', async () => {
    await handlePinReset(switchView);
  });

  lockBtn?.addEventListener('click', async () => {
    await lockSession();
    await updateLockSessionCard();
    showStatusMessage('Session locked.');
  });

  void updateLockSessionCard();
}

/**
 * Inspects security PIN status and navigates to the target view directly or prompts for PIN entry.
 *
 * @param target - Protected destination view ('aliases' or 'apiKeys').
 * @param currentTabUrl - Absolute URL of active tab to confirm LCR authorization.
 * @param switchView - Popup view navigator used to change screens.
 */
export async function openPinProtectedView(
  target: Types.PinProtectedView,
  _currentTabUrl: string,
  switchView: (target: Types.PopupView) => void
): Promise<void> {
  pendingTargetView = target;
  const pinConfigured = await hasSecurityPin();

  if (!pinConfigured) {
    showPinPrompt('setup', switchView);
    return;
  }

  const unlocked = await isSessionUnlocked();
  if (unlocked) {
    switchView(target);
    return;
  }

  showPinPrompt('unlock', switchView);
}

/**
 * Updates the visibility of the manual Lock Session button card in More settings.
 */
export async function updateLockSessionCard(): Promise<void> {
  const container = document.getElementById(Dom.LOCK_SESSION_CONTAINER_ID);
  if (!container) return;

  const pinSet = await hasSecurityPin();
  const unlocked = await isSessionUnlocked();
  container.style.display = pinSet && unlocked ? 'flex' : 'none';
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Configures PIN prompt DOM elements for either setup or unlock mode and opens the view. */
function showPinPrompt(
  mode: Types.PinPromptMode,
  switchView: (target: Types.PopupView) => void
): void {
  clearPinInputs();
  const title = document.getElementById(Dom.PIN_TITLE_ID);
  const desc = document.getElementById(Dom.PIN_DESCRIPTION_ID);
  const confirmBox = document.getElementById(Dom.PIN_CONFIRM_CONTAINER_ID);
  const submitBtn = document.getElementById(Dom.PIN_SUBMIT_BTN_ID) as HTMLButtonElement | null;
  const resetBtn = document.getElementById(Dom.PIN_RESET_BTN_ID) as HTMLButtonElement | null;

  if (title)
    title.textContent = mode === 'setup' ? Constants.PIN_SETUP_TITLE : Constants.PIN_UNLOCK_TITLE;
  if (desc)
    desc.textContent = mode === 'setup' ? Constants.PIN_SETUP_DESC : Constants.PIN_UNLOCK_DESC;
  if (confirmBox) confirmBox.style.display = mode === 'setup' ? 'block' : 'none';
  if (submitBtn) submitBtn.textContent = mode === 'setup' ? 'Save PIN' : 'Unlock';
  if (resetBtn) resetBtn.style.display = mode === 'setup' ? 'none' : 'block';

  switchView('pinPrompt');
  const input = document.getElementById(Dom.PIN_INPUT_ID) as HTMLInputElement | null;
  input?.focus();
}

/** Handles PIN submission for either establishing a new PIN or unlocking existing secrets. */
async function handlePinSubmit(switchView: (target: Types.PopupView) => void): Promise<void> {
  const input = document.getElementById(Dom.PIN_INPUT_ID) as HTMLInputElement | null;
  const confirmInput = document.getElementById(Dom.PIN_CONFIRM_INPUT_ID) as HTMLInputElement | null;
  const pin = (input?.value || '').trim();

  if (!validatePinFormat(pin)) {
    setPinStatus(Constants.PIN_INVALID_LENGTH, true);
    input?.focus();
    return;
  }

  const pinSet = await hasSecurityPin();

  if (!pinSet) {
    const confirmPin = (confirmInput?.value || '').trim();
    if (pin !== confirmPin) {
      setPinStatus(Constants.PIN_MISMATCH, true);
      confirmInput?.focus();
      return;
    }

    const sentinel = await createPinVerificationSentinel(pin);
    if (browser?.storage?.local) {
      await browser.storage.local.set({ [Constants.PIN_STORAGE_KEY]: sentinel });
    }
    await migrateApiKeysToEncryption(pin);
    await migrateNicknamesToEncryption(pin);
    await setUnlockedPin(pin);
    await updateLockSessionCard();
    clearPinInputs();
    switchView(pendingTargetView);
    return;
  }

  const res = await browser.storage.local.get(Constants.PIN_STORAGE_KEY);
  const sentinel = res[Constants.PIN_STORAGE_KEY] as Types.EncryptedPayload;
  const valid = await verifyPin(pin, sentinel);

  if (!valid) {
    setPinStatus(Constants.PIN_INCORRECT, true);
    input?.focus();
    return;
  }

  await setUnlockedPin(pin);
  await updateLockSessionCard();
  clearPinInputs();
  switchView(pendingTargetView);
}

/** Confirms with user and wipes all encrypted credentials and security PIN. */
async function handlePinReset(switchView: (target: Types.PopupView) => void): Promise<void> {
  // eslint-disable-next-line no-alert
  const confirmed = window.confirm(Constants.PIN_RESET_CONFIRM);
  if (!confirmed) return;

  await clearSecurityData();
  await updateLockSessionCard();
  clearPinInputs();
  switchView('settings');
  showStatusMessage(Constants.PIN_RESET_SUCCESS);
}

/** Clears all text from the PIN inputs and dismisses error status banners. */
function clearPinInputs(): void {
  const input = document.getElementById(Dom.PIN_INPUT_ID) as HTMLInputElement | null;
  const confirmInput = document.getElementById(Dom.PIN_CONFIRM_INPUT_ID) as HTMLInputElement | null;
  if (input) input.value = '';
  if (confirmInput) confirmInput.value = '';
  setPinStatus('');
}

/** Displays or clears error status messages on the PIN view. */
function setPinStatus(message: string, isError: boolean = false): void {
  const el = document.getElementById(Dom.PIN_STATUS_ID);
  if (!el) return;
  el.textContent = message;
  el.style.display = message ? 'block' : 'none';
  el.className = message ? `status-banner ${isError ? 'error' : 'success'} show` : 'status-banner';
}
