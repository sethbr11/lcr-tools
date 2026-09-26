import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPageTables,
  getTableDisplayName,
  getCellValue,
  getRelevantHeaderCells,
  getUniqueValues,
  getAttendanceColumnOptions,
  isAttendanceCellAttended,
  isAttendanceColumn,
  parseHeaderDate,
  tableToCSV,
} from '@/utils/table/tableUtils';

describe('tableUtils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('parseHeaderDate', () => {
    it('should parse day and month header strings', () => {
      const date = parseHeaderDate('15 Jan');
      expect(date).not.toBeNull();
      expect(date?.getDate()).toBe(15);
      expect(date?.getMonth()).toBe(0); // Jan is 0
    });

    it('should return null for invalid strings', () => {
      expect(parseHeaderDate('Member List')).toBeNull();
      expect(parseHeaderDate('')).toBeNull();
    });
  });

  describe('getTableDisplayName', () => {
    it('should detect preceding sibling headings for unassigned ministering tables', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="header-card">
          <div class="card-title">Unassigned Ministering Brothers</div>
          <table>
            <thead><tr><th>Name</th><th>Age</th></tr></thead>
            <tbody><tr><td>Brother Alpha</td><td>25</td></tr></tbody>
          </table>
        </div>
      `;
      document.body.appendChild(container);
      const table = container.querySelector('table')!;
      expect(getTableDisplayName(table)).toBe('Unassigned Ministering Brothers');
    });

    it('should not bleed district headings across multi-table parent containers', () => {
      const mainContainer = document.createElement('div');
      mainContainer.innerHTML = `
        <div class="hidden-district-card" style="display:none">
          <h3>District 1</h3>
          <span>Presidency Member: Henry Wilson</span>
          <table class="hidden-table"><tbody><tr><td>Hidden</td></tr></tbody></table>
        </div>
        <div class="unassigned-card">
          <div>Unassigned Households</div>
          <table class="unassigned-table"><tbody><tr><td>Family A</td></tr></tbody></table>
        </div>
      `;
      const unassignedTable = mainContainer.querySelector('.unassigned-table') as HTMLTableElement;
      expect(getTableDisplayName(unassignedTable)).toBe('Unassigned Households');
    });

    it('should detect Pod and presidency member names for Relief Society ministering tables', () => {
      const card = document.createElement('div');
      card.innerHTML = `
        <div class="pod-header">Pod 1</div>
        <div>Presidency Member: Watson, Emily</div>
        <div>Move to</div>
        <table>
          <thead><tr><th>Ministering Sisters</th></tr></thead>
          <tbody><tr><td>Sister Alpha</td></tr></tbody>
        </table>
      `;
      document.body.appendChild(card);
      const table = card.querySelector('table')!;
      expect(getTableDisplayName(table)).toBe('Pod 1 (Watson, Emily)');
    });
  });

  describe('getCellValue', () => {
    it('should extract plain text from table cells', () => {
      const cell = document.createElement('td');
      cell.textContent = '  John Smith  ';
      expect(getCellValue(cell)).toBe('John Smith');
    });

    it('should detect checkmark icons as Yes', () => {
      const cell = document.createElement('td');
      cell.innerHTML = '<i class="lds icon-checkmark"></i>';
      const icon = cell.querySelector('.icon-checkmark') as HTMLElement;
      Object.defineProperty(icon, 'offsetWidth', { value: 16 });
      expect(getCellValue(cell)).toBe('Yes');
    });

    it('should detect SVG path checkmarks as Yes', () => {
      const cell = document.createElement('td');
      cell.innerHTML = `
        <button type="button">
          <svg class="eden-icon"><path d="M7.453 17.542l-4.995-4.995"></path></svg>
        </button>
      `;
      const btn = cell.querySelector('button') as HTMLElement;
      Object.defineProperty(btn, 'offsetWidth', { value: 24 });
      expect(getCellValue(cell)).toBe('Yes');
    });

    it('should detect aria-pressed buttons as Yes or No', () => {
      const cellYes = document.createElement('td');
      cellYes.innerHTML = '<button type="button" aria-pressed="true">Present</button>';
      const btnYes = cellYes.querySelector('button') as HTMLElement;
      Object.defineProperty(btnYes, 'offsetWidth', { value: 30 });
      expect(getCellValue(cellYes)).toBe('Yes');

      const cellNo = document.createElement('td');
      cellNo.innerHTML = '<button type="button" aria-pressed="false">Absent</button>';
      const btnNo = cellNo.querySelector('button') as HTMLElement;
      Object.defineProperty(btnNo, 'offsetWidth', { value: 30 });
      expect(getCellValue(cellNo)).toBe('No');
    });

    it('should return empty string for Sustained label placeholders', () => {
      const cell = document.createElement('td');
      cell.textContent = 'Sustained (Click to add)';
      expect(getCellValue(cell)).toBe('');
    });
  });

  describe('getRelevantHeaderCells', () => {
    it('should extract visible column headers ignoring actions and checkboxes', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <thead>
          <tr>
            <th class="checkbox-col"><input type="checkbox"/></th>
            <th><button>Name</button></th>
            <th>Age</th>
            <th class="actions-cell">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr><td></td><td>John</td><td>30</td><td></td></tr>
        </tbody>
      `;
      document.body.appendChild(table);

      // Mock visibility for the th elements
      table.querySelectorAll('th').forEach((th) => {
        Object.defineProperty(th, 'offsetWidth', { value: 50 });
      });

      const { headers, indices } = getRelevantHeaderCells(table);
      expect(headers).toContain('Name');
      expect(headers).toContain('Age');
      expect(headers).not.toContain('Actions');
      expect(indices).toContain(1);
      expect(indices).toContain(2);
    });
  });

  describe('getUniqueValues', () => {
    it('should collect unique values from a column index', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tbody>
          <tr><td>Apple</td></tr>
          <tr><td>Banana</td></tr>
          <tr><td>Apple</td></tr>
        </tbody>
      `;
      document.body.appendChild(table);

      table.querySelectorAll('tr').forEach((tr) => {
        Object.defineProperty(tr, 'offsetWidth', { value: 100 });
      });

      const values = getUniqueValues(table, 0);
      expect(values).toEqual(['Apple', 'Banana']);
    });
  });

  describe('getPageTables & tableToCSV', () => {
    it('should find tables and generate CSV content', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <thead>
          <tr><th>Name</th><th>Role</th></tr>
        </thead>
        <tbody>
          <tr><td>Alice</td><td>Leader</td></tr>
          <tr><td>Bob</td><td>Clerk</td></tr>
        </tbody>
      `;
      document.body.appendChild(table);

      Object.defineProperty(table, 'offsetWidth', { value: 200 });
      table.querySelectorAll('th, tr').forEach((el) => {
        Object.defineProperty(el, 'offsetWidth', { value: 50 });
      });

      const tables = getPageTables();
      expect(tables.length).toBeGreaterThan(0);

      const csvResult = tableToCSV(tables[0]);
      expect(csvResult).not.toBeNull();
      expect(csvResult?.csvContent).toContain('Name,Role');
      expect(csvResult?.csvContent).toContain('Alice,Leader');
      expect(csvResult?.csvContent).toContain('Bob,Clerk');
    });

    it('should filter out empty tables when populated tables exist', () => {
      document.body.innerHTML = `
        <table id="populated">
          <thead><tr><th>Name</th></tr></thead>
          <tbody><tr><td>Member 1</td></tr></tbody>
        </table>
        <table id="empty">
          <thead><tr><th>Name</th></tr></thead>
          <tbody></tbody>
        </table>
      `;

      document.querySelectorAll('table').forEach((t) => {
        Object.defineProperty(t, 'offsetWidth', { value: 100 });
      });

      const tables = getPageTables();
      expect(tables.length).toBe(1);
      expect(tables[0].table.id).toBe('populated');
    });

    it('should resolve hierarchical table names from H2 and H3 headings while ignoring generic titles', () => {
      document.body.innerHTML = `
        <h1>Organizations</h1>
        <h2>Elders Quorum</h2>
        <div class="card">
          <h3>Teachers</h3>
          <table id="eq-teachers">
            <tbody><tr><td>Teacher 1</td></tr></tbody>
          </table>
        </div>
        <div class="card">
          <h3>Elders Quorum Presidency</h3>
          <table id="eq-presidency">
            <tbody><tr><td>President 1</td></tr></tbody>
          </table>
        </div>
      `;

      document.querySelectorAll('h1, h2, h3, table').forEach((el) => {
        Object.defineProperty(el, 'offsetWidth', { value: 100 });
      });

      const tables = getPageTables();
      expect(tables.length).toBe(2);
      expect(tables[0].name).toBe('Elders Quorum - Teachers');
      expect(tables[1].name).toBe('Elders Quorum Presidency');
    });
  });

  describe('Attendance Utilities', () => {
    it('should correctly evaluate getCellValue on hidden rows without leaking span text', () => {
      const row = document.createElement('tr');
      row.style.display = 'none';
      row.innerHTML = `
        <td>
          <div class="weekMeetingCell">
            <div class="meetingCell">
              <button type="button" class="attendanceButton" aria-label="Taylor, Alex, 2026-08-02, Adult Sunday School" aria-pressed="false"></button>
              <span class="meetingOrgName">Adult Sunday School</span>
            </div>
            <div class="meetingCell">
              <button type="button" class="attendanceButton" aria-label="Taylor, Alex, 2026-08-02, Elders Quorum" aria-pressed="false"></button>
              <span class="meetingOrgName">Elders Quorum</span>
            </div>
          </div>
        </td>
      `;
      const cell = row.querySelector('td') as HTMLElement;
      expect(getCellValue(cell)).toBe('No');
    });

    it('should detect attendance columns via isAttendanceColumn', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tbody>
          <tr>
            <td>Brother Jones</td>
            <td>
              <button type="button" class="attendanceButton" aria-pressed="true"></button>
              <span class="meetingOrgName">Sunday School</span>
            </td>
          </tr>
        </tbody>
      `;
      expect(isAttendanceColumn(table, 0)).toBe(false);
      expect(isAttendanceColumn(table, 1)).toBe(true);
    });

    it('should discover clean options via getAttendanceColumnOptions', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tbody>
          <tr>
            <td>
              <button type="button" class="attendanceButton" aria-pressed="true"></button>
              <span class="meetingOrgName">Adult Sunday School</span>
              <button type="button" class="attendanceButton" aria-pressed="false"></button>
              <span class="meetingOrgName">Elders Quorum</span>
            </td>
          </tr>
          <tr>
            <td>
              <button type="button" class="attendanceButton" aria-pressed="false"></button>
              <span class="meetingOrgName">Adult Sunday School</span>
              <button type="button" class="attendanceButton" aria-pressed="true"></button>
              <span class="meetingOrgName">Relief Society</span>
            </td>
          </tr>
        </tbody>
      `;
      const options = getAttendanceColumnOptions(table, 0);
      expect(options).toContain('Yes');
      expect(options).toContain('No');
      expect(options).toContain('Adult Sunday School');
      expect(options).toContain('Elders Quorum');
      expect(options).toContain('Relief Society');
      expect(options).not.toContain('Adult Sunday SchoolElders Quorum');
    });

    it('should accurately match attendance cells via isAttendanceCellAttended', () => {
      const cell = document.createElement('td');
      cell.innerHTML = `
        <div class="weekMeetingCell">
          <div class="meetingCell">
            <button type="button" class="attendanceButton" aria-label="Miller, Chris, 2026-08-02, Adult Sunday School" aria-pressed="true"></button>
            <span class="meetingOrgName">Adult Sunday School</span>
          </div>
          <div class="meetingCell">
            <button type="button" class="attendanceButton" aria-label="Miller, Chris, 2026-08-02, Elders Quorum" aria-pressed="false"></button>
            <span class="meetingOrgName">Elders Quorum</span>
          </div>
        </div>
      `;

      // Should match overall attended
      expect(isAttendanceCellAttended(cell, 'Yes')).toBe(true);
      // Should not match overall absent
      expect(isAttendanceCellAttended(cell, 'No')).toBe(false);
      // Should match Sunday School
      expect(isAttendanceCellAttended(cell, 'Adult Sunday School')).toBe(true);
      // Should not match Elders Quorum
      expect(isAttendanceCellAttended(cell, 'Elders Quorum')).toBe(false);
    });
  });
});
