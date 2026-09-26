import { browser } from 'wxt/browser';
import { isSessionUnlocked } from '@/utils/security/cryptoUtils';
import { getStoredApiKeys } from '@/utils/security/apiKeyStorageUtils';
import { showToast } from '@/actions/tripPlanning/utils';
import { Constants, Dom, Types } from '@/actions/tripPlanning/types';
import { showTripPinModal } from '@/actions/tripPlanning/ui/pinModalHelper';
import { clusterAddresses } from '@/actions/tripPlanning/routing/clusteringHelper';
import { exportTripCsv } from '@/actions/tripPlanning/export/exportHelper';
import { displayFailedGeocodes } from '@/actions/tripPlanning/ui/failureFixerHelper';
import { geocodePendingRecords } from '@/actions/tripPlanning/geocoding/geocodingHelper';
import { showTripLogsModal } from '@/actions/tripPlanning/ui/logsModalHelper';
import {
  drawMarkers,
  drawRoutes,
  initTripMap,
  refreshTripBasemap,
  updateClusterList,
} from '@/actions/tripPlanning/ui/mapHelper';
import { optimizeRoutes } from '@/actions/tripPlanning/routing/routingHelper';
import {
  getTripState,
  logTripStatus,
  setTripState,
  toMapMember,
  updateTripStats,
} from '@/actions/tripPlanning/ui/stateHelper';
import {
  getPlannerApiKey,
  getSelectedClusterStrategy,
  getSelectedMetric,
  getSelectedProvider,
  persistPlannerApiKey,
  setButtonEnabled,
  setGeocodeProgress,
  setupApiKeyVisibilityToggle,
  setupPlannerChrome,
  updateProviderControls,
} from '@/actions/tripPlanning/ui/uiHelper';

let storedKeys: Types.StoredApiKeys = {};

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Initializes the interactive Trip Planner page after member data is stored from LCR.
 */
