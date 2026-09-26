import { browser } from 'wxt/browser';
import { ACTION_REGISTRY, getActionsForUrl } from '@/actions/registry';
import { escapeHtml } from '@/utils';
import { Dom, Types } from '@/types';
import { executeAction } from './popupActionHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Groups an array of action definitions by their category string.
 *
 * @param actions - Array of action definitions.
 * @returns Grouped dictionary keyed by category name.
 */
export function groupActionsByCategory(
  actions: Types.ActionDefinition[]
): Record<string, Types.ActionDefinition[]> {
  return actions.reduce(
    (acc, action) => {
      if (!acc[action.category]) {
        acc[action.category] = [];
      }
      acc[action.category].push(action);
      return acc;
    },
    {} as Record<string, Types.ActionDefinition[]>
  );
}

/**
 * Creates an action card DOM element mirroring legacy directory card structure.
 *
 * @param action - Action definition metadata.
 * @param isAvailableHere - Whether the action is applicable to the current active tab.
 * @param tabId - Current active tab ID.
 * @returns Fully constructed HTML card element.
 */
export function createActionCard(
  action: Types.ActionDefinition,
  isAvailableHere: boolean,
  tabId?: number,
  currentUrl?: string
): HTMLElement {
  const card = document.createElement('div');
  card.className = 'action-card directory-item';

  const title = document.createElement('h3');
  title.className = 'action-card-title';
  title.textContent = action.title;
  card.appendChild(title);

  const description = document.createElement('p');
  description.className = 'action-card-pages';
  description.textContent = action.description;
  card.appendChild(description);

  // Available on section
  const availableSection = document.createElement('div');
  availableSection.className = 'action-card-pages';

  const availableLabel = document.createElement('strong');
  availableLabel.textContent = 'Available on: ';
  availableSection.appendChild(availableLabel);

  const pageLinks = document.createElement('div');
  pageLinks.className = 'page-links';

  if (action.directoryPages && action.directoryPages.length > 0) {
    for (const page of action.directoryPages) {
      if (page.url) {
        const link = document.createElement('a');
        link.className = 'page-link';
        link.href = page.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.title = `Open ${page.name}`;
        link.innerHTML = `
          ${escapeHtml(page.name)}
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        `;
        link.addEventListener('click', (e) => {
          e.preventDefault();
          browser.tabs.create({ url: page.url! }).catch(() => {
            window.open(page.url!, '_blank');
          });
        });
        pageLinks.appendChild(link);
      } else {
        const textSpan = document.createElement('span');
        textSpan.className = 'page-text';
        textSpan.textContent = page.name;
        pageLinks.appendChild(textSpan);
      }
    }
  }

  availableSection.appendChild(pageLinks);
  card.appendChild(availableSection);

  // Excluded pages section (if any)
  if (action.directoryExcluded && action.directoryExcluded.length > 0) {
    const excludedSection = document.createElement('p');
    excludedSection.className = 'action-card-pages action-card-excluded';
    excludedSection.innerHTML = `<em>Not available on: ${escapeHtml(action.directoryExcluded.join(', '))}</em>`;
    card.appendChild(excludedSection);
  }

  // Run on this page button or passive tool indicator
  if (isAvailableHere) {
    if (action.executionMode === 'passive') {
      const badge = document.createElement('span');
      badge.className = Dom.PASSIVE_BADGE_CLASS;
      badge.textContent = 'Passive Tool (Runs automatically)';
      card.appendChild(badge);
    } else {
      const runBtn = document.createElement('button');
      runBtn.type = 'button';
      runBtn.className = 'directory-item-run-btn';
      runBtn.textContent = 'Run on this page';
      runBtn.addEventListener('click', async () => {
        await executeAction(action, tabId, currentUrl);
      });
      card.appendChild(runBtn);
    }
  }

  return card;
}

/**
 * Filters the action registry and renders categorized section headers and cards into directory list.
 *
 * @param query - Normalized search input text.
 * @param category - Selected category filter option.
 * @param currentUrl - Active tab URL string.
 * @param tabId - Active tab ID.
 */
export function filterAndRenderDirectory(
  query: string,
  category: string,
  currentUrl: string,
  tabId?: number
): void {
  const listContainer = document.getElementById('directory-list');
  if (!listContainer) return;

  const matchingActions = [
    ...getActionsForUrl(currentUrl),
    ...getActionsForUrl(currentUrl, 'passive'),
  ];
  const matchingActionIds = new Set(matchingActions.map((a) => a.id));
  const normalizedQuery = query.toLowerCase().trim();

  const filtered = ACTION_REGISTRY.filter((action) => {
    const matchesCategory = category === 'all' || action.category === category;
    const matchesQuery =
      !normalizedQuery ||
      action.title.toLowerCase().includes(normalizedQuery) ||
      action.description.toLowerCase().includes(normalizedQuery) ||
      action.category.toLowerCase().includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });

  listContainer.innerHTML = '';

  if (filtered.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'no-results-message';
    noResults.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <h3>No actions found</h3>
      <p>Try adjusting your search or filter criteria</p>
    `;
    listContainer.appendChild(noResults);
    return;
  }

  const categorized = groupActionsByCategory(filtered);

  for (const catName of Object.keys(categorized)) {
    const header = document.createElement('div');
    header.className = 'section-header';
    header.textContent = catName;
    listContainer.appendChild(header);

    for (const action of categorized[catName]) {
      const isAvailable = matchingActionIds.has(action.id);
      const card = createActionCard(action, isAvailable, tabId, currentUrl);
      listContainer.appendChild(card);
    }
  }
}
