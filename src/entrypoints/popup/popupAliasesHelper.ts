import { Constants, Dom, Types } from '@/types';
import {
  clearAllNicknames,
  escapeHtml,
  getSavedNicknames,
  removeNicknameMapping,
  setHtml,
} from '@/utils';
import { showStatusMessage } from './popupActionHelper';
import { openPinProtectedView } from './popupPinHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Binds the More-page aliases manager.
 *
 * @param currentTabUrl - Absolute URL of the active browser tab.
 * @param switchView - Popup view navigator used to open and leave the aliases screen.
 */
export function setupAliasesManager(
  currentTabUrl: string,
  switchView: (target: Types.PopupView) => void
): void {
  const aliasesBtn = document.getElementById(Dom.ALIASES_BUTTON_ID) as HTMLButtonElement | null;
  const description = document.getElementById(Dom.ALIASES_DESCRIPTION_ID);

  if (description) {
    description.textContent = Constants.ALIASES_DESCRIPTION;
  }

  if (aliasesBtn) {
    aliasesBtn.disabled = false;
    aliasesBtn.title = Constants.ALIASES_MANAGE_TITLE;
    aliasesBtn.addEventListener('click', async () => {
      const search = document.getElementById(Dom.ALIASES_SEARCH_ID) as HTMLInputElement | null;
      if (search) search.value = '';
      await openPinProtectedView('aliases', currentTabUrl, switchView);
    });
  }

  document.getElementById(Dom.ALIASES_BACK_BUTTON_ID)?.addEventListener('click', () => {
    switchView('settings');
  });

  const searchInput = document.getElementById(Dom.ALIASES_SEARCH_ID) as HTMLInputElement | null;
  if (searchInput) {
    searchInput.placeholder = Constants.ALIASES_SEARCH_PLACEHOLDER;
    searchInput.addEventListener('input', () => {
      void renderAliasesList(currentTabUrl);
    });
  }

  document.getElementById(Dom.ALIASES_CLEAR_BUTTON_ID)?.addEventListener('click', async () => {
    await clearAllNicknames();
    await renderAliasesList(currentTabUrl);
    showStatusMessage(Constants.ALIASES_CLEARED);
  });
}

/* ==========================================================================
   EXPORTED RENDER FUNCTIONS
   ========================================================================== */

/** Reloads the aliases list from storage. */
export async function renderAliasesList(tabUrl: string): Promise<void> {
  const list = document.getElementById(Dom.ALIASES_LIST_ID);
  if (!list) return;

  const nicknames = await getSavedNicknames();
  const groups = groupAliasesByPerson(Object.values(nicknames));

  if (groups.length === 0) {
    setHtml(
      list,
      `<p class="${Dom.ALIASES_EMPTY_CLASS}">${escapeHtml(Constants.ALIASES_EMPTY)}</p>`
    );
    return;
  }

  const visible = groups.filter((group) => matchesAliasGroupSearch(group, getAliasSearchQuery()));
  if (visible.length === 0) {
    setHtml(
      list,
      `<p class="${Dom.ALIASES_EMPTY_CLASS}">${escapeHtml(Constants.ALIASES_NO_MATCH)}</p>`
    );
    return;
  }

  setHtml(list, visible.map((group) => buildAliasGroupHtml(group)).join(''));
  bindAliasRowActions(list, tabUrl);
}

/** Builds a member group card listing every nickname mapped to that person. */
function buildAliasGroupHtml(group: Types.NicknamePersonGroup): string {
  const rows = group.aliases
    .map((item) => {
      const aliasEscaped = escapeHtml(item.alias);
      return `
        <div class="${Dom.ALIASES_ROW_CLASS}" data-alias="${aliasEscaped}">
          <span class="${Dom.ALIASES_ALIAS_CLASS}">${aliasEscaped}</span>
          <button type="button" class="${Dom.ALIASES_DELETE_BTN_CLASS}" data-alias="${aliasEscaped}">
            Remove
          </button>
        </div>`;
    })
    .join('');

  return `
    <div class="${Dom.ALIASES_GROUP_CLASS}">
      <div class="${Dom.ALIASES_GROUP_NAME_CLASS}">${escapeHtml(group.canonicalName)}</div>
      ${rows}
    </div>`;
}

/** Attaches remove handlers for alias rows. */
function bindAliasRowActions(list: HTMLElement, tabUrl: string): void {
  list.querySelectorAll<HTMLButtonElement>(`.${Dom.ALIASES_DELETE_BTN_CLASS}`).forEach((btn) => {
    btn.addEventListener('click', async () => {
      const alias = btn.dataset.alias || '';
      if (!alias) return;
      await removeNicknameMapping(alias);
      await renderAliasesList(tabUrl);
      showStatusMessage(Constants.ALIASES_DELETED);
    });
  });
}

/** Reads the current aliases search query, normalized for case-insensitive matching. */
function getAliasSearchQuery(): string {
  const input = document.getElementById(Dom.ALIASES_SEARCH_ID) as HTMLInputElement | null;
  return (input?.value || '').trim().toLowerCase();
}

/** Returns whether a member group matches search on the member name or any alias. */
function matchesAliasGroupSearch(group: Types.NicknamePersonGroup, query: string): boolean {
  if (!query) return true;
  if (group.canonicalName.toLowerCase().includes(query)) return true;
  return group.aliases.some((item) => item.alias.toLowerCase().includes(query));
}

/** Groups nickname mappings by canonical member name, sorting people and aliases A–Z. */
function groupAliasesByPerson(entries: Types.NicknameMapping[]): Types.NicknamePersonGroup[] {
  const groups = new Map<string, Types.NicknamePersonGroup>();

  for (const item of entries) {
    const key = item.canonicalName.trim().toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.aliases.push(item);
      continue;
    }
    groups.set(key, { canonicalName: item.canonicalName.trim(), aliases: [item] });
  }

  return [...groups.values()]
    .map((group) => ({
      canonicalName: group.canonicalName,
      aliases: [...group.aliases].sort((a, b) => compareAliasNames(a.alias, b.alias)),
    }))
    .sort((a, b) => compareAliasNames(a.canonicalName, b.canonicalName));
}

/** Case-insensitive alphabetical comparison for member names and aliases. */
function compareAliasNames(left: string, right: string): number {
  return left.toLowerCase().localeCompare(right.toLowerCase());
}
