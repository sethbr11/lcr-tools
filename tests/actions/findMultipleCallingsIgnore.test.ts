import { describe, it, expect, beforeEach, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { runFindMultipleCallings } from '@/actions/findMultipleCallings';
import { Constants, Dom } from '@/actions/findMultipleCallings/types';

describe('findMultipleCallings - ignored callings', () => {
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

  it('should ignore Temple Worker by default so it does not count as an extra calling', async () => {
    mountOrgTables([
      assignmentRow('Doe, John', 'Teacher', 'Sunday School'),
      assignmentRow('Doe, John', 'Temple Worker', 'Temple Workers'),
    ]);

    const result = await runFindMultipleCallings();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(0);
    expect(document.querySelector('.lcr-tools-modal-backdrop')?.textContent).toContain(
      Constants.NO_ISSUES_HEADING
    );
  });

  it('should still flag leftover extras after ignoring Temple Worker', async () => {
    mountOrgTables([
      assignmentRow('Doe, John', 'Teacher', 'Sunday School'),
      assignmentRow('Doe, John', 'Librarian', 'Sunday School'),
      assignmentRow('Doe, John', 'Temple Worker', 'Temple Workers'),
    ]);

    const result = await runFindMultipleCallings();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(1);

    const modal = document.querySelector('.lcr-tools-modal-backdrop');
    expect(modal?.textContent).toContain('Doe, John');
    expect(modal?.textContent).toContain('Teacher');
    expect(modal?.textContent).toContain('Librarian');
    expect(modal?.textContent).not.toContain('Temple Worker');
  });

  it('should count Temple Worker again when its ignore toggle is turned off', async () => {
    mountOrgTables([
      assignmentRow('Doe, John', 'Teacher', 'Sunday School'),
      assignmentRow('Doe, John', 'Temple Worker', 'Temple Workers'),
    ]);

    await runFindMultipleCallings();
    await openManageGroups();

    const toggle = document.querySelector<HTMLInputElement>(`.${Dom.IGNORE_TOGGLE}`);
    expect(toggle?.checked).toBe(true);
    toggle!.checked = false;
    toggle!.dispatchEvent(new Event('change', { bubbles: true }));
    clickModalButton(Dom.GROUPS_MODAL_ID, Constants.GROUPS_DONE_BTN);

    await vi.waitFor(() => {
      expect(document.getElementById(Dom.GROUPS_MODAL_ID)).toBeNull();
      expect(document.getElementById(Dom.MODAL_ID)?.textContent).toContain('Doe, John');
      expect(document.getElementById(Dom.MODAL_ID)?.textContent).toContain('Temple Worker');
    });
  });

  it('should not ignore Temple Worker when the stored ignore list is empty', async () => {
    memoryStorage[Constants.IGNORED_CALLINGS_STORAGE_KEY] = [];
    mountOrgTables([
      assignmentRow('Doe, John', 'Teacher', 'Sunday School'),
      assignmentRow('Doe, John', 'Temple Worker', 'Temple Workers'),
    ]);

    const result = await runFindMultipleCallings();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(1);
    expect(document.getElementById(Dom.MODAL_ID)?.textContent).toContain('Temple Worker');
  });

  it('should let users add and toggle a custom ignored calling', async () => {
    memoryStorage[Constants.IGNORED_CALLINGS_STORAGE_KEY] = [];
    mountOrgTables([
      assignmentRow('Doe, John', 'Teacher', 'Sunday School'),
      assignmentRow('Doe, John', 'Librarian', 'Sunday School'),
    ]);

    const first = await runFindMultipleCallings();
    expect(first.data?.count).toBe(1);

    await openManageGroups();
    await pickIgnoredSearch('Teacher');
    clickModalButton(Dom.GROUPS_MODAL_ID, Constants.GROUPS_DONE_BTN);

    await vi.waitFor(() => {
      expect(document.getElementById(Dom.GROUPS_MODAL_ID)).toBeNull();
      expect(document.getElementById(Dom.MODAL_ID)?.textContent).toContain(
        Constants.NO_ISSUES_HEADING
      );
    });

    await openManageGroups();
    const toggle = document.querySelector<HTMLInputElement>(`.${Dom.IGNORE_TOGGLE}`);
    expect(toggle?.checked).toBe(true);
    toggle!.checked = false;
    toggle!.dispatchEvent(new Event('change', { bubbles: true }));
    clickModalButton(Dom.GROUPS_MODAL_ID, Constants.GROUPS_DONE_BTN);

    await vi.waitFor(() => {
      expect(document.getElementById(Dom.MODAL_ID)?.textContent).toContain('Doe, John');
      expect(document.getElementById(Dom.MODAL_ID)?.textContent).toContain('Teacher');
      expect(document.getElementById(Dom.MODAL_ID)?.textContent).toContain('Librarian');
    });
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

/** Types into the ignored-callings search box and selects the matching suggestion. */
async function pickIgnoredSearch(query: string): Promise<void> {
  const input = document.querySelector<HTMLInputElement>(`.${Dom.IGNORE_SEARCH_INPUT}`);
  expect(input).toBeDefined();
  input!.value = query;
  input!.dispatchEvent(new Event('input', { bubbles: true }));

  await vi.waitFor(() => {
    const item = Array.from(
      document.querySelectorAll(`.${Dom.IGNORE_SEARCH_DROPDOWN} .${Dom.GROUP_SEARCH_ITEM}`)
    ).find((el) => el.textContent?.includes(query));
    expect(item).toBeDefined();
    (item as HTMLElement).click();
  });
}
