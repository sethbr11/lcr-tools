import { describe, it, expect } from 'vitest';
import {
  advancedNormalizeAddress,
  formatCleanAddress,
} from '@/actions/tripPlanning/geocoding/addressHelper';

describe('tripAddressHelper', () => {
  describe('formatCleanAddress', () => {
    it('returns empty string for falsy input', () => {
      expect(formatCleanAddress('')).toBe('');
    });

    it('inserts spaces into glued address segments', () => {
      const glued = '1234 N 321 WSte 120Provo UT 12345';
      const cleaned = formatCleanAddress(glued);
      expect(cleaned).toBe('1234 N 321 W Ste 120 Provo UT 12345');
    });

    it('handles glued unit and glued number with apartment and zip', () => {
      const glued = '555 E Main StApt 4Salt Lake City UT84101';
      const cleaned = formatCleanAddress(glued);
      expect(cleaned).toBe('555 E Main St Apt 4 Salt Lake City UT 84101');
    });

    it('handles glued suite designator without space before number', () => {
      const glued = '999 S 200 WSte101Orem UT 84058';
      const cleaned = formatCleanAddress(glued);
      expect(cleaned).toBe('999 S 200 W Ste 101 Orem UT 84058');
    });

    it('leaves already well-formatted addresses untouched', () => {
      const clean = '123 Main St Apt 4B Provo UT 84604';
      expect(formatCleanAddress(clean)).toBe('123 Main St Apt 4B Provo UT 84604');
    });

    it('does not alter normal street names like Haste or Castle', () => {
      const normal = '100 Haste St Berkeley CA 94704';
      expect(formatCleanAddress(normal)).toBe('100 Haste St Berkeley CA 94704');
    });
  });

  describe('advancedNormalizeAddress', () => {
    it('produces cleaned variants from glued raw strings', () => {
      const result = advancedNormalizeAddress('1234 N 321 WSte 120Provo UT 12345');
      expect(result.variants[0]).toBe('1234 N 321 W Ste 120 Provo UT 12345');
    });

    it('produces stripped variants for Canadian and international postal codes', () => {
      const result = advancedNormalizeAddress('100 Main Street, Toronto ON M5V 2T6');
      expect(result.variants).toContain('100 Main Street Toronto ON');
    });
  });
});
