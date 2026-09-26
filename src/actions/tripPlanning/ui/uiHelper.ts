import { hasStoredApiKey, saveApiKey } from '../utils';
import { Constants, Dom, Types } from '../types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/** Binds accordion headers, Next buttons, log toggle, and clustering strategy radios. */
export function setupPlannerChrome(): void {
  const items = Array.from(document.querySelectorAll<HTMLElement>(`.${Dom.ACCORDION_ITEM_CLASS}`));
  items.forEach((item) => {
    const header = item.querySelector(`.${Dom.ACCORDION_HEADER_CLASS}`);
    header?.addEventListener('click', () => activateStep(item.id));
  });

  document.getElementById(Dom.STEP1_NEXT_ID)?.addEventListener('click', (event) => {
    event.stopPropagation();
    activateStep(Dom.STEP2_ID);
  });
  document.getElementById(Dom.STEP2_NEXT_ID)?.addEventListener('click', (event) => {
    event.stopPropagation();
    activateStep(Dom.STEP3_ID);
  });

  document.getElementById(Dom.LOG_HEADER_ID)?.addEventListener('click', () => {
    document.getElementById(Dom.LOG_CONTAINER_ID)?.classList.toggle(Dom.LOG_COLLAPSED_CLASS);
  });

  document
    .querySelectorAll<HTMLInputElement>(`input[name="${Dom.CLUSTER_STRATEGY_NAME}"]`)
    .forEach((radio) => {
      radio.addEventListener('change', () => {
        const byCount = document.getElementById(Dom.BY_COUNT_CONTROLS_ID);
        const bySize = document.getElementById(Dom.BY_SIZE_CONTROLS_ID);
        if (!byCount || !bySize) return;
        const isByCount = radio.value === 'byCount' && radio.checked;
        byCount.style.display = isByCount ? 'block' : 'none';
        bySize.style.display = isByCount ? 'none' : 'block';
      });
    });
}

/**
 * Updates API key visibility, autofill button presence, and road-network availability.
 *
 * @param storedKeys - Catalog keys loaded from extension storage.
 */
export async function updateProviderControls(storedKeys: Types.StoredApiKeys): Promise<void> {
  const provider = getSelectedProvider();
  const apiKeyRow = document.getElementById(Dom.API_KEY_ROW_ID);
  const apiKeyInput = document.getElementById(Dom.API_KEY_ID) as HTMLInputElement | null;
  const autofillBtn = document.getElementById(
    Dom.API_KEY_AUTOFILL_BTN_ID
  ) as HTMLButtonElement | null;
  const metricMapbox = document.getElementById(Dom.METRIC_MAPBOX_ID) as HTMLInputElement | null;
  const metricAutofillBtn = document.getElementById(
    Dom.METRIC_MAPBOX_AUTOFILL_BTN_ID
  ) as HTMLButtonElement | null;

  if (provider === 'nominatim') {
    if (apiKeyRow) apiKeyRow.style.display = 'none';
  } else {
    if (apiKeyRow) apiKeyRow.style.display = 'flex';
    const keyId =
      provider === 'mapbox' ? Constants.API_KEY_ID_MAPBOX : Constants.API_KEY_ID_LOCATIONIQ;
    if (apiKeyInput && storedKeys[keyId] && !apiKeyInput.value) {
      apiKeyInput.value = storedKeys[keyId] || '';
    }

    if (autofillBtn) {
      const hasKey = Boolean(storedKeys[keyId]) || (await hasStoredApiKey(keyId));
      const isInputEmpty = !apiKeyInput || !apiKeyInput.value.trim();
      autofillBtn.style.display = hasKey && isInputEmpty ? 'inline-block' : 'none';
    }
  }

  const mapboxAvailable = Boolean(
    storedKeys.mapbox || (provider === 'mapbox' && apiKeyInput?.value)
  );
  if (metricMapbox) {
    metricMapbox.disabled = !mapboxAvailable;
    metricMapbox.title = mapboxAvailable
      ? ''
      : 'Store a Mapbox API key to enable Road Network routing.';
    if (metricMapbox.disabled && metricMapbox.checked) {
      const straight = document.querySelector<HTMLInputElement>(
        `input[name="${Dom.DISTANCE_METRIC_NAME}"][value="straight"]`
      );
      if (straight) straight.checked = true;
    }
  }

  if (metricAutofillBtn) {
    const hasMapbox =
      Boolean(storedKeys.mapbox) || (await hasStoredApiKey(Constants.API_KEY_ID_MAPBOX));
    metricAutofillBtn.style.display = !mapboxAvailable && hasMapbox ? 'inline-block' : 'none';
  }
}

