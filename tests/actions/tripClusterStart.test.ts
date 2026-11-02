import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderClusterStartControl } from '@/actions/tripPlanning/ui/clusterStartHelper';
import { getClusterStartAddresses, resetTripState } from '@/actions/tripPlanning/ui/stateHelper';

describe('trip planner per-cluster starting address', () => {
  let card: HTMLElement;
  const buttonNamed = (label: string) =>
    Array.from(card.querySelectorAll('button')).find((b) => b.textContent === label);

  beforeEach(() => {
    resetTripState();
    document.body.replaceChildren();
    card = document.createElement('div');
    document.body.appendChild(card);
  });

  it('shows a one-line "Start: First stop" summary until the user sets a start', () => {
    renderClusterStartControl(card, 2);

    expect(card.textContent).toContain('Start:');
    expect(card.textContent).toContain('First stop');
    expect(card.querySelector('input')).toBeNull();
  });

  it('saves a starting address for just that cluster, and can clear it', async () => {
    renderClusterStartControl(card, 2);
    buttonNamed('Set start')?.click();
    await vi.waitFor(() => expect(card.querySelector('input')).not.toBeNull());
    const input = card.querySelector('input') as HTMLInputElement;
    input.value = '456 Oak Ave';
    buttonNamed('Save')?.click();

    expect(getClusterStartAddresses()).toEqual({ 2: '456 Oak Ave' });
    expect(card.textContent).toContain('456 Oak Ave');
    expect(card.querySelector('input')).toBeNull();

    buttonNamed('Edit')?.click();
    await vi.waitFor(() => expect(buttonNamed('Clear')).toBeDefined());
    buttonNamed('Clear')?.click();
    expect(getClusterStartAddresses()).toEqual({});
    expect(card.textContent).toContain('First stop');
  });

  it('applies one address to every group with "Use for all groups"', async () => {
    const other = document.createElement('div');
    document.body.appendChild(other);
    renderClusterStartControl(card, 0, [0, 1]);
    renderClusterStartControl(other, 1, [0, 1]);

    buttonNamed('Set start')?.click();
    await vi.waitFor(() => expect(card.querySelector('input')).not.toBeNull());
    (card.querySelector('input') as HTMLInputElement).value = 'Stake Center';
    buttonNamed('Use for all groups')?.click();

    expect(getClusterStartAddresses()).toEqual({ 0: 'Stake Center', 1: 'Stake Center' });
    expect(other.textContent).toContain('Stake Center');
  });
});
