import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runTableFilters } from '@/actions/tableFilters';

describe('tableFilters - ministering companionships, scope badges, and SVGs', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.__LCR_TABLE_FILTERS_STATE__ = undefined;
    vi.restoreAllMocks();
  });

  it('should parse Ministering Companion and Ministering Assignment as boolean fields and filter by presence of values', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <h3>Ministering Assignments Summary</h3>
      <table id="test-ministering">
        <thead>
          <tr>
            <th>Name</th>
            <th>Ministering Companion</th>
            <th>Ministering Assignment</th>
          </tr>
        </thead>
        <tbody>
          <tr id="row-both">
            <td>Alice Adams</td>
            <td>John Smith</td>
            <td>Doe Family</td>
          </tr>
          <tr id="row-assign-only">
            <td>Bob Baker</td>
            <td></td>
            <td>Brown Family</td>
          </tr>
          <tr id="row-none">
            <td>Charlie Clark</td>
            <td></td>
            <td></td>
          </tr>
          <tr id="row-comp-only">
            <td>David Davis</td>
            <td>Jane Doe</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const result = await runTableFilters();
    expect(result.success).toBe(true);

    const sideModal = document.querySelector('#lcr-tools-table-filter-modal') as HTMLElement;
    expect(sideModal).not.toBeNull();

    const companionSelect = sideModal.querySelector('#lcr-tools-filter-1') as HTMLSelectElement;
    const assignmentSelect = sideModal.querySelector('#lcr-tools-filter-2') as HTMLSelectElement;

    expect(companionSelect).not.toBeNull();
    expect(assignmentSelect).not.toBeNull();

    expect(Array.from(companionSelect.options).map((o) => o.text)).toEqual(['All', 'Yes', 'No']);
    expect(Array.from(assignmentSelect.options).map((o) => o.text)).toEqual(['All', 'Yes', 'No']);

    const rBoth = document.getElementById('row-both') as HTMLTableRowElement;
    const rAssignOnly = document.getElementById('row-assign-only') as HTMLTableRowElement;
    const rNone = document.getElementById('row-none') as HTMLTableRowElement;
    const rCompOnly = document.getElementById('row-comp-only') as HTMLTableRowElement;

    // Filter: Has Companion = Yes -> row-both and row-comp-only
    companionSelect.value = 'Yes';
    companionSelect.dispatchEvent(new Event('change'));

    expect(rBoth.style.display).toBe('');
    expect(rCompOnly.style.display).toBe('');
    expect(rAssignOnly.style.display).toBe('none');
    expect(rNone.style.display).toBe('none');

    // Filter: Has Companion = No -> row-assign-only and row-none
    companionSelect.value = 'No';
    companionSelect.dispatchEvent(new Event('change'));

    expect(rBoth.style.display).toBe('none');
    expect(rCompOnly.style.display).toBe('none');
    expect(rAssignOnly.style.display).toBe('');
    expect(rNone.style.display).toBe('');

    // Compound filter: Has Companion = No AND Has Assignment = Yes -> only row-assign-only
    assignmentSelect.value = 'Yes';
    assignmentSelect.dispatchEvent(new Event('change'));

    expect(rBoth.style.display).toBe('none');
    expect(rCompOnly.style.display).toBe('none');
    expect(rAssignOnly.style.display).toBe('');
    expect(rNone.style.display).toBe('none');

    // Reset filters -> all visible
    const resetBtn = Array.from(sideModal.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reset')
    );
    resetBtn?.click();

    expect(rBoth.style.display).toBe('');
    expect(rCompOnly.style.display).toBe('');
    expect(rAssignOnly.style.display).toBe('');
    expect(rNone.style.display).toBe('');
  });

  it('should permissively filter tables of differing column structures without deadlock and display scope badges', async () => {
    delete (window as Window & { __LCR_TABLE_FILTERS_STATE__?: unknown })
      .__LCR_TABLE_FILTERS_STATE__;

    const container = document.createElement('div');
    container.innerHTML = `
      <div class="eden-table-card-view__container" id="card-a">
        <h3>Leadership</h3>
        <table>
          <thead>
            <tr><th>Name</th><th>Calling</th></tr>
          </thead>
          <tbody>
            <tr id="row-a1"><td>Alice</td><td>Bishop</td></tr>
            <tr id="row-a2"><td>Bob</td><td>Clerk</td></tr>
          </tbody>
        </table>
      </div>

      <div class="eden-table-card-view__container" id="card-b">
        <h3>Classes</h3>
        <table>
          <thead>
            <tr><th>Name</th><th>Class</th></tr>
          </thead>
          <tbody>
            <tr id="row-b1"><td>Charlie</td><td>Gospel Doctrine</td></tr>
            <tr id="row-b2"><td>David</td><td>Youth</td></tr>
          </tbody>
        </table>
      </div>

      <div class="eden-table-card-view__container" id="card-c">
        <h3>Facilities</h3>
        <table>
          <thead>
            <tr><th>Name</th><th>Room</th></tr>
          </thead>
          <tbody>
            <tr id="row-c1"><td>Hall</td><td>101</td></tr>
          </tbody>
        </table>
      </div>
    `;
    document.body.appendChild(container);

    await runTableFilters();

    const sideModal = document.querySelector('#lcr-tools-table-filter-modal') as HTMLElement;
    expect(sideModal).not.toBeNull();

    // Verify scope badges rendered on labels since columns only exist in 1 of 3 tables
    const scopeBadges = sideModal.querySelectorAll('.lcr-tools-filter-scope-badge');
    expect(scopeBadges.length).toBeGreaterThanOrEqual(2);

    const labels = Array.from(sideModal.querySelectorAll('label')).map((l) => l.textContent || '');
    expect(labels.some((l) => l.includes('Calling') && l.includes('only'))).toBe(true);
    expect(labels.some((l) => l.includes('Class') && l.includes('only'))).toBe(true);

    const callingSelect = Array.from(sideModal.querySelectorAll('select')).find((s) => {
      const lbl = s.closest('div')?.querySelector('label')?.textContent || '';
      return lbl.includes('Calling');
    }) as HTMLSelectElement;

    const classSelect = Array.from(sideModal.querySelectorAll('select')).find((s) => {
      const lbl = s.closest('div')?.querySelector('label')?.textContent || '';
      return lbl.includes('Class');
    }) as HTMLSelectElement;

    expect(callingSelect).toBeDefined();
    expect(classSelect).toBeDefined();

    const rA1 = document.getElementById('row-a1') as HTMLTableRowElement;
    const rA2 = document.getElementById('row-a2') as HTMLTableRowElement;
    const rB1 = document.getElementById('row-b1') as HTMLTableRowElement;
    const rB2 = document.getElementById('row-b2') as HTMLTableRowElement;
    const rC1 = document.getElementById('row-c1') as HTMLTableRowElement;

    // Apply Calling = Bishop AND Class = Gospel Doctrine
    // Table A should evaluate Calling = Bishop (skipping Class) -> row-a1 shown, row-a2 hidden
    // Table B should evaluate Class = Gospel Doctrine (skipping Calling) -> row-b1 shown, row-b2 hidden
    // Table C has neither column -> hidden
    callingSelect.value = 'Bishop';
    callingSelect.dispatchEvent(new Event('change'));
    classSelect.value = 'Gospel Doctrine';
    classSelect.dispatchEvent(new Event('change'));

    expect(rA1.style.display).toBe('');
    expect(rA2.style.display).toBe('none');
    expect(rB1.style.display).toBe('');
    expect(rB2.style.display).toBe('none');
    expect(rC1.style.display).toBe('none');
  });

  it('should parse ministering district table names, checkmark SVGs, and companionship links', async () => {
    delete (window as Window & { __LCR_TABLE_FILTERS_STATE__?: unknown })
      .__LCR_TABLE_FILTERS_STATE__;

    const container = document.createElement('div');
    container.innerHTML = `
      <div class="sc-card-district" id="card-dist-1">
        <div>District 1</div>
        <div>Presidency Member: Wilson, Henry</div>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Ministering Brothers</th>
              <th>Jul</th>
              <th>Quarter 3</th>
              <th>Assigned Households</th>
            </tr>
          </thead>
          <tbody>
            <tr id="row-pair">
              <td><input type="checkbox"/></td>
              <td>
                <a href="#m1">Miller, Chris</a>
                <a href="#m2">Nelson, Mark</a>
              </td>
              <td><svg name="checkmarkActive"></svg></td>
              <td><svg name="checkmarkForCheckbox"></svg></td>
              <td><a href="#h1">Harrison Family</a></td>
            </tr>
            <tr id="row-single">
              <td><input type="checkbox"/></td>
              <td>
                <a href="#m3">Miller, Jordan</a>
              </td>
              <td><svg name="openCircle"></svg></td>
              <td></td>
              <td><a href="#h2">Parker Family</a></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    document.body.appendChild(container);

    await runTableFilters();

    const sideModal = document.querySelector('#lcr-tools-table-filter-modal') as HTMLElement;
    expect(sideModal).not.toBeNull();

    // Verify district table name derivation
    const tableSelector = sideModal.querySelector('#lcr-tools-table-selector') as HTMLSelectElement;
    if (tableSelector) {
      const optionsText = Array.from(tableSelector.options).map((o) => o.text);
      expect(optionsText.some((t) => t.includes('District 1 (Wilson, Henry)'))).toBe(true);
    }

    const rPair = document.getElementById('row-pair') as HTMLTableRowElement;
    const rSingle = document.getElementById('row-single') as HTMLTableRowElement;

    const brothersSelect = Array.from(sideModal.querySelectorAll('select')).find((s) => {
      const lbl = s.closest('div')?.querySelector('label')?.textContent || '';
      return lbl.includes('Ministering Brothers');
    }) as HTMLSelectElement;

    const julSelect = Array.from(sideModal.querySelectorAll('select')).find((s) => {
      const lbl = s.closest('div')?.querySelector('label')?.textContent || '';
      return lbl.includes('Jul');
    }) as HTMLSelectElement;

    const q3Select = Array.from(sideModal.querySelectorAll('select')).find((s) => {
      const lbl = s.closest('div')?.querySelector('label')?.textContent || '';
      return lbl.includes('Quarter 3');
    }) as HTMLSelectElement;

    expect(brothersSelect).toBeDefined();
    expect(julSelect).toBeDefined();
    expect(q3Select).toBeDefined();

    // Test Companionship Pair (Yes = 2+ members) vs Single (No = 1 member)
    brothersSelect.value = 'Yes';
    brothersSelect.dispatchEvent(new Event('change'));
    expect(rPair.style.display).toBe('');
    expect(rSingle.style.display).toBe('none');

    brothersSelect.value = 'No';
    brothersSelect.dispatchEvent(new Event('change'));
    expect(rPair.style.display).toBe('none');
    expect(rSingle.style.display).toBe('');

    brothersSelect.value = '';
    brothersSelect.dispatchEvent(new Event('change'));

    // Test Jul contact checkmarkActive (Yes) vs openCircle (No)
    julSelect.value = 'Yes';
    julSelect.dispatchEvent(new Event('change'));
    expect(rPair.style.display).toBe('');
    expect(rSingle.style.display).toBe('none');

    julSelect.value = 'No';
    julSelect.dispatchEvent(new Event('change'));
    expect(rPair.style.display).toBe('none');
    expect(rSingle.style.display).toBe('');

    julSelect.value = '';
    julSelect.dispatchEvent(new Event('change'));

    // Test Quarter 3 interview checkmarkForCheckbox (Yes) vs empty (No)
    q3Select.value = 'Yes';
    q3Select.dispatchEvent(new Event('change'));
    expect(rPair.style.display).toBe('');
    expect(rSingle.style.display).toBe('none');
  });
});
