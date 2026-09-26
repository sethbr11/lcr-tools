import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runTableFilters } from '@/actions/tableFilters';

describe('tableFilters - multi-table filtering, transitions, and unfilterable table omission', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.__LCR_TABLE_FILTERS_STATE__ = undefined;
    vi.restoreAllMocks();
  });

  it('should correctly filter Assigned Households and handle transitioning from No (0 matches) to Yes without deadlock', async () => {
    delete (window as Window & { __LCR_TABLE_FILTERS_STATE__?: unknown })
      .__LCR_TABLE_FILTERS_STATE__;

    const container = document.createElement('div');
    container.innerHTML = `
      <div class="eden-stack">
        <div class="eden-table-card-view__container" id="card-1">
          <table class="lcr-data-table" id="table-1">
            <thead>
              <tr>
                <th>Ministering Brothers</th>
                <th>Assigned Households</th>
              </tr>
            </thead>
            <tbody>
              <tr id="t1-r1">
                <td><a>Brother A</a><a>Brother B</a></td>
                <td><a>Household 1</a><a>Household 2</a></td>
              </tr>
              <tr id="t1-r2">
                <td><a>Brother C</a></td>
                <td><a>Household 3</a></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="eden-stack">
        <div class="eden-table-card-view__container" id="card-2">
          <table class="lcr-data-table" id="table-2">
            <thead>
              <tr>
                <th>Ministering Brothers</th>
                <th>Assigned Households</th>
              </tr>
            </thead>
            <tbody>
              <tr id="t2-r1">
                <td><a>Brother D</a><a>Brother E</a></td>
                <td><a>Household 4</a></td>
              </tr>
              <tr id="t2-r2">
                <td><a>Brother F</a></td>
                <td><button>Assign</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    await runTableFilters();

    const sideModal = document.querySelector('#lcr-tools-table-filter-modal') as HTMLElement;
    expect(sideModal).not.toBeNull();

    const householdsSelect = Array.from(sideModal.querySelectorAll('select')).find((s) => {
      const lbl = s.closest('div')?.querySelector('label')?.textContent || '';
      return lbl.includes('Assigned Households');
    }) as HTMLSelectElement;

    expect(householdsSelect).toBeDefined();

    const t1r1 = document.getElementById('t1-r1') as HTMLTableRowElement;
    const t1r2 = document.getElementById('t1-r2') as HTMLTableRowElement;
    const t2r1 = document.getElementById('t2-r1') as HTMLTableRowElement;
    const t2r2 = document.getElementById('t2-r2') as HTMLTableRowElement;
    const section1 = (document.getElementById('card-1')?.parentElement ||
      document.getElementById('card-1')) as HTMLElement;
    const section2 = (document.getElementById('card-2')?.parentElement ||
      document.getElementById('card-2')) as HTMLElement;

    // 1. Select "No" (unassigned households)
    // Table 1 has 0 unassigned companionships -> Table 1 & section1 should be hidden
    // Table 2 has 1 unassigned companionship (t2-r2 with "Assign") -> t2-r2 visible, t2-r1 hidden
    householdsSelect.value = 'No';
    householdsSelect.dispatchEvent(new Event('change'));

    expect(t1r1.style.display).toBe('none');
    expect(t1r2.style.display).toBe('none');
    expect(section1.style.display).toBe('none');

    expect(t2r1.style.display).toBe('none');
    expect(t2r2.style.display).toBe('');
    expect(section2.style.display).toBe('');

    // 2. Transition from "No" to "Yes"
    // Section 1 MUST unhide and show its rows with assigned households
    householdsSelect.value = 'Yes';
    householdsSelect.dispatchEvent(new Event('change'));

    expect(section1.style.display).toBe('');
    expect(t1r1.style.display).toBe('');
    expect(t1r2.style.display).toBe('');

    expect(section2.style.display).toBe('');
    expect(t2r1.style.display).toBe('');
    expect(t2r2.style.display).toBe('none');

    // 3. Transition back to "No"
    householdsSelect.value = 'No';
    householdsSelect.dispatchEvent(new Event('change'));
    expect(section1.style.display).toBe('none');
    expect(t2r2.style.display).toBe('');

    // 4. Transition to "All" (empty)
    householdsSelect.value = '';
    householdsSelect.dispatchEvent(new Event('change'));
    expect(section1.style.display).toBe('');
    expect(t1r1.style.display).toBe('');
    expect(t1r2.style.display).toBe('');
    expect(t2r1.style.display).toBe('');
    expect(t2r2.style.display).toBe('');
  });

  it('should ignore tables that have zero filterable columns and omit table selector if only 1 filterable table remains', async () => {
    delete (window as Window & { __LCR_TABLE_FILTERS_STATE__?: unknown })
      .__LCR_TABLE_FILTERS_STATE__;

    const container = document.createElement('div');
    container.innerHTML = `
      <div class="card-1">
        <h3>Unassigned Ministering Brothers</h3>
        <table class="table-filterable">
          <thead><tr><th>Name</th><th>Age</th></tr></thead>
          <tbody>
            <tr><td>Bro A</td><td>24</td></tr>
            <tr><td>Bro B</td><td>30</td></tr>
          </tbody>
        </table>
      </div>
      <div class="card-2">
        <h3>Unassigned Households</h3>
        <table class="table-unfilterable">
          <thead><tr><th>Name</th></tr></thead>
          <tbody>
            <tr><td>Smith Family</td></tr>
            <tr><td>Jones Family</td></tr>
          </tbody>
        </table>
      </div>
    `;
    document.body.appendChild(container);

    const tables = container.querySelectorAll('table');
    tables.forEach((tbl) => {
      Object.defineProperty(tbl, 'offsetWidth', { value: 300 });
      tbl.querySelectorAll('th, tr').forEach((el) => {
        Object.defineProperty(el, 'offsetWidth', { value: 50 });
      });
    });

    const result = await runTableFilters();
    expect(result.success).toBe(true);

    const sideModal = document.querySelector('#lcr-tools-table-filter-modal') as HTMLElement;
    expect(sideModal).not.toBeNull();

    // Table selector should NOT be present because only 1 filterable table exists!
    const tableSelect = sideModal.querySelector('#lcr-tools-table-selector');
    expect(tableSelect).toBeNull();

    // Table header name should show Unassigned Ministering Brothers
    const currentTableEl = sideModal.querySelector('#lcr-tools-current-table-name');
    expect(currentTableEl?.textContent).toBe('Table: Unassigned Ministering Brothers');

    // Controls should have Age filter, but no pill badge for scope since there is only 1 table
    expect(sideModal.textContent).not.toContain('only]');
    const minAgeInput = sideModal.querySelector('#lcr-tools-filter-1-min');
    expect(minAgeInput).not.toBeNull();
  });
});
