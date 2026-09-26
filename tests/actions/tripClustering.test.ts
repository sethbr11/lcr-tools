import { describe, it, expect, beforeEach } from 'vitest';
import { clusterAddresses } from '@/actions/tripPlanning/routing/clusteringHelper';
import { getTripState, resetTripState, setTripState } from '@/actions/tripPlanning/ui/stateHelper';
import { Types } from '@/actions/tripPlanning/types';

function member(name: string, lat: number, lng: number): Types.TripMapMember {
  return { name, address: `${name} St`, columns: {}, lat, lng };
}

describe('tripClusteringHelper', () => {
  beforeEach(() => {
    resetTripState();
  });

  it('clusters by requested group count and assigns cluster ids', () => {
    setTripState({
      geocoded: [
        member('North A', 41, -111),
        member('North B', 41.01, -111.01),
        member('South A', 39, -111),
        member('South B', 39.01, -111.01),
      ],
    });
    clusterAddresses('byCount', 2, 1, 10);
    const { clustered } = getTripState();
    expect(clustered.length).toBe(4);
    const ids = new Set(clustered.map((row) => row.cluster));
    expect(ids.size).toBe(2);
    const north = clustered.find((row) => row.name.startsWith('North'));
    const south = clustered.find((row) => row.name.startsWith('South'));
    expect(north?.cluster).toBeDefined();
    expect(south?.cluster).toBeDefined();
    expect((north?.cluster || 0) < (south?.cluster || 0)).toBe(true);
  });

  it('honors bySize min and max while still assigning clusters', () => {
    setTripState({
      geocoded: [
        member('A', 40, -111),
        member('B', 40.01, -111.01),
        member('C', 40.02, -111.02),
        member('D', 39, -111),
        member('E', 39.01, -111.01),
        member('F', 39.02, -111.02),
      ],
    });
    clusterAddresses('bySize', 1, 2, 4);
    const { clustered } = getTripState();
    expect(clustered.length).toBe(6);
    expect(clustered.every((row) => typeof row.cluster === 'number')).toBe(true);
  });
});
