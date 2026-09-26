import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runDownloadReportData } from '@/actions/downloadReportData';
import * as fileUtils from '@/utils/fileUtils';
import * as uiUtils from '@/utils/ui/uiUtils';
import * as tableUtils from '@/utils/table/tableUtils';
import * as navigationUtils from '@/utils/navigationUtils';
import { setAborted } from '@/utils/coreUtils';

describe('downloadReportData - functional user expectations', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('should notify user and return failure if current page has no tables', async () => {
    const toastSpy = vi.spyOn(uiUtils, 'showToast');

    const result = await runDownloadReportData();

    expect(result.success).toBe(false);
    expect(result.error).toBe('No tables found');
    expect(toastSpy).toHaveBeenCalledWith(
      expect.stringContaining('No tables found'),
      expect.objectContaining({ type: 'warning' })
    );
  });

  it('should extract single table and trigger CSV download with headers and rows', async () => {
    const downloadCsvSpy = vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});

    // Render realistic LCR report table
    const container = document.createElement('div');
    container.innerHTML = `
      <h3>Ward Member List</h3>
      <table id="member-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Smith, John</td>
            <td>555-0101</td>
            <td>john@example.com</td>
          </tr>
          <tr>
            <td>Doe, Jane</td>
            <td>555-0102</td>
            <td>jane@example.com</td>
          </tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const actionPromise = runDownloadReportData();

    await vi.waitFor(() => {
      expect(document.querySelector('#lcr-tools-confirm-btn')).not.toBeNull();
    });
    const confirmBtn = document.querySelector('#lcr-tools-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    await vi.waitFor(() => {
      expect(document.querySelector('#lcr-filename-confirm-btn')).not.toBeNull();
    });
    const filenameConfirmBtn = document.querySelector(
      '#lcr-filename-confirm-btn'
    ) as HTMLButtonElement;
    filenameConfirmBtn.click();

    const result = await actionPromise;

    expect(result.success).toBe(true);
    expect(result.data?.exportedCount).toBe(1);
    expect(downloadCsvSpy).toHaveBeenCalledTimes(1);

    const [exportedCsv, filename] = downloadCsvSpy.mock.calls[0];
    expect(exportedCsv).toContain('Name,Phone,Email');
    expect(exportedCsv).toContain('Smith, John');
    expect(exportedCsv).toContain('555-0101');
    expect(exportedCsv).toContain('Doe, Jane');
    expect(filename).toMatch(/Ward_Member_List.*\.csv/i);
  });

  it('should allow user to enter custom filename without extension and auto-append .csv', async () => {
    const downloadCsvSpy = vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});

    const container = document.createElement('div');
    container.innerHTML = `
      <h3>Ward List</h3>
      <table>
        <thead><tr><th>Name</th></tr></thead>
        <tbody><tr><td>Member 1</td></tr></tbody>
      </table>
    `;
    document.body.appendChild(container);

    const actionPromise = runDownloadReportData();

    await vi.waitFor(() => {
      expect(document.querySelector('#lcr-tools-confirm-btn')).not.toBeNull();
    });
    (document.querySelector('#lcr-tools-confirm-btn') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(document.querySelector('#lcr-filename-input')).not.toBeNull();
    });
    const input = document.querySelector('#lcr-filename-input') as HTMLInputElement;
    input.value = 'my_custom_export';

    (document.querySelector('#lcr-filename-confirm-btn') as HTMLButtonElement).click();

    const result = await actionPromise;
    expect(result.success).toBe(true);
    expect(downloadCsvSpy).toHaveBeenCalledWith(expect.any(String), 'my_custom_export.csv');
  });

  it('should cancel download if user cancels filename prompt dialog', async () => {
    const downloadCsvSpy = vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});

    const container = document.createElement('div');
    container.innerHTML = `
      <h3>Ward List</h3>
      <table>
        <thead><tr><th>Name</th></tr></thead>
        <tbody><tr><td>Member 1</td></tr></tbody>
      </table>
    `;
    document.body.appendChild(container);

    const actionPromise = runDownloadReportData();

    await vi.waitFor(() => {
      expect(document.querySelector('#lcr-tools-confirm-btn')).not.toBeNull();
    });
    (document.querySelector('#lcr-tools-confirm-btn') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(document.querySelector('#lcr-filename-cancel-btn')).not.toBeNull();
    });
    (document.querySelector('#lcr-filename-cancel-btn') as HTMLButtonElement).click();

    const result = await actionPromise;
    expect(result.success).toBe(false);
    expect(result.error).toBe('Cancelled by user');
    expect(downloadCsvSpy).not.toHaveBeenCalled();
  });

  it('should support Select All and Deselect All buttons in multi-table selection modal', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <h3>Table A</h3>
      <table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>A1</td></tr></tbody></table>
      <h3>Table B</h3>
      <table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>B1</td></tr></tbody></table>
    `;
    document.body.appendChild(container);

    const actionPromise = runDownloadReportData();

    const modal = document.querySelector('.lcr-tools-modal-backdrop');
    expect(modal).not.toBeNull();

    const selectAllBtn = modal?.querySelector('#lcr-select-all-tables') as HTMLButtonElement;
    const deselectAllBtn = modal?.querySelector('#lcr-deselect-all-tables') as HTMLButtonElement;
    expect(selectAllBtn).not.toBeNull();
    expect(deselectAllBtn).not.toBeNull();

    deselectAllBtn.click();
    const checkboxes = modal?.querySelectorAll<HTMLInputElement>('.lcr-table-choice');
    checkboxes?.forEach((cb) => expect(cb.checked).toBe(false));

    selectAllBtn.click();
    checkboxes?.forEach((cb) => expect(cb.checked).toBe(true));

    (modal?.querySelector('#lcr-cancel-tables') as HTMLButtonElement).click();
    const result = await actionPromise;
    expect(result.success).toBe(false);
  });

  it('should prompt user to select tables when multiple tables exist, and allow cancellation', async () => {
    const downloadCsvSpy = vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});

    const container = document.createElement('div');
    container.innerHTML = `
      <h3>Adults</h3>
      <table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Adult 1</td></tr></tbody></table>
      <h3>Youth</h3>
      <table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Youth 1</td></tr></tbody></table>
    `;
    document.body.appendChild(container);

    const actionPromise = runDownloadReportData();

    const modal = document.querySelector('.lcr-tools-modal-backdrop');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('Select Tables to Work With');

    const cancelBtn = modal?.querySelector('#lcr-cancel-tables') as HTMLButtonElement;
    expect(cancelBtn).not.toBeNull();
    cancelBtn.click();

    const result = await actionPromise;
    expect(result.success).toBe(false);
    expect(result.error).toBe('Cancelled by user');
    expect(downloadCsvSpy).not.toHaveBeenCalled();
  });

  it('should prompt user with Handbook 33.8 stewardship reminder and allow cancellation', async () => {
    const downloadCsvSpy = vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});

    const container = document.createElement('div');
    container.innerHTML = `
      <h3>Ward Member List</h3>
      <table>
        <thead><tr><th>Name</th></tr></thead>
        <tbody><tr><td>Smith, John</td></tr></tbody>
      </table>
    `;
    document.body.appendChild(container);

    const actionPromise = runDownloadReportData();

    await vi.waitFor(() => {
      expect(document.querySelector('.lcr-tools-confirm-modal')).not.toBeNull();
    });

    const modal = document.querySelector('.lcr-tools-confirm-modal');
    expect(modal?.textContent).toContain('Data Stewardship Reminder');
    expect(modal?.textContent).toContain('Handbook Section 33.8');

    const cancelBtn = modal?.querySelector('#lcr-tools-cancel-btn') as HTMLButtonElement;
    expect(cancelBtn).not.toBeNull();
    cancelBtn.click();

    const result = await actionPromise;
    expect(result.success).toBe(false);
    expect(result.error).toBe('Cancelled by user');
    expect(downloadCsvSpy).not.toHaveBeenCalled();
  });

  it('should export ZIP bundle when user selects multiple tables and confirms filename', async () => {
    const downloadZipSpy = vi.spyOn(fileUtils, 'downloadCsvZip').mockImplementation(async () => {});

    const container = document.createElement('div');
    container.innerHTML = `
      <h3>Adults</h3>
      <table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Adult 1</td></tr></tbody></table>
      <h3>Youth</h3>
      <table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Youth 1</td></tr></tbody></table>
    `;
    document.body.appendChild(container);

    const actionPromise = runDownloadReportData();

    const modal = document.querySelector('.lcr-tools-modal-backdrop');
    expect(modal).not.toBeNull();

    const checkboxes = modal?.querySelectorAll<HTMLInputElement>('.lcr-table-choice');
    expect(checkboxes?.length).toBe(2);
    checkboxes?.forEach((cb) => (cb.checked = true));

    const confirmBtn = modal?.querySelector('#lcr-confirm-tables') as HTMLButtonElement;
    confirmBtn.click();

    await vi.waitFor(() => {
      expect(document.querySelector('#lcr-tools-confirm-btn')).not.toBeNull();
    });
    const stewardshipBtn = document.querySelector('#lcr-tools-confirm-btn') as HTMLButtonElement;
    stewardshipBtn.click();

    await vi.waitFor(() => {
      expect(document.querySelector('#lcr-filename-confirm-btn')).not.toBeNull();
    });
    const filenameConfirmBtn = document.querySelector(
      '#lcr-filename-confirm-btn'
    ) as HTMLButtonElement;
    filenameConfirmBtn.click();

    const result = await actionPromise;
    expect(result.success).toBe(true);
    expect(result.data?.exportedCount).toBe(2);
    expect(downloadZipSpy).toHaveBeenCalledTimes(1);

    const [zipFiles, zipName] = downloadZipSpy.mock.calls[0];
    expect(zipFiles.length).toBe(2);
    expect(zipName).toMatch(/reports.*\.zip/i);
    expect(zipFiles[0].csvContent).toContain('Adult 1');
    expect(zipFiles[1].csvContent).toContain('Youth 1');
  });

  it('should trigger autoscroll and scroll back to top when infinite scroll is needed', async () => {
    const scrollSpy = vi.spyOn(navigationUtils, 'autoScrollToLoadContent').mockResolvedValue();
    const scrollToTopSpy = vi.spyOn(navigationUtils, 'scrollToTop').mockResolvedValue();
    vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});

    const container = document.createElement('div');
    container.className = 'eden-table-container';
    container.innerHTML = `
      <h3>Large Directory</h3>
      <table>
        <thead><tr><th>Name</th></tr></thead>
        <tbody><tr><td>Member Alpha</td></tr></tbody>
      </table>
    `;
    document.body.appendChild(container);

    // Mock scrollHeight > clientHeight on container
    Object.defineProperty(container, 'scrollHeight', { value: 1000 });
    Object.defineProperty(container, 'clientHeight', { value: 400 });

    const actionPromise = runDownloadReportData();

    await vi.waitFor(() => {
      expect(document.querySelector('#lcr-tools-confirm-btn')).not.toBeNull();
    });
    (document.querySelector('#lcr-tools-confirm-btn') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(document.querySelector('#lcr-filename-confirm-btn')).not.toBeNull();
    });
    (document.querySelector('#lcr-filename-confirm-btn') as HTMLButtonElement).click();

    const result = await actionPromise;
    expect(result.success).toBe(true);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollToTopSpy).toHaveBeenCalledTimes(1);
  });

  it('should abort cleanly when user triggers abort during execution', async () => {
    const toastSpy = vi.spyOn(uiUtils, 'showToast');

    const container = document.createElement('div');
    container.innerHTML = `
      <h3>Adults</h3>
      <table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Adult 1</td></tr></tbody></table>
      <h3>Youth</h3>
      <table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Youth 1</td></tr></tbody></table>
    `;
    document.body.appendChild(container);

    vi.spyOn(tableUtils, 'requestTables').mockImplementation(async (tables) => {
      setAborted(true);
      return tables;
    });

    const result = await runDownloadReportData();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Aborted');
    expect(toastSpy).toHaveBeenCalledWith(
      expect.stringContaining('Export cancelled by user'),
      expect.objectContaining({ type: 'info' })
    );
  });
});
