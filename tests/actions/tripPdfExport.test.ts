import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildPdfSections,
  buildTripPdf,
  computeColumnWidths,
} from '@/actions/tripPlanning/export/pdfExportHelper';
import {
  chooseClusterView,
  chooseView,
  projectToWorld,
} from '@/actions/tripPlanning/export/staticMapHelper';
import { promptPdfFields } from '@/actions/tripPlanning/ui/pdfFieldsModalHelper';
import { getTripState, resetTripState, setTripState } from '@/actions/tripPlanning/ui/stateHelper';
import { Constants, Dom, Types } from '@/actions/tripPlanning/types';

function stop(name: string, lat: number, lng: number, cluster: number): Types.TripMapMember {
  return {
    name,
    address: `${name} St`,
    columns: { Name: name, Address: `${name} St`, Phone: '555-0100' },
    lat,
    lng,
    cluster,
  };
}

describe('trip planner PDF export', () => {
  beforeEach(() => {
    resetTripState();
    document.body.replaceChildren();
  });

  describe('buildPdfSections', () => {
    it('uses optimized route order, start, and road path when routes exist', () => {
      const a = stop('A', 40, -111, 0);
      const b = stop('B', 40.1, -111, 0);
      setTripState({
        clustered: [a, b, stop('Out', 41, -112, -1)],
        optimized: [
          {
            cluster: 0,
            points: [b, a],
            distance: 2,
            displayDistance: 2.5,
            startPoint: { lat: 39.9, lng: -111 },
            geometry: [
              [39.9, -111],
              [40.1, -111],
            ],
          },
        ],
      });

      const [section, ...rest] = buildPdfSections(getTripState(), { 0: 'Chapel' });

      expect(rest).toHaveLength(0); // outliers are skipped
      expect(section.stops.map((s) => s.name)).toEqual(['B', 'A']);
      expect(section.isRouted).toBe(true);
      expect(section.startAddress).toBe('Chapel');
      expect(section.miles).toBe(2.5);
      expect(section.geometry).toHaveLength(2);
    });

    it('lists stops by name, without a route, before routes are optimized', () => {
      setTripState({ clustered: [stop('Zed', 40, -111, 1), stop('Amy', 40.1, -111, 1)] });

      const [section] = buildPdfSections(getTripState(), {});

      expect(section.clusterId).toBe(1);
      expect(section.stops.map((s) => s.name)).toEqual(['Amy', 'Zed']);
      expect(section.isRouted).toBe(false);
    });
  });

  describe('buildTripPdf', () => {
    it('starts each group on a new page and continues long tables onto more pages', async () => {
      const few = Array.from({ length: 3 }, (_, i) => stop(`F${i}`, 40, -111 + i * 0.01, 0));
      const many = Array.from({ length: 40 }, (_, i) => stop(`M${i}`, 41, -112 + i * 0.01, 1));
      setTripState({ clustered: [...few, ...many] });
      const sections = buildPdfSections(getTripState(), {});
      const renderMap = vi.fn(async () => null);

      const doc = await buildTripPdf(
        sections,
        ['Name', 'Phone'],
        ['Name', 'Address', 'Phone'],
        renderMap
      );

      expect(renderMap).toHaveBeenCalledTimes(2);
      // Group 1 fits on page 1; group 2 starts page 2 and its 40 rows need a third page
      expect(doc.getNumberOfPages()).toBe(3);
    });
  });

  describe('computeColumnWidths', () => {
    it('fills the table width, giving longer columns more room', () => {
      const widths = computeColumnWidths(
        ['Name', 'Address'],
        [['Ann Lee', '1234 Some Very Long Street Name, Lehi, UT 84043']],
        190
      );
      expect(widths.reduce((sum, w) => sum + w, 0)).toBeCloseTo(190);
      expect(widths[2]).toBeGreaterThan(widths[1]);
    });
  });

  describe('static map view', () => {
    it('projects the equator/prime meridian to the middle of the world', () => {
      const [x, y] = projectToWorld(0, 0, 1);
      expect(x).toBeCloseTo(256);
      expect(y).toBeCloseTo(256);
    });

    it('zooms in further for a tighter cluster', () => {
      const tight = [
        { lat: 40.39, lng: -111.85 },
        { lat: 40.395, lng: -111.845 },
      ];
      const wide = [
        { lat: 40.3, lng: -111.9 },
        { lat: 40.6, lng: -111.6 },
      ];
      expect(chooseView(tight, 800, 500, 48).zoom).toBeGreaterThan(
        chooseView(wide, 800, 500, 48).zoom
      );
    });

    it('keeps the map scaled to the stops when the start is far away', () => {
      const stops = [
        { lat: 40.39, lng: -111.85 },
        { lat: 40.395, lng: -111.845 },
      ];
      const near = chooseClusterView({
        stops,
        startPoint: { lat: 40.388, lng: -111.852 },
        drawRoute: true,
        color: '#e53e3e',
      });
      const far = chooseClusterView({
        stops,
        startPoint: { lat: 40.76, lng: -111.89 },
        drawRoute: true,
        color: '#e53e3e',
      });
      const stopsOnly = chooseView(stops, 800, 500, 48);
      expect(far.zoom).toBe(stopsOnly.zoom);
      expect(near.zoom).toBeGreaterThanOrEqual(stopsOnly.zoom - 2);
    });
  });

  describe('promptPdfFields', () => {
    const fields = ['Name', 'Address', 'Phone', 'Email', 'Move-In Date'];
    const checkedLabels = () =>
      Array.from(
        document.querySelectorAll<HTMLInputElement>(`#${Dom.PDF_FIELDS_MODAL_ID} input:checked`)
      ).map((box) => box.nextElementSibling?.textContent);
    const click = (action: string) =>
      document
        .querySelector<HTMLButtonElement>(
          `#${Dom.PDF_FIELDS_MODAL_ID} [data-pdf-action="${action}"]`
        )
        ?.click();

    it('defaults to name, address, and phone, and remembers the last choice', async () => {
      const store: Record<string, unknown> = {};
      vi.spyOn(chrome.storage.local, 'get').mockImplementation(async () => ({ ...store }));
      vi.spyOn(chrome.storage.local, 'set').mockImplementation(async (items) => {
        Object.assign(store, items);
      });

      const first = promptPdfFields(fields);
      await vi.waitFor(() => expect(checkedLabels()).toEqual(['Name', 'Address', 'Phone']));
      document.querySelectorAll<HTMLInputElement>(`#${Dom.PDF_FIELDS_MODAL_ID} input`)[3].checked =
        true;
      click('export');
      expect(await first).toEqual(['Name', 'Address', 'Phone', 'Email']);
      await vi.waitFor(() =>
        expect(store[Constants.STORAGE_PDF_FIELDS_KEY]).toEqual([
          'Name',
          'Address',
          'Phone',
          'Email',
        ])
      );

      const second = promptPdfFields(fields);
      await vi.waitFor(() =>
        expect(checkedLabels()).toEqual(['Name', 'Address', 'Phone', 'Email'])
      );
      click('cancel');
      expect(await second).toBeNull();
    });

    it('disables Export PDF when no column is selected', async () => {
      const pending = promptPdfFields(fields);
      await vi.waitFor(() =>
        expect(document.getElementById(Dom.PDF_FIELDS_MODAL_ID)).not.toBeNull()
      );
      click('none');
      const exportBtn = document.querySelector<HTMLButtonElement>('[data-pdf-action="export"]');
      expect(exportBtn?.disabled).toBe(true);
      click('cancel');
      await pending;
    });
  });
});
