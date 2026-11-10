import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runFindMultipleCallings } from '@/actions/findMultipleCallings';

describe('duplicate rows: findMultipleCallings - functional user expectations', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('counts a calling listed in two tables only once for the member', async () => {
    Object.defineProperty(window, 'location', {
      value: new URL('https://lcr.churchofjesuschrist.org/orgs/callings-by-organization'),
      writable: true,
      configurable: true,
    });

    const table = `
      <table>
        <thead><tr><th>Member Name</th><th>Calling</th><th>Organization</th></tr></thead>
        <tbody>
          <tr><td>Brother Adams</td><td>Elders Quorum President</td><td>Elders Quorum</td></tr>
        </tbody>
      </table>`;
    const container = document.createElement('div');
    container.innerHTML = `<h3>Elders Quorum</h3>${table}<h3>Elders Quorum (all)</h3>${table}`;
    document.body.appendChild(container);

    const result = await runFindMultipleCallings();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(0);
  });
});
