/**
 * Verification tests for popup layout, cross-browser sizing, and vertical scrollability.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Popup Layout and Cross-Browser Sizing Styles', () => {
  const cssPath = path.resolve(__dirname, '../src/entrypoints/popup/style.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  it('ensures popup-content enables vertical scrolling and avoids clipping', () => {
    expect(css.includes('overflow-y: auto')).toBe(true);
    expect(css.includes('-webkit-overflow-scrolling: touch')).toBe(true);
    expect(css.includes('max-height: 600px')).toBe(true);
    expect(css.includes('max-height: 500px')).toBe(false);
  });

  it('ensures popup-subtitle prevents wrapping to maintain consistent header height', () => {
    expect(css.includes('white-space: nowrap')).toBe(true);
    expect(css.includes('text-overflow: ellipsis')).toBe(true);
  });

  it('ensures custom scrollbars are configured for popup-content', () => {
    expect(css.includes('.popup-content::-webkit-scrollbar')).toBe(true);
    expect(css.includes('scrollbar-width: thin')).toBe(true);
  });

  it('ensures version badge styling is configured in header', () => {
    expect(css.includes('.popup-version-badge')).toBe(true);
  });
});
