import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  clickSaveButton,
  processClassVisitorCounts,
  setNativeInputValue,
  switchToVisitorsTab,
} from '@/actions/processAttendance/lcr/visitorsHelper';
import { Dom } from '@/actions/processAttendance/types';

// LCR waits are long in production; shrink them so "not found" paths fail fast in tests.
vi.mock('@/actions/processAttendance/constants', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/actions/processAttendance/constants')>();
  return {
    ...mod,
    Constants: {
      ...mod.Constants,
      ATTENDANCE_ROLL_LOAD_TIMEOUT_MS: 300,
      TAB_SWITCH_TIMEOUT_MS: 300,
      DROPDOWN_SETTLE_TIMEOUT_MS: 300,
      SUNDAY_BUTTON_TIMEOUT_MS: 300,
      SUNDAY_RECLICK_MS: 50,
    },
  };
});

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

  describe('save safety guards', () => {
    /** Builds a Visitors tab with the given month option and table rows (no name attributes). */
    const buildVisitorsPage = (monthValue: string, rows: string): void => {
      document.body.innerHTML = `
        <div class="eden-tabs">
          <button id="tab-VISITORS" role="tab" aria-selected="true">Visitors</button>
        </div>
        <select class="eden-form-part-input__control">
          <option value="${monthValue}" selected>Month</option>
        </select>
        <table><tbody>${rows}</tbody></table>
        <button class="eden-button--primary">Save</button>
      `;
    };

    afterEach(() => {
      vi.useRealTimers();
    });

    it('fills the "4 Jan" column and never the "14 Jan" column', async () => {
      buildVisitorsPage(
        '2027-01',
        `<tr role="row">
          <td>Visitors Men</td>
          <td><span>14 Jan</span><input type="number" id="men-14" value="0" /></td>
          <td><span>4 Jan</span><input type="number" id="men-4" value="0" /></td>
        </tr>`
      );

      const result = await processClassVisitorCounts('Elders Quorum', '2027-01-04', { Men: 5 });

      expect(result.success).toBe(true);
      expect((document.getElementById('men-4') as HTMLInputElement).value).toBe('5');
      expect((document.getElementById('men-14') as HTMLInputElement).value).toBe('0');
    });

    it('types nothing when a category with a count has no input', async () => {
      buildVisitorsPage(
        '2026-09',
        `<tr role="row">
          <td>Visitors Men</td>
          <td><span>13 Sep</span><input type="number" id="men-13" value="0" /></td>
        </tr>`
      );
      const saveSpy = vi.fn();
      document.querySelector(Dom.SAVE_BUTTON)?.addEventListener('click', saveSpy);

      const result = await processClassVisitorCounts('Adult Sunday School', '2026-09-13', {
        Men: 4,
        Women: 3,
        Children: 0,
      });

      expect(result).toEqual({
        success: false,
        updated: [],
        error: 'Visitor inputs not found for: Women',
      });
      expect((document.getElementById('men-13') as HTMLInputElement).value).toBe('0');
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('types nothing when the target month is missing from the dropdown', async () => {
      buildVisitorsPage(
        '2026-08',
        `<tr role="row">
          <td>Visitors Men</td>
          <td><span>13 Sep</span><input type="number" id="men-13" value="0" /></td>
        </tr>`
      );

      const result = await processClassVisitorCounts('Adult Sunday School', '2026-09-13', {
        Men: 4,
      });

      expect(result).toEqual({
        success: false,
        updated: [],
        error: "Could not find 2026-09 in LCR's month dropdown.",
      });
      expect((document.getElementById('men-13') as HTMLInputElement).value).toBe('0');
    });

    it('clickSaveButton resolves false when the save spinner never clears', async () => {
      vi.useFakeTimers();
      buildVisitorsPage('2026-09', '');
      const spinner = document.createElement('div');
      spinner.setAttribute('role', 'progressbar');
      document.body.appendChild(spinner);

      const promise = clickSaveButton();
      await vi.advanceTimersByTimeAsync(5000);

      await expect(promise).resolves.toBe(false);
    });
  });
});
