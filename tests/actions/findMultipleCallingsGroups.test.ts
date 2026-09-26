import { describe, it, expect, beforeEach, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { runFindMultipleCallings } from '@/actions/findMultipleCallings';
import { Constants, Dom } from '@/actions/findMultipleCallings/types';

describe('findMultipleCallings - calling groups', () => {
  let memoryStorage: Record<string, unknown> = {};

  beforeEach(() => {
    document.body.innerHTML = '';
    memoryStorage = {};
    vi.restoreAllMocks();

    vi.spyOn(browser.storage.local, 'get').mockImplementation(async (key) => {
      const k = typeof key === 'string' ? key : String(key);
      return { [k]: memoryStorage[k] };
    });
    vi.spyOn(browser.storage.local, 'set').mockImplementation(async (items) => {
      Object.assign(memoryStorage, items);
    });

    Object.defineProperty(window, 'location', {
      value: new URL('https://lcr.churchofjesuschrist.org/orgs/callings-by-organization'),
      writable: true,
      configurable: true,
    });
  });

  it('should not flag a member who only holds the Bishop equivalent-calling trio', async () => {
    mountOrgTables(bishopTrioRows());

    const result = await runFindMultipleCallings();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(0);
    expect(document.querySelector('.lcr-tools-modal-backdrop')?.textContent).toContain(
      Constants.NO_ISSUES_HEADING
    );
  });

  it('should show the Bishop group name plus leftover callings when extras remain', async () => {
    mountOrgTables([...bishopTrioRows(), assignmentRow('Doe, John', 'Accompanist', 'Primary')]);

    const result = await runFindMultipleCallings();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(1);

    const modal = document.querySelector('.lcr-tools-modal-backdrop');
    expect(modal?.textContent).toContain('Doe, John');
    expect(modal?.textContent).toContain('Bishop');
    expect(modal?.textContent).toContain('Accompanist');
    expect(modal?.textContent).not.toContain('Priests Quorum President');
    expect(modal?.querySelector(`.${Dom.CALLING_GROUP_BADGE}`)?.textContent).toBe('Bishop');
  });

  it('should collapse Bishopric First Counselor assignments into one group', async () => {
    const counselor = Constants.DEFAULT_CALLING_GROUPS.find(
      (group) => group.id === Constants.GROUP_ID_FIRST_COUNSELOR
    );
    expect(counselor).toBeDefined();
    mountOrgTables(
      (counselor?.members || []).map((member) =>
        assignmentRow('Doe, Jane', member.calling, member.organization)
      )
    );

    const result = await runFindMultipleCallings();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(0);
    expect(document.querySelector('.lcr-tools-modal-backdrop')?.textContent).toContain(
      Constants.NO_ISSUES_HEADING
    );
  });

  it('should not apply grouping when the stored group list is empty', async () => {
    memoryStorage[Constants.CALLING_GROUPS_STORAGE_KEY] = [];
    mountOrgTables(bishopTrioRows());

    const result = await runFindMultipleCallings();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(1);

    const modal = document.querySelector('.lcr-tools-modal-backdrop');
    expect(modal?.textContent).toContain('Doe, John');
    expect(modal?.textContent).toContain('Priests Quorum President');
    expect(modal?.querySelector(`.${Dom.CALLING_GROUP_BADGE}`)).toBeNull();
  });

  it('should let users add and remove a custom pairing from Manage Groups', async () => {
    memoryStorage[Constants.CALLING_GROUPS_STORAGE_KEY] = [];
    mountOrgTables([
      assignmentRow('Doe, John', 'Teacher', 'Sunday School'),
      assignmentRow('Doe, John', 'Librarian', 'Sunday School'),
    ]);

    const first = await runFindMultipleCallings();
    expect(first.data?.count).toBe(1);

    await openManageGroups();
    clickModalButton(Dom.GROUPS_MODAL_ID, Constants.ADD_GROUP_BTN);
    await pickCallingSearch('Teacher');
    await pickCallingSearch('Librarian');
    clickModalButton(Dom.GROUPS_MODAL_ID, Constants.GROUPS_DONE_BTN);

    await vi.waitFor(() => {
      expect(document.getElementById(Dom.GROUPS_MODAL_ID)).toBeNull();
      expect(document.getElementById(Dom.MODAL_ID)?.textContent).toContain(
        Constants.NO_ISSUES_HEADING
      );
    });

    await openManageGroups();
    document.querySelector<HTMLButtonElement>(`.${Dom.GROUP_DELETE_BTN}`)?.click();
    clickModalButton(Dom.GROUPS_MODAL_ID, Constants.GROUPS_DONE_BTN);

    await vi.waitFor(() => {
      expect(document.getElementById(Dom.MODAL_ID)?.textContent).toContain('Doe, John');
      expect(document.getElementById(Dom.MODAL_ID)?.textContent).toContain('Teacher');
      expect(document.getElementById(Dom.MODAL_ID)?.textContent).toContain('Librarian');
    });
  });

  it('should pin an open calling search dropdown above neighboring modal sections', async () => {
    mountOrgTables([
      assignmentRow('Doe, John', 'Teacher', 'Sunday School'),
      assignmentRow('Doe, Jane', 'Librarian', 'Sunday School'),
    ]);

    await runFindMultipleCallings();
    await openManageGroups();

    const cards = document.querySelectorAll<HTMLElement>(`.${Dom.GROUP_CARD}`);
    expect(cards.length).toBeGreaterThan(1);

    const input = cards[cards.length - 1].querySelector<HTMLInputElement>(
      `.${Dom.GROUP_SEARCH_INPUT}`
    );
    expect(input).toBeDefined();
    input!.value = 'Teacher';
    input!.dispatchEvent(new Event('input', { bubbles: true }));

    await vi.waitFor(() => {
      const dropdown = document
        .getElementById(Dom.GROUPS_MODAL_ID)
        ?.querySelector<HTMLElement>(`:scope > .${Dom.GROUP_SEARCH_DROPDOWN}`);
      expect(dropdown?.style.display).toBe(Dom.DISPLAY_BLOCK);
      expect(dropdown?.style.position).toBe(Dom.POSITION_FIXED);
      expect(dropdown?.parentElement?.id).toBe(Dom.GROUPS_MODAL_ID);
    });
  });

  it('should collapse Priests Quorum President in Aaronic Priesthood Quorums with other Bishop assignments', async () => {
    mountOrgTables([
      assignmentRow('Doe, John', 'Bishop', 'Bishopric'),
      assignmentRow('Doe, John', 'Priests Quorum President', 'Aaronic Priesthood Quorums'),
    ]);

    const result = await runFindMultipleCallings();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(0);
    expect(document.querySelector('.lcr-tools-modal-backdrop')?.textContent).toContain(
      Constants.NO_ISSUES_HEADING
    );
  });
});

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Mounts synthetic organization calling tables into the jsdom document. */
function mountOrgTables(rows: string[]): void {
  const container = document.createElement('div');
  container.innerHTML = `
    <h1>Organizations</h1>
    <h3>Callings</h3>
    <table>
      <thead><tr><th>Member</th><th>Calling</th><th>Organization</th></tr></thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
  document.body.appendChild(container);
}

/** Builds table rows for the default Bishop equivalent-calling group. */
function bishopTrioRows(): string[] {
  const bishop = Constants.DEFAULT_CALLING_GROUPS.find(
    (group) => group.id === Constants.GROUP_ID_BISHOP
  );
  return (bishop?.members || []).map((member) =>
    assignmentRow('Doe, John', member.calling, member.organization)
  );
}

/** Builds one synthetic calling table row. */
function assignmentRow(name: string, calling: string, organization: string): string {
  return `<tr><td>${name}</td><td>${calling}</td><td>${organization}</td></tr>`;
}

/** Opens the calling groups editor from the report modal. */
async function openManageGroups(): Promise<void> {
  clickModalButton(Dom.MODAL_ID, Constants.MANAGE_GROUPS_BTN);
  await vi.waitFor(() => {
    expect(document.getElementById(Dom.GROUPS_MODAL_ID)).not.toBeNull();
  });
}

/** Clicks a footer button inside the identified modal by visible label. */
function clickModalButton(modalId: string, label: string): void {
  const modal = document.getElementById(modalId);
  const button = Array.from(modal?.querySelectorAll('button') || []).find((btn) =>
    btn.textContent?.includes(label)
  );
  button?.click();
}

/** Types into the last group search box and selects the matching suggestion. */
async function pickCallingSearch(query: string): Promise<void> {
  const inputs = document.querySelectorAll<HTMLInputElement>(`.${Dom.GROUP_SEARCH_INPUT}`);
  const input = inputs[inputs.length - 1];
  expect(input).toBeDefined();
  input.value = query;
  input.dispatchEvent(new Event('input', { bubbles: true }));

  await vi.waitFor(() => {
    const item = Array.from(document.querySelectorAll(`.${Dom.GROUP_SEARCH_ITEM}`)).find((el) =>
      el.textContent?.includes(query)
    );
    expect(item).toBeDefined();
    (item as HTMLElement).click();
  });
}
