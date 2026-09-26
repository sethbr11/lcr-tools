import { describe, it, expect, beforeEach, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { displayManageNicknamesModal } from '@/actions/processAttendance/results/nicknameHelper';
import { getSavedNicknames, saveNicknameMapping } from '@/utils/security/storageUtils';
import { Dom } from '@/actions/processAttendance/types';

describe('processAttendance - grouped nickname modal and single alias deletion', () => {
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

    vi.spyOn(browser.storage.local, 'remove').mockImplementation(async (key) => {
      const k = typeof key === 'string' ? key : String(key);
      delete memoryStorage[k];
    });
  });

  it('groups multiple nicknames under the same member header', async () => {
    await saveNicknameMapping('Jon', 'Smith, Jonathan');
    await saveNicknameMapping('Johnny', 'Smith, Jonathan');
    await saveNicknameMapping('Bob', 'Jones, Robert');

    await displayManageNicknamesModal();

    const modal = document.getElementById(Dom.NICKNAMES_MODAL_ID);
    expect(modal).not.toBeNull();

    const groups = modal?.querySelectorAll(`.${Dom.NICKNAME_GROUP}`);
    expect(groups).toHaveLength(2);

    const smithGroup = Array.from(groups || []).find((g) =>
      g.querySelector(`.${Dom.NICKNAME_GROUP_NAME}`)?.textContent?.includes('Smith, Jonathan')
    );
    expect(smithGroup).toBeDefined();

    const smithAliases = smithGroup?.querySelectorAll(`.${Dom.NICKNAME_ALIAS_ROW}`);
    expect(smithAliases).toHaveLength(2);
    expect(smithGroup?.textContent).toContain('Jon');
    expect(smithGroup?.textContent).toContain('Johnny');
  });

  it('deletes only one nickname from a multi-nickname person and keeps the group card', async () => {
    await saveNicknameMapping('Jon', 'Smith, Jonathan');
    await saveNicknameMapping('Johnny', 'Smith, Jonathan');

    const onUpdated = vi.fn();
    await displayManageNicknamesModal(onUpdated);

    const modal = document.getElementById(Dom.NICKNAMES_MODAL_ID);
    let group = modal?.querySelector(`.${Dom.NICKNAME_GROUP}`);
    expect(group).not.toBeNull();
    expect(group?.querySelectorAll(`.${Dom.NICKNAME_ALIAS_ROW}`)).toHaveLength(2);

    // Delete only 'Jon'
    const jonDeleteBtn = modal?.querySelector<HTMLButtonElement>(`button[data-alias="Jon"]`);
    expect(jonDeleteBtn).not.toBeNull();
    jonDeleteBtn?.click();

    await new Promise((r) => setTimeout(r, 50));
    expect(onUpdated).toHaveBeenCalled();

    // Group should still exist with 'Johnny'
    group = modal?.querySelector(`.${Dom.NICKNAME_GROUP}`);
    expect(group).not.toBeNull();
    expect(group?.querySelector(`.${Dom.NICKNAME_GROUP_NAME}`)?.textContent).toContain(
      'Smith, Jonathan'
    );
    const remainingAliases = group?.querySelectorAll(`.${Dom.NICKNAME_ALIAS_ROW}`);
    expect(remainingAliases).toHaveLength(1);
    expect(remainingAliases?.[0]?.textContent).toContain('Johnny');
    expect(modal?.querySelector(`button[data-alias="Jon"]`)).toBeNull();

    // Storage should retain 'Johnny'
    const nicknames = await getSavedNicknames();
    expect(nicknames['jon']).toBeUndefined();
    expect(nicknames['johnny']?.canonicalName).toBe('Smith, Jonathan');
  });

  it('removes the member group card when the last nickname is deleted', async () => {
    await saveNicknameMapping('Bob', 'Jones, Robert');

    await displayManageNicknamesModal();

    const modal = document.getElementById(Dom.NICKNAMES_MODAL_ID);
    expect(modal?.querySelectorAll(`.${Dom.NICKNAME_GROUP}`)).toHaveLength(1);

    const deleteBtn = modal?.querySelector<HTMLButtonElement>(`button[data-alias="Bob"]`);
    deleteBtn?.click();

    await new Promise((r) => setTimeout(r, 50));

    expect(modal?.querySelectorAll(`.${Dom.NICKNAME_GROUP}`)).toHaveLength(0);
    expect(modal?.textContent).toContain('No saved nickname mappings found');
  });
});
