import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { downloadCsv, downloadCsvZip, generateFilename, blobToDataUrl } from '@/utils/fileUtils';
import * as uiUtils from '@/utils/ui/uiUtils';

describe('fileUtils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.title = 'Quarterly Report - Leader and Clerk Resources';
    vi.restoreAllMocks();
  });

  describe('generateFilename', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 10, 1, 22, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should strip church branding and format clean filenames with date', () => {
      const filename = generateFilename('csv', 'elders');
      expect(filename).toContain('quarterly_report');
      expect(filename).not.toContain('Leader and Clerk Resources');
      expect(filename).toContain('_elders_');
      expect(filename.endsWith('.csv')).toBe(true);
    });

    it('should fallback to default prefix if page title is blank', () => {
      document.title = '';
      expect(generateFilename('zip')).toBe('lcr_export_2026-11-01.zip');
    });

    it('should drop a suffix that duplicates the title', () => {
      document.title = 'Member Directory';
      expect(generateFilename('csv', 'Member_Directory')).toBe('member_directory_2026-11-01.csv');
    });

    it('should keep a distinct suffix', () => {
      document.title = 'Class and Quorum Attendance';
      expect(generateFilename('csv', 'All_Organizations')).toBe(
        'class_and_quorum_attendance_all_organizations_2026-11-01.csv'
      );
    });

    it('should strip branding from the title', () => {
      document.title = 'Members – Leader and Clerk Resources';
      expect(generateFilename('csv')).toBe('members_2026-11-01.csv');
    });

    it('should normalize suffixes with odd characters', () => {
      expect(generateFilename('csv', "High Priests' Group (2)")).toBe(
        'quarterly_report_high_priests_group_2_2026-11-01.csv'
      );
    });
  });

  describe('downloadFile & downloadCsv', () => {
    it('should trigger browser download link and show success toast', () => {
      const toastSpy = vi.spyOn(uiUtils, 'showToast');
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function (this: HTMLAnchorElement) {});

      downloadCsv('Name,Age\nJohn,30', 'members.csv');

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(toastSpy).toHaveBeenCalledWith(
        expect.stringContaining('Downloaded: members.csv'),
        expect.objectContaining({ type: 'success' })
      );
    });
  });

  describe('downloadCsvZip', () => {
    it('should bundle multiple CSV files and handle duplicate filenames', async () => {
      const toastSpy = vi.spyOn(uiUtils, 'showToast');
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function (this: HTMLAnchorElement) {});

      const files = [
        { filename: 'report.csv', csvContent: 'A,B\n1,2' },
        { filename: 'report.csv', csvContent: 'C,D\n3,4' },
      ];

      await downloadCsvZip(files, 'all_reports.zip');

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(toastSpy).toHaveBeenCalledWith(
        expect.stringContaining('Downloaded: all_reports.zip'),
        expect.objectContaining({ type: 'success' })
      );
    });

    it('should warn user if file list is empty', async () => {
      const toastSpy = vi.spyOn(uiUtils, 'showToast');
      await downloadCsvZip([]);

      expect(toastSpy).toHaveBeenCalledWith(
        expect.stringContaining('No files to zip'),
        expect.objectContaining({ type: 'warning' })
      );
    });
  });

  describe('blobToDataUrl', () => {
    it('should convert a blob to base64 data url', async () => {
      const blob = new Blob(['sample data'], { type: 'text/plain' });
      const dataUrl = await blobToDataUrl(blob);
      expect(typeof dataUrl).toBe('string');
      expect(dataUrl).toContain('data:text/plain;base64');
    });
  });
});
