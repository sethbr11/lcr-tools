import { Dom } from '../types';
import { getClusterStartAddress, logTripStatus, setClusterStartAddress } from './stateHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Renders a compact "Start: Default · Change" line inside a cluster card.
 * Clicking Change swaps it for an address field with Save / Use default, so each cluster can start
 * from its own address without cluttering the panel when the default is fine.
 *
 * @param card - Cluster card element to append the control to.
 * @param clusterId - Zero-based cluster identifier.
 */
export function renderClusterStartControl(card: HTMLElement, clusterId: number): void {
  const row = document.createElement('div');
  row.className = Dom.CLUSTER_START_CLASS;
  card.appendChild(row);
  showSummary(row, clusterId);
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Shows the collapsed one-line summary of the cluster's starting address. */
function showSummary(row: HTMLElement, clusterId: number): void {
  const custom = getClusterStartAddress(clusterId);
  const label = document.createElement('span');
  label.className = Dom.CLUSTER_START_LABEL_CLASS;
  label.textContent = 'Start:';

  const value = document.createElement('span');
  value.className = Dom.CLUSTER_START_VALUE_CLASS;
  value.textContent = custom || 'Default';
  value.title = custom || 'Uses the starting address from step 3';

  const change = document.createElement('button');
  change.type = 'button';
  change.className = Dom.CLUSTER_START_LINK_CLASS;
  change.textContent = custom ? 'Edit' : 'Change';
  change.addEventListener('click', () => showEditor(row, clusterId));

  row.replaceChildren(label, value, change);
}

/** Expands the row into an address field with Save and Use default actions. */
function showEditor(row: HTMLElement, clusterId: number): void {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = Dom.CLUSTER_START_INPUT_CLASS;
  input.placeholder = 'Starting address for this group';
  input.value = getClusterStartAddress(clusterId);

  const apply = (address: string) => {
    setClusterStartAddress(clusterId, address);
    const where = address.trim() || 'the default starting address';
    logTripStatus(
      `Cluster ${clusterId + 1} will start from ${where}. Run Optimize Routes to apply.`
    );
    showSummary(row, clusterId);
  };

  const save = document.createElement('button');
  save.type = 'button';
  save.className = Dom.CLUSTER_START_LINK_CLASS;
  save.textContent = 'Save';
  save.addEventListener('click', () => apply(input.value));

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = Dom.CLUSTER_START_LINK_CLASS;
  reset.textContent = 'Use default';
  reset.addEventListener('click', () => apply(''));

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') apply(input.value);
    if (event.key === 'Escape') showSummary(row, clusterId);
  });

  row.replaceChildren(input, save, reset);
  input.focus();
}
