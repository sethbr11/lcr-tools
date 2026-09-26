import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runTableFilters } from '@/actions/tableFilters';

describe('tableFilters - date filtering and table selector UI', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.__LCR_TABLE_FILTERS_STATE__ = undefined;
    vi.restoreAllMocks();
  });

  it('should support month-day filtering on birthday lists without year', async () => {
    delete (window as Window & { __LCR_TABLE_FILTERS_STATE__?: unknown })
      .__LCR_TABLE_FILTERS_STATE__;

    const container = document.createElement('div');
    container.innerHTML = `
      <table class="lcr-data-table">
        <thead>
          <tr>
            <th>Birthday</th>
            <th>Name</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <tr id="bday-1"><td>1 Sep</td><td>Alice</td><td>23</td></tr>
          <tr id="bday-2"><td>15 Sep</td><td>Bob</td><td>25</td></tr>
          <tr id="bday-3"><td>24 Dec</td><td>Charlie</td><td>30</td></tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    await runTableFilters();

    const sideModal = document.querySelector('#lcr-tools-table-filter-modal') as HTMLElement;
    expect(sideModal).not.toBeNull();

    // Birthday column (col 0) should render month dropdown and day range inputs
    const monthSelect = sideModal.querySelector('#lcr-tools-filter-0-month') as HTMLSelectElement;
    const fromDayInput = sideModal.querySelector(
      '#lcr-tools-filter-0-from-day'
    ) as HTMLInputElement;
    const toDayInput = sideModal.querySelector('#lcr-tools-filter-0-to-day') as HTMLInputElement;

    expect(monthSelect).not.toBeNull();
    expect(fromDayInput).not.toBeNull();
    expect(toDayInput).not.toBeNull();

    const row1 = document.getElementById('bday-1') as HTMLTableRowElement;
    const row2 = document.getElementById('bday-2') as HTMLTableRowElement;
    const row3 = document.getElementById('bday-3') as HTMLTableRowElement;

    // Filter by Month = September (9)
    monthSelect.value = '9';
    monthSelect.dispatchEvent(new Event('change'));

    expect(row1.style.display).toBe('');
    expect(row2.style.display).toBe('');
    expect(row3.style.display).toBe('none'); // December

    // Further constrain: From Day = 10 (should exclude 1 Sep)
    fromDayInput.value = '10';
    fromDayInput.dispatchEvent(new Event('input'));

    expect(row1.style.display).toBe('none'); // 1 Sep < 10
    expect(row2.style.display).toBe(''); // 15 Sep >= 10
    expect(row3.style.display).toBe('none');
  });

  it('should auto-fill with the correct month when birthday list is scoped to a single month', async () => {
    delete (window as Window & { __LCR_TABLE_FILTERS_STATE__?: unknown })
      .__LCR_TABLE_FILTERS_STATE__;

    const container = document.createElement('div');
    container.innerHTML = `
      <table class="lcr-data-table">
        <thead>
          <tr>
            <th>Birthday</th>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>1 Sep</td><td>Alice</td></tr>
          <tr><td>15 Sep</td><td>Bob</td></tr>
          <tr><td>28 Sep</td><td>Charlie</td></tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    await runTableFilters();

    const sideModal = document.querySelector('#lcr-tools-table-filter-modal') as HTMLElement;
    expect(sideModal).not.toBeNull();

    const monthSelect = sideModal.querySelector('#lcr-tools-filter-0-month') as HTMLSelectElement;
    expect(monthSelect).not.toBeNull();
    // Month dropdown should automatically be pre-filled with September (9)
    expect(monthSelect.value).toBe('9');
  });

  it('should automatically expand months to show dropdown to 12 when All Months is selected', async () => {
    delete (window as Window & { __LCR_TABLE_FILTERS_STATE__?: unknown })
      .__LCR_TABLE_FILTERS_STATE__;

    const container = document.createElement('div');
    container.innerHTML = `
      <select id="page-months-to-show">
        <option value="1" selected>Months to show: 1</option>
        <option value="12">Months to show: 12</option>
      </select>
      <table class="lcr-data-table">
        <thead>
          <tr>
            <th>Birthday</th>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>1 Sep</td><td>Alice</td></tr>
          <tr><td>15 Sep</td><td>Bob</td></tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    await runTableFilters();

    const sideModal = document.querySelector('#lcr-tools-table-filter-modal') as HTMLElement;
    expect(sideModal).not.toBeNull();

    const monthSelect = sideModal.querySelector('#lcr-tools-filter-0-month') as HTMLSelectElement;
    expect(monthSelect).not.toBeNull();
    expect(monthSelect.value).toBe('9');

    const pageMonthsSelect = document.querySelector<HTMLSelectElement>('#page-months-to-show')!;
    expect(pageMonthsSelect.value).toBe('1');

    // User selects "All Months"
    monthSelect.value = '';
    monthSelect.dispatchEvent(new Event('change'));

    // Wait a tick for async change handler
    await new Promise((r) => setTimeout(r, 50));

    expect(pageMonthsSelect.value).toBe('12');
  });

  it('should retain Calling dropdowns when unique values exceed generic limit up to category limit', async () => {
    delete (window as Window & { __LCR_TABLE_FILTERS_STATE__?: unknown })
      .__LCR_TABLE_FILTERS_STATE__;

    // Generate 35 unique callings
    const rowsHtml = Array.from(
      { length: 35 },
      (_, i) => `<tr><td>Calling ${i + 1}</td></tr>`
    ).join('');

    const container = document.createElement('div');
    container.innerHTML = `
      <table class="lcr-data-table">
        <thead><tr><th>Calling</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;
    document.body.appendChild(container);

    await runTableFilters();

    const sideModal = document.querySelector('#lcr-tools-table-filter-modal') as HTMLElement;
    expect(sideModal).not.toBeNull();

    // Calling dropdown should be generated despite having 35 unique values (> 20)
    const callingSelect = sideModal.querySelector('#lcr-tools-filter-0') as HTMLSelectElement;
    expect(callingSelect).not.toBeNull();
    expect(callingSelect.options.length).toBe(36); // All + 35 callings
  });

  it('should render table selector dropdown with All Tables at the top when multiple tables are present', async () => {
    delete (window as Window & { __LCR_TABLE_FILTERS_STATE__?: unknown })
      .__LCR_TABLE_FILTERS_STATE__;

    const container = document.createElement('div');
    container.innerHTML = `
      <table class="lcr-data-table" id="table-1">
        <thead><tr><th>Calling</th><th>Set Apart</th></tr></thead>
        <tbody>
          <tr id="t1-r1"><td>President</td><td>Yes</td></tr>
          <tr id="t1-r2"><td>Counselor</td><td>No</td></tr>
        </tbody>
      </table>
      <table class="lcr-data-table" id="table-2">
        <thead><tr><th>Calling</th><th>Set Apart</th></tr></thead>
        <tbody>
          <tr id="t2-r1"><td>Teacher</td><td>Yes</td></tr>
          <tr id="t2-r2"><td>President</td><td>No</td></tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    await runTableFilters();

    const sideModal = document.querySelector('#lcr-tools-table-filter-modal') as HTMLElement;
    const tableSelector = sideModal.querySelector('#lcr-tools-table-selector') as HTMLSelectElement;
    expect(tableSelector).not.toBeNull();
    // 3 options: All Tables (2), Table 1, Table 2
    expect(tableSelector.options.length).toBe(3);
    expect(tableSelector.options[0].value).toBe('all');
    expect(tableSelector.options[0].text).toBe('All Tables (2)');
    expect(tableSelector.value).toBe('all');

    const titleEl = sideModal.querySelector('#lcr-tools-current-table-name');
    expect(titleEl?.textContent).toBe('Table: All Tables (2)');

    // Filter by Calling = "President" across both tables
    const callingSelect = sideModal.querySelector('#lcr-tools-filter-0') as HTMLSelectElement;
    expect(callingSelect).not.toBeNull();
    callingSelect.value = 'President';
    callingSelect.dispatchEvent(new Event('change'));

    const t1r1 = document.getElementById('t1-r1') as HTMLElement;
    const t1r2 = document.getElementById('t1-r2') as HTMLElement;
    const t2r1 = document.getElementById('t2-r1') as HTMLElement;
    const t2r2 = document.getElementById('t2-r2') as HTMLElement;

    expect(t1r1.style.display).toBe(''); // President
    expect(t1r2.style.display).toBe('none'); // Counselor
    expect(t2r1.style.display).toBe('none'); // Teacher
    expect(t2r2.style.display).toBe(''); // President

    const statusEl = sideModal.querySelector('#lcr-tools-filter-status');
    expect(statusEl?.textContent).toContain('Showing 2 of 4 rows across 2 tables');
  });
});
