import { describe, it, expect } from 'vitest';
import {
  chooseKeylessBasemap,
  fillTileUrl,
  isInUnitedStates,
} from '@/actions/tripPlanning/ui/basemapHelper';

describe('trip planner keyless basemap', () => {
  it('uses public-domain USGS tiles when most locations are in the United States', () => {
    const lehi = [
      { lat: 40.39, lng: -111.85 },
      { lat: 40.42, lng: -111.8 },
    ];
    expect(chooseKeylessBasemap(lehi).id).toBe('usgs');
    expect(chooseKeylessBasemap([{ lat: 21.3, lng: -157.85 }]).id).toBe('usgs'); // Honolulu
    expect(chooseKeylessBasemap([{ lat: 61.2, lng: -149.9 }]).id).toBe('usgs'); // Anchorage
  });

  it('uses Esri World Street Map outside the United States or before anything is located', () => {
    expect(chooseKeylessBasemap([{ lat: 51.5, lng: -0.12 }]).id).toBe('esri'); // London
    expect(chooseKeylessBasemap([{ lat: 49.28, lng: -123.12 }]).id).toBe('esri'); // Vancouver
    expect(chooseKeylessBasemap([]).id).toBe('esri');
  });

  it('never points at OpenStreetMap or CARTO tile servers', () => {
    for (const points of [[{ lat: 40.39, lng: -111.85 }], [{ lat: 51.5, lng: -0.12 }]]) {
      const { tileUrl } = chooseKeylessBasemap(points);
      expect(tileUrl).not.toMatch(/openstreetmap\.org|cartocdn/);
    }
  });

  it('detects US locations and fills ArcGIS-style {z}/{y}/{x} templates', () => {
    expect(isInUnitedStates({ lat: 18.4, lng: -66.1 })).toBe(true); // San Juan
    expect(isInUnitedStates({ lat: 19.43, lng: -99.13 })).toBe(false); // Mexico City
    expect(fillTileUrl('https://t/{z}/{y}/{x}', 15, 6203, 12360)).toBe('https://t/15/12360/6203');
  });
});
