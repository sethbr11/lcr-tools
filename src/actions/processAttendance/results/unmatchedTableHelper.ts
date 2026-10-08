import * as Utils from '../utils';
import { Dom, Types } from '../types';
import { getNicknameMatch } from './nicknameHelper';
import { decrementUnmatchedCount, updateSkippedBar } from './unmatchedSkipHelper';
import { applyQueuedMatch, queueVisitorAssignment } from './queuedStatusHelper';
import {
  getMemberDropdownItemHtml,
  getUnmatchedNicknameSuggestHtml,
  getUnmatchedTableRowHtml,
  getUnmatchedVisitorButtonHtml,
  getUnmatchedVisitorSelectHtml,
} from '../templates';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Renders the unmatched attendees table, queueing member matches and visitor designations.
 * Does not mark LCR attendance; pending matches are applied after Continue.
 *
 * @param tbody - Target table body element.
 * @param overlay - Parent overlay element for positioning dropdowns.
 * @param unmatchedList - Attendees not matched on the roll.
 * @param wardMembers - All ward members on roll.
 * @param categories - Tailored visitor categories.
 * @param visitorCounts - Counts of visitors per category (mutated in place).
 * @param logs - Running audit logs.
 * @param savedNicknames - Dictionary of persisted nickname mappings.
 * @param pendingMatches - Accumulator for deferred ward-member matches.
 * @param skippedRecords - Accumulator for skipped unmatched attendees.
 * @param visitorAssigned - Accumulator for attendees queued as visitors.
 * @param onVisitorCountChanged - Callback invoked when visitor counts update.
 * @returns Refresh callback that rebinds unresolved rows after nickname edits.
 */
export function renderUnmatchedTable(
  tbody: HTMLTableSectionElement,
  overlay: HTMLElement,
  unmatchedList: Types.UnmatchedRecord[],
  wardMembers: Types.WardMember[],
  categories: Types.VisitorCategory[],
  visitorCounts: Types.VisitorCounts,
  logs: Types.AttendanceLogEntry[],
  savedNicknames: Types.NicknameDictionary,
  pendingMatches: Types.PendingMemberMatch[],
  skippedRecords: Types.UnmatchedRecord[],
  visitorAssigned: Types.UnmatchedRecord[],
  onVisitorCountChanged: () => void
): Types.RefreshUnmatchedNicknames {
  tbody.replaceChildren();
  const skippedList: Types.SkippedUnmatchedItem[] = [];
  let nicknames = savedNicknames;
  const { floatingDropdown, setActiveSelection } = mountMemberSearchDropdown(overlay, wardMembers);

  unmatchedList.forEach((rec, idx) => {
    const tr = document.createElement('tr');
    const bindRow = () => {
      // prettier-ignore
      bindUnmatchedRow(tr, rec, idx, overlay, wardMembers, categories, visitorCounts, logs, nicknames, pendingMatches, skippedRecords, skippedList, visitorAssigned, floatingDropdown, setActiveSelection, onVisitorCountChanged, bindRow);
    };
    bindRow();
    tbody.appendChild(tr);
  });

  return (nextNicknames: Types.NicknameDictionary) => {
    nicknames = nextNicknames;
    unmatchedList.forEach((_rec, idx) => {
      const tr = tbody.querySelector<HTMLTableRowElement>(`#${Dom.UNMATCHED_ROW_ID_PREFIX}${idx}`);
      if (!tr || !isUnresolvedUnmatchedRow(tr)) return;
      const bindRow = () => {
        // prettier-ignore
        bindUnmatchedRow(tr, _rec, idx, overlay, wardMembers, categories, visitorCounts, logs, nicknames, pendingMatches, skippedRecords, skippedList, visitorAssigned, floatingDropdown, setActiveSelection, onVisitorCountChanged, bindRow);
      };
      bindRow();
    });
  };
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

const dropdownListenerAborts = new WeakMap<HTMLElement, AbortController>();

/** Creates or replaces the floating member-search dropdown and overlay dismiss listeners. */
function mountMemberSearchDropdown(
  overlay: HTMLElement,
  wardMembers: Types.WardMember[]
): Types.MemberSearchDropdownMount {
  overlay.querySelector(`#${Dom.MEMBER_SEARCH_DROPDOWN_ID}`)?.remove();
  dropdownListenerAborts.get(overlay)?.abort();
  const abort = new AbortController();
  dropdownListenerAborts.set(overlay, abort);

  const floatingDropdown = document.createElement('ul');
  floatingDropdown.id = Dom.MEMBER_SEARCH_DROPDOWN_ID;
  floatingDropdown.className = Dom.DROPDOWN_LIST;
  floatingDropdown.style.display = 'none';
  overlay.appendChild(floatingDropdown);

  let activeSelection: Types.UnmatchedMemberSelectHandler | null = null;
  const setActiveSelection = (handler: Types.UnmatchedMemberSelectHandler | null) => {
    activeSelection = handler;
  };

  floatingDropdown.addEventListener(
    'click',
    async (e) => {
      const target = (e.target as HTMLElement).closest(
        `.${Dom.DROPDOWN_ITEM}`
      ) as HTMLElement | null;
      if (!target || !activeSelection) return;
      const memberName = target.dataset.name || '';
      const member = wardMembers.find((m) => m.fullName === memberName);
      floatingDropdown.style.display = 'none';
      if (member) {
        const handler = activeSelection;
        activeSelection = null;
        await handler(member);
      }
    },
    { signal: abort.signal }
  );

  overlay.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement;
      if (!floatingDropdown.contains(target) && !target.classList.contains(Dom.SEARCH_INPUT)) {
        floatingDropdown.style.display = 'none';
        activeSelection = null;
      }
    },
    { signal: abort.signal }
  );

  overlay.addEventListener(
    'scroll',
    () => {
      floatingDropdown.style.display = 'none';
      activeSelection = null;
    },
    { capture: true, signal: abort.signal }
  );

  return { floatingDropdown, setActiveSelection };
}

