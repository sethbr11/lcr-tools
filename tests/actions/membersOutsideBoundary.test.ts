import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runMembersOutsideBoundary } from '@/actions/membersOutsideBoundary';
import { Constants } from '@/actions/membersOutsideBoundary/types';
import * as fileUtils from '@/utils/fileUtils';

describe('membersOutsideBoundary - functional user expectations', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('should execute audit immediately without prompting for page reload', async () => {
    const reloadMock = vi.fn();
    const loc = new URL('https://directory.churchofjesuschrist.org/12345') as unknown as Location;
    loc.reload = reloadMock;
    Object.defineProperty(window, 'location', {
      value: loc,
      writable: true,
      configurable: true,
    });

    const container = document.createElement('div');
    container.innerHTML = `
      <div class="household-item">
        <span class="household-name">Smith, John & Mary</span>
        <span class="household-address">123 Main St</span>
      </div>
    `;
    document.body.appendChild(container);

    const result = await runMembersOutsideBoundary();
    expect(result.success).toBe(true);
    expect(reloadMock).not.toHaveBeenCalled();
    expect(document.querySelector('#lcr-tools-boundary-audit-modal')).not.toBeNull();
  });

  it('should process post-reload audit and present interactive audit dialog with CSV export', async () => {
    const downloadCsvSpy = vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});

    // Set pending flag as if page just reloaded
    sessionStorage.setItem(Constants.AUDIT_PENDING_KEY, 'true');

    // Populate mock DOM household cards
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="household-item">
        <span class="household-name">Smith, John & Mary</span>
        <span class="household-address">123 Main St</span>
      </div>
      <div class="household-item">
        <span class="household-name">Johnson, Robert</span>
        <span class="household-address">456 Elm St</span>
      </div>
    `;
    document.body.appendChild(container);

    const result = await runMembersOutsideBoundary();

    expect(result.success).toBe(true);
    // Flag should be cleaned up
    expect(sessionStorage.getItem('lcr_tools_boundary_audit_pending')).toBeNull();

    // Verify audit modal opened
    const modal = document.querySelector('#lcr-tools-boundary-audit-modal');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('Ward Boundary Audit');
    expect(modal?.textContent).toContain('Smith, John & Mary');
    expect(modal?.textContent).toContain('Johnson, Robert');

    // Click download CSV button
    const csvBtn = modal?.querySelector('#lcr-download-audit-csv') as HTMLButtonElement;
    expect(csvBtn).not.toBeNull();
    csvBtn.click();

    await vi.waitFor(() => {
      expect(document.querySelector('.lcr-tools-confirm-modal')).not.toBeNull();
    });
    const stewardshipModal = document.querySelector('.lcr-tools-confirm-modal');
    expect(stewardshipModal?.textContent).toContain('Data Stewardship Reminder');
    expect(stewardshipModal?.textContent).toContain('Handbook Section 33.8');

    const confirmBtn = stewardshipModal?.querySelector(
      '#lcr-tools-confirm-btn'
    ) as HTMLButtonElement;
    confirmBtn.click();

    await vi.waitFor(() => {
      expect(downloadCsvSpy).toHaveBeenCalledTimes(1);
    });
    const [csvContent, filename] = downloadCsvSpy.mock.calls[0];
    expect(csvContent).toContain('"Name","Status","Address","Latitude","Longitude"');
    expect(csvContent).toContain('Smith, John & Mary');
    expect(csvContent).toContain('123 Main St');
    expect(filename).toBe('boundary_audit_results.csv');
  });

  it('should not download the audit CSV when the stewardship reminder is cancelled', async () => {
    const downloadCsvSpy = vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});
    sessionStorage.setItem(Constants.AUDIT_PENDING_KEY, 'true');

    const container = document.createElement('div');
    container.innerHTML = `
      <div class="household-item">
        <span class="household-name">Smith, John & Mary</span>
        <span class="household-address">123 Main St</span>
      </div>
    `;
    document.body.appendChild(container);

    await runMembersOutsideBoundary();

    const csvBtn = document.querySelector('#lcr-download-audit-csv') as HTMLButtonElement;
    csvBtn.click();

    await vi.waitFor(() => {
      expect(document.querySelector('.lcr-tools-confirm-modal')).not.toBeNull();
    });
    document.querySelector<HTMLButtonElement>('#lcr-tools-cancel-btn')?.click();

    await vi.waitFor(() => {
      expect(document.querySelector('.lcr-tools-confirm-modal')).toBeNull();
    });
    expect(downloadCsvSpy).not.toHaveBeenCalled();
    expect(document.querySelector('#lcr-tools-boundary-audit-modal')).not.toBeNull();
  });

  it('should fetch boundary GeoJSON and households from Church APIs and accurately classify locations', async () => {
    // Mock location with unit number in pathname
    const loc = new URL('https://directory.churchofjesuschrist.org/12345') as unknown as Location;
    Object.defineProperty(window, 'location', {
      value: loc,
      writable: true,
      configurable: true,
    });

    // Mock Church API responses
    const mockBoundary = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    };

    const mockHouseholds = [
      {
        name: 'Inside Family',
        address: '5 Center St\nCity State 12345',
        coordinates: { latitude: 5, longitude: 5 },
      },
      {
        name: 'Outside Family',
        address: '50 Far Away Rd\nCity State 12345',
        coordinates: { latitude: 50, longitude: 50 },
      },
      {
        name: 'Unmapped Family',
        address: '100 Unknown Way\nCity State 12345',
        coordinates: { latitude: 0, longitude: 0 },
      },
    ];

    vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('boundary')) {
        return {
          ok: true,
          json: async () => mockBoundary,
        } as Response;
      }
      if (url.includes('households')) {
        return {
          ok: true,
          json: async () => mockHouseholds,
        } as Response;
      }
      return { ok: false } as Response;
    });

    const result = await runMembersOutsideBoundary({ skipReload: true });

    expect(result.success).toBe(true);
    const summary = result.data as {
      insideCount: number;
      outsideCount: number;
      unmappedCount: number;
      totalCount: number;
    };
    expect(summary.totalCount).toBe(3);
    expect(summary.insideCount).toBe(1);
    expect(summary.outsideCount).toBe(1);
    expect(summary.unmappedCount).toBe(1);

    const modal = document.querySelector('#lcr-tools-boundary-audit-modal');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('Inside Family');
    expect(modal?.textContent).toContain('Outside Family');
    expect(modal?.textContent).toContain('Unmapped Family');
    expect(modal?.textContent).toContain('INSIDE');
    expect(modal?.textContent).toContain('OUTSIDE');
    expect(modal?.textContent).toContain('UNMAPPED');
  });

  it('should resolve and audit 4-digit unit from pathname', async () => {
    const loc = new URL('https://directory.churchofjesuschrist.org/1234') as unknown as Location;
    Object.defineProperty(window, 'location', {
      value: loc,
      writable: true,
      configurable: true,
    });

    let requestedBoundaryUrl = '';
    let requestedHouseholdsUrl = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('boundary')) {
        requestedBoundaryUrl = url;
        return {
          ok: true,
          json: async () => ({
            type: 'Polygon',
            coordinates: [
              [
                [-111.7, 40.2],
                [-111.6, 40.2],
                [-111.6, 40.3],
                [-111.7, 40.3],
                [-111.7, 40.2],
              ],
            ],
          }),
        } as Response;
      }
      if (url.includes('households')) {
        requestedHouseholdsUrl = url;
        return {
          ok: true,
          json: async () => [
            {
              name: 'Taylor Family',
              address: '100 Main St',
              coordinates: { latitude: 40.25, longitude: -111.65 },
            },
          ],
        } as Response;
      }
      return { ok: false } as Response;
    });

    const result = await runMembersOutsideBoundary({ skipReload: true });
    expect(result.success).toBe(true);
    expect(requestedBoundaryUrl).toContain('/1234/boundary');
    expect(requestedHouseholdsUrl).toContain('unit=1234');
  });

  it('should not automatically trigger or render modal on module import or normal page load', async () => {
    // Session flag is not set (normal page load)
    expect(sessionStorage.getItem(Constants.AUDIT_PENDING_KEY)).toBeNull();

    // DOM should remain clean with no dialogs or backdrops
    expect(document.querySelector('.lcr-tools-modal-backdrop')).toBeNull();
    expect(document.querySelector('#lcr-tools-boundary-audit-modal')).toBeNull();
  });
});
