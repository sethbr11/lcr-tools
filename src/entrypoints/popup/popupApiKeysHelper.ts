import { Constants, Dom, Types } from '@/types';
import { clearApiKey, getStoredApiKeys, saveApiKey } from '@/utils/security/apiKeyStorageUtils';
import { escapeHtml } from '@/utils/coreUtils';
import { setHtml } from '@/utils';
import { showStatusMessage } from './popupActionHelper';
import { openPinProtectedView } from './popupPinHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Binds the More-page API Keys manager.
 *
 * @param currentTabUrl - Absolute URL of the active browser tab.
 * @param switchView - Popup view navigator used to open and leave the API Keys screen.
 */
export function setupApiKeysManager(
  currentTabUrl: string,
  switchView: (target: Types.PopupView) => void
): void {
  const apiKeysBtn = document.getElementById(Dom.API_KEYS_BUTTON_ID) as HTMLButtonElement | null;
  const description = document.getElementById(Dom.API_KEYS_DESCRIPTION_ID);

  if (description) {
    description.textContent = Constants.API_KEYS_DESCRIPTION;
  }

  if (apiKeysBtn) {
    apiKeysBtn.disabled = false;
    apiKeysBtn.title = Constants.API_KEYS_MANAGE_TITLE;
    apiKeysBtn.addEventListener('click', async () => {
      await openPinProtectedView('apiKeys', currentTabUrl, switchView);
    });
  }

  document.getElementById(Dom.API_KEYS_BACK_BUTTON_ID)?.addEventListener('click', () => {
    switchView('settings');
  });
}

/* ==========================================================================
   EXPORTED RENDER FUNCTIONS
   ========================================================================== */

/** Renders the list of catalog API keys with inputs and action buttons. */
export async function renderApiKeysList(_currentTabUrl?: string): Promise<void> {
  const list = document.getElementById(Dom.API_KEYS_LIST_ID);
  if (!list) return;

  const stored = await getStoredApiKeys();
  list.replaceChildren();

  for (const entry of Constants.API_KEY_CATALOG) {
    const row = document.createElement('div');
    row.className = Dom.API_KEYS_ROW_CLASS;
    row.setAttribute(Dom.API_KEYS_ID_ATTR, entry.id);
    setHtml(
      row,
      `
      <div class="${Dom.API_KEYS_COPY_CLASS}">
        <span class="${Dom.API_KEYS_LABEL_CLASS}">${escapeHtml(entry.label)}</span>
        <span class="${Dom.API_KEYS_DESCRIPTION_CLASS}">${escapeHtml(entry.description)}</span>
      </div>
      <div class="${Dom.API_KEYS_CONTROLS_CLASS}">
        <input
          class="${Dom.API_KEYS_INPUT_CLASS}"
          type="password"
          autocomplete="off"
          placeholder="${escapeHtml(Constants.API_KEYS_INPUT_PLACEHOLDER)}"
          value="${escapeHtml(stored[entry.id] || '')}"
        />
        <button class="${Dom.API_KEYS_TOGGLE_CLASS}" type="button">${Constants.API_KEYS_SHOW_LABEL}</button>
        <button class="${Dom.API_KEYS_SAVE_CLASS}" type="button">${Constants.API_KEYS_SAVE_LABEL}</button>
        <button class="${Dom.API_KEYS_CLEAR_CLASS}" type="button">${Constants.API_KEYS_CLEAR_LABEL}</button>
      </div>
    `
    );
    bindApiKeyRow(row, entry.id);
    list.appendChild(row);
  }
}

/** Wires show/hide, save, and clear controls for one catalog key row. */
function bindApiKeyRow(row: HTMLElement, id: Types.KnownApiKeyId): void {
  const input = row.querySelector<HTMLInputElement>(`.${Dom.API_KEYS_INPUT_CLASS}`);
  const toggleBtn = row.querySelector<HTMLButtonElement>(`.${Dom.API_KEYS_TOGGLE_CLASS}`);
  const saveBtn = row.querySelector<HTMLButtonElement>(`.${Dom.API_KEYS_SAVE_CLASS}`);
  const clearBtn = row.querySelector<HTMLButtonElement>(`.${Dom.API_KEYS_CLEAR_CLASS}`);
  if (!input || !toggleBtn || !saveBtn || !clearBtn) return;

  toggleBtn.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    toggleBtn.textContent = isPassword
      ? Constants.API_KEYS_HIDE_LABEL
      : Constants.API_KEYS_SHOW_LABEL;
  });

  saveBtn.addEventListener('click', async () => {
    await saveApiKey(id, input.value);
    showStatusMessage(Constants.API_KEYS_SAVED);
  });

  clearBtn.addEventListener('click', async () => {
    await clearApiKey(id);
    input.value = '';
    showStatusMessage(Constants.API_KEYS_CLEARED);
  });
}
