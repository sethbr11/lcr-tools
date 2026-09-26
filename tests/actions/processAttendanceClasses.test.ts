import { describe, it, expect, beforeEach } from 'vitest';
import {
  getMostRecentSunday,
  getVisitorCategoriesForClass,
  parseClassQuorumOptions,
} from '@/actions/processAttendance/setup/classHelper';

describe('attendanceClassHelper', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('getMostRecentSunday', () => {
    it('should return a Date object on a Sunday', () => {
      const sunday = getMostRecentSunday();
      expect(sunday.getDay()).toBe(0);
      expect(sunday.getHours()).toBe(0);
      expect(sunday.getMinutes()).toBe(0);
    });
  });

  describe('parseClassQuorumOptions', () => {
    it('should preserve original DOM order with Adult Sunday School prioritized at the top and headers marked', () => {
      const select = document.createElement('select');
      select.className = 'eden-form-part-input__control';
      select.innerHTML = `
        <option value="ALL">All Classes and Quorums</option>
        <option value="rs-uuid">Relief Society</option>
        <option value="eq-uuid">Elders Quorum</option>
        <option value="ap-header">Aaronic Priesthood Quorums</option>
        <option value="deacons-uuid">Deacons Quorum</option>
        <option value="yw-header">Young Women</option>
        <option value="yw-uuid">Young Women 12-18</option>
        <option value="ss-header">Sunday School</option>
        <option value="ss-uuid">Adult Sunday School</option>
        <option value="c14-uuid">Course 14</option>
        <option value="pr-header">Primary</option>
        <option value="ctr-uuid">CTR 6</option>
      `;
      document.body.appendChild(select);

      const options = parseClassQuorumOptions();

      // Adult Sunday School must be index 0 and selected
      expect(options[0].text).toBe('Adult Sunday School');
      expect(options[0].value).toBe('ss-uuid');
      expect(options[0].selected).toBe(true);
      expect(options[0].isHeader).toBeFalsy();

      // Section headers should be marked isHeader: true with empty value
      const headers = options.filter((o) => o.isHeader);
      expect(headers.map((h) => h.text)).toEqual([
        'All Classes and Quorums',
        'Aaronic Priesthood Quorums',
        'Young Women',
        'Sunday School',
        'Primary',
      ]);
      headers.forEach((h) => expect(h.value).toBe(''));

      // Original order is preserved without alphabetization
      const remainingTexts = options.slice(1).map((o) => o.text);
      expect(remainingTexts).toEqual([
        'All Classes and Quorums',
        'Relief Society',
        'Elders Quorum',
        'Aaronic Priesthood Quorums',
        'Deacons Quorum',
        'Young Women',
        'Young Women 12-18',
        'Sunday School',
        'Course 14',
        'Primary',
        'CTR 6',
      ]);
    });

    it('should extract headers from optgroup elements if present in DOM', () => {
      const select = document.createElement('select');
      select.className = 'eden-form-part-input__control';
      select.innerHTML = `
        <optgroup label="Aaronic Priesthood Quorums">
          <option value="priests-1">Priests Quorum</option>
        </optgroup>
        <optgroup label="Young Women">
          <option value="yw-1">Gatherers of Light</option>
        </optgroup>
      `;
      document.body.appendChild(select);

      const options = parseClassQuorumOptions();
      expect(options[0].text).toBe('Aaronic Priesthood Quorums');
      expect(options[0].isHeader).toBe(true);
      expect(options[1].text).toBe('Priests Quorum');
      expect(options[1].isHeader).toBeFalsy();
      expect(options[1].selected).toBe(true);
    });

    it('should provide sensible fallback if no select elements exist', () => {
      const options = parseClassQuorumOptions();
      expect(options.length).toBeGreaterThan(0);
      expect(options[0].text).toBe('Adult Sunday School');
      expect(options.some((o) => o.isHeader)).toBe(true);
    });
  });

  describe('getVisitorCategoriesForClass', () => {
    it('should return Men and Women for Adult Sunday School', () => {
      expect(getVisitorCategoriesForClass('Adult Sunday School')).toEqual(['Men', 'Women']);
      expect(getVisitorCategoriesForClass('Sunday School - Adult')).toEqual(['Men', 'Women']);
    });

    it('should return Young Men and Young Women for Course classes', () => {
      expect(getVisitorCategoriesForClass('Course 14')).toEqual(['Young Men', 'Young Women']);
      expect(getVisitorCategoriesForClass('Course 17')).toEqual(['Young Men', 'Young Women']);
    });

    it('should return Men only for Elders Quorum', () => {
      expect(getVisitorCategoriesForClass('Elders Quorum')).toEqual(['Men']);
    });

    it('should return Women only for Relief Society', () => {
      expect(getVisitorCategoriesForClass('Relief Society')).toEqual(['Women']);
    });

    it('should return Young Men only for Aaronic quorums', () => {
      expect(getVisitorCategoriesForClass('Priests Quorum')).toEqual(['Young Men']);
      expect(getVisitorCategoriesForClass('Teachers Quorum')).toEqual(['Young Men']);
      expect(getVisitorCategoriesForClass('Deacons Quorum')).toEqual(['Young Men']);
    });

    it('should return Young Women only for Young Women classes', () => {
      expect(getVisitorCategoriesForClass('Gatherers of Light')).toEqual(['Young Women']);
      expect(getVisitorCategoriesForClass('Messengers of Hope')).toEqual(['Young Women']);
      expect(getVisitorCategoriesForClass('Builders of Faith')).toEqual(['Young Women']);
      expect(getVisitorCategoriesForClass('Young Women 12-18')).toEqual(['Young Women']);
    });

    it('should return Children only for Primary classes', () => {
      expect(getVisitorCategoriesForClass('Valiant 9')).toEqual(['Children']);
      expect(getVisitorCategoriesForClass('CTR 7')).toEqual(['Children']);
      expect(getVisitorCategoriesForClass('Sunbeam')).toEqual(['Children']);
      expect(getVisitorCategoriesForClass('Nursery')).toEqual(['Children']);
    });
  });
});
