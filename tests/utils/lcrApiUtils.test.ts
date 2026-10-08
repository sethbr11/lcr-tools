import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchMemberCard,
  processInBatches,
  getMemberInfoFromRow,
  parseUnitNumberFromText,
  resolveCurrentUnitNumber,
} from '@/utils/church/lcrApiUtils';
import { setAborted } from '@/utils/coreUtils';

describe('lcrApiUtils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('fetchMemberCard', () => {
    it('should fetch and parse member card data on successful API response', async () => {
      const mockCard = {
        name: 'John Smith',
        photoMetadata: { tokenUrl: 'https://example.com/photos/123' },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockCard,
      } as Response);

      const result = await fetchMemberCard('uuid-123');
      expect(result).toEqual(mockCard);
    });

    it('should return null when API returns error or fetch fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      expect(await fetchMemberCard('uuid-404')).toBeNull();

      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
      expect(await fetchMemberCard('uuid-net-err')).toBeNull();
    });
  });

  describe('processInBatches', () => {
    it('should process items in batches and report progress', async () => {
      const items = [1, 2, 3, 4, 5];
      const processed: number[] = [];
      const progressCalls: number[] = [];

      await processInBatches(
        items,
        2,
        async (item) => {
          processed.push(item * 10);
        },
        (_done, currentBatchEnd, _total) => {
          progressCalls.push(currentBatchEnd);
        }
      );

      expect(processed).toEqual([10, 20, 30, 40, 50]);
      expect(progressCalls).toEqual([2, 4, 5]);
    });

    it('should stop processing if isAborted() becomes true', async () => {
      const items = [1, 2, 3, 4, 5];
      const processed: number[] = [];

      await processInBatches(items, 2, async (item) => {
        processed.push(item);
        if (item === 2) {
          setAborted(true);
        }
      });

      // Should have processed the first batch (1, 2), then aborted before second batch
      expect(processed.length).toBe(2);
      setAborted(false);
    });
  });

  describe('getMemberInfoFromRow', () => {
    it('should parse member ID and comma-separated name with age suffix', () => {
      const row = document.createElement('tr');
      row.id = 'uuid-member-1';
      row.innerHTML = `
        <td>
          <button class="member-card__styled-ghost">Smith, John (35)</button>
        </td>
      `;

      const info = getMemberInfoFromRow(row);
      expect(info).not.toBeNull();
      expect(info?.memberId).toBe('uuid-member-1');
      expect(info?.firstName).toBe('John');
      expect(info?.lastName).toBe('Smith');
      expect(info?.fullName).toBe('John Smith');
      expect(info?.directoryName).toBe('Smith, John');
    });

    it('should parse member without comma and resolve ID from href attribute', () => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <button class="member-card__styled-ghost" href="/member-profile/a1b2c3d4-e5f6-7890-abcd-ef1234567890">Mary Jane</button>
        </td>
      `;

      const info = getMemberInfoFromRow(row);
      expect(info).not.toBeNull();
      expect(info?.memberId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      expect(info?.firstName).toBe('Mary');
      expect(info?.lastName).toBe('Jane');
      expect(info?.fullName).toBe('Mary Jane');
    });

    it('should return null if row has no styled-ghost button or valid ID', () => {
      const row = document.createElement('tr');
      row.innerHTML = `<td><span>Static Header</span></td>`;
      expect(getMemberInfoFromRow(row)).toBeNull();
    });
  });

  describe('parseUnitNumberFromText', () => {
    it('should parse 2-digit unit number from trailing parentheses', () => {
      expect(parseUnitNumberFromText('Synthetic 1st Ward (42)')).toBe('42');
    });

    it('should parse 3-digit unit number from trailing parentheses', () => {
      expect(parseUnitNumberFromText('Synthetic 1st Ward (123)')).toBe('123');
    });

    it('should parse 4-digit unit number from trailing parentheses', () => {
      expect(parseUnitNumberFromText('Synthetic 1st Ward (1234)')).toBe('1234');
    });

    it('should parse 5-digit unit number from trailing parentheses', () => {
      expect(parseUnitNumberFromText('Synthetic 2nd Ward (12345)')).toBe('12345');
    });

    it('should parse 6-digit and 7-digit unit numbers from trailing parentheses', () => {
      expect(parseUnitNumberFromText('Synthetic 3rd Ward (123456)')).toBe('123456');
      expect(parseUnitNumberFromText('Synthetic 4th Ward (1234567)')).toBe('1234567');
    });

    it('should parse unit number when preceded by age bracket', () => {
      expect(parseUnitNumberFromText('Synthetic YSA 262nd Ward (18-25) (42)')).toBe('42');
      expect(parseUnitNumberFromText('Synthetic YSA 262nd Ward (18-25) (12345)')).toBe('12345');
    });

    it('should not mistake age range in parentheses for a unit number', () => {
      expect(parseUnitNumberFromText('Synthetic YSA 262nd Ward (18-25)')).toBeNull();
    });

    it('should parse unit number from intermediate parentheses', () => {
      expect(parseUnitNumberFromText('Ward (42) - Additional Information')).toBe('42');
      expect(parseUnitNumberFromText('Ward (1234) - Additional Information')).toBe('1234');
    });

    it('should parse labeled unit numbers without parentheses', () => {
      expect(parseUnitNumberFromText('Unit 42')).toBe('42');
      expect(parseUnitNumberFromText('Unit 1234')).toBe('1234');
      expect(parseUnitNumberFromText('#1234567')).toBe('1234567');
    });

    it('should parse standalone 2 to 7 digit numeric strings', () => {
      expect(parseUnitNumberFromText('42')).toBe('42');
      expect(parseUnitNumberFromText('123')).toBe('123');
      expect(parseUnitNumberFromText('1234')).toBe('1234');
      expect(parseUnitNumberFromText('1234567')).toBe('1234567');
    });

    it('should return null for empty, single-digit, or non-numeric strings', () => {
      expect(parseUnitNumberFromText('')).toBeNull();
      expect(parseUnitNumberFromText('7')).toBeNull();
      expect(parseUnitNumberFromText('Synthetic Stake')).toBeNull();
    });
  });

  describe('resolveCurrentUnitNumber', () => {
    it('should resolve 2-digit to 7-digit unit numbers from static LCR header DOM element', () => {
      document.body.innerHTML = `
        <div id="static-current-unit-text"><span>Synthetic 1st Ward (42)</span></div>
      `;
      expect(resolveCurrentUnitNumber(document)).toBe('42');

      document.body.innerHTML = `
        <div id="static-current-unit-text"><span>Synthetic 1st Ward (1234567)</span></div>
      `;
      expect(resolveCurrentUnitNumber(document)).toBe('1234567');
    });

    it('should resolve unit number from interactive switcher header element', () => {
      document.body.innerHTML = `
        <div id="current-unit-text"><span>Synthetic 2nd Branch (5678)</span></div>
      `;
      expect(resolveCurrentUnitNumber(document)).toBe('5678');
    });

    it('should resolve unit number from stake parent element', () => {
      document.body.innerHTML = `
        <div id="mltp-unit-info-parent"><span>Synthetic Stake (99)</span></div>
      `;
      expect(resolveCurrentUnitNumber(document)).toBe('99');
    });

    it('should resolve 2-digit to 7-digit unit numbers from Church Directory pathname', () => {
      expect(
        resolveCurrentUnitNumber(document, 'https://directory.churchofjesuschrist.org/42')
      ).toBe('42');
      expect(
        resolveCurrentUnitNumber(document, 'https://directory.churchofjesuschrist.org/123')
      ).toBe('123');
      expect(
        resolveCurrentUnitNumber(document, 'https://directory.churchofjesuschrist.org/1234')
      ).toBe('1234');
      expect(
        resolveCurrentUnitNumber(document, 'https://directory.churchofjesuschrist.org/1234567')
      ).toBe('1234567');
      expect(
        resolveCurrentUnitNumber(document, 'https://directory.churchofjesuschrist.org/unit/42')
      ).toBe('42');
      expect(
        resolveCurrentUnitNumber(
          document,
          'https://directory.churchofjesuschrist.org/42/households'
        )
      ).toBe('42');
    });

    it('should resolve unit numbers from URL query parameters', () => {
      expect(
        resolveCurrentUnitNumber(document, 'https://directory.churchofjesuschrist.org/?unit=42')
      ).toBe('42');
      expect(
        resolveCurrentUnitNumber(
          document,
          'https://directory.churchofjesuschrist.org/?unit=1234567'
        )
      ).toBe('1234567');
      expect(
        resolveCurrentUnitNumber(
          document,
          'https://lcr.churchofjesuschrist.org/mlt/report/members-moved-in?unitNumber=1234'
        )
      ).toBe('1234');
    });

    it('should resolve unit number from Next.js state or pageProps', () => {
      window.__NEXT_DATA__ = {
        query: { unit: '42' },
      };
      expect(resolveCurrentUnitNumber()).toBe('42');

      delete window.__NEXT_DATA__.query;
      window.__NEXT_DATA__.props = {
        pageProps: { unitNumber: '1234567' },
      };
      expect(resolveCurrentUnitNumber()).toBe('1234567');

      delete window.__NEXT_DATA__;
    });

    it('should return null for non-unit paths and invalid strings', () => {
      expect(resolveCurrentUnitNumber(document, 'https://example.com/other')).toBeNull();
      expect(
        resolveCurrentUnitNumber(
          document,
          'https://directory.churchofjesuschrist.org/api/v4/households'
        )
      ).toBeNull();
    });
  });
});
