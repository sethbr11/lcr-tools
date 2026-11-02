import { describe, it, expect, beforeEach } from 'vitest';
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

  it('shows a one-line "Start: Default" summary until the user chooses to change it', () => {
    renderClusterStartControl(card, 2);

    expect(card.textContent).toContain('Start:');
    expect(card.textContent).toContain('Default');
    expect(card.querySelector('input')).toBeNull();
  });

  it('saves a starting address for just that cluster, and can revert to the default', () => {
    renderClusterStartControl(card, 2);
    buttonNamed('Change')?.click();
    const input = card.querySelector('input') as HTMLInputElement;
    input.value = '456 Oak Ave';
    buttonNamed('Save')?.click();

    expect(getClusterStartAddresses()).toEqual({ 2: '456 Oak Ave' });
    expect(card.textContent).toContain('456 Oak Ave');
    expect(card.querySelector('input')).toBeNull();

    buttonNamed('Edit')?.click();
    buttonNamed('Use default')?.click();
    expect(getClusterStartAddresses()).toEqual({});
    expect(card.textContent).toContain('Default');
  });
});
