import { describe, it, expect } from 'vitest';
import { solveTspWithMatrix } from '@/actions/tripPlanning/routing/matrixHelper';
import { solveTspNearestNeighbor } from '@/actions/tripPlanning/routing/routingHelper';
import { Types } from '@/actions/tripPlanning/types';

function point(name: string, lat: number, lng: number): Types.TripMapMember {
  return { name, address: name, columns: {}, lat, lng };
}

describe('tripRoutingHelper', () => {
  it('solves a nearest-neighbor route along a straight line', async () => {
    const points = [point('A', 40, -111), point('B', 40.1, -111), point('C', 40.2, -111)];
    const route = await solveTspNearestNeighbor(points, points[0]);
    expect(route[0].name).toBe('A');
    expect(route.map((stop) => stop.name).sort()).toEqual(['A', 'B', 'C']);
  });

  it('follows a duration matrix for nearest-neighbor TSP', () => {
    const points = [point('A', 40, -111), point('B', 40.1, -111), point('C', 40.2, -111)];
    const matrix = [
      [0, 10, 50],
      [10, 0, 10],
      [50, 10, 0],
    ];
    const result = solveTspWithMatrix(matrix, points, points[0]);
    expect(result.orderedPoints.map((stop) => stop.name)).toEqual(['A', 'B', 'C']);
    expect(result.totalDistance).toBeCloseTo(20 / 60);
  });

  it('assigns displayDistance to optimized routes', async () => {
    const points = [
      { ...point('A', 40.0, -111.0), cluster: 0 },
      { ...point('B', 40.1, -111.0), cluster: 0 },
    ];
    const { setTripState, resetTripState } = await import('@/actions/tripPlanning/ui/stateHelper');
    const { optimizeRoutes } = await import('@/actions/tripPlanning/routing/routingHelper');
    resetTripState();
    setTripState({ clustered: points });
    const routes = await optimizeRoutes('straight', '', 'nominatim', '', '');
    expect(routes).not.toBeNull();
    expect(routes?.[0].displayDistance).toBeGreaterThan(0);
  });
});
