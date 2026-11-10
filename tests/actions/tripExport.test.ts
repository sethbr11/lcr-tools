import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildTripCsv, exportTripCsv } from '@/actions/tripPlanning/export/exportHelper';
import { resetTripState, setTripState } from '@/actions/tripPlanning/ui/stateHelper';
import * as uiUtils from '@/utils/ui/uiUtils';
import * as fileUtils from '@/utils/fileUtils';

describe('tripExportHelper', () => {
  beforeEach(() => {
    resetTripState();
    vi.restoreAllMocks();
  });

  it('includes original headers plus route columns', () => {
    setTripState({
      originalHeaders: ['Name', 'Address'],
      geocoded: [
        {
          name: 'Smith, John',
          address: '100 N Main St',
          columns: { Name: 'Smith, John', Address: '100 N Main St' },
          lat: 40.1,
          lng: -111.1,
        },
      ],
    });
    const csv = buildTripCsv();
    expect(csv).toContain('Name');
    expect(csv).toContain('Latitude');
    expect(csv).toContain('Longitude');
    expect(csv).toContain('Cluster');
    expect(csv).toContain('RouteOrder');
    expect(csv).toContain('FailureReason');
    expect(csv).toContain('Smith, John');
    expect(csv).toContain('40.1');
  });

  it('formats glued addresses with proper spacing in CSV output', () => {
    setTripState({
      originalHeaders: ['Name', 'Address'],
      geocoded: [
        {
          name: 'Doe, Jane',
          address: '1234 N 321 WSte 120Provo UT 12345',
          columns: { Name: 'Doe, Jane', Address: '1234 N 321 WSte 120Provo UT 12345' },
          lat: 40.2,
          lng: -111.6,
        },
      ],
    });
    const csv = buildTripCsv();
    expect(csv).toContain('1234 N 321 W Ste 120 Provo UT 12345');
  });

  it('gates CSV download behind the stewardship modal', async () => {
    const confirmSpy = vi.spyOn(uiUtils, 'confirmDataStewardshipDownload').mockResolvedValue(false);
    const downloadSpy = vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});
    const handled = await exportTripCsv();
    expect(handled).toBe(true);
    expect(confirmSpy).toHaveBeenCalled();
    expect(downloadSpy).not.toHaveBeenCalled();
  });
});
