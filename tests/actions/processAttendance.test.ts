import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runProcessAttendance } from '@/actions/processAttendance';
import { Dom } from '@/actions/processAttendance/types';

describe('processAttendance - functional user expectations', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="eden-tabs">
        <button id="tab-MEMBERS" role="tab" aria-selected="true">Members</button>
        <button id="tab-VISITORS" role="tab" aria-selected="false">Visitors</button>
      </div>

      <select class="eden-form-part-input__control">
        <option value="2026-09" selected>September 2026</option>
      </select>

      <select class="eden-form-part-input__control" id="class-dropdown">
        <option value="ALL">All Classes and Quorums</option>
        <option value="adult-ss">Adult Sunday School</option>
        <option value="eq">Elders Quorum</option>
      </select>

      <div class="eden-button-bar">
        <button class="eden-button-bar__button" aria-selected="true">13 Sep</button>
      </div>

      <table id="attendance-table">
        <tbody>
          <tr role="row" id="member-row-1">
            <td><button class="member-card__styled-ghost">Smith, John</button></td>
            <td>
              <button class="attendanceButton" id="btn-john" aria-pressed="false">
                <svg><path d="M12 3.5a8.5" /></svg>
              </button>
            </td>
          </tr>
          <tr role="row" id="member-row-2">
            <td><button class="member-card__styled-ghost">Doe, Jane</button></td>
            <td>
              <button class="attendanceButton active" id="btn-jane" aria-pressed="true">
                <svg><path d="M12 22c5.523" /></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <table id="visitors-table">
        <tbody>
          <tr>
            <td>Men</td>
            <td><input type="number" name="uuid-1::men::2026-09-13" value="" /></td>
          </tr>
          <tr>
            <td>Women</td>
            <td><input type="number" name="uuid-1::women::2026-09-13" value="" /></td>
          </tr>
        </tbody>
      </table>

      <button class="eden-button--primary">Save</button>
    `;

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

    // Ensure button click updates aria-pressed for toggle tests
    const btnJohn = document.getElementById('btn-john') as HTMLButtonElement;
    btnJohn.addEventListener('click', () => {
      btnJohn.setAttribute('aria-pressed', 'true');
      btnJohn.classList.add('active');
      btnJohn.innerHTML = '<svg><path d="M12 22c5.523" /></svg>';
    });

    vi.restoreAllMocks();
  });
  it('should prompt user with compact setup modal and handle cancellation', async () => {
    const actionPromise = runProcessAttendance();

    // Setup modal should appear
    const overlay = document.querySelector(`#${Dom.UI_OVERLAY_ID}`);
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain('Process Attendance');
    expect(overlay?.textContent).toContain('Expected 3-Column Format:');

    // Click cancel button
    const cancelBtn = overlay?.querySelector('#lcr-tools-setup-cancel') as HTMLButtonElement;
    expect(cancelBtn).not.toBeNull();
    cancelBtn.click();

    const result = await actionPromise;
    expect(result.success).toBe(false);
    expect(result.error).toBe('Cancelled by user');
  });

  it('should parse pasted 3-column rows, mark present, and show results modal with top visitor cards', async () => {
    const actionPromise = runProcessAttendance();

    const overlay = document.querySelector(`#${Dom.UI_OVERLAY_ID}`);
    expect(overlay).not.toBeNull();

    // Class dropdown should have Adult Sunday School at the top
    const classSelect = overlay?.querySelector(`#${Dom.CLASS_SELECT_ID}`) as HTMLSelectElement;
    expect(classSelect).not.toBeNull();
    expect(classSelect.options[0].text).toBe('Adult Sunday School');

    // Date picker should have a date
    const dateInput = overlay?.querySelector(`#${Dom.DATE_INPUT_ID}`) as HTMLInputElement;
    expect(dateInput).not.toBeNull();
    dateInput.value = '2026-09-13';

    // Simulate pasting spreadsheet text into paste catcher
    const pasteCatcher = overlay?.querySelector('#lcr-tools-paste-catcher') as HTMLTextAreaElement;
    expect(pasteCatcher).not.toBeNull();

    const pasteData = [
      'Timestamp\tFirst Name\tLast Name',
      '2026-09-13 09:15:00\tJohn\tSmith',
      '2026-09-13 09:16:00\tJane\tDoe',
      '2026-09-13 09:17:00\tUnmatched\tGuest',
    ].join('\n');

    // Dispatch paste event
    const pasteEvent = new Event('paste', { bubbles: true }) as ClipboardEvent;
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: {
        getData: (type: string) => (type === 'text' ? pasteData : ''),
      },
    });
    pasteCatcher.dispatchEvent(pasteEvent);

    // Verify record count badge updated
    const countBadge = overlay?.querySelector(`#${Dom.RECORD_COUNT_ID}`);
    expect(countBadge?.textContent).toContain('3 records loaded');

    // Click Process Attendance button
    const processBtn = overlay?.querySelector(`#${Dom.PROCESS_BTN_ID}`) as HTMLButtonElement;
    expect(processBtn.disabled).toBe(false);
    processBtn.click();

    await new Promise((r) => setTimeout(r, 50));

    // Review modal must be visible
    const resultsOverlay = document.querySelector(`#${Dom.REVIEW_OVERLAY_ID}`);
    expect(resultsOverlay).not.toBeNull();
    expect(resultsOverlay?.textContent).toContain('Review Unmatched Attendees');

    // Streamlined Visitor Strip must be at the top with Men and Women for Adult Sunday School
    const visitorCard = resultsOverlay?.querySelector('#lcr-tools-visitor-card');
    expect(visitorCard).not.toBeNull();
    expect(visitorCard?.textContent).toContain('Visitor Counts:');
    expect(visitorCard?.querySelector('#lcr-visitor-men')).not.toBeNull();
    expect(visitorCard?.querySelector('#lcr-visitor-women')).not.toBeNull();

    // Unmatched section should contain Unmatched Guest
    const unmatchedSection = resultsOverlay?.querySelector(`#${Dom.UNMATCHED_SECTION_ID}`);
    expect(unmatchedSection?.textContent).toContain('Unmatched Guest');

    const doneBtn = resultsOverlay?.querySelector(
      `#${Dom.REVIEW_CONTINUE_ID}`
    ) as HTMLButtonElement;
    expect(doneBtn.textContent).toBe('Continue');
    doneBtn?.click();

    await new Promise((r) => setTimeout(r, 80));
    const completion = document.querySelector(`#${Dom.COMPLETION_OVERLAY_ID}`);
    expect(completion).not.toBeNull();
    (completion?.querySelector(`#${Dom.COMPLETION_DONE_ID}`) as HTMLButtonElement)?.click();

    const result = await actionPromise;

    expect(result.success).toBe(true);
    expect(result.data?.total).toBe(3);
    expect(result.data?.marked).toBe(1); // John Smith newly marked
    expect(result.data?.already).toBe(1); // Jane Doe already present
    expect(result.data?.unmatched).toBe(1); // Unmatched Guest skipped/unresolved

    // John Smith's button was clicked and now marked
    const btnJohn = document.getElementById('btn-john');
    expect(btnJohn?.getAttribute('aria-pressed')).toBe('true');
  });

  it('should auto-calculate visitor counts when Total Headcount is entered in setup modal', async () => {
    const actionPromise = runProcessAttendance();

    const overlay = document.querySelector(`#${Dom.UI_OVERLAY_ID}`);
    expect(overlay).not.toBeNull();

    // Select Adult Sunday School
    const classSelect = overlay?.querySelector(`#${Dom.CLASS_SELECT_ID}`) as HTMLSelectElement;
    classSelect.value = 'adult-ss';
    classSelect.dispatchEvent(new Event('change'));

    // Paste 3 attendees
    const pasteCatcher = overlay?.querySelector('#lcr-tools-paste-catcher') as HTMLTextAreaElement;
    const pasteData = [
      '2026-09-13\tJohn\tSmith',
      '2026-09-13\tJane\tDoe',
      '2026-09-13\tGuest\tAttendee',
    ].join('\n');
    const pasteEvent = new Event('paste', { bubbles: true }) as ClipboardEvent;
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: { getData: () => pasteData },
    });
    pasteCatcher.dispatchEvent(pasteEvent);

    // Enter Headcount: 5 (5 headcount - 3 attendees = 2 visitors)
    const headcountInput = overlay?.querySelector(`#${Dom.HEADCOUNT_INPUT_ID}`) as HTMLInputElement;
    expect(headcountInput).not.toBeNull();
    headcountInput.value = '5';
    headcountInput.dispatchEvent(new Event('input'));

    // Verify visitor calculation box shows 2 visitors split evenly (1 Men, 1 Women)
    const calcBox = overlay?.querySelector(`#${Dom.VISITOR_SPLIT_CONTAINER_ID}`) as HTMLElement;
    expect(calcBox).not.toBeNull();
    expect(calcBox.style.display).not.toBe('none');
    expect(calcBox.textContent).toContain('Calculated Visitors: 2');

    const menInput = calcBox.querySelector('#lcr-calc-men') as HTMLInputElement;
    const womenInput = calcBox.querySelector('#lcr-calc-women') as HTMLInputElement;
    expect(menInput?.value).toBe('1');
    expect(womenInput?.value).toBe('1');

    // Click Process
    const processBtn = overlay?.querySelector(`#${Dom.PROCESS_BTN_ID}`) as HTMLButtonElement;
    processBtn.click();

    await new Promise((r) => setTimeout(r, 50));

    // Verify review modal displays the initial visitor counts (1 Men, 1 Women)
    const resultsOverlay = document.querySelector(`#${Dom.REVIEW_OVERLAY_ID}`);
    expect(resultsOverlay?.querySelector('#lcr-visitor-men')?.textContent).toBe('Men: 1');
    expect(resultsOverlay?.querySelector('#lcr-visitor-women')?.textContent).toBe('Women: 1');

    // Resolve the unmatched attendee by adding as a Women visitor
    const visitorSelect = resultsOverlay?.querySelector(`tbody select`) as HTMLSelectElement;
    expect(visitorSelect).not.toBeNull();
    visitorSelect.value = 'Women';
    visitorSelect.dispatchEvent(new Event('change'));

    // Women count should now be 2
    expect(resultsOverlay?.querySelector('#lcr-visitor-women')?.textContent).toBe('Women: 2');

    const doneBtn = resultsOverlay?.querySelector(
      `#${Dom.REVIEW_CONTINUE_ID}`
    ) as HTMLButtonElement;
    expect(doneBtn.textContent).toBe('Continue');
    doneBtn.click();

    await vi.waitFor(
      () => {
        const finishBtn = document.querySelector<HTMLButtonElement>(`#${Dom.COMPLETION_DONE_ID}`);
        expect(finishBtn).not.toBeNull();
        finishBtn?.click();
      },
      { timeout: 3000 }
    );

    const result = await actionPromise;
    expect(result.success).toBe(true);
  });

  it('should show floating autocomplete dropdown and match unmatched attendee when member selected', async () => {
    const actionPromise = runProcessAttendance();

    const overlay = document.querySelector(`#${Dom.UI_OVERLAY_ID}`);
    expect(overlay).not.toBeNull();

    // Select Adult Sunday School
    const classSelect = overlay?.querySelector(`#${Dom.CLASS_SELECT_ID}`) as HTMLSelectElement;
    classSelect.value = 'adult-ss';
    classSelect.dispatchEvent(new Event('change'));

    // Paste an attendee whose name doesn't match the roll
    const pasteCatcher = overlay?.querySelector('#lcr-tools-paste-catcher') as HTMLTextAreaElement;
    const pasteEvent = Object.assign(new Event('paste', { bubbles: true }), {
      clipboardData: { getData: () => '2026-09-13\tGuest\tAttendee' },
    }) as unknown as ClipboardEvent;
    pasteCatcher.dispatchEvent(pasteEvent);

    // Process
    const processBtn = overlay?.querySelector(`#${Dom.PROCESS_BTN_ID}`) as HTMLButtonElement;
    processBtn.click();

    await new Promise((r) => setTimeout(r, 50));

    const resultsOverlay = document.querySelector(`#${Dom.REVIEW_OVERLAY_ID}`) as HTMLElement;
    expect(resultsOverlay).not.toBeNull();

    // The floating dropdown should be attached directly to resultsOverlay
    const floatingDropdown = resultsOverlay.querySelector<HTMLUListElement>(
      `#${Dom.MEMBER_SEARCH_DROPDOWN_ID}`
    );
    expect(floatingDropdown).not.toBeNull();
    expect(floatingDropdown?.style.display).toBe('none');

    // Type query into search input
    const searchInput = resultsOverlay.querySelector<HTMLInputElement>('.lcrx-search-input');
    expect(searchInput).not.toBeNull();
    if (searchInput) {
      searchInput.value = 'smith';
      searchInput.dispatchEvent(new Event('input'));
    }

    // Dropdown should now be visible and contain Smith, John
    expect(floatingDropdown?.style.display).toBe('block');
    const items = floatingDropdown?.querySelectorAll<HTMLLIElement>('.lcrx-dropdown-item');
    expect(items?.length).toBe(1);
    expect(items?.[0].textContent).toBe('Smith, John');

    // Click the matching member — queues deferred mark (no LCR click yet)
    items?.[0].click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(floatingDropdown?.style.display).toBe('none');

    const row = resultsOverlay.querySelector('#lcrx-unmatched-row-0');
    expect(row?.textContent).toContain('Matched to Smith, John');
    expect(row?.textContent).toContain('queued to mark after Continue');
    expect(row?.querySelector(`.${Dom.QUEUED_UNDO_BTN}`)?.textContent).toBe('Undo');
    expect(resultsOverlay.querySelector(`#${Dom.UNMATCHED_COUNT_ID}`)?.textContent).toBe('0');
    expect(document.getElementById('btn-john')?.getAttribute('aria-pressed')).toBe('false');

    const doneBtn = resultsOverlay.querySelector(`#${Dom.REVIEW_CONTINUE_ID}`) as HTMLButtonElement;
    expect(doneBtn.textContent).toBe('Continue');
    doneBtn?.click();

    await new Promise((r) => setTimeout(r, 80));
    expect(document.getElementById('btn-john')?.getAttribute('aria-pressed')).toBe('true');
    (document.querySelector(`#${Dom.COMPLETION_DONE_ID}`) as HTMLButtonElement)?.click();

    await actionPromise;
  });

  it('should display single-group note when class has only one group', async () => {
    runProcessAttendance();

    const overlay = document.querySelector(`#${Dom.UI_OVERLAY_ID}`);
    expect(overlay).not.toBeNull();

    // Select Elders Quorum (single group: Men)
    const classSelect = overlay?.querySelector(`#${Dom.CLASS_SELECT_ID}`) as HTMLSelectElement;
    classSelect.value = 'eq';
    classSelect.dispatchEvent(new Event('change'));

    // Paste 1 attendee
    const pasteCatcher = overlay?.querySelector('#lcr-tools-paste-catcher') as HTMLTextAreaElement;
    const pasteEvent = new Event('paste', { bubbles: true }) as ClipboardEvent;
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: { getData: () => '2026-09-13\tJohn\tSmith' },
    });
    pasteCatcher.dispatchEvent(pasteEvent);

    // Enter Headcount: 20 (20 - 1 = 19 visitors)
    const headcountInput = overlay?.querySelector(`#${Dom.HEADCOUNT_INPUT_ID}`) as HTMLInputElement;
    headcountInput.value = '20';
    headcountInput.dispatchEvent(new Event('input'));

    const calcBox = overlay?.querySelector(`#${Dom.VISITOR_SPLIT_CONTAINER_ID}`) as HTMLElement;
    expect(calcBox.style.display).not.toBe('none');
    expect(calcBox.textContent).toContain('Calculated Visitors: 19');
    expect(calcBox.textContent).toContain('Marking 19 for Men');

    // Clean up
    const cancelBtn = overlay?.querySelector('#lcr-tools-setup-cancel') as HTMLButtonElement;
    cancelBtn.click();
  });
});
