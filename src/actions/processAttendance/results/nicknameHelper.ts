import * as Utils from '../utils';
import { Dom, Types } from '../types';
import {
  getManageNicknamesModalHtml,
  getNicknameAliasRowHtml,
  getNicknameEmptyListHtml,
  getNicknameGroupHtml,
} from '../templates';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Resolves a raw attendee name against the saved nickname dictionary.
 * Supports direct and reversed "Last, First" naming formats.
 *
 * @param rawName - Raw attendee full name string from attendance roster.
 * @param nicknames - Pre-loaded nickname mapping dictionary.
 * @returns Canonical ward member name if mapped, or null if no mapping found.
 */
export function getNicknameMatch(
  rawName: string,
  nicknames: Types.NicknameDictionary
): string | null {
  if (!rawName) return null;
  const clean = rawName.trim().toLowerCase();
  if (nicknames[clean]?.canonicalName) {
    return nicknames[clean].canonicalName;
  }

  // Also check direct vs reversed without comma
  if (clean.includes(',')) {
    const parts = clean.split(',').map((p) => p.trim());
    if (parts.length === 2) {
      const reversed = `${parts[1]} ${parts[0]}`.trim();
      if (nicknames[reversed]?.canonicalName) {
        return nicknames[reversed].canonicalName;
      }
    }
  }

  return null;
}

/**
 * Displays an interactive modal allowing users to review, individual-delete,
 * or completely flush all locally persisted nickname mappings.
 *
 * @param onUpdated - Optional callback invoked when mappings are modified or cleared.
 */
export async function displayManageNicknamesModal(onUpdated?: () => void): Promise<void> {
  document.getElementById(Dom.NICKNAMES_MODAL_ID)?.remove();

  const overlay = document.createElement('div');
  overlay.id = Dom.NICKNAMES_MODAL_ID;
  overlay.className = 'lcrx-modal-backdrop';
  overlay.innerHTML = getManageNicknamesModalHtml();
  document.body.appendChild(overlay);

  const listContainer = overlay.querySelector<HTMLElement>(`#${Dom.NICKNAMES_LIST_ID}`);
  const close = () => overlay.remove();

  overlay.querySelector(`#${Dom.NICKNAMES_CLOSE_ID}`)?.addEventListener('click', close);
  overlay.querySelector(`#${Dom.NICKNAMES_DONE_ID}`)?.addEventListener('click', close);

  const renderList = async () => {
    if (!listContainer) return;
    const nicknames = await Utils.getSavedNicknames();
    const groups = groupNicknamesByPerson(Object.values(nicknames));

    if (groups.length === 0) {
      listContainer.innerHTML = getNicknameEmptyListHtml();
      return;
    }

    listContainer.innerHTML = groups
      .map((group) => {
        const canonicalEscaped = Utils.escapeHtml(group.canonicalName);
        const rowsHtml = group.aliases
          .map((item: Types.NicknameMapping) => {
            const aliasEscaped = Utils.escapeHtml(item.alias);
            return getNicknameAliasRowHtml(aliasEscaped, aliasEscaped);
          })
          .join('');
        return getNicknameGroupHtml(canonicalEscaped, rowsHtml);
      })
      .join('');

    listContainer
      .querySelectorAll<HTMLButtonElement>(`.${Dom.NICKNAME_DELETE_BTN}`)
      .forEach((btn) => {
        btn.addEventListener('click', async () => {
          const alias = btn.dataset.alias || '';
          if (alias) {
            await Utils.removeNicknameMapping(alias);
            await renderList();
            onUpdated?.();
          }
        });
      });
  };

  overlay
    .querySelector<HTMLButtonElement>(`#${Dom.CLEAR_NICKNAMES_BTN_ID}`)
    ?.addEventListener('click', async () => {
      await Utils.clearAllNicknames();
      Utils.showToast('All nickname mappings cleared', { type: 'info' });
      await renderList();
      onUpdated?.();
    });

  await renderList();
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Groups nickname mappings by canonical member name, sorting people and aliases A–Z. */
function groupNicknamesByPerson(entries: Types.NicknameMapping[]): Types.NicknamePersonGroup[] {
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
      aliases: [...group.aliases].sort((a, b) => a.alias.localeCompare(b.alias)),
    }))
    .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
}
