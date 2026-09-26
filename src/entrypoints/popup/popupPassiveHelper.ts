/**
 * Helper routines for rendering and managing passive action toggle controls in the extension popup.
 */

import { getPassiveActionsForUrl } from '@/actions/registry';
import { Constants, Dom, Types } from '@/types';
import { getPassiveActionEnabled, setPassiveActionEnabled } from '@/utils';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Discovers and renders passive action toggle cards compatible with the active tab URL.
 *
 * @param sectionContainer - The parent section container element for passive actions.
 * @param currentTabUrl - Active tab URL string to evaluate against action match patterns.
 * @param onStatus - Status notification callback for displaying user feedback.
 * @returns Promise resolving to the number of passive actions rendered.
 */
export async function renderPassiveActions(
  sectionContainer: HTMLElement,
  currentTabUrl: string,
  onStatus: Types.StatusCallback
): Promise<number> {
  const passiveActions = getPassiveActionsForUrl(currentTabUrl);
  const itemsContainer = document.getElementById(Dom.PASSIVE_ITEMS_ID);

  if (passiveActions.length === 0 || !itemsContainer) {
    sectionContainer.style.display = 'none';
    return 0;
  }

  itemsContainer.innerHTML = '';

  for (const action of passiveActions) {
    if (!action.storageKey) continue;

    const card = document.createElement('div');
    card.className = Dom.PASSIVE_CARD_CLASS;

    const info = document.createElement('div');
    info.className = Dom.PASSIVE_CARD_INFO_CLASS;

    const title = document.createElement('div');
    title.className = Dom.PASSIVE_CARD_TITLE_CLASS;
    title.textContent = action.title;

    const desc = document.createElement('div');
    desc.className = Dom.PASSIVE_CARD_DESC_CLASS;
    desc.textContent = action.description;

    info.appendChild(title);
    info.appendChild(desc);

    const toggleWrapper = document.createElement('label');
    toggleWrapper.className = Dom.TOGGLE_SWITCH_CLASS;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${Dom.PASSIVE_TOGGLE_PREFIX}${action.id}`;
    checkbox.setAttribute('aria-label', action.title);

    const slider = document.createElement('span');
    slider.className = Dom.TOGGLE_SLIDER_CLASS;

    toggleWrapper.appendChild(checkbox);
    toggleWrapper.appendChild(slider);

    const isEnabled = await getPassiveActionEnabled(action.storageKey, action.defaultEnabled);
    checkbox.checked = isEnabled;

    checkbox.addEventListener('change', async () => {
      const checked = checkbox.checked;
      await setPassiveActionEnabled(action.storageKey!, checked);
      onStatus(
        checked ? Constants.PASSIVE_TOOL_ENABLED_TOAST : Constants.PASSIVE_TOOL_DISABLED_TOAST
      );
    });

    card.appendChild(info);
    card.appendChild(toggleWrapper);
    itemsContainer.appendChild(card);
  }

  sectionContainer.style.display = 'block';
  return passiveActions.length;
}