export async function initTripPlanner(): Promise<void> {
  storedKeys = await getStoredApiKeys();
  initTripMap(storedKeys.mapbox || '');
  setupPlannerChrome();
  setupApiKeyVisibilityToggle(() => {
    void updateProviderControls(storedKeys);
  });
  bindPlannerActions();
  await updateProviderControls(storedKeys);
  await loadStoredStartingAddress();
  await loadStoredMembers();
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Loads extracted members from extension storage and seeds Church coordinates. */
async function loadStoredMembers(): Promise<void> {
  try {
    const result = browser?.storage?.local
      ? await browser.storage.local.get([Constants.STORAGE_DATA_KEY, Constants.STORAGE_HEADERS_KEY])
      : {};
    const records = (result[Constants.STORAGE_DATA_KEY] as Types.TripPlanningMember[]) || [];
    const originalHeaders = (result[Constants.STORAGE_HEADERS_KEY] as string[]) || [];
    const geocoded = records
      .map(toMapMember)
      .filter((member): member is Types.TripMapMember => Boolean(member));

    setTripState({
      records,
      originalHeaders,
      geocoded,
      clustered: [],
      optimized: [],
      failedGeocodes: [],
    });
    updateTripStats();
    logTripStatus(`Loaded ${records.length} records.`);

    if (geocoded.length > 0) {
      drawMarkers(geocoded, false);
      setButtonEnabled(Dom.CLUSTER_BTN_ID, true);
      logTripStatus(`Used Church Directory coordinates for ${geocoded.length} members.`);
    }
    if (geocoded.length === records.length && records.length > 0) {
      logTripStatus('All members already have coordinates. Clustering is ready.');
    }
  } catch (error) {
    console.error('LCR Tools: Failed to load stored trip members:', error);
    logTripStatus('Error reading stored members from extension storage.');
  }
}

/** Wires geocode, cluster, route, export, logs, and provider controls. */
function bindPlannerActions(): void {
  document.getElementById(Dom.GEOCODE_BTN_ID)?.addEventListener('click', () => {
    void handleGeocode();
  });
  document.getElementById(Dom.CLUSTER_BTN_ID)?.addEventListener('click', handleCluster);
  document.getElementById(Dom.OPTIMIZE_BTN_ID)?.addEventListener('click', () => {
    void handleOptimize();
  });
  document.getElementById(Dom.EXPORT_CSV_BTN_ID)?.addEventListener('click', () => {
    void exportTripCsv();
  });
  document.getElementById(Dom.VIEW_LOGS_BTN_ID)?.addEventListener('click', () => {
    showTripLogsModal();
  });
  document.getElementById(Dom.SAVE_STARTING_ADDRESS_BTN_ID)?.addEventListener('click', () => {
    void handleSaveStartingAddress();
  });
  document.getElementById(Dom.GEOCODE_PROVIDER_ID)?.addEventListener('change', () => {
    void updateProviderControls(storedKeys);
  });
  document.getElementById(Dom.API_KEY_AUTOFILL_BTN_ID)?.addEventListener('click', () => {
    void handleAutofillApiKey();
  });
  document.getElementById(Dom.METRIC_MAPBOX_AUTOFILL_BTN_ID)?.addEventListener('click', () => {
    void handleAutofillApiKey(Constants.API_KEY_ID_MAPBOX);
  });
}

/** Loads saved default starting address from extension storage if available. */
async function loadStoredStartingAddress(): Promise<void> {
  try {
    if (!browser?.storage?.local) return;
    const stored = await browser.storage.local.get(Constants.STORAGE_STARTING_ADDRESS_KEY);
    const address = stored[Constants.STORAGE_STARTING_ADDRESS_KEY];
    if (typeof address === 'string' && address.trim()) {
      const input = document.getElementById(Dom.STARTING_ADDRESS_ID) as HTMLInputElement | null;
      if (input && !input.value) {
        input.value = address.trim();
      }
    }
  } catch (error) {
    console.error('LCR Tools: Failed to load stored starting address:', error);
  }
}

/** Persists current starting address input into extension storage as default. */
async function handleSaveStartingAddress(): Promise<void> {
  const input = document.getElementById(Dom.STARTING_ADDRESS_ID) as HTMLInputElement | null;
  const address = input?.value.trim() || '';
  if (browser?.storage?.local) {
    await browser.storage.local.set({ [Constants.STORAGE_STARTING_ADDRESS_KEY]: address });
  }
  showToast(Constants.STARTING_ADDRESS_SAVED_TOAST, { type: 'success' });
}

/** Runs fallback geocoding for members still missing coordinates. */
async function handleGeocode(): Promise<void> {
  const provider = getSelectedProvider();
  const apiKey =
    getPlannerApiKey() || storedKeys[provider === 'mapbox' ? 'mapbox' : 'locationiq'] || '';
  if ((provider === 'locationiq' || provider === 'mapbox') && !apiKey) {
    logTripStatus(`Please enter an API key for ${provider}.`);
    return;
  }

  await persistPlannerApiKey(provider);
  storedKeys = await getStoredApiKeys();
  if (storedKeys.mapbox) refreshTripBasemap(storedKeys.mapbox);
  await updateProviderControls(storedKeys);

  const { records, geocoded: currentGeocoded } = getTripState();
  const alreadyMapped = new Set(
    currentGeocoded.map((member) => member.name + '|' + member.address)
  );
  const pendingCount = records.filter(
    (member) => !member.lat && !alreadyMapped.has(member.name + '|' + member.address)
  ).length;

  if (pendingCount > 0) {
    const providerName =
      provider === 'nominatim'
        ? 'OpenStreetMap Nominatim'
        : provider === 'mapbox'
          ? 'Mapbox'
          : 'LocationIQ';
    const confirmMessage = Constants.GEOCODE_DISCLOSURE_CONFIRM.replace(
      '{count}',
      String(pendingCount)
    ).replace('{provider}', providerName);
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) {
      logTripStatus('Geocoding cancelled by user.');
      return;
    }
  }

  setButtonEnabled(Dom.GEOCODE_BTN_ID, false);
  setGeocodeProgress(0, true);
  logTripStatus(`Starting geocoding with ${provider}...`);
  await geocodePendingRecords(provider, apiKey, (percent) => setGeocodeProgress(percent, true));

  const { geocoded, failedGeocodes } = getTripState();
  drawMarkers(geocoded, false);
  displayFailedGeocodes(provider, getPlannerApiKey);
  setButtonEnabled(Dom.CLUSTER_BTN_ID, geocoded.length > 0);
  setButtonEnabled(Dom.GEOCODE_BTN_ID, true);
  logTripStatus(
    `Geocoding complete: ${geocoded.length} succeeded, ${failedGeocodes.length} failed.`
  );
}

