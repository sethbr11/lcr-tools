/**
 * Unit test suite for Auto-Sync State Dropdown action and helpers.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runAutoSyncStateDropdown } from '@/actions/autoSyncStateDropdown';
import {
  findStateSelectElements,
  isAddressLoading,
  isSelectInteractable,
  isStateSelect,
  logSyncMessage,
} from '@/actions/autoSyncStateDropdown/stateDropdownDiscoveryHelper';
import {
  setupAddressInputListeners,
  startStateDropdownWatcher,
  syncAllStateSelects,
  syncStateSelect,
} from '@/actions/autoSyncStateDropdown/stateDropdownHelper';
import { Dom } from '@/types';

describe('autoSyncStateDropdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('isAddressLoading', () => {
    it('returns true when a spinner element is detected in address container', () => {
      document.body.innerHTML = `
        <div class="address-group__styled-label">
          <div class="eden-spinner"></div>
        </div>
      `;
      expect(isAddressLoading(document.body)).toBe(true);
    });

    it('returns false when no loading indicators are present', () => {
      document.body.innerHTML = '<div class="address-container"><input name="street1" /></div>';
      expect(isAddressLoading(document.body)).toBe(false);
    });
  });

  describe('isSelectInteractable', () => {
    it('returns false when the select element is disabled', () => {
      const select = document.createElement('select');
      select.disabled = true;
      select.innerHTML = '<option value="1">AL</option><option value="44" selected>UT</option>';
      select.value = '44';
      expect(isSelectInteractable(select)).toBe(false);
    });

    it('returns false when parent container has an active spinner', () => {
      document.body.innerHTML = `
        <div class="eden-form-part-form-field">
          <div class="eden-spinner"></div>
          <select id="stateSelect">
            <option value="1">AL</option>
            <option value="44" selected>UT</option>
          </select>
        </div>
      `;
      const select = document.getElementById('stateSelect') as HTMLSelectElement;
      select.value = '44';
      expect(isSelectInteractable(select)).toBe(false);
    });

    it('returns false when options are not yet populated', () => {
      const select = document.createElement('select');
      select.innerHTML = '<option value="">- Select One -</option>';
      select.value = '';
      expect(isSelectInteractable(select)).toBe(false);
    });

    it('returns true when select is enabled, options populated, and value set', () => {
      const select = document.createElement('select');
      select.innerHTML = '<option value="1">AL</option><option value="44" selected>UT</option>';
      select.value = '44';
      expect(isSelectInteractable(select)).toBe(true);
    });
  });

  describe('isStateSelect', () => {
    it('returns true when name is stateProvinceId', () => {
      const select = document.createElement('select');
      select.name = Dom.STATE_PROVINCE_ID_NAME;
      expect(isStateSelect(select)).toBe(true);
    });

    it('returns true when name or id contains state or province', () => {
      const select1 = document.createElement('select');
      select1.name = 'residential_state';
      expect(isStateSelect(select1)).toBe(true);

      const select2 = document.createElement('select');
      select2.id = 'addressProvinceDropdown';
      expect(isStateSelect(select2)).toBe(true);
    });

    it('returns true when options include full state names like Utah', () => {
      const select = document.createElement('select');
      select.name = 'regionField';
      select.innerHTML = '<option value="">- Select -</option><option value="44">Utah</option>';
      expect(isStateSelect(select)).toBe(true);
    });

    it('returns true when sibling label in eden form field contains State', () => {
      const formField = document.createElement('div');
      formField.className = 'eden-form-part-form-field';
      formField.innerHTML = `
        <label class="eden-form-part-label">State / Province</label>
        <span class="eden-form-part-input"><select id="_r_xyz_"></select></span>
      `;
      document.body.appendChild(formField);
      const select = formField.querySelector('select') as HTMLSelectElement;
      expect(isStateSelect(select)).toBe(true);
    });

    it('returns true when placeholder option contains select state text', () => {
      const select = document.createElement('select');
      select.id = '_r_abc_';
      select.innerHTML = '<option value="">- Select State -</option>';
      expect(isStateSelect(select)).toBe(true);
    });

    it('returns false for unrelated dropdowns like country or status', () => {
      const select = document.createElement('select');
      select.name = 'countryId';
      select.innerHTML =
        '<option value="251">United States</option><option value="94">Canada</option>';
      expect(isStateSelect(select)).toBe(false);
    });
  });

  describe('findStateSelectElements', () => {
    it('discovers state dropdowns in the provided DOM tree', () => {
      document.body.innerHTML = `
        <div class="address-container">
          <select name="countryId"><option value="251">United States</option></select>
          <select name="stateProvinceId">
            <option value="">- Select One -</option>
            <option value="1">Alabama</option>
            <option value="44" selected>Utah</option>
          </select>
        </div>
      `;

      const found = findStateSelectElements(document.body);
      expect(found).toHaveLength(1);
      expect(found[0].name).toBe('stateProvinceId');
    });
  });

  describe('syncStateSelect', () => {
    it('cycles value through alternate state and back to initial default value', async () => {
      const container = document.createElement('div');
      container.className = 'address-group__styled-label';
      container.innerHTML = `
        <select name="stateProvinceId">
          <option value="">- Select One -</option>
          <option value="1">AL</option>
          <option value="44" selected>UT</option>
        </select>
      `;
      document.body.appendChild(container);

      const select = container.querySelector('select') as HTMLSelectElement;
      select.value = '44';

      const changeEvents: string[] = [];
      select.addEventListener('change', () => {
        changeEvents.push(select.value);
      });

      const syncPromise = syncStateSelect(select);
      await vi.advanceTimersByTimeAsync(300);
      const synced = await syncPromise;

      expect(synced).toBe(true);
      expect(select.value).toBe('44');
      expect(select.getAttribute(Dom.SYNCED_DATA_ATTR)).toBe('true');
      expect(changeEvents).toContain('1');
      expect(changeEvents).toContain('44');
    });

    it('skips synchronization if already marked as synced', async () => {
      const select = document.createElement('select');
      select.name = 'stateProvinceId';
      select.setAttribute(Dom.SYNCED_DATA_ATTR, 'true');
      select.innerHTML = '<option value="1">AL</option><option value="44" selected>UT</option>';
      select.value = '44';

      const synced = await syncStateSelect(select);
      expect(synced).toBe(false);
    });

    it('returns false when select value is empty', async () => {
      const select = document.createElement('select');
      select.name = 'stateProvinceId';
      select.innerHTML = '<option value="">- Select One -</option><option value="44">UT</option>';
      select.value = '';

      const synced = await syncStateSelect(select);
      expect(synced).toBe(false);
      expect(select.getAttribute(Dom.SYNCED_DATA_ATTR)).toBeNull();
    });
  });

  describe('setupAddressInputListeners', () => {
    it('triggers sync when user inputs text into a sibling address field', async () => {
      const container = document.createElement('div');
      container.className = 'address-group__styled-label';
      container.innerHTML = `
        <input name="street1" type="text" value="" />
        <select name="stateProvinceId">
          <option value="">- Select One -</option>
          <option value="1">AL</option>
          <option value="44" selected>UT</option>
        </select>
      `;
      document.body.appendChild(container);

      const select = container.querySelector('select') as HTMLSelectElement;
      const streetInput = container.querySelector('input[name="street1"]') as HTMLInputElement;
      select.value = '44';

      setupAddressInputListeners(select);
      expect(select.getAttribute(Dom.SYNCED_DATA_ATTR)).toBeNull();

      streetInput.dispatchEvent(new Event('input', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(300);

      expect(select.getAttribute(Dom.SYNCED_DATA_ATTR)).toBe('true');
      expect(select.value).toBe('44');
    });
  });

  describe('syncAllStateSelects', () => {
    it('synchronizes all un-synced state dropdowns found in the document and renders toast', async () => {
      document.body.innerHTML = `
        <div class="form-1">
          <select name="stateProvinceId">
            <option value="1">Alabama</option>
            <option value="44" selected>Utah</option>
          </select>
        </div>
        <div class="form-2">
          <select name="residential_state">
            <option value="2">Alaska</option>
            <option value="5" selected>California</option>
          </select>
        </div>
      `;

      const select1 = document.body.querySelector(
        'select[name="stateProvinceId"]'
      ) as HTMLSelectElement;
      const select2 = document.body.querySelector(
        'select[name="residential_state"]'
      ) as HTMLSelectElement;
      select1.value = '44';
      select2.value = '5';

      const syncPromise = syncAllStateSelects(document.body);
      await vi.advanceTimersByTimeAsync(400);
      const result = await syncPromise;

      expect(result.syncedCount).toBe(2);
      expect(result.selectElements).toHaveLength(2);
      expect(result.syncedStateNames).toContain('Utah');
      expect(result.syncedStateNames).toContain('California');
      expect(select1.getAttribute(Dom.SYNCED_DATA_ATTR)).toBe('true');
      expect(select2.getAttribute(Dom.SYNCED_DATA_ATTR)).toBe('true');

      const toast = document.querySelector(`.${Dom.TOAST_ITEM}`);
      expect(toast).not.toBeNull();
      expect(toast?.textContent).toContain('Utah');
    });
  });

  describe('startStateDropdownWatcher', () => {
    it('detects and syncs state dropdown when user transitions to later wizard screen', async () => {
      document.body.innerHTML = `
        <div class="wizard-screen-1">
          <input name="searchName" value="John Doe" />
          <button id="next-btn" class="eden-button">Next</button>
        </div>
      `;

      const teardown = startStateDropdownWatcher({ pollIntervalMs: 50 });

      await vi.advanceTimersByTimeAsync(100);
      expect(document.querySelector(`.${Dom.TOAST_ITEM}`)).toBeNull();

      const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
      nextBtn.click();

      document.body.innerHTML = `
        <div class="wizard-screen-3">
          <div class="eden-form-part-form-field">
            <label class="eden-form-part-label">State</label>
            <select id="_r_state_">
              <option value="1">Alabama</option>
              <option value="44" selected>Utah</option>
            </select>
          </div>
        </div>
      `;
      const select = document.getElementById('_r_state_') as HTMLSelectElement;
      select.value = '44';

      await vi.advanceTimersByTimeAsync(350);

      expect(select.getAttribute(Dom.SYNCED_DATA_ATTR)).toBe('true');
      teardown();
    });
  });

  describe('runAutoSyncStateDropdown', () => {
    it('initializes watcher and returns disconnect teardown function', async () => {
      document.body.innerHTML = `
        <select name="stateProvinceId">
          <option value="1">AL</option>
          <option value="44" selected>UT</option>
        </select>
      `;
      const select = document.body.querySelector('select') as HTMLSelectElement;
      select.value = '44';

      const teardown = runAutoSyncStateDropdown();
      await vi.advanceTimersByTimeAsync(350);

      expect(select.getAttribute(Dom.SYNCED_DATA_ATTR)).toBe('true');
      expect(typeof teardown).toBe('function');
      teardown();
    });
  });

  describe('logSyncMessage', () => {
    it('emits formatted log messages for info, warn, and error levels', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logSyncMessage('Testing info message', 'info');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Testing info message'));

      logSyncMessage('Testing warn message', 'warn');
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Testing warn message'));

      logSyncMessage('Testing error message', 'error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Testing error message')
      );
    });
  });
});
