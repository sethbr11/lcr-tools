/**
 * Unit tests for popupPassiveHelper toggle controls and UI rendering.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { renderPassiveActions } from '@/entrypoints/popup/popupPassiveHelper';
import { Constants, Dom } from '@/types';

describe('popupPassiveHelper', () => {
  let container: HTMLElement;
  let itemsContainer: HTMLElement;
  let mockStore: Record<string, unknown> = {};

  beforeEach(() => {
    mockStore = {};
    document.body.innerHTML = '';

    container = document.createElement('div');
    container.id = Dom.PASSIVE_SECTION_ID;
    container.style.display = 'none';

    itemsContainer = document.createElement('div');
    itemsContainer.id = Dom.PASSIVE_ITEMS_ID;
    container.appendChild(itemsContainer);

    document.body.appendChild(container);

    vi.spyOn(browser.storage.local, 'get').mockImplementation((keys) => {
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockStore[keys] });
      }
      return Promise.resolve({});
    });

    vi.spyOn(browser.storage.local, 'set').mockImplementation((items) => {
      Object.assign(mockStore, items);
      return Promise.resolve();
    });
  });

  it('renders passive action cards and toggles for matching LCR page', async () => {
    const onStatus = vi.fn();
    const count = await renderPassiveActions(
      container,
      'https://lcr.churchofjesuschrist.org/records/move-in',
      onStatus
    );

    expect(count).toBeGreaterThan(0);
    expect(container.style.display).toBe('block');

    const card = itemsContainer.querySelector(`.${Dom.PASSIVE_CARD_CLASS}`);
    expect(card).not.toBeNull();

    const title = card?.querySelector(`.${Dom.PASSIVE_CARD_TITLE_CLASS}`);
    expect(title?.textContent).toBe('Auto-Sync State Dropdown');

    const checkbox = card?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    expect(checkbox.checked).toBe(false);

    // Simulate toggle ON
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockStore[Constants.PASSIVE_STATE_DROPDOWN_KEY]).toBe(true);
    expect(onStatus).toHaveBeenCalledWith(Constants.PASSIVE_TOOL_ENABLED_TOAST);
  });

  it('hides container when page has no compatible passive actions', async () => {
    const onStatus = vi.fn();
    const count = await renderPassiveActions(container, 'https://example.com/other-page', onStatus);

    expect(count).toBe(0);
    expect(container.style.display).toBe('none');
    expect(itemsContainer.children).toHaveLength(0);
  });
});
