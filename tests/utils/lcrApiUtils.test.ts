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
    it('should parse 4-digit unit number from trailing parentheses', () => {
      expect(parseUnitNumberFromText('Synthetic 1st Ward (1234)')).toBe('1234');
    });

    it('should parse 5-digit unit number from trailing parentheses', () => {
      expect(parseUnitNumberFromText('Synthetic 2nd Ward (12345)')).toBe('12345');
    });

    it('should parse 4-digit unit number from intermediate parentheses', () => {
      expect(parseUnitNumberFromText('Ward (1234) - Additional Information')).toBe('1234');
    });

    it('should parse 4-digit unit number without parentheses as fallback', () => {
      expect(parseUnitNumberFromText('Unit 1234')).toBe('1234');
      expect(parseUnitNumberFromText('1234')).toBe('1234');
    });

    it('should return null for empty or non-numeric strings', () => {
      expect(parseUnitNumberFromText('')).toBeNull();
      expect(parseUnitNumberFromText('Synthetic Stake')).toBeNull();
    });
  });

  describe('resolveCurrentUnitNumber', () => {
    it('should resolve 4-digit unit number from static LCR header DOM element', () => {
      document.body.innerHTML = `
        <div id="static-current-unit-text"><span>Synthetic 1st Ward (1234)</span></div>
      `;
      expect(resolveCurrentUnitNumber(document)).toBe('1234');
    });

    it('should resolve 4-digit unit number from interactive switcher header element', () => {
      document.body.innerHTML = `
        <div id="current-unit-text"><span>Synthetic 2nd Branch (5678)</span></div>
      `;
      expect(resolveCurrentUnitNumber(document)).toBe('5678');
    });

    it('should resolve 4-digit unit number from stake parent element', () => {
      document.body.innerHTML = `
        <div id="mltp-unit-info-parent"><span>Synthetic Stake (9999)</span></div>
      `;
      expect(resolveCurrentUnitNumber(document)).toBe('9999');
    });

    it('should resolve 4-digit unit number from Church Directory pathname', () => {
      expect(
        resolveCurrentUnitNumber(document, 'https://directory.churchofjesuschrist.org/1234')
      ).toBe('1234');
      expect(
        resolveCurrentUnitNumber(document, 'https://directory.churchofjesuschrist.org/unit/1234')
      ).toBe('1234');
    });

    it('should resolve 4-digit unit number from URL query parameters', () => {
      expect(
        resolveCurrentUnitNumber(document, 'https://directory.churchofjesuschrist.org/?unit=1234')
      ).toBe('1234');
      expect(
        resolveCurrentUnitNumber(
          document,
          'https://lcr.churchofjesuschrist.org/mlt/report/members-moved-in?unitNumber=1234'
        )
      ).toBe('1234');
    });

    it('should resolve 4-digit unit number from Next.js state or pageProps', () => {
      window.__NEXT_DATA__ = {
        query: { unit: '1234' },
      };
      expect(resolveCurrentUnitNumber()).toBe('1234');

      delete window.__NEXT_DATA__.query;
      window.__NEXT_DATA__.props = {
        pageProps: { unitNumber: '5678' },
      };
      expect(resolveCurrentUnitNumber()).toBe('5678');

      delete window.__NEXT_DATA__;
    });

    it('should return null when no unit number is found', () => {
      expect(resolveCurrentUnitNumber(document, 'https://example.com/other')).toBeNull();
    });
  });
});
