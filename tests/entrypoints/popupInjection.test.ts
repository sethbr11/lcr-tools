import { describe, it, expect, vi, afterEach } from 'vitest';
import { browser } from 'wxt/browser';
import { executeAction } from '@/entrypoints/popup/popupActionHelper';
import { ACTION_REGISTRY } from '@/actions/registry';

const downloadAction = ACTION_REGISTRY.find((a) => a.id === 'downloadReportData')!;

describe('popup action injection across browsers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the scripting API when the browser provides it', async () => {
    const scripting = vi
      .spyOn(browser.scripting, 'executeScript')
      .mockResolvedValue(undefined as never);
    vi.spyOn(window, 'close').mockImplementation(() => {});

    await executeAction(downloadAction, 7, 'https://lcr.churchofjesuschrist.org/report');

    expect(scripting).toHaveBeenCalledWith(
      expect.objectContaining({ files: ['/action-download-report-data.js'] })
    );
  });

  it('falls back to tabs.executeScript when the scripting API is missing (Safari MV2)', async () => {
    const original = browser.scripting;
    const legacy = vi.fn().mockResolvedValue([]);
    Object.defineProperty(browser, 'scripting', { value: undefined, configurable: true });
    (browser.tabs as unknown as { executeScript: typeof legacy }).executeScript = legacy;
    vi.spyOn(window, 'close').mockImplementation(() => {});

    try {
      await executeAction(downloadAction, 7, 'https://lcr.churchofjesuschrist.org/report');
      expect(legacy).toHaveBeenCalledWith(expect.any(Number), {
        file: '/action-download-report-data.js',
      });
    } finally {
      Object.defineProperty(browser, 'scripting', { value: original, configurable: true });
      delete (browser.tabs as unknown as { executeScript?: unknown }).executeScript;
    }
  });
});
