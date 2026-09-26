import { describe, it, expect } from 'vitest';
import { ACTION_REGISTRY, getActionsForUrl, getPassiveActionsForUrl } from '@/actions/registry';

describe('ACTION_REGISTRY & getActionsForUrl', () => {
  it('should define all 9 core actions with required metadata', () => {
    expect(ACTION_REGISTRY.length).toBe(9);
    const ids = ACTION_REGISTRY.map((a) => a.id);
    expect(ids).toContain('downloadReportData');
    expect(ids).toContain('tableFilters');
    expect(ids).toContain('findMultipleCallings');
    expect(ids).toContain('memberFlashcards');
    expect(ids).toContain('membersOutsideBoundary');
    expect(ids).toContain('noPhotoList');
    expect(ids).toContain('processAttendance');
    expect(ids).toContain('tripPlanning');
    expect(ids).toContain('autoSyncStateDropdown');

    const passive = ACTION_REGISTRY.find((a) => a.id === 'autoSyncStateDropdown');
    expect(passive?.executionMode).toBe('passive');
    expect(passive?.defaultEnabled).toBe(false);
  });

  it('should match actions on Member Directory page and exclude tripPlanning', () => {
    const url = 'https://lcr.churchofjesuschrist.org/mlt/records/member-list';
    const actions = getActionsForUrl(url);
    const ids = actions.map((a) => a.id);

    expect(ids).toContain('downloadReportData');
    expect(ids).toContain('tableFilters');
    expect(ids).toContain('memberFlashcards');
    expect(ids).toContain('noPhotoList');
    expect(ids).not.toContain('tripPlanning');
  });

  it('should match tripPlanning only on members-moved-in report', () => {
    const url = 'https://lcr.churchofjesuschrist.org/mlt/report/members-moved-in';
    const actions = getActionsForUrl(url);
    const ids = actions.map((a) => a.id);

    expect(ids).toContain('tripPlanning');
    expect(ids).toContain('downloadReportData');
  });

  it('should match actions on Attendance page', () => {
    const url = 'https://lcr.churchofjesuschrist.org/class-and-quorum-attendance';
    const actions = getActionsForUrl(url);
    const ids = actions.map((a) => a.id);

    expect(ids).toContain('processAttendance');
  });

  it('should match actions on Callings report page and orgs page', () => {
    const reportUrl = 'https://lcr.churchofjesuschrist.org/mlt/report/member-callings';
    const reportActions = getActionsForUrl(reportUrl);
    expect(reportActions.map((a) => a.id)).toContain('findMultipleCallings');

    const orgsUrl = 'https://lcr.churchofjesuschrist.org/mlt/orgs';
    const orgsActions = getActionsForUrl(orgsUrl);
    expect(orgsActions.map((a) => a.id)).toContain('findMultipleCallings');
  });

  it('should return empty list for non-matching URLs', () => {
    const actions = getActionsForUrl('https://google.com');
    expect(actions).toEqual([]);
  });

  it('should exclude confidential and root base pages from table actions', () => {
    const baseUrls = [
      'https://lcr.churchofjesuschrist.org',
      'https://lcr.churchofjesuschrist.org/',
      'https://lcr.churchofjesuschrist.org/?lang=eng',
      'https://lcr.churchofjesuschrist.org/home',
      'https://lcr.churchofjesuschrist.org/#/',
      'https://lcrf.churchofjesuschrist.org/',
    ];

    for (const url of baseUrls) {
      const baseActions = getActionsForUrl(url);
      const baseIds = baseActions.map((a) => a.id);
      expect(baseIds).not.toContain('downloadReportData');
      expect(baseIds).not.toContain('tableFilters');
      expect(baseIds).not.toContain('tripPlanning');
    }

    const caActions = getActionsForUrl('https://lcr.churchofjesuschrist.org/ca/report');
    const caIds = caActions.map((a) => a.id);
    expect(caIds).not.toContain('downloadReportData');
  });

  it('should not register any actions for finance pages on lcrf or lcrffe', () => {
    const financeUrls = [
      'https://lcrf.churchofjesuschrist.org/finance',
      'https://lcrf.churchofjesuschrist.org/expenses',
      'https://lcrffe.churchofjesuschrist.org/finance',
      'https://lcrffe.churchofjesuschrist.org/budget',
    ];

    for (const url of financeUrls) {
      const actions = getActionsForUrl(url);
      expect(actions).toEqual([]);
    }
  });

  it('should exclude unit-statistics report page from table actions', () => {
    const statsUrl = 'https://lcr.churchofjesuschrist.org/report/unit-statistics?lang=eng';
    const actions = getActionsForUrl(statsUrl);
    const ids = actions.map((a) => a.id);

    expect(ids).not.toContain('downloadReportData');
    expect(ids).not.toContain('tableFilters');
  });

  it('should restrict memberFlashcards strictly to Church Directory and LCR Member Directory pages', () => {
    const nonDirUrls = [
      'https://google.com',
      'https://lcr.churchofjesuschrist.org/',
      'https://lcr.churchofjesuschrist.org/home',
      'https://lcr.churchofjesuschrist.org/mlt/report/members-moved-in',
      'chrome://extensions',
      'about:blank',
      '',
      undefined,
    ];

    for (const url of nonDirUrls) {
      const actions = getActionsForUrl(url);
      expect(actions.map((a) => a.id)).not.toContain('memberFlashcards');
    }

    // Must match Church Directory & Map
    const dirActions = getActionsForUrl('https://directory.churchofjesuschrist.org/12345');
    expect(dirActions.map((a) => a.id)).toContain('memberFlashcards');
    expect(dirActions.map((a) => a.id)).toContain('noPhotoList');

    // Must match LCR Member Directory
    const lcrListActions = getActionsForUrl(
      'https://lcr.churchofjesuschrist.org/mlt/records/member-list'
    );
    expect(lcrListActions.map((a) => a.id)).toContain('memberFlashcards');
  });

  it('should retrieve passive actions for matching LCR URLs', () => {
    const passiveActions = getPassiveActionsForUrl(
      'https://lcr.churchofjesuschrist.org/records/move-in'
    );
    expect(passiveActions.map((a) => a.id)).toContain('autoSyncStateDropdown');

    const nonLcrPassive = getPassiveActionsForUrl('https://directory.churchofjesuschrist.org');
    expect(nonLcrPassive).toEqual([]);
  });
});
