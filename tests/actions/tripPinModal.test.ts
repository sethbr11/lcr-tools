import { describe, it, expect, beforeEach, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { Constants, Dom } from '@/actions/tripPlanning/types';
import * as utils from '@/utils';
import { showTripPinModal } from '@/actions/tripPlanning/ui/pinModalHelper';
import { updateProviderControls } from '@/actions/tripPlanning/ui/uiHelper';

describe('tripPinModalHelper and Trip Planner Autofill', () => {
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
      <div id="${Dom.API_KEY_ROW_ID}">
        <select id="${Dom.GEOCODE_PROVIDER_ID}">
          <option value="mapbox" selected>Mapbox</option>
          <option value="locationiq">LocationIQ</option>
          <option value="nominatim">Nominatim</option>
        </select>
        <input type="password" id="${Dom.API_KEY_ID}" value="" />
        <button type="button" id="${Dom.API_KEY_TOGGLE_ID}">Show</button>
        <button type="button" id="${Dom.API_KEY_AUTOFILL_BTN_ID}" style="display: none;">Autofill</button>
      </div>
      <input type="radio" name="${Dom.DISTANCE_METRIC_NAME}" value="straight" checked />
      <input type="radio" name="${Dom.DISTANCE_METRIC_NAME}" value="mapbox" id="${Dom.METRIC_MAPBOX_ID}" disabled />
      <button type="button" id="${Dom.METRIC_MAPBOX_AUTOFILL_BTN_ID}" style="display: none;">Autofill Key</button>
    `;

    await utils.lockSession();
  });

  describe('showTripPinModal', () => {
    it('renders the PIN unlock modal with header, description, and inputs', () => {
      showTripPinModal(vi.fn());

      const overlay = document.getElementById(Dom.TRIP_PIN_MODAL_OVERLAY_ID);
      expect(overlay).not.toBeNull();
      expect(overlay?.textContent).toContain(Constants.TRIP_PIN_MODAL_TITLE);
      expect(overlay?.textContent).toContain(Constants.TRIP_PIN_MODAL_DESC);

      const input = document.getElementById(Dom.TRIP_PIN_MODAL_INPUT_ID);
      expect(input).not.toBeNull();
    });

    it('rejects invalid PIN formats with an error banner', async () => {
      showTripPinModal(vi.fn());

      const input = document.getElementById(Dom.TRIP_PIN_MODAL_INPUT_ID) as HTMLInputElement;
      const submitBtn = document.getElementById(Dom.TRIP_PIN_MODAL_SUBMIT_ID) as HTMLButtonElement;
      const statusBanner = document.getElementById(Dom.TRIP_PIN_MODAL_STATUS_ID);

      input.value = '12';
      submitBtn.click();

      await vi.waitFor(() => {
        expect(statusBanner?.textContent).toBe(Constants.PIN_INVALID_LENGTH);
      });
    });

    it('rejects incorrect PINs when sentinel verification fails', async () => {
      const sentinel = await utils.createPinVerificationSentinel('1234');
      localStorageData[Constants.PIN_STORAGE_KEY] = sentinel;

      showTripPinModal(vi.fn());

      const input = document.getElementById(Dom.TRIP_PIN_MODAL_INPUT_ID) as HTMLInputElement;
      const submitBtn = document.getElementById(Dom.TRIP_PIN_MODAL_SUBMIT_ID) as HTMLButtonElement;
      const statusBanner = document.getElementById(Dom.TRIP_PIN_MODAL_STATUS_ID);

      input.value = '9999';
      submitBtn.click();

      await vi.waitFor(() => {
        expect(statusBanner?.textContent).toBe(Constants.PIN_INCORRECT);
      });
      expect(await utils.isSessionUnlocked()).toBe(false);
    });

    it('unlocks session, decrypts stored keys, invokes callback, and closes modal on valid PIN', async () => {
      const pin = '4321';
      const sentinel = await utils.createPinVerificationSentinel(pin);
      localStorageData[Constants.PIN_STORAGE_KEY] = sentinel;

      const encrypted = await utils.encryptData({ mapbox: 'secret-mb-token' }, pin);
      localStorageData[Constants.API_KEYS_STORAGE_KEY] = {
        ...encrypted,
        keyIds: ['mapbox'],
      };

      const onUnlocked = vi.fn();
      showTripPinModal(onUnlocked);

      const input = document.getElementById(Dom.TRIP_PIN_MODAL_INPUT_ID) as HTMLInputElement;
      const submitBtn = document.getElementById(Dom.TRIP_PIN_MODAL_SUBMIT_ID) as HTMLButtonElement;

      input.value = pin;
      submitBtn.click();

      await vi.waitFor(() => {
        expect(onUnlocked).toHaveBeenCalledWith({ mapbox: 'secret-mb-token' });
        expect(document.getElementById(Dom.TRIP_PIN_MODAL_OVERLAY_ID)).toBeNull();
      });
      expect(await utils.isSessionUnlocked()).toBe(true);
    });

    it('closes modal when Cancel button, Close button, or Escape key is pressed', () => {
      showTripPinModal(vi.fn());
      expect(document.getElementById(Dom.TRIP_PIN_MODAL_OVERLAY_ID)).not.toBeNull();

      document.getElementById(Dom.TRIP_PIN_MODAL_CANCEL_ID)?.click();
      expect(document.getElementById(Dom.TRIP_PIN_MODAL_OVERLAY_ID)).toBeNull();

      showTripPinModal(vi.fn());
      document.getElementById(Dom.TRIP_PIN_MODAL_CLOSE_ID)?.click();
      expect(document.getElementById(Dom.TRIP_PIN_MODAL_OVERLAY_ID)).toBeNull();

      showTripPinModal(vi.fn());
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(document.getElementById(Dom.TRIP_PIN_MODAL_OVERLAY_ID)).toBeNull();
    });
  });

  describe('updateProviderControls with Autofill buttons', () => {
    it('shows autofill button when Mapbox key is configured in encrypted storage and input is empty', async () => {
      localStorageData[Constants.API_KEYS_STORAGE_KEY] = {
        version: 1,
        salt: 'c2FsdA==',
        iv: 'aXY=',
        ciphertext: 'Y2lwaGVy',
        keyIds: ['mapbox'],
      };

      await updateProviderControls({});

      const autofillBtn = document.getElementById(Dom.API_KEY_AUTOFILL_BTN_ID);
      expect(autofillBtn?.style.display).toBe('inline-block');

      const metricAutofillBtn = document.getElementById(Dom.METRIC_MAPBOX_AUTOFILL_BTN_ID);
      expect(metricAutofillBtn?.style.display).toBe('inline-block');
    });

    it('hides autofill button when input already has a value', async () => {
      const apiKeyInput = document.getElementById(Dom.API_KEY_ID) as HTMLInputElement;
      apiKeyInput.value = 'typed-key';

      localStorageData[Constants.API_KEYS_STORAGE_KEY] = {
        version: 1,
        salt: 'c2FsdA==',
        iv: 'aXY=',
        ciphertext: 'Y2lwaGVy',
        keyIds: ['mapbox'],
      };

      await updateProviderControls({});

      const autofillBtn = document.getElementById(Dom.API_KEY_AUTOFILL_BTN_ID);
      expect(autofillBtn?.style.display).toBe('none');
    });

    it('hides autofill button when selected provider has no saved key in storage', async () => {
      const select = document.getElementById(Dom.GEOCODE_PROVIDER_ID) as HTMLSelectElement;
      select.value = 'locationiq';

      localStorageData[Constants.API_KEYS_STORAGE_KEY] = {
        version: 1,
        salt: 'c2FsdA==',
        iv: 'aXY=',
        ciphertext: 'Y2lwaGVy',
        keyIds: ['mapbox'],
      };

      await updateProviderControls({});

      const autofillBtn = document.getElementById(Dom.API_KEY_AUTOFILL_BTN_ID);
      expect(autofillBtn?.style.display).toBe('none');
    });
  });
});
