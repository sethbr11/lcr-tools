import { describe, it, expect, beforeEach, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { Constants, Dom } from '@/actions/tripPlanning/types';
import * as utils from '@/utils';
import {
  fillSavedApiKey,
  refreshApiKeySaveButton,
  setupApiKeyField,
} from '@/actions/tripPlanning/ui/apiKeyFieldHelper';
import { updateProviderControls } from '@/actions/tripPlanning/ui/uiHelper';

describe('Trip Planner API key box', () => {
  let local: Record<string, unknown> = {};
  let session: Record<string, unknown> = {};
  const input = () => document.getElementById(Dom.API_KEY_ID) as HTMLInputElement;
  const saveBtn = () => document.getElementById(Dom.API_KEY_SAVE_BTN_ID) as HTMLButtonElement;
  const type = (value: string) => {
    input().value = value;
    input().dispatchEvent(new Event('input'));
  };
  const pinField = (id: string) => document.getElementById(id) as HTMLInputElement;
  const submitPin = () =>
    (document.getElementById(Dom.PIN_MODAL_SUBMIT_ID) as HTMLButtonElement).click();

  beforeEach(async () => {
    local = {};
    session = {};
    vi.restoreAllMocks();
    vi.spyOn(browser.storage.local, 'get').mockImplementation(async (keys) =>
      typeof keys === 'string' ? { [keys]: local[keys] } : { ...local }
    );
    vi.spyOn(browser.storage.local, 'set').mockImplementation(async (items) => {
      Object.assign(local, items);
    });
    vi.spyOn(browser.storage.session, 'get').mockImplementation(async (keys) =>
      typeof keys === 'string' ? { [keys]: session[keys] } : { ...session }
    );
    vi.spyOn(browser.storage.session, 'set').mockImplementation(async (items) => {
      Object.assign(session, items);
    });
    vi.spyOn(browser.storage.session, 'remove').mockImplementation(async () => {
      session = {};
    });
    await utils.lockSession();

    document.body.innerHTML = `
      <select id="${Dom.GEOCODE_PROVIDER_ID}"><option value="locationiq" selected>LocationIQ</option></select>
      <div id="${Dom.API_KEY_ROW_ID}">
        <input type="password" id="${Dom.API_KEY_ID}" />
        <button type="button" id="${Dom.API_KEY_TOGGLE_ID}">Show</button>
        <button type="button" id="${Dom.API_KEY_AUTOFILL_BTN_ID}" style="display: none">Autofill</button>
        <button type="button" id="${Dom.API_KEY_SAVE_BTN_ID}" style="display: none">Save key</button>
      </div>`;
    setupApiKeyField(
      () => 'locationiq',
      () => void refreshApiKeySaveButton('locationiq')
    );
  });

  it('never fills a saved key into the box on its own', async () => {
    const pin = '1234';
    local[Constants.PIN_STORAGE_KEY] = await utils.createPinVerificationSentinel(pin);
    await utils.setUnlockedPin(pin);
    await utils.saveApiKey('locationiq', 'saved-key');

    await updateProviderControls(await utils.getStoredApiKeys());

    expect(input().value).toBe('');
    expect(document.getElementById(Dom.API_KEY_AUTOFILL_BTN_ID)?.style.display).toBe(
      'inline-block'
    );
  });

  it('does not save a typed key until Save is clicked, then requires creating a PIN', async () => {
    type('typed-key');
    await vi.waitFor(() => expect(saveBtn().style.display).toBe('inline-block'));
    expect(saveBtn().textContent).toBe(Constants.TRIP_KEY_SAVE_LABEL);
    expect(local[Constants.API_KEYS_STORAGE_KEY]).toBeUndefined();

    saveBtn().click();
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain(Constants.TRIP_PIN_SETUP_TITLE)
    );
    pinField(Dom.PIN_MODAL_INPUT_ID).value = '2468';
    pinField(Dom.PIN_MODAL_CONFIRM_INPUT_ID).value = '2468';
    submitPin();

    await vi.waitFor(async () =>
      expect(await utils.getStoredApiKeys()).toEqual({ locationiq: 'typed-key' })
    );
    const stored = local[Constants.API_KEYS_STORAGE_KEY] as Record<string, unknown>;
    expect(stored.locationiq).toBeUndefined();
    expect(saveBtn().style.display).toBe('none');
  });

  it('offers Replace (with confirmation) when a key is already saved, without comparing keys', async () => {
    const pin = '1234';
    local[Constants.PIN_STORAGE_KEY] = await utils.createPinVerificationSentinel(pin);
    await utils.setUnlockedPin(pin);
    await utils.saveApiKey('locationiq', 'old-key');

    type('old-key');
    await vi.waitFor(() => expect(saveBtn().textContent).toBe(Constants.TRIP_KEY_REPLACE_LABEL));

    type('new-key');
    saveBtn().click();
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain(Constants.TRIP_KEY_REPLACE_TITLE)
    );
    document.querySelector<HTMLButtonElement>('#lcr-tools-confirm-btn')?.click();

    await vi.waitFor(async () =>
      expect(await utils.getStoredApiKeys()).toEqual({ locationiq: 'new-key' })
    );
  });

  it('hides Save for an autofilled key, and asks for the PIN before showing it', async () => {
    local[Constants.PIN_STORAGE_KEY] = await utils.createPinVerificationSentinel('1234');
    fillSavedApiKey('saved-key');
    await refreshApiKeySaveButton('locationiq');
    expect(saveBtn().style.display).toBe('none');

    document.getElementById(Dom.API_KEY_TOGGLE_ID)?.click();
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain(Constants.TRIP_PIN_VERIFY_TITLE)
    );
    expect(input().type).toBe('password');
    pinField(Dom.PIN_MODAL_INPUT_ID).value = '1234';
    submitPin();
    await vi.waitFor(() => expect(input().type).toBe('text'));
  });

  it('shows a typed key without asking for the PIN', () => {
    type('typed-key');
    document.getElementById(Dom.API_KEY_TOGGLE_ID)?.click();
    return vi.waitFor(() => expect(input().type).toBe('text'));
  });
});
