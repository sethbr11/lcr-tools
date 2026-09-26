import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchMemberCard,
  processInBatches,
  getMemberInfoFromRow,
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
});
