import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  processClassVisitorCounts,
  setNativeInputValue,
  switchToVisitorsTab,
} from '@/actions/processAttendance/lcr/visitorsHelper';
import { Dom } from '@/actions/processAttendance/types';

describe('attendanceVisitorHelper - Visitors tab automation', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="eden-tabs">
        <button id="tab-MEMBERS" role="tab" aria-selected="true">Members</button>
        <button id="tab-VISITORS" role="tab" aria-selected="false">Visitors</button>
      </div>

      <select class="eden-form-part-input__control">
        <option value="2026-08">August 2026</option>
        <option value="2026-09" selected>September 2026</option>
      </select>

      <table>
        <tbody>
          <tr id="men_2026-09_ALL" role="row">
            <td><span>Visitors</span>Men</td>
            <td>
              <span>13 Sep</span>
              <input type="number" id="input-men-13" value="0" name="dummy-uuid::men::2026-09-13" />
            </td>
          </tr>
          <tr id="women_2026-09_ALL" role="row">
            <td><span>Visitors</span>Women</td>
            <td>
              <span>13 Sep</span>
              <input type="number" id="input-women-13" value="0" name="dummy-uuid::women::2026-09-13" />
            </td>
          </tr>
        </tbody>
      </table>

      <button class="eden-button--primary">Save</button>
    `;

    // Connect tab click behavior
    const memTab = document.getElementById('tab-MEMBERS');
    const visTab = document.getElementById('tab-VISITORS');
    visTab?.addEventListener('click', () => {
      visTab.setAttribute('aria-selected', 'true');
      memTab?.setAttribute('aria-selected', 'false');
    });
  });

  it('should switch to the Visitors tab if not currently active', async () => {
    const visTab = document.getElementById('tab-VISITORS');
    expect(visTab?.getAttribute('aria-selected')).toBe('false');

    await switchToVisitorsTab();

    expect(visTab?.getAttribute('aria-selected')).toBe('true');
  });

  it('should update numerical input value and dispatch input & change events', () => {
    const input = document.getElementById('input-men-13') as HTMLInputElement;
    let inputFired = false;
    let changeFired = false;

    input.addEventListener('input', () => {
      inputFired = true;
    });
    input.addEventListener('change', () => {
      changeFired = true;
    });

    setNativeInputValue(input, 18);

    expect(input.value).toBe('18');
    expect(inputFired).toBe(true);
    expect(changeFired).toBe(true);
  });

  it('should locate inputs matching domAnonymizerOutput.html structure, set values, and click save', async () => {
    const menInput = document.getElementById('input-men-13') as HTMLInputElement;
    const womenInput = document.getElementById('input-women-13') as HTMLInputElement;
    const saveBtn = document.querySelector<HTMLButtonElement>(Dom.SAVE_BUTTON);

    const saveClickSpy = vi.fn();
    saveBtn?.addEventListener('click', saveClickSpy);

    const result = await processClassVisitorCounts('Adult Sunday School', '2026-09-13', {
      Men: 22,
      Women: 27,
    });

    expect(result.success).toBe(true);
    expect(result.updated).toEqual(['Men: 22', 'Women: 27']);

    // Check DOM input values
    expect(menInput.value).toBe('22');
    expect(womenInput.value).toBe('27');

    // Save button was clicked
    expect(saveClickSpy).toHaveBeenCalled();
  });

  it('does not write Men counts into a Women row when name attributes are missing', async () => {
    document.body.innerHTML = `
      <div class="eden-tabs">
        <button id="tab-MEMBERS" role="tab" aria-selected="false">Members</button>
        <button id="tab-VISITORS" role="tab" aria-selected="true">Visitors</button>
      </div>
      <select class="eden-form-part-input__control">
        <option value="2026-09" selected>September 2026</option>
      </select>
      <table>
        <tbody>
          <tr role="row">
            <td>Visitors Women</td>
            <td>
              <span>13 Sep</span>
              <input type="number" id="input-women-13" value="0" />
            </td>
          </tr>
          <tr role="row">
            <td>Visitors Men</td>
            <td>
              <span>13 Sep</span>
              <input type="number" id="input-men-13" value="0" />
            </td>
          </tr>
        </tbody>
      </table>
      <button class="eden-button--primary">Save</button>
    `;

    const result = await processClassVisitorCounts('Adult Sunday School', '2026-09-13', {
      Men: 4,
      Women: 9,
    });

    expect(result.success).toBe(true);
    expect((document.getElementById('input-men-13') as HTMLInputElement).value).toBe('4');
    expect((document.getElementById('input-women-13') as HTMLInputElement).value).toBe('9');
  });
});