/** True when a review row still has match/visitor controls (not queued, skipped, or status-only). */
function isUnresolvedUnmatchedRow(tr: HTMLTableRowElement): boolean {
  if (tr.style.display === 'none') return false;
  return !!tr.querySelector(`.${Dom.SEARCH_INPUT}`) || !!tr.querySelector(`.${Dom.GUEST_INPUT}`);
}

/** Builds one unmatched row and binds match, visitor, skip, and undo handlers. */
function bindUnmatchedRow(
  tr: HTMLTableRowElement,
  rec: Types.UnmatchedRecord,
  idx: number,
  overlay: HTMLElement,
  wardMembers: Types.WardMember[],
  categories: Types.VisitorCategory[],
  visitorCounts: Types.VisitorCounts,
  logs: Types.AttendanceLogEntry[],
  savedNicknames: Types.NicknameDictionary,
  pendingMatches: Types.PendingMemberMatch[],
  skippedRecords: Types.UnmatchedRecord[],
  skippedList: Types.SkippedUnmatchedItem[],
  visitorAssigned: Types.UnmatchedRecord[],
  floatingDropdown: HTMLUListElement,
  setActiveSelection: (handler: Types.UnmatchedMemberSelectHandler | null) => void,
  onVisitorCountChanged: () => void,
  rebindRow: () => void
): void {
  tr.id = `${Dom.UNMATCHED_ROW_ID_PREFIX}${idx}`;
  tr.style.display = '';

  const isSingleCategory = categories.length === 1;
  const singleCategory = categories[0] || 'Men';
  const visitorActionHtml = isSingleCategory
    ? getUnmatchedVisitorButtonHtml(idx, singleCategory)
    : getUnmatchedVisitorSelectHtml(idx, categories);

  const suggestedCanonical = getNicknameMatch(rec.fullName, savedNicknames);
  const suggestedMember = suggestedCanonical
    ? wardMembers.find((m) => m.fullName === suggestedCanonical)
    : null;
  const nicknameBoxHtml = suggestedMember
    ? getUnmatchedNicknameSuggestHtml(idx, Utils.escapeHtml(suggestedMember.fullName))
    : '';

  // prettier-ignore
  Utils.setHtml(tr, getUnmatchedTableRowHtml(idx, rec.date, Utils.escapeHtml(rec.fullName), nicknameBoxHtml, suggestedMember ? 'none' : 'block', visitorActionHtml));

  const queuedCtx: Types.QueuedRowContext = { tr, rec, overlay, logs, rebindRow };

  if (suggestedMember) {
    tr.querySelector<HTMLButtonElement>(`.${Dom.NICKNAME_BTN}`)?.addEventListener('click', () => {
      applyQueuedMatch(
        queuedCtx,
        pendingMatches,
        suggestedMember,
        true,
        true,
        `Queued match using saved nickname: ${suggestedMember.fullName}`
      );
    });

    tr.querySelector<HTMLButtonElement>(`.${Dom.SEARCH_TOGGLE}`)?.addEventListener('click', () => {
      const nickBox = tr.querySelector<HTMLElement>(`#${Dom.NICK_BOX_ID_PREFIX}${idx}`);
      const autoBox = tr.querySelector<HTMLElement>(`#${Dom.AUTO_BOX_ID_PREFIX}${idx}`);
      if (nickBox) nickBox.style.display = 'none';
      if (autoBox) {
        autoBox.style.display = 'block';
        autoBox.querySelector<HTMLInputElement>(`.${Dom.SEARCH_INPUT}`)?.focus();
      }
    });
  }

  const searchInput = tr.querySelector<HTMLInputElement>(`.${Dom.SEARCH_INPUT}`);
  const nicknameCheck = tr.querySelector<HTMLInputElement>(`.${Dom.NICKNAME_CHECK}`);

  const showMatches = () => {
    if (!searchInput) return;
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      floatingDropdown.style.display = 'none';
      setActiveSelection(null);
      return;
    }

    const matches = wardMembers.filter((m) => m.fullName.toLowerCase().includes(query)).slice(0, 5);

    if (matches.length === 0) {
      floatingDropdown.style.display = 'none';
      setActiveSelection(null);
      return;
    }

    Utils.setHtml(
      floatingDropdown,
      matches.map((m) => getMemberDropdownItemHtml(Utils.escapeHtml(m.fullName))).join('')
    );
    Utils.positionDropdown(floatingDropdown, searchInput, matches.length);

    setActiveSelection(async (member: Types.WardMember) => {
      const shouldSave = nicknameCheck?.checked ?? false;
      if (shouldSave) await Utils.saveNicknameMapping(rec.fullName, member.fullName);
      const statusDetail = shouldSave
        ? `Queued match to ${member.fullName} (saved nickname mapping)`
        : `Queued match to ${member.fullName}`;
      applyQueuedMatch(queuedCtx, pendingMatches, member, shouldSave, false, statusDetail);
    });
  };

  searchInput?.addEventListener('input', showMatches);
  searchInput?.addEventListener('focus', showMatches);
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      floatingDropdown.style.display = 'none';
      setActiveSelection(null);
    }
  });

  const hideDropdown = () => {
    floatingDropdown.style.display = 'none';
    setActiveSelection(null);
  };

  if (isSingleCategory) {
    tr.querySelector<HTMLButtonElement>(`.${Dom.GUEST_INPUT}`)?.addEventListener('click', () => {
      hideDropdown();
      // prettier-ignore
      queueVisitorAssignment(queuedCtx, singleCategory, visitorCounts, visitorAssigned, onVisitorCountChanged);
    });
  } else {
    tr.querySelector<HTMLSelectElement>(`.${Dom.GUEST_INPUT}`)?.addEventListener('change', (e) => {
      hideDropdown();
      const cat = (e.target as HTMLSelectElement).value as Types.VisitorCategory;
      if (!cat) return;
      // prettier-ignore
      queueVisitorAssignment(queuedCtx, cat, visitorCounts, visitorAssigned, onVisitorCountChanged);
    });
  }

  tr.querySelector<HTMLButtonElement>(`.${Dom.SKIP_BTN}`)?.addEventListener('click', () => {
    hideDropdown();
    skippedList.push({ rec, rowEl: tr });
    skippedRecords.push(rec);
    tr.style.display = 'none';
    decrementUnmatchedCount(overlay);
    updateSkippedBar(overlay, skippedList, skippedRecords);
    Utils.pushAttendanceLog(logs, {
      date: rec.date,
      action: 'SKIP',
      target: rec.fullName,
      firstName: rec.firstName,
      lastName: rec.lastName,
      lcrUpdateStatus: `Skipped attendee - not marked on roll: ${rec.fullName}`,
    });
  });
}
