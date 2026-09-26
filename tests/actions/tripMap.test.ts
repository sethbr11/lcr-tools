import { describe, it, expect, beforeEach } from 'vitest';
import { updateClusterList } from '@/actions/tripPlanning/ui/mapHelper';
import { Dom, Types } from '@/actions/tripPlanning/types';

describe('tripMapHelper - updateClusterList', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="${Dom.CLUSTER_LIST_CONTAINER_ID}" style="display: none">
        <div id="${Dom.CLUSTER_LIST_ID}"></div>
      </div>
    `;
  });

  it('renders cluster details without distance when routes are not provided', () => {
    const points: Types.TripMapMember[] = [
      {
        name: 'Smith, John',
        address: '100 N Main St',
        columns: {},
        lat: 40.0,
        lng: -111.0,
        cluster: 0,
      },
      {
        name: 'Doe, Jane',
        address: '200 S State St',
        columns: {},
        lat: 40.1,
        lng: -111.1,
        cluster: 0,
      },
    ];

    updateClusterList(points);

    const list = document.getElementById(Dom.CLUSTER_LIST_ID);
    expect(list?.textContent).toContain('Cluster 1');
    expect(list?.textContent).toContain('Smith, John');
    expect(list?.textContent).toContain('Doe, Jane');
    expect(list?.querySelector(`.${Dom.CLUSTER_DISTANCE_CLASS}`)).toBeNull();
  });

  it('renders route distance in the top-right of cluster item when route is provided', () => {
    const points: Types.TripMapMember[] = [
      {
        name: 'Smith, John',
        address: '100 N Main St',
        columns: {},
        lat: 40.0,
        lng: -111.0,
        cluster: 0,
      },
      {
        name: 'Doe, Jane',
        address: '200 S State St',
        columns: {},
        lat: 40.1,
        lng: -111.1,
        cluster: 0,
      },
    ];
    const routes: Types.OptimizedRoute[] = [
      { cluster: 0, points, distance: 7.2, displayDistance: 7.2 },
    ];

    updateClusterList(points, routes);

    const list = document.getElementById(Dom.CLUSTER_LIST_ID);
    const distEl = list?.querySelector(`.${Dom.CLUSTER_DISTANCE_CLASS}`);
    expect(distEl).not.toBeNull();
    expect(distEl?.textContent).toBe('7.2 mi');
  });

  it('returns a no-op teardown function when map is not initialized', async () => {
    const { enableMapClickToPin } = await import('@/actions/tripPlanning/ui/mapHelper');
    const teardown = enableMapClickToPin(() => {});
    expect(typeof teardown).toBe('function');
    expect(() => teardown()).not.toThrow();
  });
});