/** Reads the currently selected geocoding provider. */
export function getSelectedProvider(): Types.GeocodeProvider {
  const select = document.getElementById(Dom.GEOCODE_PROVIDER_ID) as HTMLSelectElement | null;
  const value = select?.value;
  if (value === 'locationiq' || value === 'mapbox') return value;
  return 'nominatim';
}

/** Reads the currently selected distance metric. */
export function getSelectedMetric(): Types.DistanceMetric {
  const checked = document.querySelector<HTMLInputElement>(
    `input[name="${Dom.DISTANCE_METRIC_NAME}"]:checked`
  );
  return checked?.value === 'mapbox' ? 'mapbox' : 'straight';
}

/** Reads the clustering strategy radios. */
export function getSelectedClusterStrategy(): Types.ClusterStrategy {
  const checked = document.querySelector<HTMLInputElement>(
    `input[name="${Dom.CLUSTER_STRATEGY_NAME}"]:checked`
  );
  return checked?.value === 'bySize' ? 'bySize' : 'byCount';
}

/** Returns the API key currently typed in the planner form. */
export function getPlannerApiKey(): string {
  const input = document.getElementById(Dom.API_KEY_ID) as HTMLInputElement | null;
  return input?.value.trim() || '';
}

/**
 * Persists the current planner key into the matching catalog slot.
 *
 * @param provider - Provider currently selected in the planner.
 */
export async function persistPlannerApiKey(provider: Types.GeocodeProvider): Promise<void> {
  if (provider === 'nominatim') return;
  const value = getPlannerApiKey();
  if (!value) return;
  const keyId =
    provider === 'mapbox' ? Constants.API_KEY_ID_MAPBOX : Constants.API_KEY_ID_LOCATIONIQ;
  await saveApiKey(keyId, value);
}

/**
 * Binds the show/hide toggle and input change listener for the planner API key field.
 *
 * @param onInputChange - Optional callback invoked when the user modifies the API key input.
 */
export function setupApiKeyVisibilityToggle(onInputChange?: () => void): void {
  const toggle = document.getElementById(Dom.API_KEY_TOGGLE_ID);
  const input = document.getElementById(Dom.API_KEY_ID) as HTMLInputElement | null;
  toggle?.addEventListener('click', () => {
    if (!input) return;
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    if (toggle)
      toggle.textContent = hidden ? Constants.API_KEYS_HIDE_LABEL : Constants.API_KEYS_SHOW_LABEL;
  });
  input?.addEventListener('input', () => {
    onInputChange?.();
  });
}

/**
 * Updates geocode progress bar width and percent label.
 *
 * @param percent - Integer percent complete.
 * @param visible - Whether the progress container should be shown.
 */
export function setGeocodeProgress(percent: number, visible: boolean): void {
  const container = document.getElementById(Dom.GEOCODE_PROGRESS_ID);
  const fill = document.getElementById(Dom.GEOCODE_PROGRESS_FILL_ID);
  const label = document.getElementById(Dom.GEOCODE_PROGRESS_PERCENT_ID);
  if (container) container.style.display = visible ? 'block' : 'none';
  if (fill) fill.style.width = `${percent}%`;
  if (label) label.textContent = `${percent}%`;
}

/**
 * Enables or disables a planner action button.
 *
 * @param id - Button element ID.
 * @param enabled - Whether the button should be clickable.
 */
export function setButtonEnabled(id: string, enabled: boolean): void {
  const button = document.getElementById(id) as HTMLButtonElement | null;
  if (button) button.disabled = !enabled;
}

/**
 * Expands one accordion step card and collapses the remaining step cards.
 *
 * @param stepId - DOM element ID of the step card to activate.
 */
export function activateStep(stepId: string): void {
  const items = Array.from(document.querySelectorAll<HTMLElement>(`.${Dom.ACCORDION_ITEM_CLASS}`));
  for (const item of items) {
    const isActive = item.id === stepId;
    item.classList.toggle(Dom.ACCORDION_ACTIVE_CLASS, isActive);
    const icon = item.querySelector(`.${Dom.ACCORDION_ICON_CLASS}`);
    if (icon) icon.textContent = isActive ? '▼' : '▶';
  }
}