/** Clusters geocoded members using the selected strategy. */
function handleCluster(): void {
  const strategy = getSelectedClusterStrategy();
  const countInput = document.getElementById(Dom.CLUSTER_COUNT_ID) as HTMLInputElement | null;
  const minInput = document.getElementById(Dom.MIN_CLUSTER_SIZE_ID) as HTMLInputElement | null;
  const maxInput = document.getElementById(Dom.MAX_CLUSTER_SIZE_ID) as HTMLInputElement | null;

  const rawCount = parseInt(countInput?.value || '', 10);
  const rawMin = parseInt(minInput?.value || '', 10);
  const rawMax = parseInt(maxInput?.value || '', 10);
  const count = Number.isNaN(rawCount) ? Constants.CLUSTER_COUNT_DEFAULT : rawCount;
  const min = Number.isNaN(rawMin) ? Constants.CLUSTER_MIN_SIZE_DEFAULT : rawMin;
  const max = Number.isNaN(rawMax) ? Constants.CLUSTER_MAX_SIZE_DEFAULT : rawMax;

  clusterAddresses(strategy, count, min, max);
  const { clustered } = getTripState();
  drawMarkers(clustered, true);
  updateClusterList(clustered);
  setButtonEnabled(Dom.OPTIMIZE_BTN_ID, clustered.length > 0);
  const optimizeBtn = document.getElementById(Dom.OPTIMIZE_BTN_ID);
  if (optimizeBtn) optimizeBtn.title = '';
}

/** Optimizes cluster visit order using straight-line or Mapbox road routing. */
async function handleOptimize(): Promise<void> {
  const optimizeBtn = document.getElementById(Dom.OPTIMIZE_BTN_ID) as HTMLButtonElement | null;
  if (optimizeBtn) {
    optimizeBtn.disabled = true;
    optimizeBtn.textContent = 'Optimizing...';
  }

  try {
    const metric = getSelectedMetric();
    const provider = getSelectedProvider();
    const mapboxKey = storedKeys.mapbox || (provider === 'mapbox' ? getPlannerApiKey() : '');
    const geocodeKey =
      provider === 'nominatim' ? '' : getPlannerApiKey() || storedKeys[provider] || '';
    const startInput = document.getElementById(Dom.STARTING_ADDRESS_ID) as HTMLInputElement | null;
    const routes = await optimizeRoutes(
      metric,
      mapboxKey,
      provider,
      geocodeKey,
      startInput?.value.trim() || ''
    );
    if (!routes) return;
    drawRoutes(routes);
    updateClusterList(getTripState().clustered, routes);
    setButtonEnabled(Dom.EXPORT_CSV_BTN_ID, true);
  } finally {
    if (optimizeBtn) {
      optimizeBtn.disabled = false;
      optimizeBtn.textContent = 'Optimize Routes';
    }
  }
}

/** Handles unlocking and autofilling stored API keys via PIN modal or cached credentials. */
async function handleAutofillApiKey(forceProvider?: Types.KnownApiKeyId): Promise<void> {
  const provider = forceProvider || (getSelectedProvider() === 'mapbox' ? 'mapbox' : 'locationiq');
  const unlocked = await isSessionUnlocked();

  if (unlocked) {
    storedKeys = await getStoredApiKeys();
    applyUnlockedKeys(storedKeys, provider);
    showToast(Constants.TRIP_PIN_MODAL_SUCCESS, { type: 'success' });
    return;
  }

  showTripPinModal(async (keys) => {
    storedKeys = keys;
    applyUnlockedKeys(keys, provider);
  });
}

/** Applies unlocked keys to input fields, routing controls, and basemap. */
function applyUnlockedKeys(keys: Types.StoredApiKeys, targetKeyId: Types.KnownApiKeyId): void {
  const apiKeyInput = document.getElementById(Dom.API_KEY_ID) as HTMLInputElement | null;
  const currentProvider = getSelectedProvider();

  if (apiKeyInput && keys[targetKeyId] && (currentProvider === targetKeyId || !apiKeyInput.value)) {
    apiKeyInput.value = keys[targetKeyId] || '';
  }

  void updateProviderControls(keys);

  if (keys.mapbox) {
    refreshTripBasemap(keys.mapbox);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  void initTripPlanner();
});
