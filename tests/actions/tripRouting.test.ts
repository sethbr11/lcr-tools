import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getMapboxTravelMatrix,
  haversineMiles,
  solveOpenPath,
} from '@/actions/tripPlanning/routing/matrixHelper';
import { optimizeRoutes } from '@/actions/tripPlanning/routing/routingHelper';
import { geocodeAddressMulti } from '@/actions/tripPlanning/geocoding/geocodingHelper';
import { resetTripState, setTripState } from '@/actions/tripPlanning/ui/stateHelper';
import { Constants, Types } from '@/actions/tripPlanning/types';

vi.mock('@/actions/tripPlanning/geocoding/geocodingHelper', () => ({
  geocodeAddressMulti: vi.fn(),
}));

function point(name: string, lat: number, lng: number, cluster = 0): Types.TripMapMember {
  return { name, address: name, columns: {}, lat, lng, cluster };
}

/** Builds a fetch Response-like object. */
function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

/** Mapbox Matrix mock: every distinct pair is 60 s and one mile apart. */
function uniformMatrixFetch(): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: string) => {
    const url = new URL(input);
    const sources = (url.searchParams.get('sources') ?? '').split(';').map(Number);
    const destinations = (url.searchParams.get('destinations') ?? '').split(';').map(Number);
    const grid = (value: number): number[][] =>
      sources.map((s) => destinations.map((d) => (s === d ? 0 : value)));
    return jsonResponse({
      code: 'Ok',
      durations: grid(60),
      distances: grid(Constants.METERS_PER_MILE),
    });
  });
}

function planarCost(points: Array<[number, number]>): number[][] {
  return points.map((a) => points.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1])));
}

function pathCost(cost: number[][], order: number[]): number {
  let total = 0;
  for (let i = 0; i < order.length - 1; i += 1) total += cost[order[i]][order[i + 1]];
  return total;
}

function nearestNeighbor(cost: number[][], start: number): number[] {
  const order = [start];
  while (order.length < cost.length) {
    let best = -1;
    for (let i = 0; i < cost.length; i += 1) {
      if (order.includes(i)) continue;
      if (best === -1 || cost[order[order.length - 1]][i] < cost[order[order.length - 1]][best]) {
        best = i;
      }
    }
    order.push(best);
  }
  return order;
}

function orientation(a: number[], b: number[], c: number[]): number {
  return (c[1] - a[1]) * (b[0] - a[0]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function segmentsCross(a: number[], b: number[], c: number[], d: number[]): boolean {
  return (
    orientation(a, c, d) * orientation(b, c, d) < 0 &&
    orientation(a, b, c) * orientation(a, b, d) < 0
  );
}

describe('solveOpenPath', () => {
  it('removes a crossing that nearest neighbor produces and lowers the cost', () => {
    const layout: Array<[number, number]> = [
      [6, 7],
      [6, 8],
      [8, 6],
      [1, 10],
    ];
    const cost = planarCost(layout);
    const nn = nearestNeighbor(cost, 0);
    expect(nn).toEqual([0, 1, 2, 3]);
    expect(segmentsCross(layout[0], layout[1], layout[2], layout[3])).toBe(true);

    const order = solveOpenPath(cost, 0);
    expect(order[0]).toBe(0);
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
    const crossing = segmentsCross(
      layout[order[0]],
      layout[order[1]],
      layout[order[2]],
      layout[order[3]]
    );
    expect(crossing).toBe(false);
    expect(pathCost(cost, order)).toBeLessThan(pathCost(cost, nn));
  });

  it('never costs more than nearest neighbor from index 0 when no start is fixed', () => {
    const layout: Array<[number, number]> = [
      [5, 5],
      [0, 0],
      [10, 0],
      [0, 10],
      [10, 10],
      [3, 7],
      [8, 2],
    ];
    const cost = planarCost(layout);
    const order = solveOpenPath(cost, null);
    expect([...order].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(pathCost(cost, order)).toBeLessThanOrEqual(pathCost(cost, nearestNeighbor(cost, 0)));
  });

  it('handles asymmetric costs and trivial sizes', () => {
    expect(solveOpenPath([], null)).toEqual([]);
    expect(solveOpenPath([[0]], 0)).toEqual([0]);
    const cost = [
      [0, 1, 9],
      [9, 0, 1],
      [1, 9, 0],
    ];
    expect(solveOpenPath(cost, 0)).toEqual([0, 1, 2]);
  });
});

describe('getMapboxTravelMatrix', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const pair = [point('A', 40, -111), point('B', 40.1, -111)];

  it('retries HTTP 429 after a delay and then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 429))
      .mockResolvedValueOnce(
        jsonResponse({
          code: 'Ok',
          durations: [
            [0, 100],
            [200, 0],
          ],
          distances: [
            [0, 1000],
            [2000, 0],
          ],
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const pending = getMapboxTravelMatrix(pair, 'token');
    await vi.advanceTimersByTimeAsync(Constants.MAPBOX_MATRIX_RETRY_DELAY_MS);
    const result = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.durations[0][1]).toBe(100);
    expect(result.durations[1][0]).toBe(200);
    expect(result.distances[1][0]).toBe(2000);
  });

  it('requests duration and distance annotations', async () => {
    const fetchMock = uniformMatrixFetch();
    vi.stubGlobal('fetch', fetchMock);
    await getMapboxTravelMatrix(pair, 'token');
    expect(String(fetchMock.mock.calls[0][0])).toContain('annotations=duration,distance');
  });

  it('fills a missing cell using the 30 mph fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          code: 'Ok',
          durations: [
            [0, null],
            [120, 0],
          ],
          distances: [
            [0, null],
            [500, 0],
          ],
        })
      )
    );
    const result = await getMapboxTravelMatrix(pair, 'token');
    const miles = haversineMiles(pair[0], pair[1]);
    expect(result.durations[0][1]).toBeCloseTo((miles / Constants.FALLBACK_SPEED_MPH) * 3600);
    expect(result.distances[0][1]).toBeCloseTo(miles * 1609.34);
    expect(result.durations[1][0]).toBe(120);
  });
});

