import { browser } from 'wxt/browser';
import { replaceTemplate } from '../utils';
import { Constants, Dom } from '../types';
import { getClusterStartAddress, logTripStatus, setClusterStartAddress } from './stateHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Renders a compact "Start: First stop · Set start" line inside a cluster card.
 * Clicking it swaps in an address field with Save / Use for all groups / Clear, so each group can
 * start from its own address without cluttering the panel. The field is pre-filled with the last
 * address saved on any group.
 *
 * @param card - Cluster card element to append the control to.
 * @param clusterId - Zero-based cluster identifier.
 * @param allClusterIds - Every cluster id on the page, for "Use for all groups".
 */
export function renderClusterStartControl(
  card: HTMLElement,
  clusterId: number,
  allClusterIds: number[] = [clusterId]
): void {
  const row = document.createElement('div');
  row.className = Dom.CLUSTER_START_CLASS;
  row.dataset.clusterId = String(clusterId);
  card.appendChild(row);
  showSummary(row, clusterId, allClusterIds);
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Shows the collapsed one-line summary of the cluster's starting address. */
function showSummary(row: HTMLElement, clusterId: number, allClusterIds: number[]): void {
  const custom = getClusterStartAddress(clusterId);
  const label = document.createElement('span');
  label.className = Dom.CLUSTER_START_LABEL_CLASS;
  label.textContent = Constants.CLUSTER_START_LABEL;

  const value = document.createElement('span');
  value.className = Dom.CLUSTER_START_VALUE_CLASS;
  value.textContent = custom || Constants.CLUSTER_START_DEFAULT;
  value.title = custom || Constants.CLUSTER_START_DEFAULT_TITLE;

  const change = document.createElement('button');
  change.type = 'button';
  change.className = Dom.CLUSTER_START_LINK_CLASS;
  change.textContent = custom ? Constants.CLUSTER_START_EDIT : Constants.CLUSTER_START_SET;
  change.addEventListener('click', () => {
    void showEditor(row, clusterId, allClusterIds);
  });

  row.replaceChildren(label, value, change);
}

/** Expands the row into an address field with Save, Use for all groups, and Clear actions. */
async function showEditor(
  row: HTMLElement,
  clusterId: number,
  allClusterIds: number[]
): Promise<void> {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = Dom.CLUSTER_START_INPUT_CLASS;
  input.placeholder = Constants.CLUSTER_START_PLACEHOLDER;
  input.value = getClusterStartAddress(clusterId) || (await getLastUsedAddress());

  const apply = (ids: number[], address: string) => {
    for (const id of ids) setClusterStartAddress(id, address);
    if (address.trim()) void rememberAddress(address.trim());
    const who = ids.length > 1 ? Constants.CLUSTER_START_ALL_GROUPS : `Cluster ${clusterId + 1}`;
    const where = address.trim() || Constants.CLUSTER_START_FIRST_STOP;
    logTripStatus(replaceTemplate(Constants.CLUSTER_START_APPLIED_LOG, { who, where }));
    refreshSummaries(ids, allClusterIds);
  };

  const save = makeLink(Constants.CLUSTER_START_SAVE, () => apply([clusterId], input.value));
  const applyAll = makeLink(Constants.CLUSTER_START_APPLY_ALL, () =>
    apply(allClusterIds, input.value)
  );
  const clear = makeLink(Constants.CLUSTER_START_CLEAR, () => apply([clusterId], ''));

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') apply([clusterId], input.value);
    if (event.key === 'Escape') showSummary(row, clusterId, allClusterIds);
  });

  row.replaceChildren(input, save, applyAll, clear);
  input.focus();
}

/** Re-renders the summary row of each listed cluster currently on the page. */
function refreshSummaries(ids: number[], allClusterIds: number[]): void {
  for (const id of ids) {
    const row = document.querySelector<HTMLElement>(
      `.${Dom.CLUSTER_START_CLASS}[data-cluster-id="${id}"]`
    );
    if (row) showSummary(row, id, allClusterIds);
  }
}

/** Builds a text-style button used in the starting address row. */
function makeLink(text: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = Dom.CLUSTER_START_LINK_CLASS;
  button.textContent = text;
  button.addEventListener('click', onClick);
  return button;
}

/** Reads the last starting address saved on any group, or '' when none or storage is unavailable. */
async function getLastUsedAddress(): Promise<string> {
  try {
    const stored = await browser?.storage?.local?.get(Constants.STORAGE_STARTING_ADDRESS_KEY);
    const address = stored?.[Constants.STORAGE_STARTING_ADDRESS_KEY];
    return typeof address === 'string' ? address : '';
  } catch {
    return '';
  }
}

/** Remembers an address so the next group's editor can offer it. */
async function rememberAddress(address: string): Promise<void> {
  try {
    await browser?.storage?.local?.set({ [Constants.STORAGE_STARTING_ADDRESS_KEY]: address });
  } catch {
    // Storage is optional; the address is still applied for this session
  }
}
