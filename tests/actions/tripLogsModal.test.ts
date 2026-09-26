import { describe, it, expect, beforeEach, vi } from 'vitest';
import { downloadTripLogs, showTripLogsModal } from '@/actions/tripPlanning/ui/logsModalHelper';
import { logTripStatus, resetTripState } from '@/actions/tripPlanning/ui/stateHelper';
import { Dom } from '@/actions/tripPlanning/types';
import * as fileUtils from '@/utils/fileUtils';
import * as uiUtils from '@/utils/ui/uiUtils';

describe('tripLogsModalHelper', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    resetTripState();
    vi.restoreAllMocks();
  });

  it('renders execution log modal with recorded status entries', () => {
    logTripStatus('Started geocoding with nominatim');
    logTripStatus('Geocoding complete: 5 succeeded');

    showTripLogsModal();

    const overlay = document.getElementById(Dom.LOGS_MODAL_OVERLAY_ID);
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain('Started geocoding with nominatim');
    expect(overlay?.textContent).toContain('Geocoding complete: 5 succeeded');
  });

  it('dismisses modal on close button click', () => {
    showTripLogsModal();
    const closeBtn = document.getElementById(Dom.LOGS_MODAL_CLOSE_ID) as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    expect(document.getElementById(Dom.LOGS_MODAL_OVERLAY_ID)).toBeNull();
  });

  it('dismisses modal on Done button click', () => {
    showTripLogsModal();
    const doneBtn = document.getElementById(Dom.LOGS_MODAL_DONE_ID) as HTMLButtonElement;
    expect(doneBtn).not.toBeNull();
    doneBtn.click();
    expect(document.getElementById(Dom.LOGS_MODAL_OVERLAY_ID)).toBeNull();
  });

  it('dismisses modal on Escape key press', () => {
    showTripLogsModal();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.getElementById(Dom.LOGS_MODAL_OVERLAY_ID)).toBeNull();
  });

  it('triggers download with data stewardship confirmation', async () => {
    const confirmSpy = vi.spyOn(uiUtils, 'confirmDataStewardshipDownload').mockResolvedValue(true);
    const downloadSpy = vi.spyOn(fileUtils, 'downloadFile').mockImplementation(() => {});

    await downloadTripLogs([{ timestamp: '10:00:00 AM', message: 'Test message' }]);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(downloadSpy).toHaveBeenCalledWith(
      expect.stringContaining('Test message'),
      'trip_planner_execution_log.txt',
      'text/plain;charset=utf-8;'
    );
  });
});
