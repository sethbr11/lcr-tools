import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initPopup } from '@/entrypoints/popup/main';
import { ACTION_REGISTRY } from '@/actions/registry';
import * as storageUtils from '@/utils/security/storageUtils';

describe('Popup View & Directory Navigation', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="popup-container">
        <!-- Main Actions View -->
        <div id="main-view" class="popup-view">
          <div class="popup-header">
            <button id="directory-button" class="directory-button" title="Browse all actions"></button>
          </div>
          <div class="popup-content">
            <div id="menu-items" class="action-list"></div>
            <div id="status-message" class="status-banner"></div>
            <div class="settings-section">
              <button id="settings-button" class="settings-button">More</button>
            </div>
          </div>
        </div>

        <!-- Action Directory View -->
        <div id="directory-view" class="popup-view" style="display: none;">
          <div class="popup-header">
            <button id="back-button" class="back-button" title="Back to actions"></button>
          </div>
          <div class="popup-content directory-content">
            <div class="directory-controls">
              <input type="text" id="search-input" class="search-input" />
              <select id="category-filter" class="category-filter">
                <option value="all">All Categories</option>
              </select>
            </div>
            <div id="directory-status-message" class="status-banner"></div>
            <div id="directory-list" class="directory-list"></div>
          </div>
        </div>

        <!-- More View -->
        <div id="settings-view" class="popup-view" style="display: none;">
          <div class="popup-header">
            <button id="settings-back-button" class="back-button" title="Back to actions"></button>
          </div>
          <div class="popup-content settings-view-content">
            <div id="settings-status-message" class="status-banner"></div>
            <div class="settings-group">
              <div class="settings-card">
                <button id="clear-cache-button" class="settings-action-button clear-cache-danger">Clear Photo Cache</button>
              </div>
              <div id="dev-tools-card" class="settings-card" style="display: none;">
                <button id="dev-anonymize-button" class="settings-action-button dev-action-btn">Copy Anonymized DOM</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  it('should initialize main view and display actions for active page', async () => {
    await initPopup();

    const mainView = document.getElementById('main-view')!;
    const directoryView = document.getElementById('directory-view')!;
    const menuContainer = document.getElementById('menu-items')!;

    expect(mainView.style.display).not.toBe('none');
    expect(directoryView.style.display).toBe('none');

    // Default mock tab is member-list, which has matching actions
    const buttons = menuContainer.querySelectorAll('button.menu-item');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should switch to directory view when directory-button is clicked without opening new tab', async () => {
    await initPopup();

    const mainView = document.getElementById('main-view')!;
    const directoryView = document.getElementById('directory-view')!;
    const dirBtn = document.getElementById('directory-button')!;
    const directoryList = document.getElementById('directory-list')!;

    dirBtn.click();

    expect(mainView.style.display).toBe('none');
    expect(directoryView.style.display).toBe('flex');

    // Directory list should be populated with all registered action cards
    const cards = directoryList.querySelectorAll('.action-card');
    expect(cards.length).toBe(ACTION_REGISTRY.length);

    // Should render category section headers
    const headers = directoryList.querySelectorAll('.section-header');
    expect(headers.length).toBeGreaterThan(0);
  });

  it('should switch back to main view when back-button is clicked', async () => {
    await initPopup();

    const mainView = document.getElementById('main-view')!;
    const directoryView = document.getElementById('directory-view')!;
    const dirBtn = document.getElementById('directory-button')!;
    const backBtn = document.getElementById('back-button')!;

    dirBtn.click();
    expect(directoryView.style.display).toBe('flex');

    backBtn.click();
    expect(mainView.style.display).toBe('flex');
    expect(directoryView.style.display).toBe('none');
  });

  it('should return to main view when Escape key is pressed in directory view', async () => {
    await initPopup();

    const mainView = document.getElementById('main-view')!;
    const directoryView = document.getElementById('directory-view')!;
    const dirBtn = document.getElementById('directory-button')!;

    dirBtn.click();
    expect(directoryView.style.display).toBe('flex');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(mainView.style.display).toBe('flex');
    expect(directoryView.style.display).toBe('none');
  });

  it('should filter actions by search query in directory view and group by category', async () => {
    await initPopup();

    const dirBtn = document.getElementById('directory-button')!;
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const directoryList = document.getElementById('directory-list')!;

    dirBtn.click();

    searchInput.value = 'flashcards';
    searchInput.dispatchEvent(new Event('input'));

    const cards = directoryList.querySelectorAll('.action-card');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Member Flashcards');

    const headers = directoryList.querySelectorAll('.section-header');
    expect(headers.length).toBe(1);
    expect(headers[0].textContent).toBe('Member Management');
  });

  it('should display empty state when search query matches no actions', async () => {
    await initPopup();

    const dirBtn = document.getElementById('directory-button')!;
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const directoryList = document.getElementById('directory-list')!;

    dirBtn.click();

    searchInput.value = 'nonexistent-action-term-xyz';
    searchInput.dispatchEvent(new Event('input'));

    const noResults = directoryList.querySelector('.no-results-message');
    expect(noResults).not.toBeNull();
    expect(noResults?.textContent).toContain('No actions found');
  });

  it('should filter actions by category filter and populate category select options', async () => {
    await initPopup();

    const dirBtn = document.getElementById('directory-button')!;
    const categoryFilter = document.getElementById('category-filter') as HTMLSelectElement;
    const directoryList = document.getElementById('directory-list')!;

    // Category options should be dynamically populated
    expect(categoryFilter.options.length).toBeGreaterThan(1);

    dirBtn.click();

    categoryFilter.value = 'Data Export';
    categoryFilter.dispatchEvent(new Event('change'));

    const cards = directoryList.querySelectorAll('.action-card');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Download Report Data');

    const headers = directoryList.querySelectorAll('.section-header');
    expect(headers.length).toBe(1);
    expect(headers[0].textContent).toBe('Data Export');
  });

  it('should render action card details including page links with SVGs and excluded pages', async () => {
    await initPopup();

    const dirBtn = document.getElementById('directory-button')!;
    const directoryList = document.getElementById('directory-list')!;

    dirBtn.click();

    // Member Flashcards has page links with direct URLs
    const flashcardCard = Array.from(directoryList.querySelectorAll('.action-card')).find((c) =>
      c.textContent?.includes('Member Flashcards')
    );
    expect(flashcardCard).toBeDefined();

    const pageLinks = flashcardCard?.querySelectorAll('a.page-link');
    expect(pageLinks && pageLinks.length).toBeGreaterThan(0);
    expect(pageLinks?.[0].querySelector('svg')).not.toBeNull();

    // Download Report Data has excluded pages
    const downloadCard = Array.from(directoryList.querySelectorAll('.action-card')).find((c) =>
      c.textContent?.includes('Download Report Data')
    );
    expect(downloadCard).toBeDefined();
    const excludedSection = downloadCard?.querySelector('.action-card-excluded');
    expect(excludedSection).not.toBeNull();
    expect(excludedSection?.textContent).toContain('Not available on:');
  });

  it('should render "Run on this page" button for actions matching current tab', async () => {
    await initPopup();

    const dirBtn = document.getElementById('directory-button')!;
    const directoryList = document.getElementById('directory-list')!;

    dirBtn.click();

    // In mock setup, current tab is member-list, so memberFlashcards should have Run button
    const flashcardCard = Array.from(directoryList.querySelectorAll('.action-card')).find((c) =>
      c.textContent?.includes('Member Flashcards')
    );
    expect(flashcardCard).toBeDefined();
    const runBtn = flashcardCard?.querySelector('.directory-item-run-btn');
    expect(runBtn).not.toBeNull();
    expect(runBtn?.textContent).toBe('Run on this page');
  });

  it('should clear photo cache and display confirmation message when clear-cache-button is clicked', async () => {
    const clearSpy = vi.spyOn(storageUtils, 'clearPhotoCache').mockResolvedValue();

    await initPopup();

    const clearBtn = document.getElementById('clear-cache-button')!;
    expect(clearBtn).not.toBeNull();

    clearBtn.click();

    expect(clearSpy).toHaveBeenCalledTimes(1);

    await vi.waitFor(() => {
      const statusMsg = document.getElementById('status-message');
      expect(statusMsg?.textContent).toBe('Photo cache cleared!');
    });
  });

  it('should show Member Flashcards on directory pages', async () => {
    const { browser } = await import('wxt/browser');
    vi.spyOn(browser.tabs, 'query').mockImplementation(
      async () => [{ id: 999, url: 'https://directory.churchofjesuschrist.org/12345' }] as never
    );

    await initPopup();

    const menuContainer = document.getElementById('menu-items')!;
    const buttons = Array.from(menuContainer.querySelectorAll('button.menu-item'));
    const flashcardBtn = buttons.find((b) => b.textContent?.includes('Member Flashcards'));

    expect(flashcardBtn).toBeDefined();
  });

  it('should show empty state on non-LCR pages without available tools', async () => {
    const { browser } = await import('wxt/browser');
    vi.spyOn(browser.tabs, 'query').mockImplementation(
      async () => [{ id: 999, url: 'https://google.com' }] as never
    );

    await initPopup();

    const menuContainer = document.getElementById('menu-items')!;
    const noActions = menuContainer.querySelector('.no-actions-message');

    expect(noActions).not.toBeNull();
    expect(noActions?.textContent).toContain('No tools available for this page');
  });

  it('should switch to More view when settings-button is clicked', async () => {
    await initPopup();

    const mainView = document.getElementById('main-view')!;
    const settingsView = document.getElementById('settings-view')!;
    const settingsBtn = document.getElementById('settings-button')!;

    settingsBtn.click();

    expect(mainView.style.display).toBe('none');
    expect(settingsView.style.display).toBe('flex');
    expect(settingsView.querySelector('#clear-cache-button')).not.toBeNull();
  });

  it('should switch back to main view when settings-back-button is clicked', async () => {
    await initPopup();

    const mainView = document.getElementById('main-view')!;
    const settingsView = document.getElementById('settings-view')!;
    const settingsBtn = document.getElementById('settings-button')!;
    const settingsBackBtn = document.getElementById('settings-back-button')!;

    settingsBtn.click();
    expect(settingsView.style.display).toBe('flex');
    expect(settingsView.classList.contains('slide-in-right')).toBe(true);

    settingsBackBtn.click();
    expect(mainView.style.display).toBe('flex');
    expect(settingsView.style.display).toBe('none');
    expect(mainView.classList.contains('slide-in-left')).toBe(true);
  });

  it('should return to main view when Escape key is pressed in settings view', async () => {
    await initPopup();

    const mainView = document.getElementById('main-view')!;
    const settingsView = document.getElementById('settings-view')!;
    const settingsBtn = document.getElementById('settings-button')!;

    settingsBtn.click();
    expect(settingsView.style.display).toBe('flex');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(mainView.style.display).toBe('flex');
    expect(settingsView.style.display).toBe('none');
  });

  it('should have zero emojis in settings and action controls', async () => {
    await initPopup();

    const settingsBtn = document.getElementById('settings-button')!;
    const clearBtn = document.getElementById('clear-cache-button')!;
    const devBtn = document.getElementById('dev-anonymize-button')!;

    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;

    expect(emojiRegex.test(settingsBtn.textContent || '')).toBe(false);
    expect(emojiRegex.test(clearBtn.textContent || '')).toBe(false);
    expect(emojiRegex.test(devBtn.textContent || '')).toBe(false);
  });

  it('should display status messages in main, directory, and settings banners', async () => {
    const { showStatusMessage } = await import('@/entrypoints/popup/popupActionHelper');
    showStatusMessage('Testing directory status message');

    const mainStatus = document.getElementById('status-message');
    const dirStatus = document.getElementById('directory-status-message');
    const settingsStatus = document.getElementById('settings-status-message');

    expect(mainStatus?.textContent).toBe('Testing directory status message');
    expect(dirStatus?.textContent).toBe('Testing directory status message');
    expect(settingsStatus?.textContent).toBe('Testing directory status message');
    expect(dirStatus?.classList.contains('show')).toBe(true);
    expect(settingsStatus?.classList.contains('show')).toBe(true);
  });
});
