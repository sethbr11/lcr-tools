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

  it('should update numerical input value and dispatch focus, input, change, & blur events', () => {
    const input = document.getElementById('input-men-13') as HTMLInputElement;
    const trackerSetValueSpy = vi.fn();
    (input as unknown as { _valueTracker: { setValue: (v: string) => void } })._valueTracker = {
      setValue: trackerSetValueSpy,
    };

    let focusFired = false;
    let inputFired = false;
    let changeFired = false;
    let blurFired = false;

    input.addEventListener('focus', () => {
      focusFired = true;
    });
    input.addEventListener('input', () => {
      inputFired = true;
    });
    input.addEventListener('change', () => {
      changeFired = true;
    });
    input.addEventListener('blur', () => {
      blurFired = true;
    });

    setNativeInputValue(input, 18);

    expect(input.value).toBe('18');
    expect(focusFired).toBe(true);
    expect(inputFired).toBe(true);
    expect(changeFired).toBe(true);
    expect(blurFired).toBe(true);
    expect(trackerSetValueSpy).toHaveBeenCalledWith('0');
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

  it('reliably fills both Men and Women visitor rows and clicks save on Adult Sunday School table', async () => {
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
          <tr id="men_2026-09_ALL" role="row">
            <td class="eden-table-td"><span class="eden-headings-h6">Visitors</span>Men</td>
            <td class="eden-table-td">
              <span class="eden-headings-h6">27 Sep</span>
              <div class="useClassQuorumAttendanceVisitors-module__layxKa__visitorInputContainer">
                <input class="eden-form-part-input__control" id="_r_vr_" type="number" value="" name="dummy-uuid::men::2026-09-27" />
              </div>
            </td>
          </tr>
          <tr id="women_2026-09_ALL" role="row">
            <td class="eden-table-td"><span class="eden-headings-h6">Visitors</span>Women</td>
            <td class="eden-table-td">
              <span class="eden-headings-h6">27 Sep</span>
              <div class="useClassQuorumAttendanceVisitors-module__layxKa__visitorInputContainer">
                <input class="eden-form-part-input__control" id="_r_107_" type="number" value="" name="dummy-uuid::women::2026-09-27" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <button class="eden-button--primary">Save</button>
    `;

    const menInput = document.getElementById('_r_vr_') as HTMLInputElement;
    const womenInput = document.getElementById('_r_107_') as HTMLInputElement;
    const saveBtn = document.querySelector<HTMLButtonElement>(Dom.SAVE_BUTTON);

    let menFocused = false;
    let menBlurred = false;
    let womenFocused = false;
    let womenBlurred = false;

    menInput.addEventListener('focus', () => {
      menFocused = true;
    });
    menInput.addEventListener('blur', () => {
      menBlurred = true;
    });
    womenInput.addEventListener('focus', () => {
      womenFocused = true;
    });
    womenInput.addEventListener('blur', () => {
      womenBlurred = true;
    });

    const saveSpy = vi.fn();
    saveBtn?.addEventListener('click', saveSpy);

    const result = await processClassVisitorCounts('Adult Sunday School', '2026-09-27', {
      Men: 21,
      Women: 21,
    });

    expect(result.success).toBe(true);
    expect(result.updated).toEqual(['Men: 21', 'Women: 21']);
    expect(menInput.value).toBe('21');
    expect(womenInput.value).toBe('21');
    expect(menFocused).toBe(true);
    expect(menBlurred).toBe(true);
    expect(womenFocused).toBe(true);
    expect(womenBlurred).toBe(true);
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it('accurately resolves single-digit day column headers such as 6 Sep without leading zeros', async () => {
    document.body.innerHTML = `
      <div class="eden-tabs">
        <button id="tab-VISITORS" role="tab" aria-selected="true">Visitors</button>
      </div>
      <select class="eden-form-part-input__control">
        <option value="2026-09" selected>September 2026</option>
      </select>
      <table>
        <tbody>
          <tr id="men_2026-09_ALL" role="row">
            <td>Visitors Men</td>
            <td>
              <span>6 Sep</span>
              <input type="number" id="input-men-6" value="16" />
            </td>
          </tr>
        </tbody>
      </table>
      <button class="eden-button--primary">Save</button>
    `;

    const result = await processClassVisitorCounts('Adult Sunday School', '2026-09-06', {
      Men: 19,
    });

    expect(result.success).toBe(true);
    expect((document.getElementById('input-men-6') as HTMLInputElement).value).toBe('19');
  });
});
