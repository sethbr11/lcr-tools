import { describe, it, expect, beforeEach } from 'vitest';
import { activateStep, setupPlannerChrome } from '@/actions/tripPlanning/ui/uiHelper';
import { Dom } from '@/actions/tripPlanning/types';

describe('tripUiHelper', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="${Dom.ACCORDION_ITEM_CLASS} ${Dom.ACCORDION_ACTIVE_CLASS}" id="${Dom.STEP1_ID}">
        <div class="${Dom.ACCORDION_HEADER_CLASS}">
          <h3>1. Locate</h3>
          <span class="${Dom.ACCORDION_ICON_CLASS}">▼</span>
        </div>
        <button type="button" id="${Dom.STEP1_NEXT_ID}">Next</button>
      </div>
      <div class="${Dom.ACCORDION_ITEM_CLASS}" id="${Dom.STEP2_ID}">
        <div class="${Dom.ACCORDION_HEADER_CLASS}">
          <h3>2. Clustering</h3>
          <span class="${Dom.ACCORDION_ICON_CLASS}">▶</span>
        </div>
        <button type="button" id="${Dom.STEP2_NEXT_ID}">Next</button>
      </div>
      <div class="${Dom.ACCORDION_ITEM_CLASS}" id="${Dom.STEP3_ID}">
        <div class="${Dom.ACCORDION_HEADER_CLASS}">
          <h3>3. Routing</h3>
          <span class="${Dom.ACCORDION_ICON_CLASS}">▶</span>
        </div>
      </div>
    `;
    setupPlannerChrome();
  });

  it('advances from Locate to Clustering when Next is clicked', () => {
    document.getElementById(Dom.STEP1_NEXT_ID)?.click();
    expect(
      document.getElementById(Dom.STEP1_ID)?.classList.contains(Dom.ACCORDION_ACTIVE_CLASS)
    ).toBe(false);
    expect(
      document.getElementById(Dom.STEP2_ID)?.classList.contains(Dom.ACCORDION_ACTIVE_CLASS)
    ).toBe(true);
  });

  it('still expands a step when its header is clicked', () => {
    activateStep(Dom.STEP1_ID);
    document
      .getElementById(Dom.STEP3_ID)
      ?.querySelector(`.${Dom.ACCORDION_HEADER_CLASS}`)
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(
      document.getElementById(Dom.STEP3_ID)?.classList.contains(Dom.ACCORDION_ACTIVE_CLASS)
    ).toBe(true);
    expect(
      document.getElementById(Dom.STEP1_ID)?.classList.contains(Dom.ACCORDION_ACTIVE_CLASS)
    ).toBe(false);
  });

  it('renders failed geocodes with pick-on-map and fix buttons', async () => {
    const { displayFailedGeocodes } = await import('@/actions/tripPlanning/ui/failureFixerHelper');
    const { setTripState } = await import('@/actions/tripPlanning/ui/stateHelper');

    const container = document.createElement('div');
    container.id = Dom.FAILURE_CONTAINER_ID;
    const list = document.createElement('div');
    list.id = Dom.FAILURE_LIST_ID;
    container.appendChild(list);
    document.body.appendChild(container);

    setTripState({
      failedGeocodes: [
        { name: 'Smith, John', address: '123 Unknown Rd', reason: 'Not found', columns: {} },
      ],
    });

    displayFailedGeocodes('nominatim', () => '');

    expect(container.style.display).toBe('block');
    const pickBtn = document.getElementById('pick-map-btn-0');
    const fixBtn = document.getElementById('fix-btn-0');
    expect(pickBtn).not.toBeNull();
    expect(fixBtn).not.toBeNull();
    expect(pickBtn?.textContent).toBe('Pick on Map');
  });
});
