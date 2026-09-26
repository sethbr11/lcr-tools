import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runNoPhotoList } from '@/actions/noPhotoList';
import * as fileUtils from '@/utils/fileUtils';
import * as uiUtils from '@/utils/ui/uiUtils';
import * as storageUtils from '@/utils/security/storageUtils';
import * as lcrApiUtils from '@/utils/church/lcrApiUtils';

describe('noPhotoList - functional user expectations', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'lcr.churchofjesuschrist.org',
        href: 'https://lcr.churchofjesuschrist.org/mlt/records/member-list',
      },
      writable: true,
      configurable: true,
    });
  });

  it('should warn when the active page is not a member directory', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'www.example.com', href: 'https://www.example.com/' },
      writable: true,
      configurable: true,
    });
    const toastSpy = vi.spyOn(uiUtils, 'showToast');

    const result = await runNoPhotoList();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not on directory page');
    expect(toastSpy).toHaveBeenCalledWith(
      expect.stringContaining('Member Directory or Church Directory'),
      expect.objectContaining({ type: 'warning' })
    );
  });

  it('should detect members lacking photos from cached status and trigger CSV export', async () => {
    const downloadCsvSpy = vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});
    const toastSpy = vi.spyOn(uiUtils, 'showToast');

    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue({
      '101': {
        memberId: '101',
        firstName: 'John',
        lastName: 'Smith',
        fullName: 'John Smith',
        hasPhoto: true,
        photoUrl: 'https://example.com/photo.jpg',
        timestamp: Date.now(),
      },
      '102': {
        memberId: '102',
        firstName: 'Alice',
        lastName: 'Walker',
        fullName: 'Alice Walker',
        hasPhoto: false,
        timestamp: Date.now(),
      },
    });

    const container = document.createElement('div');
    container.innerHTML = `
      <table>
        <tbody>
          <tr id="101" role="row">
            <td><button class="member-card__styled-ghost">Smith, John</button></td>
          </tr>
          <tr id="102" role="row">
            <td><button class="member-card__styled-ghost">Walker, Alice</button></td>
          </tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const actionPromise = runNoPhotoList();
    await confirmStewardship();
    const result = await actionPromise;

    expect(result.success).toBe(true);
    expect(result.data?.missingCount).toBe(1);
    expect(downloadCsvSpy).toHaveBeenCalledTimes(1);

    const [csvContent, filename] = downloadCsvSpy.mock.calls[0];
    expect(csvContent).toContain('Alice');
    expect(csvContent).toContain('Walker');
    expect(csvContent).not.toContain('Smith');
    expect(filename).toMatch(/no_photos.*\.csv/i);
    expect(toastSpy).toHaveBeenCalledWith(
      expect.stringContaining('Found 1 members without photos'),
      expect.objectContaining({ type: 'success' })
    );
  });

  it('should not download CSV when the stewardship reminder is cancelled', async () => {
    const downloadCsvSpy = vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});

    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue({
      '102': {
        memberId: '102',
        firstName: 'Alice',
        lastName: 'Walker',
        hasPhoto: false,
        timestamp: Date.now(),
      },
    });

    document.body.innerHTML = `
      <table>
        <tbody>
          <tr id="102" role="row">
            <td><button class="member-card__styled-ghost">Walker, Alice</button></td>
          </tr>
        </tbody>
      </table>
    `;

    const actionPromise = runNoPhotoList();
    await vi.waitFor(() => {
      expect(document.querySelector('.lcr-tools-confirm-modal')).not.toBeNull();
    });
    document.querySelector<HTMLButtonElement>('#lcr-tools-cancel-btn')?.click();

    const result = await actionPromise;
    expect(result.success).toBe(false);
    expect(result.error).toBe('Cancelled by user');
    expect(downloadCsvSpy).not.toHaveBeenCalled();
  });

  it('should fetch API card for uncached members and download report for missing ones', async () => {
    const downloadCsvSpy = vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});

    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue({});
    vi.spyOn(storageUtils, 'updatePhotoCache').mockResolvedValue();
    vi.spyOn(lcrApiUtils, 'fetchMemberCard').mockResolvedValue({
      name: 'Davis, Mark',
      photoMetadata: null,
    });

    const container = document.createElement('div');
    container.innerHTML = `
      <table>
        <tbody>
          <tr id="201" role="row">
            <td><button class="member-card__styled-ghost">Davis, Mark</button></td>
          </tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const actionPromise = runNoPhotoList();
    await confirmStewardship();
    const result = await actionPromise;

    expect(result.success).toBe(true);
    expect(result.data?.missingCount).toBe(1);
    expect(downloadCsvSpy).toHaveBeenCalled();
  });

  it('should report success when all members have photos without prompting stewardship', async () => {
    const toastSpy = vi.spyOn(uiUtils, 'showToast');
    const downloadCsvSpy = vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});

    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue({
      '301': {
        memberId: '301',
        firstName: 'Sarah',
        lastName: 'Connor',
        hasPhoto: true,
        photoUrl: 'https://example.com/sarah.jpg',
        timestamp: Date.now(),
      },
    });

    const container = document.createElement('div');
    container.innerHTML = `
      <table>
        <tbody>
          <tr id="301" role="row">
            <td><button class="member-card__styled-ghost">Connor, Sarah</button></td>
          </tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const result = await runNoPhotoList();

    expect(result.success).toBe(true);
    expect(result.data?.missingCount).toBe(0);
    expect(downloadCsvSpy).not.toHaveBeenCalled();
    expect(document.querySelector('.lcr-tools-confirm-modal')).toBeNull();
    expect(toastSpy).toHaveBeenCalledWith(
      expect.stringContaining('All members in this view have photos!'),
      expect.objectContaining({ type: 'success' })
    );
  });

  it('should switch from Households to Individuals before scanning LCR rows', async () => {
    const downloadCsvSpy = vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});
    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue({});
    vi.spyOn(storageUtils, 'updatePhotoCache').mockResolvedValue();
    vi.spyOn(lcrApiUtils, 'fetchMemberCard').mockResolvedValue({
      name: 'Photo, Member',
      photoMetadata: null,
    });

    document.body.innerHTML = `
      <div role="tablist" class="eden-tabs__tab-list">
        <button id="tab-individuals" role="tab" aria-selected="false">Individuals</button>
        <button id="tab-households" role="tab" aria-selected="true">Households</button>
      </div>
      <table>
        <tbody>
          <tr id="household-1" role="row"><td>Smith Household</td></tr>
        </tbody>
      </table>
    `;

    const individualsTab = document.getElementById('tab-individuals') as HTMLButtonElement;
    const householdsTab = document.getElementById('tab-households') as HTMLButtonElement;
    individualsTab.addEventListener('click', () => {
      individualsTab.setAttribute('aria-selected', 'true');
      householdsTab.setAttribute('aria-selected', 'false');
      const table = document.querySelector('table');
      if (table) {
        table.innerHTML = `
          <tbody>
            <tr id="member-missing" role="row">
              <td><button class="member-card__styled-ghost">Missing, Member</button></td>
            </tr>
          </tbody>
        `;
      }
    });

    const actionPromise = runNoPhotoList();
    await confirmStewardship();
    const result = await actionPromise;

    expect(result.success).toBe(true);
    expect(result.data?.missingCount).toBe(1);
    expect(individualsTab.getAttribute('aria-selected')).toBe('true');
    expect(downloadCsvSpy).toHaveBeenCalled();
  });
});

/** Confirms the Handbook 33.8 stewardship dialog that appears before CSV download. */
async function confirmStewardship(): Promise<void> {
  await vi.waitFor(() => {
    expect(document.querySelector('.lcr-tools-confirm-modal')).not.toBeNull();
  });
  const modal = document.querySelector('.lcr-tools-confirm-modal');
  expect(modal?.textContent).toContain('Data Stewardship Reminder');
  document.querySelector<HTMLButtonElement>('#lcr-tools-confirm-btn')?.click();
}
