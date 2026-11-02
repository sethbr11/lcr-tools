import { describe, it, expect, beforeEach } from 'vitest';
import { clusterAddresses } from '@/actions/tripPlanning/routing/clusteringHelper';
import { capacitatedClusters, kMeans } from '@/actions/tripPlanning/routing/kMeansHelper';
import {
  getTripLogs,
  getTripState,
  resetTripState,
  setTripState,
} from '@/actions/tripPlanning/ui/stateHelper';
import { Types } from '@/actions/tripPlanning/types';

function member(name: string, lat: number, lng: number): Types.TripMapMember {
  return { name, address: `${name} St`, columns: {}, lat, lng };
}

/** Deterministic pseudo-random spread of members around a center. */
function scatter(count: number, centerLat: number, centerLng: number, spread: number) {
  let state = 12345;
  const next = (): number => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  return Array.from({ length: count }, (_, index) =>
    member(`M${index}`, centerLat + next() * spread, centerLng + next() * spread)
  );
}

function sizesOf(assignments: number[]): number[] {
  const sizes = new Map<number, number>();
  assignments.forEach((id) => sizes.set(id, (sizes.get(id) || 0) + 1));
  return [...sizes.values()];
}

function clusterMembers(): Types.TripMapMember[] {
  return getTripState().clustered;
}

describe('tripClusteringHelper kMeans', () => {
  it('returns exactly k non-empty clusters with colocated seed points', () => {
    const xy: [number, number][] = [
      [0, 0],
      [0, 0],
      [0, 0],
      [10, 10],
      [10, 10.1],
      [20, 0],
      [20, 0.1],
      [0, 20],
    ];
    for (let seed = 1; seed <= 8; seed += 1) {
      const { assignments, centroids } = kMeans(xy, 4, seed);
      expect(centroids.length).toBe(4);
      expect(new Set(assignments).size).toBe(4);
    }
  });

  it('is deterministic for the same seed', () => {
    const xy = scatter(40, 40, -111, 0.2).map((m) => [m.lng, m.lat] as [number, number]);
    expect(kMeans(xy, 5, 3).assignments).toEqual(kMeans(xy, 5, 3).assignments);
  });

  it('caps clusters at the number of distinct coordinates', () => {
    const xy: [number, number][] = [
      [1, 1],
      [1, 1],
      [2, 2],
    ];
    const { assignments, centroids } = kMeans(xy, 5, 1);
    expect(centroids.length).toBe(2);
    expect(new Set(assignments).size).toBe(2);
  });
});

describe('tripClusteringHelper capacitatedClusters', () => {
  it('keeps every cluster within min and max when feasible', () => {
    const xy = scatter(23, 40, -111, 0.3).map((m) => [m.lng, m.lat] as [number, number]);
    const sizes = sizesOf(capacitatedClusters(xy, 4, 6));
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(23);
    sizes.forEach((size) => {
      expect(size).toBeGreaterThanOrEqual(4);
      expect(size).toBeLessThanOrEqual(6);
    });
  });

  it('honors max when sizes cannot all be satisfied', () => {
    const xy = scatter(5, 40, -111, 0.1).map((m) => [m.lng, m.lat] as [number, number]);
    const sizes = sizesOf(capacitatedClusters(xy, 4, 4));
    expect(sizes.length).toBe(2);
    sizes.forEach((size) => expect(size).toBeLessThanOrEqual(4));
  });

  it('falls back to count-based clustering for invalid sizes', () => {
    const xy = scatter(10, 40, -111, 0.1).map((m) => [m.lng, m.lat] as [number, number]);
    const messages: string[] = [];
    const assignments = capacitatedClusters(xy, 8, 2, (message) => messages.push(message));
    expect(assignments.length).toBe(10);
    expect(messages.some((message) => /Invalid min\/max/.test(message))).toBe(true);
  });
});

