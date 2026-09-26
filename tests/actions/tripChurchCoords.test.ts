import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  attachChurchCoordinates,
  resolveUnitNumberFromHref,
} from '@/actions/tripPlanning/geocoding/churchCoordsHelper';
import { Types } from '@/actions/tripPlanning/types';
import { resolveCurrentUnitNumber } from '@/utils/church/lcrApiUtils';

const smith: Types.TripPlanningMember = {
  name: 'Smith, John',
  address: '100 N Main St, Springfield, UT',
  columns: { Name: 'Smith, John', Address: '100 N Main St, Springfield, UT' },
};

const doe: Types.TripPlanningMember = {
  name: 'Doe, Jane',
  address: '200 S State St, Springfield, UT',
  columns: { Name: 'Doe, Jane', Address: '200 S State St, Springfield, UT' },
};

describe('tripChurchCoordsHelper', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('resolves a unit number from query parameters', () => {
    expect(
      resolveUnitNumberFromHref(
        'https://lcr.churchofjesuschrist.org/mlt/report/members-moved-in?unitNumber=12345'
      )
    ).toBe('12345');
  });

  it('resolves a unit number from static LCR header DOM element with complex unit name', () => {
    document.body.innerHTML = `
      <div class="mltp-unit-info-right">
        <div class="ward-stake-container">
          <div><span id="mltp-unit-info-parent">Synthetic Stake (99999)</span></div>
          <div id="static-current-unit-text"><span>Synthetic YSA 262nd Ward (18-25) (12345)</span></div>
          <div id="no-proxy" style="display: block;"></div>
        </div>
      </div>
    `;

    expect(resolveCurrentUnitNumber(document)).toBe('12345');
  });

  it('resolves a unit number from interactive switcher header element', () => {
    document.body.innerHTML = `
      <div class="mltp-unit-info-right">
        <div class="ward-stake-container">
          <div id="current-unit-text"><span>Synthetic 1st Branch (98765)</span></div>
        </div>
      </div>
    `;

    expect(resolveCurrentUnitNumber(document)).toBe('98765');
  });

  it('resolves a fallback parent unit number at stake level when ward text is absent', () => {
    document.body.innerHTML = `
      <div class="mltp-unit-info-right">
        <div class="ward-stake-container">
          <div><span id="mltp-unit-info-parent">Synthetic Stake (99999)</span></div>
        </div>
      </div>
    `;

    expect(resolveCurrentUnitNumber(document)).toBe('99999');
  });

  it('attaches Church coordinates when a household name matches locally', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          name: 'Smith, John',
          address: '100 N Main St',
          coordinates: { latitude: 40.25, longitude: -111.66 },
        },
      ],
    });

    const result = await attachChurchCoordinates(
      [smith, doe],
      'https://lcr.churchofjesuschrist.org/mlt/report/members-moved-in?unit=12345',
      fetchImpl as unknown as typeof fetch
    );

    expect(fetchImpl).toHaveBeenCalled();
    expect(result[0].coordSource).toBe('church');
    expect(result[0].lat).toBe(40.25);
    expect(result[0].lng).toBe(-111.66);
    expect(result[1].lat).toBeUndefined();
  });

  it('attaches Church coordinates on Moved In page via DOM unit number when URL has no unit', async () => {
    document.body.innerHTML = `
      <div class="mltp-unit-info-right">
        <div class="ward-stake-container">
          <div id="static-current-unit-text"><span>Synthetic Ward (12345)</span></div>
        </div>
      </div>
    `;

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          name: 'Smith, John',
          address: '100 N Main St',
          coordinates: { latitude: 40.25, longitude: -111.66 },
        },
      ],
    });

    const result = await attachChurchCoordinates(
      [smith],
      'https://lcr.churchofjesuschrist.org/mlt/report/members-moved-in',
      fetchImpl as unknown as typeof fetch,
      document
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('unit=12345'),
      expect.any(Object)
    );
    expect(result[0].coordSource).toBe('church');
    expect(result[0].lat).toBe(40.25);
    expect(result[0].lng).toBe(-111.66);
  });

  it('skips the Directory request when no unit number is present in DOM or URL', async () => {
    const fetchImpl = vi.fn();
    const result = await attachChurchCoordinates(
      [smith],
      'https://lcr.churchofjesuschrist.org/mlt/report/members-moved-in',
      fetchImpl as unknown as typeof fetch,
      document
    );
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result[0].coordSource).toBeUndefined();
  });
});
