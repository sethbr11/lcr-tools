import { describe, it, expect, beforeEach, vi } from 'vitest';
import { browser } from 'wxt/browser';
import {
  simulateMemberRollProcessing,
  simulateVisitorEntryAndRestore,
} from '@/actions/processAttendance/members/simulateHelper';
import { runProcessAttendance } from '@/actions/processAttendance';
import {
  getUnmatchedReviewModalHtml,
  getSetupModalHtml,
} from '@/actions/processAttendance/templates';
import { Dom, Constants, Types } from '@/actions/processAttendance/types';
import { setupDevAttendanceSimulation } from '@/entrypoints/popup/popupActionHelper';
import { resetAborted } from '@/actions/processAttendance/utils';

describe('attendanceSimulationHelper - Dry Run & Dev Mode Simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAborted();
    document.body.innerHTML = '';
  });

  describe('simulateMemberRollProcessing', () => {
    it('scrolls matched rows and only toggles the first unmarked member ON and OFF', async () => {
      // Setup DOM with 3 synthetic member rows
      const table = document.createElement('table');
      const tbody = document.createElement('tbody');
      table.appendChild(tbody);
      document.body.appendChild(table);

      const createMemberRow = (name: string, isPresent: boolean) => {
        const tr = document.createElement('tr');
        tr.setAttribute('role', 'row');
        tr.scrollIntoView = vi.fn();

        const tdName = document.createElement('td');
        const btnName = document.createElement('button');
        btnName.className = 'member-card__styled-ghost';
        btnName.textContent = name;
        tdName.appendChild(btnName);

        const tdAction = document.createElement('td');
        const btnAttendance = document.createElement('button');
        btnAttendance.className = 'attendanceButton';
        btnAttendance.setAttribute('aria-pressed', isPresent ? 'true' : 'false');
        btnAttendance.addEventListener('click', () => {
          const current = btnAttendance.getAttribute('aria-pressed') === 'true';
          btnAttendance.setAttribute('aria-pressed', current ? 'false' : 'true');
        });
        tdAction.appendChild(btnAttendance);

        tr.appendChild(tdName);
        tr.appendChild(tdAction);
        tbody.appendChild(tr);
        return { row: tr, btn: btnAttendance };
      };

      const row1 = createMemberRow('Smith, John', true); // already marked
      const row2 = createMemberRow('Doe, Jane', false); // first unmarked
      const row3 = createMemberRow('Brown, Charlie', false); // second unmarked

      const wardMembers: Types.WardMember[] = [
        {
          fullName: 'Smith, John',
          firstName: 'John',
          lastName: 'Smith',
          isPresent: true,
          pageNum: 1,
          row: row1.row,
        },
        {
          fullName: 'Doe, Jane',
          firstName: 'Jane',
          lastName: 'Doe',
          isPresent: false,
          pageNum: 1,
          row: row2.row,
        },
        {
          fullName: 'Brown, Charlie',
          firstName: 'Charlie',
          lastName: 'Brown',
          isPresent: false,
          pageNum: 1,
          row: row3.row,
        },
      ];

      const attendees = [
        { firstName: 'John', lastName: 'Smith' },
        { firstName: 'Jane', lastName: 'Doe' },
        { firstName: 'Charlie', lastName: 'Brown' },
        { firstName: 'Nonexistent', lastName: 'Visitor' },
      ];

      const result = await simulateMemberRollProcessing(attendees, wardMembers, '2026-09-13');

      // Verify scrolling was called on matched rows
      expect(row1.row.scrollIntoView).toHaveBeenCalled();
      expect(row2.row.scrollIntoView).toHaveBeenCalled();
      expect(row3.row.scrollIntoView).toHaveBeenCalled();

      // Verify row 2 (first unmarked) was toggled ON and back OFF, leaving it in original state
      expect(row2.btn.getAttribute('aria-pressed')).toBe('false');

      // Verify row 3 was NOT toggled at all
      expect(row3.btn.getAttribute('aria-pressed')).toBe('false');

      // Verify metrics
      expect(result.alreadyMarked).toBe(1);
      expect(result.newlyMarked).toBe(2);
      expect(result.unmatchedList).toHaveLength(1);
      expect(result.unmatchedList[0].fullName).toBe('Nonexistent Visitor');

      // Verify log entries
      const toggleLog = result.logs.find((l) => l.firstName === 'Jane');
      expect(toggleLog?.lcrUpdateStatus).toContain('Toggle Tested ON/OFF');

      const nonClickLog = result.logs.find((l) => l.firstName === 'Charlie');
      expect(nonClickLog?.lcrUpdateStatus).toContain('Match Confirmed (Did Not Click)');

      const unmatchedLog = result.logs.find((l) => l.firstName === 'Nonexistent');
      expect(unmatchedLog?.lcrUpdateStatus).toContain('Unmatched (Simulated)');
    });

    it('aborts immediately and stops processing when ESC key is pressed', async () => {
      const table = document.createElement('table');
      const tbody = document.createElement('tbody');
      table.appendChild(tbody);
      document.body.appendChild(table);

      const createMemberRow = (name: string) => {
        const tr = document.createElement('tr');
        tr.setAttribute('role', 'row');
        tr.scrollIntoView = vi.fn();

        const tdName = document.createElement('td');
        const btnName = document.createElement('button');
        btnName.className = 'member-card__styled-ghost';
        btnName.textContent = name;
        tdName.appendChild(btnName);

        const tdAction = document.createElement('td');
        const btnAttendance = document.createElement('button');
        btnAttendance.className = 'attendanceButton';
        btnAttendance.setAttribute('aria-pressed', 'true');
        tdAction.appendChild(btnAttendance);

        tr.appendChild(tdName);
        tr.appendChild(tdAction);
        tbody.appendChild(tr);
        return tr;
      };

      const row1 = createMemberRow('Smith, John');
      const row2 = createMemberRow('Doe, Jane');

      const wardMembers: Types.WardMember[] = [
        {
          fullName: 'Smith, John',
          firstName: 'John',
          lastName: 'Smith',
          isPresent: true,
          pageNum: 1,
          row: row1,
        },
        {
          fullName: 'Doe, Jane',
          firstName: 'Jane',
          lastName: 'Doe',
          isPresent: true,
          pageNum: 1,
          row: row2,
        },
      ];

      const attendees = [
        { firstName: 'John', lastName: 'Smith' },
        { firstName: 'Jane', lastName: 'Doe' },
      ];

      // Dispatch Escape after a tiny delay so first member finishes, then abort occurs
      setTimeout(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      }, 50);

      await simulateMemberRollProcessing(attendees, wardMembers, '2026-09-13');

      // Second member should have been skipped due to abort
      expect(row2.scrollIntoView).not.toHaveBeenCalled();
    });
  });

  describe('simulateVisitorEntryAndRestore', () => {
    function mountVisitorTabs(): void {
      const memTab = document.getElementById('tab-MEMBERS');
      const visTab = document.getElementById('tab-VISITORS');
      visTab?.addEventListener('click', () => {
        visTab.setAttribute('aria-selected', 'true');
        memTab?.setAttribute('aria-selected', 'false');
      });
      memTab?.addEventListener('click', () => {
        memTab.setAttribute('aria-selected', 'true');
        visTab?.setAttribute('aria-selected', 'false');
      });
    }

    /** Replaces the named visitor input with a new node that copies the current value (LCR remount). */
    function remountNamedVisitorInput(nameAttr: string): void {
      const live = document.querySelector<HTMLInputElement>(`input[name="${nameAttr}"]`);
      if (!live) return;
      const neu = document.createElement('input');
      neu.type = 'number';
      neu.id = live.id;
      neu.name = nameAttr;
      neu.value = live.value;
      live.replaceWith(neu);
    }

    it('probes that Sunday with 1, saves, remounts, then restores a blank original value', async () => {
      const nameAttr = 'uuid-1::men::2026-09-13';
      document.body.innerHTML = `
        <div class="eden-tabs">
          <button id="tab-MEMBERS" role="tab" aria-selected="true">Members</button>
          <button id="tab-VISITORS" role="tab" aria-selected="false">Visitors</button>
        </div>
        <table>
          <tbody>
            <tr id="men_2026-09_ALL">
              <td><span>Visitors</span>Men</td>
              <td>
                <input type="number" id="input-men-13" value="" name="${nameAttr}" />
              </td>
            </tr>
          </tbody>
        </table>
        <button class="eden-button--primary" id="save-btn">Save</button>
      `;
      mountVisitorTabs();

      let saveClickCount = 0;
      document.getElementById('save-btn')?.addEventListener('click', () => {
        saveClickCount++;
        remountNamedVisitorInput(nameAttr);
      });

      const outcome = await simulateVisitorEntryAndRestore('2026-09-13');
      const live = document.querySelector<HTMLInputElement>(`input[name="${nameAttr}"]`);

      expect(outcome.success).toBe(true);
      expect(outcome.logMessage).toContain('restored blank');
      expect(saveClickCount).toBe(2);
      expect(live?.value).toBe('');
    });

    it('probes that Sunday even when populated and restores the original value, not another column', async () => {
      const nameAttr = 'uuid-1::men::2026-09-13';
      document.body.innerHTML = `
        <div class="eden-tabs">
          <button id="tab-MEMBERS" role="tab" aria-selected="true">Members</button>
          <button id="tab-VISITORS" role="tab" aria-selected="false">Visitors</button>
        </div>
        <table>
          <tbody>
            <tr id="men_2026-09_ALL">
              <td><span>Visitors</span>Men</td>
              <td>
                <input type="number" id="input-men-13" value="5" name="${nameAttr}" />
              </td>
              <td>
                <input type="number" id="input-men-20" value="" name="uuid-1::men::2026-09-20" />
              </td>
            </tr>
          </tbody>
        </table>
        <button class="eden-button--primary" id="save-btn">Save</button>
      `;
      mountVisitorTabs();

      document.getElementById('save-btn')?.addEventListener('click', () => {
        remountNamedVisitorInput(nameAttr);
      });

      const outcome = await simulateVisitorEntryAndRestore('2026-09-13');
      const targetDay = document.querySelector<HTMLInputElement>(`input[name="${nameAttr}"]`);
      const nextSunday = document.getElementById('input-men-20') as HTMLInputElement;

      expect(outcome.success).toBe(true);
      expect(outcome.logMessage).toContain('restored 5');
      expect(targetDay?.value).toBe('5');
      expect(nextSunday.value).toBe('');
    });
  });

  describe('Simulation Mode Templates', () => {
    it('renders simulation badge and button in setup modal when isSimulation is true', () => {
      const html = getSetupModalHtml([], '2026-09-13', true);
      expect(html).toContain('SIMULATION (DRY RUN)');
      expect(html).toContain('Simulate Attendance');
      expect(html).toContain('Dev Mode Simulation');
    });

    it('renders simulation results badge in results modal when isSimulation is true', () => {
      const metrics = { total: 5, marked: 4, already: 1, unmatched: 0 };
      const html = getUnmatchedReviewModalHtml(metrics, 'Adult Sunday School', '2026-09-13', true);
      expect(html).toContain('SIMULATION RESULTS (DRY RUN)');
      expect(html).toContain('Continue Simulation');
    });
  });

  describe('runProcessAttendance in simulation mode', () => {
    it('aborts safely if LCR layout is missing even in simulation mode', async () => {
      document.body.innerHTML = '<div>Empty Page</div>';
      const res = await runProcessAttendance({ isSimulation: true });
      expect(res.success).toBe(false);
      expect(res.error).toBe('LCR setup mismatch');
    });
  });

  describe('Popup Dev Settings Integration', () => {
    it('handles clicking simulate attendance button to arm storage and inject script', async () => {
      document.body.innerHTML = `
        <div id="dev-tools-section">
          <button id="${Dom.DEV_SIMULATE_BUTTON_ID}">Simulate Attendance</button>
        </div>
        <div id="status-message" class="status-banner"></div>
      `;

      const setSpy = vi.spyOn(browser.storage.local, 'set').mockResolvedValue();
      const executeSpy = vi
        .spyOn(browser.scripting, 'executeScript')
        .mockImplementation(async () => [] as never);

      setupDevAttendanceSimulation(123);

      const btn = document.getElementById(Dom.DEV_SIMULATE_BUTTON_ID) as HTMLButtonElement;
      expect(btn).not.toBeNull();

      btn.click();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(setSpy).toHaveBeenCalledWith({
        [Constants.DEV_SIMULATE_ATTENDANCE_KEY]: true,
      });
      expect(executeSpy).toHaveBeenCalledWith({
        target: { tabId: 123 },
        files: ['/action-process-attendance.js'],
      });
    });
  });
});