describe('tripClusteringHelper clusterAddresses', () => {
  beforeEach(() => {
    resetTripState();
  });

  it('separates two interleaved tight blobs when asked for 2 clusters', () => {
    const geocoded: Types.TripMapMember[] = [];
    for (let i = 0; i < 5; i += 1) {
      geocoded.push(member(`North ${i}`, 41 + i * 0.001, -111 + i * 0.001));
      geocoded.push(member(`South ${i}`, 39 + i * 0.001, -111 + i * 0.001));
    }
    setTripState({ geocoded });
    clusterAddresses('byCount', 2, 1, 10);
    const clustered = clusterMembers();
    expect(clustered.length).toBe(10);
    const north = new Set(
      clustered.filter((m) => m.name.startsWith('North')).map((m) => m.cluster)
    );
    const south = new Set(
      clustered.filter((m) => m.name.startsWith('South')).map((m) => m.cluster)
    );
    expect(north.size).toBe(1);
    expect(south.size).toBe(1);
    expect([...north][0]).not.toBe([...south][0]);
    expect([...north][0]).toBe(0);
  });

  it('returns 4 clusters when the first members share a household coordinate', () => {
    const areas: [number, number][] = [
      [41, -112],
      [41, -110],
      [39, -112],
      [39, -110],
    ];
    const geocoded: Types.TripMapMember[] = [
      member('House 1', 41, -112),
      member('House 2', 41, -112),
      member('House 3', 41, -112),
      member('A near', 41.01, -112.01),
      member('B 1', areas[1][0], areas[1][1]),
      member('B 2', areas[1][0] + 0.01, areas[1][1]),
      member('B 3', areas[1][0], areas[1][1] + 0.01),
      member('C 1', areas[2][0], areas[2][1]),
      member('C 2', areas[2][0] + 0.01, areas[2][1]),
      member('C 3', areas[2][0], areas[2][1] + 0.01),
      member('D 1', areas[3][0], areas[3][1]),
      member('D 2', areas[3][0] + 0.01, areas[3][1]),
    ];
    setTripState({ geocoded });
    clusterAddresses('byCount', 4, 1, 10);
    const clustered = clusterMembers();
    expect(new Set(clustered.map((m) => m.cluster)).size).toBe(4);
    const house = clustered.filter((m) => m.name.startsWith('House'));
    expect(new Set(house.map((m) => m.cluster)).size).toBe(1);
    clustered.forEach((m) => expect(Number.isInteger(m.cluster)).toBe(true));
  });

  it('reduces cluster count to the distinct coordinates and logs why', () => {
    setTripState({
      geocoded: [
        member('A1', 40, -111),
        member('A2', 40, -111),
        member('A3', 40, -111),
        member('B1', 41, -111),
        member('B2', 41, -111),
        member('B3', 41, -111),
      ],
    });
    clusterAddresses('byCount', 4, 1, 10);
    expect(new Set(clusterMembers().map((m) => m.cluster)).size).toBe(2);
    expect(
      getTripLogs().some((entry) => /Only 2 distinct locations.*from 4 to 2/.test(entry.message))
    ).toBe(true);
  });

  it('produces identical assignments for identical input', () => {
    const geocoded = scatter(60, 40, -111, 0.4);
    setTripState({ geocoded });
    clusterAddresses('byCount', 6, 1, 10);
    const first = clusterMembers().map((m) => `${m.name}:${m.cluster}`);
    setTripState({ geocoded });
    clusterAddresses('byCount', 6, 1, 10);
    const second = clusterMembers().map((m) => `${m.name}:${m.cluster}`);
    expect(second).toEqual(first);
  });

  it('honors bySize min and max through clusterAddresses', () => {
    setTripState({ geocoded: scatter(23, 40, -111, 0.3) });
    clusterAddresses('bySize', 1, 4, 6);
    const clustered = clusterMembers();
    expect(clustered.length).toBe(23);
    sizesOf(clustered.map((m) => m.cluster as number)).forEach((size) => {
      expect(size).toBeGreaterThanOrEqual(4);
      expect(size).toBeLessThanOrEqual(6);
    });
  });

  it('keeps all sizes at or below max when the minimum is infeasible', () => {
    setTripState({ geocoded: scatter(5, 40, -111, 0.1) });
    clusterAddresses('bySize', 1, 4, 4);
    sizesOf(clusterMembers().map((m) => m.cluster as number)).forEach((size) => {
      expect(size).toBeLessThanOrEqual(4);
    });
  });

  it('groups longitudinally close points at high latitude (planar projection)', () => {
    // At 60 degrees latitude 0.02 deg of longitude is ~0.01 deg of ground distance, which is
    // closer than the 0.015 deg latitude gap; raw degrees would pair the points vertically.
    setTripState({
      geocoded: [
        member('SW', 60, 0),
        member('NW', 60.015, 0),
        member('SE', 60, 0.02),
        member('NE', 60.015, 0.02),
      ],
    });
    clusterAddresses('byCount', 2, 1, 10);
    const byName = Object.fromEntries(clusterMembers().map((m) => [m.name, m.cluster]));
    expect(byName.SW).toBe(byName.SE);
    expect(byName.NW).toBe(byName.NE);
    expect(byName.SW).not.toBe(byName.NW);
  });

  it('clusters 500 points into 25 groups in under one second', () => {
    setTripState({ geocoded: scatter(500, 40, -111, 1) });
    const start = performance.now();
    clusterAddresses('byCount', 25, 1, 10);
    expect(performance.now() - start).toBeLessThan(1000);
    expect(new Set(clusterMembers().map((m) => m.cluster)).size).toBe(25);
  });
});
