import { describe, it, expect, beforeEach, vi } from 'vitest';
import { browser } from 'wxt/browser';
import {
  classifyFailure,
  geocodeAddressMulti,
  geocodePendingRecords,
} from '@/actions/tripPlanning/geocoding/geocodingHelper';
import { getTripState, resetTripState, setTripState } from '@/actions/tripPlanning/ui/stateHelper';
import { Constants } from '@/actions/tripPlanning/types';

describe('tripGeocodingHelper', () => {
  beforeEach(() => {
    resetTripState();
    vi.restoreAllMocks();
    vi.spyOn(browser.storage.local, 'get').mockImplementation(async () => ({}));
    vi.spyOn(browser.storage.local, 'set').mockImplementation(async () => undefined);
  });

  it('classifies empty, incomplete, and missing-state addresses', () => {
    expect(classifyFailure('')).toBe('Empty');
    expect(classifyFailure('Main Street')).toBe('No leading number');
    expect(classifyFailure('100')).toBe('Incomplete street');
    expect(classifyFailure('100 Main Street')).toBe('Missing state');
    expect(classifyFailure('100 Main Street, Toronto ON M5V 2T6')).toBe('Not found');
    expect(classifyFailure('42 Wallaby Way, Sydney NSW 2000')).toBe('Not found');
    expect(classifyFailure('10 Downing St, London SW1A 2AA, UK')).toBe('Not found');
  });

  it('returns cached coordinates without fetching', async () => {
    vi.spyOn(browser.storage.local, 'get').mockImplementation(async () => ({
      [Constants.GEOCODE_CACHE_KEY]: {
        '100 N Main St': { lat: 40.1, lng: -111.1, usedVariant: 'original' },
      },
    }));
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await geocodeAddressMulti('100 N Main St', 'nominatim', '');
    expect(result).toEqual({ lat: 40.1, lng: -111.1, usedVariant: 'original' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('queries Nominatim with an email parameter and parses lat/lon', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '40.2', lon: '-111.2' }],
    } as Response);

    const result = await geocodeAddressMulti('100 N Main St, UT', 'nominatim', '');
    expect(result?.lat).toBe(40.2);
    expect(result?.lng).toBe(-111.2);
    const url = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(url).toContain('nominatim.openstreetmap.org');
    expect(url).toContain('email=');
  });

  it('retries a later address variant after the first lookup fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false, json: async () => [] } as Response)
      .mockResolvedValue({
        ok: true,
        json: async () => [{ lat: '40.4', lon: '-111.4' }],
      } as Response);

    const result = await geocodeAddressMulti(
      '100 N Main St Apt 2, Springfield, UT',
      'nominatim',
      ''
    );
    expect(result).toEqual({
      lat: 40.4,
      lng: -111.4,
      usedVariant: expect.stringContaining('100 N Main St'),
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('parses Mapbox feature centers as lng/lat', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ features: [{ center: [-111.3, 40.3] }] }),
    } as Response);
    const result = await geocodeAddressMulti('100 N Main St, UT', 'mapbox', 'test-token');
    expect(result).toEqual({ lat: 40.3, lng: -111.3, usedVariant: '100 N Main St, UT' });
  });

  it('skips members that already have Church Directory coordinates', async () => {
    setTripState({
      records: [
        {
          name: 'Smith, John',
          address: '100 N Main St, Springfield, UT',
          columns: {},
          lat: 40.1,
          lng: -111.1,
          coordSource: 'church',
        },
      ],
      geocoded: [
        {
          name: 'Smith, John',
          address: '100 N Main St, Springfield, UT',
          columns: {},
          lat: 40.1,
          lng: -111.1,
          coordSource: 'church',
        },
      ],
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await geocodePendingRecords('nominatim', '');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(getTripState().geocoded[0].coordSource).toBe('church');
  });
});
