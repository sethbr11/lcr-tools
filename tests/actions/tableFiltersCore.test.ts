import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runTableFilters } from '@/actions/tableFilters';
import * as uiUtils from '@/utils/ui/uiUtils';

describe('tableFilters - core filter discovery, types, and persistence', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.__LCR_TABLE_FILTERS_STATE__ = undefined;
    vi.restoreAllMocks();
  });

  it('should notify user if no tables exist to filter', async () => {
    const toastSpy = vi.spyOn(uiUtils, 'showToast');

    const result = await runTableFilters();
    expect(result.success).toBe(false);
    expect(result.error).toBe('No tables found');
    expect(toastSpy).toHaveBeenCalledWith(
      expect.stringContaining('No tables found'),
      expect.objectContaining({ type: 'warning' })
    );
  });

  it('should exclude personal columns and handle dropdown and range filters', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <h3>Ward Member Directory</h3>
      <table id="test-members">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone Number</th>
            <th>E-mail</th>
            <th>Address</th>
            <th>Gender</th>
            <th>Age</th>
            <th>Birth Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr id="row-1">
            <td>John Smith</td>
            <td>555-0101</td>
            <td>john@example.com</td>
            <td>123 Main St</td>
            <td>Male</td>
            <td>28</td>
            <td>1996-05-12</td>
            <td>Active</td>
          </tr>
          <tr id="row-2">
            <td>Jane Doe</td>
            <td>555-0102</td>
            <td>jane@example.com</td>
            <td>456 Oak Ave</td>
            <td>Female</td>
            <td>22</td>
            <td>2002-08-20</td>
            <td>Active</td>
          </tr>
          <tr id="row-3">
            <td>Mary Johnson</td>
            <td>555-0103</td>
            <td>mary@example.com</td>
            <td>789 Pine Rd</td>
            <td>Female</td>
            <td>45</td>
            <td>1979-11-04</td>
            <td>Prospective</td>
          </tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const result = await runTableFilters();

    expect(result.success).toBe(true);
    // 4 filterable columns: Gender, Age, Birth Date, Status (Name, Phone, Email, Address are excluded)
    expect(result.data?.columnsFiltered).toBe(4);

    const sideModal = document.querySelector('#lcr-tools-table-filter-modal');
    expect(sideModal).not.toBeNull();

    // Verify personal info columns are NOT registered as filters
    expect(sideModal?.querySelector('#lcr-tools-filter-0')).toBeNull(); // Name
    expect(sideModal?.querySelector('#lcr-tools-filter-1')).toBeNull(); // Phone
    expect(sideModal?.querySelector('#lcr-tools-filter-2')).toBeNull(); // Email
    expect(sideModal?.querySelector('#lcr-tools-filter-3')).toBeNull(); // Address

    // Verify Gender dropdown exists (column 4)
    const genderSelect = sideModal?.querySelector('#lcr-tools-filter-4') as HTMLSelectElement;
    expect(genderSelect).not.toBeNull();

    // Verify Age number range inputs exist (column 5)
    const ageMinInput = sideModal?.querySelector('#lcr-tools-filter-5-min') as HTMLInputElement;
    const ageMaxInput = sideModal?.querySelector('#lcr-tools-filter-5-max') as HTMLInputElement;
    expect(ageMinInput).not.toBeNull();
    expect(ageMaxInput).not.toBeNull();

    // Verify Birth Date range inputs exist (column 6)
    const birthFromInput = sideModal?.querySelector('#lcr-tools-filter-6-from') as HTMLInputElement;
    const birthToInput = sideModal?.querySelector('#lcr-tools-filter-6-to') as HTMLInputElement;
    expect(birthFromInput).not.toBeNull();
    expect(birthToInput).not.toBeNull();

    // Verify Status dropdown exists (column 7)
    const statusSelect = sideModal?.querySelector('#lcr-tools-filter-7') as HTMLSelectElement;
    expect(statusSelect).not.toBeNull();

    const row1 = document.getElementById('row-1') as HTMLTableRowElement;
    const row2 = document.getElementById('row-2') as HTMLTableRowElement;
    const row3 = document.getElementById('row-3') as HTMLTableRowElement;

    // 1. Test Gender Filter: Select "Female"
    genderSelect.value = 'Female';
    genderSelect.dispatchEvent(new Event('change'));

    expect(row1.style.display).toBe('none'); // Male
    expect(row2.style.display).toBe(''); // Female, 22
    expect(row3.style.display).toBe(''); // Female, 45

    // 2. Test Number Range Filter: Age max = 30
    ageMaxInput.value = '30';
    ageMaxInput.dispatchEvent(new Event('input'));

    expect(row1.style.display).toBe('none');
    expect(row2.style.display).toBe(''); // Female, 22 (<= 30)
    expect(row3.style.display).toBe('none'); // Female, 45 (> 30)

    // 3. Test Date Range Filter: From date after Jane Doe's birthday
    birthFromInput.value = '2005-01-01';
    birthFromInput.dispatchEvent(new Event('input'));

    expect(row1.style.display).toBe('none');
    expect(row2.style.display).toBe('none'); // Born 2002 (< 2005)
    expect(row3.style.display).toBe('none');

    // 4. Test Reset Filters
    const resetBtn = Array.from(sideModal?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Reset Filters')
    );
    expect(resetBtn).toBeDefined();
    resetBtn?.click();

    expect(row1.style.display).toBe('');
    expect(row2.style.display).toBe('');
    expect(row3.style.display).toBe('');
    expect(genderSelect.value).toBe('');
    expect(ageMinInput.value).toBe('');
    expect(ageMaxInput.value).toBe('');
    expect(birthFromInput.value).toBe('');
    expect(birthToInput.value).toBe('');
  });

  it('should persist filter values and table row states when modal is closed and reopened', async () => {
    delete (window as Window & { __LCR_TABLE_FILTERS_STATE__?: unknown })
      .__LCR_TABLE_FILTERS_STATE__;

    const container = document.createElement('div');
    container.innerHTML = `
      <h3>Ward Member Directory</h3>
      <table id="test-members-persist">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Address</th>
            <th>Gender</th>
            <th>Age</th>
            <th>Birth Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr id="p-row-1">
            <td>John Smith</td><td>555-0101</td><td>j@test.com</td><td>123 St</td>
            <td>Male</td><td>28</td><td>1996-05-12</td><td>Active</td>
          </tr>
          <tr id="p-row-2">
            <td>Jane Doe</td><td>555-0102</td><td>jd@test.com</td><td>456 St</td>
            <td>Female</td><td>22</td><td>2002-08-20</td><td>Active</td>
          </tr>
          <tr id="p-row-3">
            <td>Mary Johnson</td><td>555-0103</td><td>m@test.com</td><td>789 St</td>
            <td>Female</td><td>45</td><td>1979-11-04</td><td>Prospective</td>
          </tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    // Initial run
    await runTableFilters();

    const sideModal1 = document.querySelector('#lcr-tools-table-filter-modal') as HTMLElement;
    const genderSelect1 = sideModal1.querySelector('#lcr-tools-filter-4') as HTMLSelectElement;
    const ageMinInput1 = sideModal1.querySelector('#lcr-tools-filter-5-min') as HTMLInputElement;

    genderSelect1.value = 'Female';
    genderSelect1.dispatchEvent(new Event('change'));

    ageMinInput1.value = '25';
    ageMinInput1.dispatchEvent(new Event('input'));

    const row1 = document.getElementById('p-row-1') as HTMLTableRowElement;
    const row2 = document.getElementById('p-row-2') as HTMLTableRowElement;
    const row3 = document.getElementById('p-row-3') as HTMLTableRowElement;

    expect(row1.style.display).toBe('none');
    expect(row2.style.display).toBe('none'); // Female 22 (< 25)
    expect(row3.style.display).toBe(''); // Female 45 (>= 25)

    // Close modal
    const closeBtn = sideModal1.querySelector('button[aria-label="Close"]') as HTMLButtonElement;
    closeBtn?.click();

    // Table rows must remain filtered after modal is closed
    expect(row1.style.display).toBe('none');
    expect(row2.style.display).toBe('none');
    expect(row3.style.display).toBe('');

    // Reopen modal by running tableFilters again
    await runTableFilters();

    const sideModal2 = document.querySelector('#lcr-tools-table-filter-modal') as HTMLElement;
    expect(sideModal2).not.toBeNull();

    const genderSelect2 = sideModal2.querySelector('#lcr-tools-filter-4') as HTMLSelectElement;
    const ageMinInput2 = sideModal2.querySelector('#lcr-tools-filter-5-min') as HTMLInputElement;

    // Filter values must still be populated in the reopened modal
    expect(genderSelect2.value).toBe('Female');
    expect(ageMinInput2.value).toBe('25');

    // Status bar must display persisted count
    const statusBar = sideModal2.querySelector('#lcr-tools-filter-status');
    expect(statusBar?.textContent).toContain('Showing 1 of 3 rows');
  });

  it('should update table footer count when filtering and restore on reset', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <table id="eden-test-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Gender</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr id="r-1"><td>John Doe</td><td>Male</td><td>Active</td></tr>
          <tr id="r-2"><td>Jane Smith</td><td>Female</td><td>Active</td></tr>
          <tr id="r-3"><td>Alice Taylor</td><td>Female</td><td>Prospective</td></tr>
        </tbody>
        <tfoot class="eden-table-tfoot">
          <tr role="row">
            <td class="eden-table-td"></td>
            <td class="eden-table-td" colspan="2">
              <span class="eden-headings-h6 eden-table-card-view__cloned-column-header" aria-hidden="true">Name</span>
              <div class="table-container__footer-row">
                <div class="eden-text eden-text-text4">Count: 3</div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    `;
    document.body.appendChild(container);

    await runTableFilters();

    const sideModal = document.querySelector('#lcr-tools-table-filter-modal') as HTMLElement;
    expect(sideModal).not.toBeNull();

    const footerCountEl = document.querySelector(
      '#eden-test-table tfoot .table-container__footer-row .eden-text'
    ) as HTMLElement;
    expect(footerCountEl).not.toBeNull();
    expect(footerCountEl.textContent?.trim()).toBe('Count: 3');

    // Filter by Gender = Female
    const genderSelect = sideModal.querySelector('#lcr-tools-filter-1') as HTMLSelectElement;
    genderSelect.value = 'Female';
    genderSelect.dispatchEvent(new Event('change'));

    // Verify footer was updated to show filtered count
    expect(footerCountEl.innerHTML).toContain('Count: 2');
    expect(footerCountEl.textContent).toContain('Count: 2 of 3 (filtered)');

    // Reset filters
    const resetBtn = Array.from(sideModal.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reset Filters')
    );
    expect(resetBtn).toBeDefined();
    resetBtn?.click();

    // Verify footer was restored to original text
    expect(footerCountEl.textContent?.trim()).toBe('Count: 3');
    expect(footerCountEl.hasAttribute('data-lcr-original-count')).toBe(false);

    // Re-filter by Gender = Female then clear select to empty
    genderSelect.value = 'Female';
    genderSelect.dispatchEvent(new Event('change'));
    expect(footerCountEl.textContent).toContain('Count: 2 of 3 (filtered)');

    genderSelect.value = '';
    genderSelect.dispatchEvent(new Event('change'));
    expect(footerCountEl.textContent?.trim()).toBe('Count: 3');
    expect(footerCountEl.hasAttribute('data-lcr-original-count')).toBe(false);
  });

  it('should gracefully handle tables without a footer count element', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <table id="no-footer-table">
        <thead>
          <tr><th>Name</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr><td>Member 1</td><td>Active</td></tr>
          <tr><td>Member 2</td><td>Prospective</td></tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const result = await runTableFilters();
    expect(result.success).toBe(true);

    const sideModal = document.querySelector('#lcr-tools-table-filter-modal') as HTMLElement;
    const statusSelect = sideModal.querySelector('#lcr-tools-filter-1') as HTMLSelectElement;
    statusSelect.value = 'Active';
    expect(() => statusSelect.dispatchEvent(new Event('change'))).not.toThrow();
  });

  it('should update Eden footer with raw numeric count as seen in anonymized dom output', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <table id="eden-raw-number-table">
        <thead>
          <tr><th>Name</th><th>Gender</th></tr>
        </thead>
        <tbody>
          <tr><td>Member A</td><td>Female</td></tr>
          <tr><td>Member B</td><td>Male</td></tr>
        </tbody>
        <tfoot class="eden-table-tfoot">
          <tr>
            <td></td>
            <td colspan="2">
              <div class="table-container__footer-row">
                <div class="eden-text eden-text-text4">123</div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    `;
    document.body.appendChild(container);

    await runTableFilters();

    const sideModal = document.querySelector('#lcr-tools-table-filter-modal') as HTMLElement;
    const genderSelect = sideModal.querySelector('#lcr-tools-filter-1') as HTMLSelectElement;
    const footerCountEl = document.querySelector(
      '#eden-raw-number-table tfoot .table-container__footer-row .eden-text'
    ) as HTMLElement;

    expect(footerCountEl.textContent?.trim()).toBe('123');

    genderSelect.value = 'Female';
    genderSelect.dispatchEvent(new Event('change'));

    expect(footerCountEl.innerHTML).toContain('Count: 1');
    expect(footerCountEl.textContent).toContain('Count: 1 of 123 (filtered)');

    genderSelect.value = '';
    genderSelect.dispatchEvent(new Event('change'));

    expect(footerCountEl.textContent?.trim()).toBe('123');
  });
});
