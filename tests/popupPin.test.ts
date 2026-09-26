import { describe, it, expect, beforeEach, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { Constants, Dom } from '@/types';
import * as utils from '@/utils';
import {
  openPinProtectedView,
  setupPinManager,
  updateLockSessionCard,
} from '@/entrypoints/popup/popupPinHelper';

describe('popupPinHelper', () => {
  let localStorageData: Record<string, unknown> = {};
  let sessionStorageData: Record<string, unknown> = {};

  beforeEach(async () => {
    localStorageData = {};
    sessionStorageData = {};
    vi.restoreAllMocks();

    vi.spyOn(browser.storage.local, 'get').mockImplementation(async (keys) => {
      if (typeof keys === 'string') return { [keys]: localStorageData[keys] };
      if (Array.isArray(keys)) {
        const result: Record<string, unknown> = {};
        for (const k of keys) result[k] = localStorageData[k];
        return result;
      }
      return { ...localStorageData };
    });

    vi.spyOn(browser.storage.local, 'set').mockImplementation(async (items) => {
      Object.assign(localStorageData, items);
    });

    vi.spyOn(browser.storage.local, 'remove').mockImplementation(async (keys) => {
      const arr = Array.isArray(keys) ? keys : [keys];
      for (const k of arr) delete localStorageData[k];
    });

    vi.spyOn(browser.storage.session, 'get').mockImplementation(async (keys) => {
      if (typeof keys === 'string') return { [keys]: sessionStorageData[keys] };
      return { ...sessionStorageData };
    });

    vi.spyOn(browser.storage.session, 'set').mockImplementation(async (items) => {
      Object.assign(sessionStorageData, items);
    });

    vi.spyOn(browser.storage.session, 'remove').mockImplementation(async (keys) => {
      const arr = Array.isArray(keys) ? keys : [keys];
      for (const k of arr) delete sessionStorageData[k];
    });

    document.body.innerHTML = `
      <div id="${Dom.PIN_VIEW_ID}">
        <div id="${Dom.PIN_TITLE_ID}"></div>
        <div id="${Dom.PIN_DESCRIPTION_ID}"></div>
        <div id="${Dom.PIN_STATUS_ID}" style="display: none;"></div>
        <input id="${Dom.PIN_INPUT_ID}" type="password" />
        <div id="${Dom.PIN_CONFIRM_CONTAINER_ID}" style="display: none;">
          <input id="${Dom.PIN_CONFIRM_INPUT_ID}" type="password" />
        </div>
        <button id="${Dom.PIN_SUBMIT_BTN_ID}" type="button">Submit</button>
        <button id="${Dom.PIN_BACK_BTN_ID}" type="button">Back</button>
        <button id="${Dom.PIN_RESET_BTN_ID}" type="button">Reset</button>
      </div>
      <div id="${Dom.LOCK_SESSION_CONTAINER_ID}" style="display: none;">
        <button id="${Dom.LOCK_SESSION_BTN_ID}" type="button">Lock Session</button>
      </div>
    `;

    await utils.lockSession();
  });

  it('allows openPinProtectedView off Church LCR hosts', async () => {
    const switchView = vi.fn();
    await openPinProtectedView('aliases', 'https://google.com', switchView);
    expect(switchView).toHaveBeenCalledWith('pinPrompt');
  });

  it('navigates directly to protected view when session is already unlocked', async () => {
    const sentinel = await utils.createPinVerificationSentinel('1234');
    localStorageData[Constants.PIN_STORAGE_KEY] = sentinel;
    await utils.setUnlockedPin('1234');

    const switchView = vi.fn();
    await openPinProtectedView('apiKeys', 'https://lcr.churchofjesuschrist.org/report', switchView);

    expect(switchView).toHaveBeenCalledWith('apiKeys');
  });

  it('handles PIN setup validation and saves sentinel on match', async () => {
    const switchView = vi.fn();
    setupPinManager(switchView);

    await openPinProtectedView('aliases', 'https://lcr.churchofjesuschrist.org/report', switchView);
    expect(switchView).toHaveBeenCalledWith('pinPrompt');

    const pinInput = document.getElementById(Dom.PIN_INPUT_ID) as HTMLInputElement;
    const confirmInput = document.getElementById(Dom.PIN_CONFIRM_INPUT_ID) as HTMLInputElement;
    const submitBtn = document.getElementById(Dom.PIN_SUBMIT_BTN_ID) as HTMLButtonElement;
    const statusMsg = document.getElementById(Dom.PIN_STATUS_ID);

    pinInput.value = '12';
    submitBtn.click();
    await vi.waitFor(() => {
      expect(statusMsg?.textContent).toBe(Constants.PIN_INVALID_LENGTH);
    });

    pinInput.value = '1234';
    confirmInput.value = '9999';
    submitBtn.click();
    await vi.waitFor(() => {
      expect(statusMsg?.textContent).toBe(Constants.PIN_MISMATCH);
    });

    confirmInput.value = '1234';
    submitBtn.click();
    await vi.waitFor(() => {
      expect(switchView).toHaveBeenCalledWith('aliases');
      expect(localStorageData[Constants.PIN_STORAGE_KEY]).toBeTruthy();
    });
    expect(await utils.isSessionUnlocked()).toBe(true);
  });

  it('handles PIN unlock flow and rejects incorrect PINs', async () => {
    const sentinel = await utils.createPinVerificationSentinel('5678');
    localStorageData[Constants.PIN_STORAGE_KEY] = sentinel;

    const switchView = vi.fn();
    setupPinManager(switchView);

    await openPinProtectedView('apiKeys', 'https://lcr.churchofjesuschrist.org/report', switchView);
    expect(switchView).toHaveBeenCalledWith('pinPrompt');

    const pinInput = document.getElementById(Dom.PIN_INPUT_ID) as HTMLInputElement;
    const submitBtn = document.getElementById(Dom.PIN_SUBMIT_BTN_ID) as HTMLButtonElement;
    const statusMsg = document.getElementById(Dom.PIN_STATUS_ID);

    pinInput.value = '0000';
    submitBtn.click();
    await vi.waitFor(() => {
      expect(statusMsg?.textContent).toBe(Constants.PIN_INCORRECT);
      expect(statusMsg?.className).toContain('status-banner error show');
    });

    pinInput.value = '5678';
    submitBtn.click();
    await vi.waitFor(() => {
      expect(switchView).toHaveBeenCalledWith('apiKeys');
      expect(statusMsg?.className).toBe('status-banner');
      expect(statusMsg?.style.display).toBe('none');
    });
    expect(await utils.isSessionUnlocked()).toBe(true);
  });

  it('submits PIN on Enter key in inputs', async () => {
    const sentinel = await utils.createPinVerificationSentinel('2468');
    localStorageData[Constants.PIN_STORAGE_KEY] = sentinel;

    const switchView = vi.fn();
    setupPinManager(switchView);
    await openPinProtectedView('aliases', 'https://lcr.churchofjesuschrist.org/report', switchView);

    const pinInput = document.getElementById(Dom.PIN_INPUT_ID) as HTMLInputElement;
    pinInput.value = '2468';
    pinInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    await vi.waitFor(() => {
      expect(switchView).toHaveBeenCalledWith('aliases');
    });
  });

  it('handles reset PIN confirmation and cancellation', async () => {
    const sentinel = await utils.createPinVerificationSentinel('1111');
    localStorageData[Constants.PIN_STORAGE_KEY] = sentinel;
    localStorageData[Constants.API_KEYS_STORAGE_KEY] = { mapbox: 'token' };
    await utils.setUnlockedPin('1111');

    const switchView = vi.fn();
    setupPinManager(switchView);

    const resetBtn = document.getElementById(Dom.PIN_RESET_BTN_ID) as HTMLButtonElement;

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    resetBtn.click();
    expect(localStorageData[Constants.PIN_STORAGE_KEY]).toBeTruthy();
    expect(switchView).not.toHaveBeenCalledWith('settings');

    confirmSpy.mockReturnValue(true);
    resetBtn.click();
    await vi.waitFor(() => {
      expect(switchView).toHaveBeenCalledWith('settings');
      expect(localStorageData[Constants.PIN_STORAGE_KEY]).toBeUndefined();
      expect(localStorageData[Constants.API_KEYS_STORAGE_KEY]).toBeUndefined();
    });
    expect(await utils.isSessionUnlocked()).toBe(false);
  });

  it('locks session when Lock Session button is clicked and toggles card visibility', async () => {
    const sentinel = await utils.createPinVerificationSentinel('4321');
    localStorageData[Constants.PIN_STORAGE_KEY] = sentinel;
    await utils.setUnlockedPin('4321');

    const switchView = vi.fn();
    setupPinManager(switchView);

    const lockContainer = document.getElementById(Dom.LOCK_SESSION_CONTAINER_ID);
    const lockBtn = document.getElementById(Dom.LOCK_SESSION_BTN_ID) as HTMLButtonElement;

    await updateLockSessionCard();
    expect(lockContainer?.style.display).toBe('flex');

    lockBtn.click();
    await vi.waitFor(async () => {
      expect(await utils.isSessionUnlocked()).toBe(false);
      expect(lockContainer?.style.display).toBe('none');
    });
  });

  it('navigates back to settings when back button is clicked and clears inputs', () => {
    const switchView = vi.fn();
    setupPinManager(switchView);

    const pinInput = document.getElementById(Dom.PIN_INPUT_ID) as HTMLInputElement;
    pinInput.value = '1234';

    document.getElementById(Dom.PIN_BACK_BTN_ID)?.click();
    expect(switchView).toHaveBeenCalledWith('settings');
    expect(pinInput.value).toBe('');
  });
});
