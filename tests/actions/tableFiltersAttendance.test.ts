import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runTableFilters } from '@/actions/tableFilters';

describe('tableFilters - attendance, boolean status, and vacant calling filters', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.__LCR_TABLE_FILTERS_STATE__ = undefined;
    vi.restoreAllMocks();
  });

  it('should render rich attendance filter controls and filter by overall or class attendance', async () => {
    delete (window as Window & { __LCR_TABLE_FILTERS_STATE__?: unknown })
      .__LCR_TABLE_FILTERS_STATE__;

    const container = document.createElement('div');
    container.innerHTML = `
      <table class="lcr-data-table" id="attendance-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>2 August</th>
          </tr>
        </thead>
        <tbody>
          <tr id="member-1">
            <td>Brother Miller</td>
            <td>
              <div class="meetingCell">
                <button type="button" class="attendanceButton" aria-label="Miller, Chris, 2026-08-02, Adult Sunday School" aria-pressed="true"></button>
                <span class="meetingOrgName">Adult Sunday School</span>
              </div>
              <div class="meetingCell">
                <button type="button" class="attendanceButton" aria-label="Miller, Chris, 2026-08-02, Elders Quorum" aria-pressed="false"></button>
                <span class="meetingOrgName">Elders Quorum</span>
              </div>
            </td>
          </tr>
          <tr id="member-2">
            <td>Sister Baker</td>
            <td>
              <div class="meetingCell">
                <button type="button" class="attendanceButton" aria-label="Baker, Sarah, 2026-08-02, Adult Sunday School" aria-pressed="false"></button>
                <span class="meetingOrgName">Adult Sunday School</span>
              </div>
              <div class="meetingCell">
                <button type="button" class="attendanceButton" aria-label="Baker, Sarah, 2026-08-02, Relief Society" aria-pressed="true"></button>
                <span class="meetingOrgName">Relief Society</span>
              </div>
            </td>
          </tr>
          <tr id="member-3">
            <td>Brother Clark</td>
            <td>
              <div class="meetingCell">
                <button type="button" class="attendanceButton" aria-label="Clark, Dave, 2026-08-02, Adult Sunday School" aria-pressed="false"></button>
                <span class="meetingOrgName">Adult Sunday School</span>
              </div>
              <div class="meetingCell">
                <button type="button" class="attendanceButton" aria-label="Clark, Dave, 2026-08-02, Elders Quorum" aria-pressed="false"></button>
                <span class="meetingOrgName">Elders Quorum</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const result = await runTableFilters();
    expect(result.success).toBe(true);

    const sideModal = document.querySelector('#lcr-tools-table-filter-modal') as HTMLElement;
    expect(sideModal).not.toBeNull();

    const attendanceSelect = sideModal.querySelector('#lcr-tools-filter-1') as HTMLSelectElement;
    expect(attendanceSelect).not.toBeNull();

    const optionValues = Array.from(attendanceSelect.options).map((o) => o.value);
    expect(optionValues).toContain('');
    expect(optionValues).toContain('Yes');
    expect(optionValues).toContain('No');
    expect(optionValues).toContain('Adult Sunday School');
    expect(optionValues).toContain('Elders Quorum');
    expect(optionValues).toContain('Relief Society');

    const m1 = document.getElementById('member-1') as HTMLTableRowElement;
    const m2 = document.getElementById('member-2') as HTMLTableRowElement;
    const m3 = document.getElementById('member-3') as HTMLTableRowElement;

    // 1. Filter: Yes (Attended) -> Member 1 & 2 attended, Member 3 absent
    attendanceSelect.value = 'Yes';
    attendanceSelect.dispatchEvent(new Event('change'));

    expect(m1.style.display).toBe('');
    expect(m2.style.display).toBe('');
    expect(m3.style.display).toBe('none');

    // 2. Filter: No (Absent) -> Member 3 only
    attendanceSelect.value = 'No';
    attendanceSelect.dispatchEvent(new Event('change'));

    expect(m1.style.display).toBe('none');
    expect(m2.style.display).toBe('none');
    expect(m3.style.display).toBe('');

    // 3. Filter: Adult Sunday School -> Member 1 only
    attendanceSelect.value = 'Adult Sunday School';
    attendanceSelect.dispatchEvent(new Event('change'));

    expect(m1.style.display).toBe('');
    expect(m2.style.display).toBe('none');
    expect(m3.style.display).toBe('none');

    // 4. Filter: Relief Society -> Member 2 only
    attendanceSelect.value = 'Relief Society';
    attendanceSelect.dispatchEvent(new Event('change'));

    expect(m1.style.display).toBe('none');
    expect(m2.style.display).toBe('');
    expect(m3.style.display).toBe('none');
  });

  it('should parse Set Apart status as a boolean column with Yes and No options and filter correctly', async () => {
    delete (window as Window & { __LCR_TABLE_FILTERS_STATE__?: unknown })
      .__LCR_TABLE_FILTERS_STATE__;

    const container = document.createElement('div');
    container.innerHTML = `
      <table class="lcr-data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Calling</th>
            <th>Set Apart</th>
          </tr>
        </thead>
        <tbody>
          <tr id="row-1">
            <td>Member One</td>
            <td>Teacher</td>
            <td>
              <svg class="eden-icon" viewBox="0 0 24 24"><path d="M7.453 17.542a.75.75 0 0 0 1.102.065L20.02 6.54"></path></svg>
            </td>
          </tr>
          <tr id="row-2">
            <td>Member Two</td>
            <td>Clerk</td>
            <td>
              <span class="eden-headings-h6 eden-table-card-view__cloned-column-header" aria-hidden="true">Set Apart</span>
            </td>
          </tr>
          <tr id="row-3">
            <td>Member Three</td>
            <td>President</td>
            <td>
              <svg class="eden-icon" viewBox="0 0 24 24"><path d="M7.453 17.542a.75.75 0 0 0 1.102.065L20.02 6.54"></path></svg>
            </td>
          </tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const result = await runTableFilters();
    expect(result.success).toBe(true);

    const sideModal = document.querySelector('#lcr-tools-table-filter-modal') as HTMLElement;
    expect(sideModal).not.toBeNull();

    const setApartSelect = sideModal.querySelector('#lcr-tools-filter-2') as HTMLSelectElement;
    expect(setApartSelect).not.toBeNull();

    // Verify options are strictly ['All', 'Yes', 'No'] without "(Attended)" or "(Absent)"
    const optionTexts = Array.from(setApartSelect.options).map((o) => o.text);
    expect(optionTexts).toEqual(['All', 'Yes', 'No']);

    const r1 = document.getElementById('row-1') as HTMLTableRowElement;
    const r2 = document.getElementById('row-2') as HTMLTableRowElement;
    const r3 = document.getElementById('row-3') as HTMLTableRowElement;

    // Filter: Yes (Set Apart) -> row 1 and row 3
    setApartSelect.value = 'Yes';
    setApartSelect.dispatchEvent(new Event('change'));

    expect(r1.style.display).toBe('');
    expect(r2.style.display).toBe('none');
    expect(r3.style.display).toBe('');

    // Filter: No (Not Set Apart) -> row 2
    setApartSelect.value = 'No';
    setApartSelect.dispatchEvent(new Event('change'));

    expect(r1.style.display).toBe('none');
    expect(r2.style.display).toBe('');
    expect(r3.style.display).toBe('none');
  });

  it('should render Vacant Callings filter and allow ignoring or isolating vacant callings', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <h3>Bishopric Callings</h3>
      <table id="test-callings">
        <thead>
          <tr>
            <th>Name</th>
            <th>Calling</th>
            <th>Set Apart</th>
          </tr>
        </thead>
        <tbody>
          <tr id="row-filled-1">
            <td>John Doe</td>
            <td>Bishop</td>
            <td>Yes</td>
          </tr>
          <tr id="row-vacant-1">
            <td><em>Calling Vacant</em></td>
            <td>First Counselor</td>
            <td>No</td>
          </tr>
          <tr id="row-filled-2">
            <td>Jane Smith</td>
            <td>Second Counselor</td>
            <td>Yes</td>
          </tr>
          <tr id="row-vacant-2">
            <td><em>Calling Vacant</em></td>
            <td>Executive Secretary</td>
            <td>No</td>
          </tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const result = await runTableFilters();
    expect(result.success).toBe(true);

    const sideModal = document.querySelector('#lcr-tools-table-filter-modal') as HTMLElement;
    expect(sideModal).not.toBeNull();

    const vacancySelect = sideModal.querySelector('#lcr-tools-filter-vacancy') as HTMLSelectElement;
    expect(vacancySelect).not.toBeNull();

    const optionValues = Array.from(vacancySelect.options).map((o) => o.value);
    expect(optionValues).toEqual(['', 'exclude', 'only']);

    const rf1 = document.getElementById('row-filled-1') as HTMLTableRowElement;
    const rv1 = document.getElementById('row-vacant-1') as HTMLTableRowElement;
    const rf2 = document.getElementById('row-filled-2') as HTMLTableRowElement;
    const rv2 = document.getElementById('row-vacant-2') as HTMLTableRowElement;

    // Test: Hide Vacant (Filled Only)
    vacancySelect.value = 'exclude';
    vacancySelect.dispatchEvent(new Event('change'));

    expect(rf1.style.display).toBe('');
    expect(rv1.style.display).toBe('none');
    expect(rf2.style.display).toBe('');
    expect(rv2.style.display).toBe('none');

    // Test: Only Vacant Callings
    vacancySelect.value = 'only';
    vacancySelect.dispatchEvent(new Event('change'));

    expect(rf1.style.display).toBe('none');
    expect(rv1.style.display).toBe('');
    expect(rf2.style.display).toBe('none');
    expect(rv2.style.display).toBe('');

    // Test: Reset back to all
    vacancySelect.value = '';
    vacancySelect.dispatchEvent(new Event('change'));

    expect(rf1.style.display).toBe('');
    expect(rv1.style.display).toBe('');
    expect(rf2.style.display).toBe('');
    expect(rv2.style.display).toBe('');
  });
});
