import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createActionLogger,
  getCurrentLogger,
  setCurrentLogger,
  exportLogsToCSV,
} from '@/utils/loggingUtils';
import * as fileUtils from '@/utils/fileUtils';

describe('loggingUtils', () => {
  beforeEach(() => {
    setCurrentLogger(null);
    vi.restoreAllMocks();
  });

  it('should initialize an ActionLogger and record startup entry', () => {
    const logger = createActionLogger('testAction');
    expect(getCurrentLogger()).toBe(logger);

    const logs = logger.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('ACTION_STARTED');
    expect(logs[0].actionName).toBe('testAction');
  });

  it('should log custom actions, modifications, user actions, and errors', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const logger = createActionLogger('memberAudit');

    logger.logAction('SCAN_INITIATED', { target: 'all' }, 'INFO');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('LCR Tools [memberAudit]: SCAN_INITIATED'),
      expect.anything()
    );

    logger.logAction('LOW_PHOTO_COUNT', { count: 2 }, 'WARN');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('LCR Tools [memberAudit]: LOW_PHOTO_COUNT'),
      expect.anything()
    );

    logger.logModification('UPDATE', 'Member#123', 'Old Address', 'New Address');
    logger.logUserAction('CLICK', 'btn-export', 'Clicked export button');
    logger.logError(new Error('Network timeout'), 'fetchCard');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('LCR Tools [memberAudit]: ERROR_OCCURRED'),
      expect.anything()
    );

    const logs = logger.getLogs();
    expect(logs.length).toBe(6); // Started + 5 logged events
  });

  it('should generate valid CSV text from captured logs and export to file', () => {
    const downloadFileSpy = vi.spyOn(fileUtils, 'downloadFile').mockImplementation(() => {});

    const logger = createActionLogger('csvTest');
    logger.logAction('TEST_ACTION', 'Sample detail string');

    const csv = logger.exportToCSV();
    expect(csv).toContain('Timestamp,Action,Target,Level,Details');
    expect(csv).toContain('ACTION_STARTED');
    expect(csv).toContain('TEST_ACTION');
    expect(csv).toContain('Sample detail string');

    exportLogsToCSV('custom_log.csv');
    expect(downloadFileSpy).toHaveBeenCalledWith(
      expect.stringContaining('TEST_ACTION'),
      'custom_log.csv',
      expect.anything()
    );
  });
});
