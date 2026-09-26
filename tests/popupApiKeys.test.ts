import { describe, it, expect, beforeEach, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { Constants, Dom } from '@/types';
import * as utils from '@/utils';
import { renderApiKeysList, setupApiKeysManager } from '@/entrypoints/popup/popupApiKeysHelper';

describe('popupApiKeysHelper', () => {
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
      <span id="${Dom.API_KEYS_DESCRIPTION_ID}"></span>
      <button id="${Dom.API_KEYS_BUTTON_ID}" type="button">Manage API Keys</button>
      <button id="${Dom.API_KEYS_BACK_BUTTON_ID}" type="button">Back</button>
      <div id="${Dom.API_KEYS_LIST_ID}"></div>
      <div id="${Dom.API_KEYS_STATUS_ID}"></div>
      <div id="${Dom.PIN_VIEW_ID}" style="display: none;">
        <button id="${Dom.PIN_BACK_BTN_ID}" type="button">Back</button>
        <div id="${Dom.PIN_TITLE_ID}"></div>
        <div id="${Dom.PIN_DESCRIPTION_ID}"></div>
        <div id="${Dom.PIN_STATUS_ID}"></div>
        <input id="${Dom.PIN_INPUT_ID}" />
        <div id="${Dom.PIN_CONFIRM_CONTAINER_ID}" style="display: none;">
          <input id="${Dom.PIN_CONFIRM_INPUT_ID}" />
        </div>
        <button id="${Dom.PIN_SUBMIT_BTN_ID}" type="button">Submit</button>
        <button id="${Dom.PIN_RESET_BTN_ID}" type="button">Reset</button>
      </div>
      <div id="${Dom.LOCK_SESSION_CONTAINER_ID}" style="display: none;">
        <button id="${Dom.LOCK_SESSION_BTN_ID}" type="button">Lock Session</button>
      </div>
    `;

    await utils.lockSession();
  });

  it('enables the manager on non-LCR hosts and routes to pinPrompt', async () => {
    const switchView = vi.fn();
    setupApiKeysManager('https://google.com', switchView);

    const btn = document.getElementById(Dom.API_KEYS_BUTTON_ID) as HTMLButtonElement;
    const desc = document.getElementById(Dom.API_KEYS_DESCRIPTION_ID);

    expect(btn.disabled).toBe(false);
    expect(btn.title).toBe(Constants.API_KEYS_MANAGE_TITLE);
    expect(desc?.textContent).toBe(Constants.API_KEYS_DESCRIPTION);

    btn.click();
    await vi.waitFor(() => {
      expect(switchView).toHaveBeenCalledWith('pinPrompt');
    });
  });

  it('routes to pinPrompt in setup mode when no PIN is configured on LCR host', async () => {
    const switchView = vi.fn();
    setupApiKeysManager('https://lcr.churchofjesuschrist.org/report', switchView);

    const btn = document.getElementById(Dom.API_KEYS_BUTTON_ID) as HTMLButtonElement;
    btn.click();

    await vi.waitFor(() => {
      expect(switchView).toHaveBeenCalledWith('pinPrompt');
      expect(document.getElementById(Dom.PIN_TITLE_ID)?.textContent).toBe(
        Constants.PIN_SETUP_TITLE
      );
      expect(document.getElementById(Dom.PIN_CONFIRM_CONTAINER_ID)?.style.display).toBe('block');
    });
  });

  it('routes to pinPrompt in unlock mode when PIN is configured but session is locked', async () => {
    const sentinel = await utils.createPinVerificationSentinel('1234');
    localStorageData[Constants.PIN_STORAGE_KEY] = sentinel;

    const switchView = vi.fn();
    setupApiKeysManager('https://lcr.churchofjesuschrist.org/report', switchView);

    const btn = document.getElementById(Dom.API_KEYS_BUTTON_ID) as HTMLButtonElement;
    btn.click();

    await vi.waitFor(() => {
      expect(switchView).toHaveBeenCalledWith('pinPrompt');
      expect(document.getElementById(Dom.PIN_TITLE_ID)?.textContent).toBe(
        Constants.PIN_UNLOCK_TITLE
      );
      expect(document.getElementById(Dom.PIN_CONFIRM_CONTAINER_ID)?.style.display).toBe('none');
    });
  });

  it('renders catalog rows with masked values and toggles visibility when unlocked', async () => {
    const sentinel = await utils.createPinVerificationSentinel('1234');
    localStorageData[Constants.PIN_STORAGE_KEY] = sentinel;
    await utils.setUnlockedPin('1234');

    const encryptedKeys = await utils.encryptData({ mapbox: 'mb-secret-token' }, '1234');
    localStorageData[Constants.API_KEYS_STORAGE_KEY] = encryptedKeys;

    const switchView = vi.fn(async (view: string) => {
      if (view === 'apiKeys') {
        await renderApiKeysList('https://lcr.churchofjesuschrist.org/report');
      }
    });

    setupApiKeysManager('https://lcr.churchofjesuschrist.org/report', switchView);

    const btn = document.getElementById(Dom.API_KEYS_BUTTON_ID) as HTMLButtonElement;
    btn.click();

    await vi.waitFor(() => {
      expect(switchView).toHaveBeenCalledWith('apiKeys');
      expect(document.querySelectorAll(`.${Dom.API_KEYS_ROW_CLASS}`).length).toBe(
        Constants.API_KEY_CATALOG.length
      );
    });

    const input = document.querySelector<HTMLInputElement>(`.${Dom.API_KEYS_INPUT_CLASS}`);
    const toggle = document.querySelector<HTMLButtonElement>(`.${Dom.API_KEYS_TOGGLE_CLASS}`);
    expect(input?.type).toBe('password');
    expect(input?.value).toBe('mb-secret-token');

    toggle?.click();
    expect(input?.type).toBe('text');
    expect(toggle?.textContent).toBe(Constants.API_KEYS_HIDE_LABEL);

    toggle?.click();
    expect(input?.type).toBe('password');
    expect(toggle?.textContent).toBe(Constants.API_KEYS_SHOW_LABEL);
  });

  it('navigates back to settings when back button is clicked', () => {
    const switchView = vi.fn();
    setupApiKeysManager('https://lcr.churchofjesuschrist.org/report', switchView);
    document.getElementById(Dom.API_KEYS_BACK_BUTTON_ID)?.click();
    expect(switchView).toHaveBeenCalledWith('settings');
  });

  it('saves and clears API keys via catalog row actions', async () => {
    const sentinel = await utils.createPinVerificationSentinel('1234');
    localStorageData[Constants.PIN_STORAGE_KEY] = sentinel;
    await utils.setUnlockedPin('1234');

    await renderApiKeysList('https://lcr.churchofjesuschrist.org/report');

    const row = document.querySelector(`[${Dom.API_KEYS_ID_ATTR}="mapbox"]`) as HTMLElement;
    const input = row.querySelector<HTMLInputElement>(`.${Dom.API_KEYS_INPUT_CLASS}`);
    const saveBtn = row.querySelector<HTMLButtonElement>(`.${Dom.API_KEYS_SAVE_CLASS}`);
    const clearBtn = row.querySelector<HTMLButtonElement>(`.${Dom.API_KEYS_CLEAR_CLASS}`);

    if (input) input.value = 'new-mb-token';
    saveBtn?.click();

    await vi.waitFor(async () => {
      const stored = await utils.getStoredApiKeys();
      expect(stored.mapbox).toBe('new-mb-token');
    });

    clearBtn?.click();

    await vi.waitFor(async () => {
      const stored = await utils.getStoredApiKeys();
      expect(stored.mapbox).toBeUndefined();
      expect(input?.value).toBe('');
    });
  });
});
