import { browser } from 'wxt/browser';
import { ACTION_REGISTRY, getActionsForUrl } from '@/actions/registry';
import { Dom, Types } from '@/types';
import { clearPhotoCache } from '@/utils';
import { executeAction, showStatusMessage, setupDevDomAnonymizer } from './popupActionHelper';
import { renderAliasesList, setupAliasesManager } from './popupAliasesHelper';
import { renderApiKeysList, setupApiKeysManager } from './popupApiKeysHelper';
import { setupPinManager, updateLockSessionCard } from './popupPinHelper';
import { filterAndRenderDirectory } from './popupDirectoryHelper';
import { renderPassiveActions } from './popupPassiveHelper';

/**
 * Initializes the popup interface, discovers current tab URL, and binds navigation & action handlers.
 */
export async function initPopup(): Promise<void> {
  const mainView = document.getElementById('main-view');
  const directoryView = document.getElementById('directory-view');
  const settingsView = document.getElementById('settings-view');
  const aliasesView = document.getElementById('aliases-view');
  const apiKeysView = document.getElementById(Dom.API_KEYS_VIEW_ID);
  const pinView = document.getElementById(Dom.PIN_VIEW_ID);
  const menuContainer = document.getElementById('menu-items');
  const dirBtn = document.getElementById('directory-button');
  const backBtn = document.getElementById('back-button');
  const settingsBtn = document.getElementById('settings-button');
  const settingsBackBtn = document.getElementById('settings-back-button');
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  const categoryFilter = document.getElementById('category-filter') as HTMLSelectElement | null;

  let currentTabId: number | undefined;
  let currentTabUrl = '';

  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    currentTabId = currentTab?.id;
    currentTabUrl = currentTab?.url || currentTab?.pendingUrl || '';

    const actions = getActionsForUrl(currentTabUrl);
    const passiveSection = document.getElementById(Dom.PASSIVE_SECTION_ID);
    let passiveCount = 0;
    if (passiveSection) {
      passiveCount = await renderPassiveActions(passiveSection, currentTabUrl, showStatusMessage);
    }

    if (menuContainer) {
      if (actions.length === 0) {
        if (passiveCount === 0) {
          menuContainer.innerHTML = `
            <div class="no-actions-message">
              <p style="margin: 0 0 8px 0; font-weight: 600;">No tools available for this page</p>
              <p style="margin: 0; font-size: 12px; font-style: normal;">Navigate to an LCR report or open the Directory to see all tools.</p>
            </div>
          `;
        } else {
          menuContainer.innerHTML = `
            <div class="no-actions-message" style="padding: 16px 20px;">
              <p style="margin: 0; font-size: 12px; font-style: normal;">No active click-to-run tools for this page.</p>
            </div>
          `;
        }
      } else {
        menuContainer.innerHTML = '';
        for (const action of actions) {
          const btn = document.createElement('button');
          btn.className = 'menu-item';
          btn.textContent = action.title;
          btn.addEventListener('click', async () => {
            await executeAction(action, currentTabId, currentTabUrl);
          });
          menuContainer.appendChild(btn);
        }
      }
    }
  } catch (error) {
    console.error('LCR Tools: Failed to initialize popup:', error);
    if (menuContainer) {
      menuContainer.innerHTML = '<p class="error-message">Error loading actions.</p>';
    }
  }

  // Populate category filter options dynamically from unique registry categories
  if (categoryFilter) {
    const categories = Array.from(new Set(ACTION_REGISTRY.map((a) => a.category))).sort();
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    for (const cat of categories) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    }
  }

  // Clear photo cache button handler
  const clearCacheBtn = document.getElementById('clear-cache-button');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', async () => {
      try {
        await clearPhotoCache();
        showStatusMessage('Photo cache cleared!');
      } catch (err) {
        console.error('LCR Tools: Failed to clear cache:', err);
        showStatusMessage('Failed to clear cache.', true);
      }
    });
  }

  // Populate active extension version from runtime manifest
  const manifest = browser.runtime?.getManifest?.();
  const versionText = manifest?.version ? `v${manifest.version}` : 'v2.0.1';
  const versionEl = document.getElementById(Dom.EXTENSION_VERSION_ID);
  if (versionEl) {
    versionEl.textContent = versionText;
  }
  const mainVersionEl = document.getElementById(Dom.MAIN_VERSION_LABEL_ID);
  if (mainVersionEl) {
    mainVersionEl.textContent = versionText;
  }
  const badges = document.querySelectorAll(`.${Dom.POPUP_VERSION_BADGE_CLASS}`);
  badges.forEach((badge) => {
    badge.textContent = versionText;
  });

  // Development-only DOM anonymizer tool
  if (import.meta.env.DEV) {
    setupDevDomAnonymizer(currentTabId);
  }

  const viewMap: Record<Types.PopupView, HTMLElement | null> = {
    main: mainView,
    directory: directoryView,
    settings: settingsView,
    aliases: aliasesView,
    apiKeys: apiKeysView,
    pinPrompt: pinView,
  };

  const viewDepths: Record<Types.PopupView, number> = {
    main: 0,
    directory: 1,
    settings: 1,
    aliases: 2,
    apiKeys: 2,
    pinPrompt: 2,
  };

  let currentView: Types.PopupView = 'main';

  const switchView = (
    target: Types.PopupView,
    explicitDirection?: Types.ViewTransitionDirection
  ): void => {
    const targetEl = viewMap[target];
    if (!targetEl || !mainView || !directoryView) return;

    const direction =
      explicitDirection ?? (viewDepths[target] < viewDepths[currentView] ? 'backward' : 'forward');
    const enterClass = direction === 'forward' ? Dom.SLIDE_IN_RIGHT_CLASS : Dom.SLIDE_IN_LEFT_CLASS;

    mainView.style.display = 'none';
    directoryView.style.display = 'none';
    if (settingsView) settingsView.style.display = 'none';
    if (aliasesView) aliasesView.style.display = 'none';
    if (apiKeysView) apiKeysView.style.display = 'none';
    if (pinView) pinView.style.display = 'none';

    targetEl.style.display = 'flex';
    targetEl.classList.remove(Dom.SLIDE_IN_RIGHT_CLASS, Dom.SLIDE_IN_LEFT_CLASS);
    void targetEl.offsetWidth;
    targetEl.classList.add(enterClass);

    currentView = target;

    if (target === 'directory') {
      if (searchInput) searchInput.value = '';
      if (categoryFilter) categoryFilter.value = 'all';
      filterAndRenderDirectory('', 'all', currentTabUrl, currentTabId);
      searchInput?.focus();
    } else if (target === 'aliases') {
      void renderAliasesList(currentTabUrl);
    } else if (target === 'apiKeys') {
      void renderApiKeysList(currentTabUrl);
    } else if (target === 'settings') {
      void updateLockSessionCard();
    } else if (target === 'main') {
      dirBtn?.focus();
    }
  };

  dirBtn?.addEventListener('click', () => switchView('directory'));
  backBtn?.addEventListener('click', () => switchView('main'));
  settingsBtn?.addEventListener('click', () => switchView('settings'));
  settingsBackBtn?.addEventListener('click', () => switchView('main'));

  setupAliasesManager(currentTabUrl, switchView);
  setupApiKeysManager(currentTabUrl, switchView);
  setupPinManager(switchView);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (pinView && pinView.style.display !== 'none') {
      switchView('settings');
      return;
    }
    if (aliasesView && aliasesView.style.display !== 'none') {
      switchView('settings');
      return;
    }
    if (apiKeysView && apiKeysView.style.display !== 'none') {
      switchView('settings');
      return;
    }
    if (directoryView && directoryView.style.display !== 'none') {
      switchView('main');
      return;
    }
    if (settingsView && settingsView.style.display !== 'none') {
      switchView('main');
    }
  });

  // Directory search and category filter event bindings
  const handleDirectoryFilterChange = () => {
    const query = (searchInput?.value || '').toLowerCase().trim();
    const category = categoryFilter?.value || 'all';
    filterAndRenderDirectory(query, category, currentTabUrl, currentTabId);
  };

  searchInput?.addEventListener('input', handleDirectoryFilterChange);
  categoryFilter?.addEventListener('change', handleDirectoryFilterChange);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initPopup();
  });
} else {
  initPopup();
}
