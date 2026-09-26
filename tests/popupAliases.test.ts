import { describe, it, expect, beforeEach, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { initPopup } from '@/entrypoints/popup/main';
import { Constants } from '@/types';
import * as utils from '@/utils';

describe('Popup attendance aliases manager', () => {
  let memoryStorage: Record<string, unknown> = {};

  beforeEach(async () => {
    memoryStorage = {};
    vi.restoreAllMocks();

    vi.spyOn(browser.storage.local, 'get').mockImplementation(async (key) => {
      const k = typeof key === 'string' ? key : String(key);
      return { [k]: memoryStorage[k] };
    });
    vi.spyOn(browser.storage.local, 'set').mockImplementation(async (items) => {
      Object.assign(memoryStorage, items);
    });
    vi.spyOn(browser.storage.local, 'remove').mockImplementation(async (key) => {
      const k = typeof key === 'string' ? key : String(key);
      delete memoryStorage[k];
    });

    document.body.innerHTML = `
      <div id="main-view" class="popup-view"></div>
      <div id="directory-view" class="popup-view" style="display: none;"></div>
      <div id="settings-view" class="popup-view" style="display: none;">
        <span id="aliases-card-description"></span>
        <button id="aliases-button" type="button">Manage Aliases</button>
        <button id="settings-back-button" type="button">Back</button>
      </div>
      <div id="aliases-view" class="popup-view" style="display: none;">
        <button id="aliases-back-button" type="button">Back</button>
        <div id="aliases-status-message" class="status-banner"></div>
        <input id="aliases-search" />
        <div id="aliases-list"></div>
        <button id="aliases-clear-button" type="button">Clear All Aliases</button>
      </div>
      <div id="pin-view" class="popup-view" style="display: none;">
        <button id="pin-back-button" type="button">Back</button>
        <div id="pin-view-title"></div>
        <div id="pin-view-description"></div>
        <div id="pin-status-message"></div>
        <input id="pin-input" />
        <div id="pin-confirm-container" style="display: none;">
          <input id="pin-confirm-input" />
        </div>
        <button id="pin-submit-button" type="button">Submit</button>
        <button id="pin-reset-button" type="button">Reset</button>
      </div>
      <button id="settings-button" type="button">More</button>
      <div id="menu-items"></div>
    `;

    const sentinel = await utils.createPinVerificationSentinel('1234');
    memoryStorage[Constants.PIN_STORAGE_KEY] = sentinel;
    await utils.setUnlockedPin('1234');
  });

  it('should enable aliases on non-LCR hosts', async () => {
    vi.spyOn(browser.tabs, 'query').mockResolvedValue([
      { id: 9, url: 'https://google.com' },
    ] as never);

    await initPopup();

    const aliasesBtn = document.getElementById('aliases-button') as HTMLButtonElement;
    const description = document.getElementById('aliases-card-description');

    expect(aliasesBtn.disabled).toBe(false);
    expect(description?.textContent).toBe(Constants.ALIASES_DESCRIPTION);
  });

  it('should enable aliases on Church Directory pages', async () => {
    vi.spyOn(browser.tabs, 'query').mockResolvedValue([
      { id: 9, url: 'https://directory.churchofjesuschrist.org/12345' },
    ] as never);

    await initPopup();

    const aliasesBtn = document.getElementById('aliases-button') as HTMLButtonElement;
    expect(aliasesBtn.disabled).toBe(false);
  });

  it('should open aliases and list saved mappings', async () => {
    const getSpy = vi.spyOn(utils, 'getSavedNicknames');
    await utils.saveNicknameMapping('Jon Smith', 'Smith, Jonathan');

    await initPopup();

    const aliasesBtn = document.getElementById('aliases-button') as HTMLButtonElement;
    expect(aliasesBtn.disabled).toBe(false);
    expect(getSpy).not.toHaveBeenCalled();

    aliasesBtn.click();
    await vi.waitFor(() => {
      expect(document.getElementById('aliases-view')?.style.display).toBe('flex');
      expect(document.getElementById('aliases-list')?.textContent).toContain('Jon Smith');
      expect(document.getElementById('aliases-list')?.textContent).toContain('Smith, Jonathan');
    });
    expect(getSpy).toHaveBeenCalled();
  });

  it('should remove a saved alias from the popup list', async () => {
    await utils.saveNicknameMapping('Beth Jones', 'Jones, Elizabeth');
    await initPopup();

    document.getElementById('aliases-button')?.click();
    await vi.waitFor(() => {
      expect(document.getElementById('aliases-list')?.textContent).toContain('Beth Jones');
    });

    const deleteBtn = document.querySelector('.aliases-delete-btn') as HTMLButtonElement;
    expect(deleteBtn.textContent?.trim()).toBe('Remove');
    deleteBtn.click();
    await vi.waitFor(() => {
      expect(document.getElementById('aliases-list')?.textContent).toContain(
        Constants.ALIASES_EMPTY
      );
    });
  });

  it('should return from aliases to More on back and Escape', async () => {
    await initPopup();

    document.getElementById('settings-button')?.click();
    document.getElementById('aliases-button')?.click();
    await vi.waitFor(() => {
      expect(document.getElementById('aliases-view')?.style.display).toBe('flex');
    });

    document.getElementById('aliases-back-button')?.click();
    expect(document.getElementById('settings-view')?.style.display).toBe('flex');
    expect(document.getElementById('aliases-view')?.style.display).toBe('none');
    expect(document.getElementById('settings-view')?.classList.contains('slide-in-left')).toBe(
      true
    );

    document.getElementById('aliases-button')?.click();
    await vi.waitFor(() => {
      expect(document.getElementById('aliases-view')?.style.display).toBe('flex');
      expect(document.getElementById('aliases-view')?.classList.contains('slide-in-right')).toBe(
        true
      );
    });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.getElementById('settings-view')?.style.display).toBe('flex');
    expect(document.getElementById('aliases-view')?.style.display).toBe('none');
    expect(document.getElementById('settings-view')?.classList.contains('slide-in-left')).toBe(
      true
    );
  });

  it('should list aliases alphabetically and filter by alias or mapped name', async () => {
    await utils.saveNicknameMapping('Charlie Young', 'Young, Charles');
    await utils.saveNicknameMapping('alice brown', 'Brown, Alice');
    await utils.saveNicknameMapping('Beth Jones', 'Jones, Elizabeth');

    await initPopup();
    document.getElementById('aliases-button')?.click();

    await vi.waitFor(() => {
      const aliases = Array.from(document.querySelectorAll('.aliases-alias')).map(
        (el) => el.textContent
      );
      expect(aliases).toEqual(['alice brown', 'Beth Jones', 'Charlie Young']);
      const people = Array.from(document.querySelectorAll('.aliases-group-name')).map(
        (el) => el.textContent
      );
      expect(people).toEqual(['Brown, Alice', 'Jones, Elizabeth', 'Young, Charles']);
    });

    const searchInput = document.getElementById('aliases-search') as HTMLInputElement;
    searchInput.value = 'elizabeth';
    searchInput.dispatchEvent(new Event('input'));

    await vi.waitFor(() => {
      const aliases = Array.from(document.querySelectorAll('.aliases-alias')).map(
        (el) => el.textContent
      );
      expect(aliases).toEqual(['Beth Jones']);
      expect(document.getElementById('aliases-list')?.textContent).toContain('Jones, Elizabeth');
      expect(document.getElementById('aliases-list')?.textContent).not.toContain('Charlie Young');
    });

    searchInput.value = 'charlie';
    searchInput.dispatchEvent(new Event('input'));
    await vi.waitFor(() => {
      const aliases = Array.from(document.querySelectorAll('.aliases-alias')).map(
        (el) => el.textContent
      );
      expect(aliases).toEqual(['Charlie Young']);
    });

    searchInput.value = 'xyz-no-match';
    searchInput.dispatchEvent(new Event('input'));
    await vi.waitFor(() => {
      expect(document.getElementById('aliases-list')?.textContent).toContain(
        Constants.ALIASES_NO_MATCH
      );
    });
  });

  it('should group multiple aliases under the same member', async () => {
    await utils.saveNicknameMapping('Johnny', 'Smith, Jonathan');
    await utils.saveNicknameMapping('Jon', 'Smith, Jonathan');
    await utils.saveNicknameMapping('Bob', 'Jones, Robert');

    await initPopup();
    document.getElementById('aliases-button')?.click();

    await vi.waitFor(() => {
      const groups = Array.from(document.querySelectorAll('.aliases-group'));
      expect(groups).toHaveLength(2);
      expect(groups[0].querySelector('.aliases-group-name')?.textContent).toBe('Jones, Robert');
      expect(groups[1].querySelector('.aliases-group-name')?.textContent).toBe('Smith, Jonathan');
      const smithAliases = Array.from(groups[1].querySelectorAll('.aliases-alias')).map(
        (el) => el.textContent
      );
      expect(smithAliases).toEqual(['Johnny', 'Jon']);
    });

    const searchInput = document.getElementById('aliases-search') as HTMLInputElement;
    searchInput.value = 'johnny';
    searchInput.dispatchEvent(new Event('input'));
    await vi.waitFor(() => {
      const groups = Array.from(document.querySelectorAll('.aliases-group'));
      expect(groups).toHaveLength(1);
      expect(groups[0].querySelector('.aliases-group-name')?.textContent).toBe('Smith, Jonathan');
      const smithAliases = Array.from(groups[0].querySelectorAll('.aliases-alias')).map(
        (el) => el.textContent
      );
      expect(smithAliases).toEqual(['Johnny', 'Jon']);
    });
  });
});
