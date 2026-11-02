import { describe, it, expect } from 'vitest';
import { clearElement, setHtml } from '@/utils/ui/htmlUtils';

describe('htmlUtils', () => {
  describe('setHtml', () => {
    it('keeps td cells inside a tr', () => {
      const tr = document.createElement('tr');
      setHtml(tr, '<td>a</td><td>b</td>');
      expect(tr.cells.length).toBe(2);
      expect(tr.cells[1].textContent).toBe('b');
    });

    it('preserves colspan on a td', () => {
      const tr = document.createElement('tr');
      setHtml(tr, '<td colspan="5">x</td>');
      expect(tr.cells.length).toBe(1);
      expect(tr.cells[0].getAttribute('colspan')).toBe('5');
    });

    it('keeps tr rows inside a tbody', () => {
      const tbody = document.createElement('tbody');
      setHtml(tbody, '<tr><td>1</td></tr><tr><td>2</td></tr>');
      expect(tbody.rows.length).toBe(2);
    });

    it('still works for a div', () => {
      const div = document.createElement('div');
      setHtml(div, '<span>hi</span> there');
      expect(div.querySelector('span')?.textContent).toBe('hi');
      expect(div.textContent).toBe('hi there');
    });

    it('still works for option in a select', () => {
      const select = document.createElement('select');
      setHtml(select, '<option value="a">A</option><option value="b">B</option>');
      expect(select.options.length).toBe(2);
    });
  });

  describe('clearElement', () => {
    it('empties the target', () => {
      const div = document.createElement('div');
      div.append('x', document.createElement('b'));
      clearElement(div);
      expect(div.childNodes.length).toBe(0);
    });
  });
});
