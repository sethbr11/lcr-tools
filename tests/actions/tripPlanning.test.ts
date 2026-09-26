import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runTripPlanning } from '@/actions/tripPlanning';
import { extractMembersForTripPlanning } from '@/actions/tripPlanning/utils';
import { Constants, Dom } from '@/actions/tripPlanning/types';

describe('tripPlanning - functional user expectations', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('should prompt user to confirm opening Trip Planner and exit if cancelled', async () => {
    const actionPromise = runTripPlanning();
    const modal = document.querySelector('.lcr-tools-modal-backdrop');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('Trip Planner');
    const cancelBtn = modal?.querySelector('#lcr-tools-cancel-btn') as HTMLButtonElement;
    cancelBtn.click();
    const result = await actionPromise;
    expect(result.success).toBe(false);
    expect(result.error).toBe('Cancelled by user');
  });

  it('should show maintenance modal if no tables are present', async () => {
    const actionPromise = runTripPlanning();
    const modal = document.querySelector('.lcr-tools-modal-backdrop');
    const confirmBtn = modal?.querySelector('#lcr-tools-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();
    const result = await actionPromise;
    expect(result.success).toBe(false);
    expect(result.error).toBe('No tables');
    const maintenance = document.querySelector(`#${Dom.MAINTENANCE_MODAL_ID}`);
    expect(maintenance).not.toBeNull();
  });

  it('should show maintenance modal if the table lacks Name or Address columns', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <h3>Incomplete Table</h3>
      <table>
        <thead><tr><th>Member Name</th><th>Phone</th></tr></thead>
        <tbody><tr><td>Smith, John</td><td>555-0101</td></tr></tbody>
      </table>
    `;
    document.body.appendChild(container);

    const actionPromise = runTripPlanning();
    const modal = document.querySelector('.lcr-tools-modal-backdrop');
    const confirmBtn = modal?.querySelector('#lcr-tools-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();
    const result = await actionPromise;
    expect(result.success).toBe(false);
    expect(result.error).toBe('Missing columns');
    const maintenance = document.querySelector(`#${Dom.MAINTENANCE_MODAL_ID}`);
    expect(maintenance).not.toBeNull();
    expect(maintenance?.textContent).toContain(Constants.MAINTENANCE_EMAIL);
  });

  it('should extract members, store payload, and launch planner tab', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <h3>Ward Member List</h3>
      <table>
        <thead><tr><th>Name</th><th>Address</th><th>Phone</th></tr></thead>
        <tbody>
          <tr><td>Smith, John</td><td>100 N Main St, Salt Lake City, UT</td><td>555-0100</td></tr>
          <tr><td>Doe, Jane</td><td>200 S State St, Salt Lake City, UT</td><td>555-0200</td></tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const setStorageSpy = vi
      .spyOn(chrome.storage.local, 'set')
      .mockResolvedValue(undefined as never);
    const createTabSpy = vi.spyOn(chrome.tabs, 'create').mockResolvedValue({ id: 99 } as never);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => [],
    } as Response);

    const actionPromise = runTripPlanning();
    const modal = document.querySelector('.lcr-tools-modal-backdrop');
    const confirmBtn = modal?.querySelector('#lcr-tools-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();
    const result = await actionPromise;

    expect(result.success).toBe(true);
    expect(result.data?.memberCount).toBe(2);
    expect(setStorageSpy).toHaveBeenCalledTimes(1);
    const storageArgs = setStorageSpy.mock.calls[0][0] as Record<string, unknown[]>;
    expect(storageArgs[Constants.STORAGE_DATA_KEY]).toBeDefined();
    expect(storageArgs[Constants.STORAGE_DATA_KEY].length).toBe(2);
    expect(createTabSpy).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining(Constants.PAGE_PATH) })
    );
  });

  it('extractMembersForTripPlanning should skip rows without addresses', () => {
    const table = document.createElement('table');
    table.innerHTML = `
      <thead><tr><th>Full Name</th><th>Residential Address</th></tr></thead>
      <tbody>
        <tr><td>Clark, Bruce</td><td>350 5th Ave, New York, NY</td></tr>
        <tr><td>Wayne, Bruce</td><td></td></tr>
      </tbody>
    `;
    document.body.appendChild(table);
    const extraction = extractMembersForTripPlanning(table);
    expect(extraction?.members.length).toBe(1);
    expect(extraction?.members[0].name).toBe('Clark, Bruce');
  });
});
