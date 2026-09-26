import { describe, it, expect, beforeEach } from 'vitest';
import {
  expandMonthsToShow,
  getNeeds,
  isLastPage,
  isLcrHostUrl,
  isUrlMatching,
  navigateToTab,
  setSelectValue,
} from '@/utils/navigationUtils';

describe('navigationUtils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('isLastPage', () => {
    it('should return true if next page button is disabled', () => {
      document.body.innerHTML = '<button data-testid="next" disabled>Next</button>';
      expect(isLastPage()).toBe(true);
    });

    it('should return false if next page button is enabled', () => {
      document.body.innerHTML = '<button data-testid="next">Next</button>';
      expect(isLastPage()).toBe(false);
    });
  });

  describe('setSelectValue', () => {
    it('should set select element value and dispatch change and input events', () => {
      const select = document.createElement('select');
      select.innerHTML = `
        <option value="1">One</option>
        <option value="2">Two</option>
      `;
      document.body.appendChild(select);

      let eventFired = false;
      select.addEventListener('change', () => {
        eventFired = true;
      });

      const success = setSelectValue(select, '2');
      expect(success).toBe(true);
      expect(select.value).toBe('2');
      expect(eventFired).toBe(true);
    });

    it('should return false if select is null', () => {
      expect(setSelectValue(null, 'val')).toBe(false);
    });
  });

  describe('expandMonthsToShow', () => {
    it('should expand months dropdown to 12 when present', async () => {
      document.body.innerHTML = `
        <select id="months-filter">
          <option value="1" selected>Months to show: 1</option>
          <option value="6">Months to show: 6</option>
          <option value="12">Months to show: 12</option>
        </select>
        <table><tbody><tr><td>Row 1</td></tr></tbody></table>
      `;

      const select = document.querySelector<HTMLSelectElement>('#months-filter')!;
      const changed = await expandMonthsToShow(12, null, 50);
      expect(changed).toBe(true);
      expect(select.value).toBe('12');
    });

    it('should return false if already set to target value', async () => {
      document.body.innerHTML = `
        <select id="months-filter">
          <option value="1">Months to show: 1</option>
          <option value="12" selected>Months to show: 12</option>
        </select>
      `;

      const changed = await expandMonthsToShow(12, null, 50);
      expect(changed).toBe(false);
    });

    it('should return false if no months to show select exists', async () => {
      document.body.innerHTML = `
        <select id="other-select">
          <option value="a">A</option>
        </select>
      `;

      const changed = await expandMonthsToShow(12, null, 50);
      expect(changed).toBe(false);
    });
  });

  describe('getNeeds', () => {
    it('should detect pagination need when next button is present', () => {
      document.body.innerHTML = '<button data-testid="next">Next</button>';
      const needs = getNeeds();
      expect(needs).toContain('pagination');
    });

    it('should return empty array if no pagination or scroll needs exist', () => {
      document.body.innerHTML = '<div>Plain Content</div>';
      const needs = getNeeds();
      expect(needs).toEqual([]);
    });
  });

  describe('navigateToTab', () => {
    it('should click tab if not active', () => {
      const tab = document.createElement('button');
      tab.id = 'tab1';
      document.body.appendChild(tab);

      let clicked = false;
      tab.addEventListener('click', () => {
        clicked = true;
      });

      const res = navigateToTab('#tab1');
      expect(res).toBe(true);
      expect(clicked).toBe(true);
    });

    it('should skip click if already active', () => {
      const tab = document.createElement('button');
      tab.id = 'tab2';
      tab.classList.add('active');
      document.body.appendChild(tab);

      let clicked = false;
      tab.addEventListener('click', () => {
        clicked = true;
      });

      const res = navigateToTab('#tab2');
      expect(res).toBe(true);
      expect(clicked).toBe(false);
    });
  });

  describe('isUrlMatching', () => {
    it('should match included URLs', () => {
      const patterns = {
        include: ['lcr.churchofjesuschrist.org/'],
        exclude: ['confidential'],
      };
      expect(isUrlMatching('https://lcr.churchofjesuschrist.org/report', patterns)).toBe(true);
      expect(isUrlMatching('https://other.domain.com/report', patterns)).toBe(false);
    });

    it('should reject excluded URLs', () => {
      const patterns = {
        include: ['lcr.churchofjesuschrist.org/'],
        exclude: ['confidential', /records\/profile/],
      };
      expect(isUrlMatching('https://lcr.churchofjesuschrist.org/confidential', patterns)).toBe(
        false
      );
      expect(
        isUrlMatching('https://lcr.churchofjesuschrist.org/records/profile/123', patterns)
      ).toBe(false);
    });
  });

  describe('isLcrHostUrl', () => {
    it('should accept LCR, LCRF, and LCRFFE hosts', () => {
      expect(isLcrHostUrl('https://lcr.churchofjesuschrist.org/mlt/records/member-list')).toBe(
        true
      );
      expect(isLcrHostUrl('https://lcrf.churchofjesuschrist.org/report')).toBe(true);
      expect(isLcrHostUrl('https://lcrffe.churchofjesuschrist.org')).toBe(true);
    });

    it('should reject directory, other Church hosts, and non-Church URLs', () => {
      expect(isLcrHostUrl('https://directory.churchofjesuschrist.org/12345')).toBe(false);
      expect(isLcrHostUrl('https://www.churchofjesuschrist.org')).toBe(false);
      expect(isLcrHostUrl('https://google.com')).toBe(false);
      expect(isLcrHostUrl('')).toBe(false);
      expect(isLcrHostUrl(null)).toBe(false);
    });
  });
});
