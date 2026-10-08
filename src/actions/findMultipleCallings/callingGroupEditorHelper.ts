// prettier-ignore
import { callingAssignmentKey, closeModal, createStandardModal, escapeHtml, formatCallingLabel, setHtml } from './utils';
import { getCallingGroups, saveCallingGroups } from './callingGroupStorageHelper';
import { getIgnoredCallings, saveIgnoredCallings } from './callingIgnoreStorageHelper';
import { bindIgnoredCallingsEditor } from './callingIgnoreEditorHelper';
import {
  clearPortaledSearchDropdowns,
  hideFixedSearchDropdown,
  showFixedSearchDropdown,
} from './callingSearchDropdownHelper';
import { Constants, Dom, Types } from './types';
import { Templates } from './templates';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Opens the calling groups editor over the report so users can edit pairings and ignored callings.
 *
 * @param catalog - Unique calling-and-organization pairs from the current page.
 * @param onSaved - Callback invoked after groups are persisted so the report can refresh.
 */
export async function openCallingGroupEditor(
  catalog: Types.CallingAssignment[],
  onSaved: Types.CallingGroupsSavedHandler
): Promise<void> {
  const [draft, ignored] = await Promise.all([getCallingGroups(), getIgnoredCallings()]);

  createStandardModal({
    id: Dom.GROUPS_MODAL_ID,
    title: Constants.GROUPS_MODAL_TITLE,
    content: Templates.groupsEditor(
      draft.map(Templates.groupCard).join(''),
      Templates.ignoredList(ignored)
    ),
    width: Constants.GROUPS_MODAL_WIDTH,
    buttons: [
      {
        text: Constants.ADD_GROUP_BTN,
        type: 'secondary',
        onClick: () => {
          draft.push(createBlankGroup());
          renderGroupList(draft, catalog);
          return true;
        },
      },
      {
        text: Constants.GROUPS_DONE_BTN,
        type: 'primary',
        onClick: async () => {
          await Promise.all([saveCallingGroups(draft), saveIgnoredCallings(ignored)]);
          closeModal(Dom.GROUPS_MODAL_ID);
          await onSaved();
          return true;
        },
      },
    ],
  });

  bindEditorEvents(draft, catalog);
  bindIgnoredCallingsEditor(ignored, catalog);
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Rebuilds group cards and rebinds editor events after add/remove mutations. */
function renderGroupList(draft: Types.CallingGroup[], catalog: Types.CallingAssignment[]): void {
  clearPortaledSearchDropdowns();
  const list = document.getElementById(Dom.GROUPS_LIST_ID);
  if (!list) return;
  setHtml(list, draft.map(Templates.groupCard).join(''));
  bindEditorEvents(draft, catalog);
}

/** Wires name edits, chip removal, group deletion, and calling search for every card. */
function bindEditorEvents(draft: Types.CallingGroup[], catalog: Types.CallingAssignment[]): void {
  const list = document.getElementById(Dom.GROUPS_LIST_ID);
  if (!list) return;

  list.querySelectorAll<HTMLElement>(`.${Dom.GROUP_CARD}`).forEach((card) => {
    const group = draft.find((item) => item.id === (card.getAttribute(Dom.DATA_GROUP_ID) || ''));
    if (!group) return;

    card
      .querySelector<HTMLInputElement>(`.${Dom.GROUP_NAME_INPUT}`)
      ?.addEventListener('input', (event) => {
        group.name = (event.target as HTMLInputElement).value;
      });

    card.querySelector(`.${Dom.GROUP_DELETE_BTN}`)?.addEventListener('click', () => {
      const index = draft.findIndex((item) => item.id === group.id);
      if (index === -1) return;
      draft.splice(index, 1);
      renderGroupList(draft, catalog);
    });

    bindChipRemoval(card, group);
    bindCallingSearch(card, group, catalog);
  });
}

/** Removes a selected calling from a group when its chip dismiss control is clicked. */
function bindChipRemoval(card: HTMLElement, group: Types.CallingGroup): void {
  card.querySelectorAll<HTMLButtonElement>(`.${Dom.GROUP_CHIP_REMOVE}`).forEach((button) => {
    button.addEventListener('click', () => {
      const chip = button.closest(`.${Dom.GROUP_CHIP}`) as HTMLElement | null;
      if (!chip) return;
      const key = callingAssignmentKey({
        calling: chip.getAttribute(Dom.DATA_CALLING) || '',
        organization: chip.getAttribute(Dom.DATA_ORGANIZATION) || '',
      });
      group.members = group.members.filter((member) => callingAssignmentKey(member) !== key);
      replaceChips(card, group);
    });
  });
}

/** Attaches searchable calling autocomplete to one group card. */
function bindCallingSearch(
  card: HTMLElement,
  group: Types.CallingGroup,
  catalog: Types.CallingAssignment[]
): void {
  const input = card.querySelector<HTMLInputElement>(`.${Dom.GROUP_SEARCH_INPUT}`);
  const wrap = card.querySelector<HTMLElement>(`.${Dom.GROUP_SEARCH_WRAP}`);
  const dropdown = wrap?.querySelector<HTMLElement>(`.${Dom.GROUP_SEARCH_DROPDOWN}`);
  if (!input || !wrap || !dropdown) return;

  const hide = () => hideFixedSearchDropdown(dropdown, wrap);

  const showMatches = () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      hide();
      return;
    }

    const selected = new Set(group.members.map(callingAssignmentKey));
    const matches = catalog
      .filter((item) => {
        if (selected.has(callingAssignmentKey(item))) return false;
        return formatCallingLabel(item).toLowerCase().includes(query);
      })
      .slice(0, Constants.CALLING_SEARCH_MAX_RESULTS);

    if (matches.length === 0) {
      setHtml(
        dropdown,
        `<li style="padding: 6px 10px; color: #888; font-size: 13px;">${escapeHtml(Constants.NO_MATCHING_CALLINGS)}</li>`
      );
      showFixedSearchDropdown(dropdown, input);
      return;
    }

    setHtml(dropdown, matches.map(Templates.searchItem).join(''));
    showFixedSearchDropdown(dropdown, input);
    dropdown.querySelectorAll<HTMLElement>(`.${Dom.GROUP_SEARCH_ITEM}`).forEach((item) => {
      item.addEventListener('click', () => {
        const calling = item.getAttribute(Dom.DATA_CALLING) || '';
        const organization = item.getAttribute(Dom.DATA_ORGANIZATION) || '';
        if (!calling) return;
        group.members.push({ calling, organization });
        input.value = '';
        hide();
        replaceChips(card, group);
      });
    });
  };

  input.addEventListener('input', showMatches);
  input.addEventListener('focus', showMatches);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hide();
  });
}

/** Replaces the chips container for a group after a calling is added or removed. */
function replaceChips(card: HTMLElement, group: Types.CallingGroup): void {
  const chips = card.querySelector(`.${Dom.GROUP_CHIPS}`);
  if (!chips) return;
  setHtml(chips, Templates.groupChips(group.members));
  bindChipRemoval(card, group);
}

/** Creates an empty user-defined calling group. */
function createBlankGroup(): Types.CallingGroup {
  return {
    id: `${Constants.NEW_GROUP_ID_PREFIX}${Date.now()}`,
    name: Constants.NEW_GROUP_NAME,
    members: [],
  };
}
