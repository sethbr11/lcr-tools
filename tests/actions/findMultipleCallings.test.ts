import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runFindMultipleCallings } from '@/actions/findMultipleCallings';
import { Constants, Dom } from '@/actions/findMultipleCallings/types';
import * as fileUtils from '@/utils/fileUtils';
import * as uiUtils from '@/utils/ui/uiUtils';

describe('findMultipleCallings - functional user expectations', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('should warn user and exit if page is not a recognized callings report page', async () => {
    const toastSpy = vi.spyOn(uiUtils, 'showToast');

    // Simulate non-callings page
    Object.defineProperty(window, 'location', {
      value: new URL('https://lcr.churchofjesuschrist.org/finance/expenses'),
      writable: true,
      configurable: true,
    });

    const result = await runFindMultipleCallings();

    expect(result.success).toBe(false);
    expect(result.error).toBe(Constants.UNSUPPORTED_PAGE_ERROR);
    expect(toastSpy).toHaveBeenCalledWith(
      Constants.UNSUPPORTED_PAGE_TOAST,
      expect.objectContaining({ type: 'warning' })
    );
  });

  it('should display friendly message when no members have multiple callings', async () => {
    Object.defineProperty(window, 'location', {
      value: new URL('https://lcr.churchofjesuschrist.org/orgs/callings-by-organization'),
      writable: true,
      configurable: true,
    });

    const container = document.createElement('div');
    container.innerHTML = `
      <h1>Organizations</h1>
      <h3>Elders Quorum</h3>
      <table>
        <thead><tr><th>Member Name</th><th>Calling</th></tr></thead>
        <tbody>
          <tr><td>Brother Adams</td><td>Elders Quorum President</td></tr>
        </tbody>
      </table>
      <h3>Sunday School</h3>
      <table>
        <thead><tr><th>Member Name</th><th>Calling</th></tr></thead>
        <tbody>
          <tr><td>Sister Baker</td><td>Sunday School Teacher</td></tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const result = await runFindMultipleCallings();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(0);

    const modal = document.querySelector('.lcr-tools-modal-backdrop');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain(Constants.NO_ISSUES_HEADING);
    expect(modal?.textContent).toContain('All members have only one');
    expect(modal?.textContent).toContain(Constants.MANAGE_GROUPS_BTN);
    expect(modal?.textContent).not.toContain(Constants.EXPORT_CSV_BTN);
  });

  it('should detect members holding multiple callings, display report modal, and export CSV', async () => {
    const downloadCsvSpy = vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});

    Object.defineProperty(window, 'location', {
      value: new URL('https://lcr.churchofjesuschrist.org/orgs/callings-by-organization'),
      writable: true,
      configurable: true,
    });

    const container = document.createElement('div');
    container.innerHTML = `
      <h1>Organizations</h1>
      <h3>Elders Quorum</h3>
      <table>
        <thead><tr><th>Member</th><th>Calling</th><th>Organization</th></tr></thead>
        <tbody>
          <tr><td>Doe, John</td><td>1st Counselor</td><td>Elders Quorum</td></tr>
          <tr><td>Smith, Jane</td><td>President</td><td>Relief Society</td></tr>
        </tbody>
      </table>
      <h3>Sunday School</h3>
      <table>
        <thead><tr><th>Member</th><th>Calling</th><th>Organization</th></tr></thead>
        <tbody>
          <tr><td>Doe, John</td><td>Teacher</td><td>Sunday School</td></tr>
          <tr><td>Vacant Slot</td><td>Unassigned</td><td>Sunday School</td></tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const result = await runFindMultipleCallings();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(1);

    // Verify modal content
    const modal = document.querySelector('.lcr-tools-modal-backdrop');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('Doe, John');
    expect(modal?.textContent).toContain('1st Counselor');
    expect(modal?.textContent).toContain('Teacher');
    expect(modal?.textContent).not.toContain('Smith, Jane'); // Only 1 calling, shouldn't be flagged

    // Click Export CSV button inside modal
    const exportBtn = Array.from(modal?.querySelectorAll('button') || []).find((btn) =>
      btn.textContent?.includes(Constants.EXPORT_CSV_BTN)
    );
    expect(exportBtn).toBeDefined();
    exportBtn?.click();

    await vi.waitFor(() => {
      expect(document.querySelector('.lcr-tools-confirm-modal')).not.toBeNull();
    });
    expect(downloadCsvSpy).not.toHaveBeenCalled();
    document.querySelector<HTMLButtonElement>('#lcr-tools-confirm-btn')?.click();

    await vi.waitFor(() => {
      expect(downloadCsvSpy).toHaveBeenCalledTimes(1);
    });
    const [csvContent, filename] = downloadCsvSpy.mock.calls[0];
    expect(csvContent).toContain(
      `"${Constants.CSV_HEADER_MEMBER}","${Constants.CSV_HEADER_CALLING}","${Constants.CSV_HEADER_ORGANIZATION}"`
    );
    expect(csvContent).toContain('Doe, John');
    expect(csvContent).toContain('1st Counselor');
    expect(csvContent).toContain('Teacher');
    expect(filename).toMatch(/multiple_callings.*\.csv/i);
    expect(document.getElementById(Dom.MODAL_ID)).not.toBeNull();
  });

  it('should not download CSV when the stewardship reminder is cancelled', async () => {
    const downloadCsvSpy = vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});
    const toastSpy = vi.spyOn(uiUtils, 'showToast');

    Object.defineProperty(window, 'location', {
      value: new URL('https://lcr.churchofjesuschrist.org/orgs/callings-by-organization'),
      writable: true,
      configurable: true,
    });

    const container = document.createElement('div');
    container.innerHTML = `
      <h1>Organizations</h1>
      <h3>Elders Quorum</h3>
      <table>
        <thead><tr><th>Member</th><th>Calling</th><th>Organization</th></tr></thead>
        <tbody>
          <tr><td>Doe, John</td><td>1st Counselor</td><td>Elders Quorum</td></tr>
        </tbody>
      </table>
      <h3>Sunday School</h3>
      <table>
        <thead><tr><th>Member</th><th>Calling</th><th>Organization</th></tr></thead>
        <tbody>
          <tr><td>Doe, John</td><td>Teacher</td><td>Sunday School</td></tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    await runFindMultipleCallings();

    const modal = document.querySelector('.lcr-tools-modal-backdrop');
    const exportBtn = Array.from(modal?.querySelectorAll('button') || []).find((btn) =>
      btn.textContent?.includes(Constants.EXPORT_CSV_BTN)
    );
    exportBtn?.click();

    await vi.waitFor(() => {
      expect(document.querySelector('.lcr-tools-confirm-modal')).not.toBeNull();
    });
    document.querySelector<HTMLButtonElement>('#lcr-tools-cancel-btn')?.click();

    await vi.waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        Constants.STEWARDSHIP_CANCELLED_TOAST,
        expect.objectContaining({ type: 'info' })
      );
    });
    expect(downloadCsvSpy).not.toHaveBeenCalled();
    expect(document.getElementById(Dom.MODAL_ID)).not.toBeNull();
  });

  it('should ignore Calling Vacant placeholders instead of grouping them as a member', async () => {
    Object.defineProperty(window, 'location', {
      value: new URL('https://lcr.churchofjesuschrist.org/orgs/callings-by-organization'),
      writable: true,
      configurable: true,
    });

    const container = document.createElement('div');
    container.innerHTML = `
      <h1>Organizations</h1>
      <h3>Elders Quorum</h3>
      <table>
        <thead><tr><th>Member</th><th>Calling</th></tr></thead>
        <tbody>
          <tr><td>Doe, John</td><td>1st Counselor</td></tr>
          <tr><td>Calling Vacant</td><td>Secretary</td></tr>
        </tbody>
      </table>
      <h3>Sunday School</h3>
      <table>
        <thead><tr><th>Member</th><th>Calling</th></tr></thead>
        <tbody>
          <tr><td>Doe, John</td><td>Teacher</td></tr>
          <tr><td>Calling Vacant</td><td>Librarian</td></tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const result = await runFindMultipleCallings();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(1);

    const modal = document.querySelector('.lcr-tools-modal-backdrop');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('Doe, John');
    expect(modal?.textContent).not.toContain('Calling Vacant');
  });

  it('should strip Custom Calling suffixes from calling names in the report modal', async () => {
    Object.defineProperty(window, 'location', {
      value: new URL('https://lcr.churchofjesuschrist.org/orgs/callings-by-organization'),
      writable: true,
      configurable: true,
    });

    const container = document.createElement('div');
    container.innerHTML = `
      <h1>Organizations</h1>
      <h3>Elders Quorum</h3>
      <table>
        <thead><tr><th>Member</th><th>Calling</th><th>Organization</th></tr></thead>
        <tbody>
          <tr><td>Doe, Jane</td><td>Sacrament CoordinatorCustom Calling</td><td>Elders Quorum - Service</td></tr>
        </tbody>
      </table>
      <h3>Young Single Adults</h3>
      <table>
        <thead><tr><th>Member</th><th>Calling</th><th>Organization</th></tr></thead>
        <tbody>
          <tr><td>Doe, Jane</td><td>Activities CommitteeCustom Calling</td><td>Young Single Adult</td></tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const result = await runFindMultipleCallings();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(1);

    const modal = document.querySelector('.lcr-tools-modal-backdrop');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('Sacrament Coordinator');
    expect(modal?.textContent).toContain('Activities Committee');
    expect(modal?.textContent).toContain('Elders Quorum - Service');
    expect(modal?.textContent).toContain('Young Single Adult');
    expect(modal?.textContent).not.toContain('Custom Calling');
  });

  it('should leave the organizations unit picker unchanged when All Organizations is absent', async () => {
    Object.defineProperty(window, 'location', {
      value: new URL('https://lcr.churchofjesuschrist.org/orgs/callings-by-organization'),
      writable: true,
      configurable: true,
    });

    document.body.innerHTML = `
      <h1>Organizations</h1>
      ${unitPickerHtml()}
      <h3>Elders Quorum</h3>
      <table>
        <thead><tr><th>Member Name</th><th>Calling</th></tr></thead>
        <tbody>
          <tr><td>Brother Adams</td><td>Elders Quorum President</td></tr>
        </tbody>
      </table>
    `;

    const unitButton = document.querySelector<HTMLButtonElement>('#unit-picker');
    const unitClick = vi.fn();
    unitButton?.addEventListener('click', unitClick);

    await runFindMultipleCallings();

    expect(unitClick).not.toHaveBeenCalled();
    expect(unitButton?.getAttribute(Dom.ARIA_EXPANDED)).toBe('false');
  });

  it('should check All Organizations from its own dropdown without toggling the unit picker', async () => {
    Object.defineProperty(window, 'location', {
      value: new URL('https://lcr.churchofjesuschrist.org/orgs/callings-by-organization'),
      writable: true,
      configurable: true,
    });

    document.body.innerHTML = `
      <h1>Organizations</h1>
      ${unitPickerHtml()}
      ${orgsFilterHtml()}
      <h3>Elders Quorum</h3>
      <table>
        <thead><tr><th>Member Name</th><th>Calling</th></tr></thead>
        <tbody>
          <tr><td>Brother Adams</td><td>Elders Quorum President</td></tr>
        </tbody>
      </table>
    `;

    const unitButton = document.querySelector<HTMLButtonElement>('#unit-picker');
    const orgsButton = document.querySelector<HTMLButtonElement>('#orgs-picker');
    const allOrgs = document.querySelector<HTMLInputElement>(Dom.ALL_ORGS_CHECKBOX_SELECTOR);
    const unitClick = vi.fn();
    unitButton?.addEventListener('click', unitClick);
    orgsButton?.addEventListener('click', () => {
      const expanded = orgsButton.getAttribute(Dom.ARIA_EXPANDED) === Dom.ARIA_EXPANDED_TRUE;
      orgsButton.setAttribute(Dom.ARIA_EXPANDED, expanded ? 'false' : Dom.ARIA_EXPANDED_TRUE);
    });

    await runFindMultipleCallings();

    expect(unitClick).not.toHaveBeenCalled();
    expect(allOrgs?.checked).toBe(true);
    expect(orgsButton?.getAttribute(Dom.ARIA_EXPANDED)).toBe('false');
  });
});

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Synthetic ward/stake unit picker matching LCR organizations-page markup. */
function unitPickerHtml(): string {
  return `
    <div class="eden-stack multi-select__styled-stack no-print">
      <div class="eden-progress-button-container multi-select__fit-content">
        <button id="unit-picker" aria-pressed="true" aria-haspopup="true" aria-expanded="false"
          aria-controls="unit-panel" type="button"
          class="eden-button eden-button--secondary multi-select__styled-secondary">
          Example YSA 1st Ward (18-25)
        </button>
      </div>
      <div id="unit-panel" class="eden-card multi-select__styled-card" hidden>
        <fieldset>
          <label>
            <input class="eden-form-part-input__control" type="checkbox" value="12345">
            Example Stake
          </label>
        </fieldset>
        <fieldset>
          <label>
            <input class="eden-form-part-input__control" type="checkbox" value="67890" checked>
            Example YSA 1st Ward (18-25)
          </label>
        </fieldset>
      </div>
    </div>
  `;
}

/** Synthetic All Organizations filter dropdown used by the callings-by-organization report. */
function orgsFilterHtml(): string {
  return `
    <div class="eden-stack multi-select__styled-stack">
      <button id="orgs-picker" aria-haspopup="listbox" aria-expanded="false"
        aria-controls="orgs-panel" type="button" class="eden-button">
        Organizations
      </button>
      <div id="orgs-panel" class="eden-card multi-select__styled-card" hidden>
        <label>
          <input type="checkbox" value="all-organizations">
          All Organizations
        </label>
      </div>
    </div>
  `;
}