describe('optimizeRoutes', () => {
  beforeEach(() => {
    resetTripState();
    vi.mocked(geocodeAddressMulti).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('assigns displayDistance to optimized routes', async () => {
    setTripState({ clustered: [point('A', 40.0, -111.0), point('B', 40.1, -111.0)] });
    const routes = await optimizeRoutes('straight', '', 'nominatim', '', '');
    expect(routes?.[0].displayDistance).toBeGreaterThan(0);
    expect(routes?.[0].startPoint).toBeUndefined();
  });

  it('starts every cluster at the starting address and includes that leg', async () => {
    vi.mocked(geocodeAddressMulti).mockResolvedValue({
      lat: 39.9,
      lng: -111,
      usedVariant: 'original',
    });
    const north = [point('N1', 41, -111, 0), point('N2', 41.1, -111, 0)];
    const south = [point('S1', 40, -111, 1), point('S2', 40.1, -111, 1)];
    setTripState({ clustered: [...south, ...north] });

    const routes = await optimizeRoutes('straight', '', 'nominatim', '', '1 Start St');
    expect(routes?.map((route) => route.cluster)).toEqual([0, 1]);
    for (const route of routes ?? []) {
      expect(route.startPoint).toEqual({ lat: 39.9, lng: -111 });
      expect(route.points.some((stop) => stop.name === 'Starting Point')).toBe(false);
      const chain = [route.startPoint as Types.CoordinatePoint, ...route.points];
      let expected = 0;
      for (let i = 0; i < chain.length - 1; i += 1)
        expected += haversineMiles(chain[i], chain[i + 1]);
      expect(route.displayDistance).toBeCloseTo(expected);
      expect(route.distance).toBeCloseTo(expected);
    }
    expect(geocodeAddressMulti).toHaveBeenCalledTimes(1);
  });

  it('computes road totals from matrices without calling Directions', async () => {
    vi.mocked(geocodeAddressMulti).mockResolvedValue({
      lat: 39.9,
      lng: -111,
      usedVariant: 'original',
    });
    const fetchMock = uniformMatrixFetch();
    vi.stubGlobal('fetch', fetchMock);
    setTripState({
      clustered: [point('A', 40, -111, 0), point('B', 40.1, -111, 0), point('C', 40.2, -111, 0)],
    });

    const routes = await optimizeRoutes('mapbox', 'token', 'nominatim', '', '1 Start St');
    const route = routes?.[0];
    // Start leg plus two hops: 3 hops of 60 s and 1 mile each.
    expect(route?.distance).toBeCloseTo(3);
    expect(route?.displayDistance).toBeCloseTo(3);
    expect(route?.startPoint).toBeDefined();
    expect(route?.points).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalled();
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).not.toContain('/directions/v5/');
    }
  });
});
