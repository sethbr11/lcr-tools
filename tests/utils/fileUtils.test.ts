import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  downloadCsv,
  downloadCsvZip,
  generateFilename,
  formatCsvCell,
  blobToDataUrl,
} from '@/utils/fileUtils';
import * as uiUtils from '@/utils/ui/uiUtils';

describe('fileUtils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.title = 'Quarterly Report - Leader and Clerk Resources';
    vi.restoreAllMocks();
  });

  describe('generateFilename', () => {
    it('should strip church branding and format clean filenames with date', () => {
      const filename = generateFilename('csv', 'elders');
      expect(filename).toContain('quarterly_report');
      expect(filename).not.toContain('Leader and Clerk Resources');
      expect(filename).toContain('_elders_');
      expect(filename.endsWith('.csv')).toBe(true);
    });

    it('should fallback to default prefix if page title is blank', () => {
      document.title = '';
      const filename = generateFilename('zip');
      expect(filename.startsWith('_export_')).toBe(true);
      expect(filename.endsWith('.zip')).toBe(true);
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

  describe('formatCsvCell', () => {
    it('should quote values with commas or quotes', () => {
      expect(formatCsvCell('Hello, World')).toBe('"Hello, World"');
      expect(formatCsvCell('Simple')).toBe('Simple');
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
