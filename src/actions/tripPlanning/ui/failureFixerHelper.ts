import { escapeHtml, setHtml } from '../utils';
import { Constants, Dom, Types } from '../types';
import { geocodeAddressMulti } from '../geocoding/geocodingHelper';
import { drawMarkers, enableMapClickToPin } from './mapHelper';
import { getTripState, logTripStatus, setTripState, updateTripStats } from './stateHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Renders the failed-address fixer panel after a geocode pass.
 *
 * @param provider - Provider used when the user retries an address.
 * @param getApiKey - Reads the current API key from the planner form.
 */
export function displayFailedGeocodes(
  provider: Types.GeocodeProvider,
  getApiKey: () => string
): void {
  const container = document.getElementById(Dom.FAILURE_CONTAINER_ID);
  const listEl = document.getElementById(Dom.FAILURE_LIST_ID);
  if (!container || !listEl) return;
  listEl.replaceChildren();

  const { failedGeocodes } = getTripState();
  if (failedGeocodes.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';

  failedGeocodes.forEach((failure, index) => {
    const item = document.createElement('div');
    item.className = Dom.FAILURE_ITEM_CLASS;
    item.id = `failure-item-${index}`;
    setHtml(
      item,
      `
      <div class="${Dom.FAILURE_NAME_CLASS}">${escapeHtml(failure.name)}</div>
      <div class="${Dom.FAILURE_REASON_CLASS}">${escapeHtml(failure.reason || 'Not found')}</div>
      <input type="text" class="${Dom.FAILURE_ADDRESS_INPUT_CLASS}" id="fix-addr-${index}" value="${escapeHtml(failure.address || '')}">
      <div class="${Dom.FAILURE_COORD_ROW_CLASS}">
        <input type="number" class="${Dom.FAILURE_COORD_INPUT_CLASS}" id="fix-lat-${index}" placeholder="Latitude" step="any">
        <input type="number" class="${Dom.FAILURE_COORD_INPUT_CLASS}" id="fix-lon-${index}" placeholder="Longitude" step="any">
      </div>
      <div class="failure-actions-row">
        <button type="button" id="pick-map-btn-${index}" class="${Dom.FAILURE_PICK_MAP_CLASS}">${Constants.BUTTON_PICK_MAP_TEXT}</button>
        <button type="button" id="fix-btn-${index}" class="${Dom.FAILURE_BUTTON_CLASS}">${Constants.BUTTON_FIX_TEXT}</button>
      </div>
    `
    );
    listEl.appendChild(item);

    let cancelPick: (() => void) | null = null;
    const pickBtn = document.getElementById(`pick-map-btn-${index}`) as HTMLButtonElement | null;
    pickBtn?.addEventListener('click', () => {
      if (cancelPick) {
        cancelPick();
        cancelPick = null;
        if (pickBtn) pickBtn.textContent = Constants.BUTTON_PICK_MAP_TEXT;
        return;
      }
      if (pickBtn) pickBtn.textContent = Constants.BUTTON_PICKING_MAP_TEXT;
      cancelPick = enableMapClickToPin((lat, lng) => {
        const latIn = document.getElementById(`fix-lat-${index}`) as HTMLInputElement | null;
        const lngIn = document.getElementById(`fix-lon-${index}`) as HTMLInputElement | null;
        if (latIn) latIn.value = String(lat);
        if (lngIn) lngIn.value = String(lng);
        if (pickBtn) {
          pickBtn.textContent = '📍 Pinned';
          setTimeout(() => {
            if (pickBtn) pickBtn.textContent = Constants.BUTTON_PICK_MAP_TEXT;
          }, 2000);
        }
        cancelPick = null;
      });
    });

    document
      .getElementById(`fix-btn-${index}`)
      ?.addEventListener('click', () => void handleFix(index, provider, getApiKey));
  });
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Applies a manual coordinate override or retries geocoding for one failed row. */
async function handleFix(
  index: number,
  provider: Types.GeocodeProvider,
  getApiKey: () => string
): Promise<void> {
  const button = document.getElementById(`fix-btn-${index}`) as HTMLButtonElement | null;
  const latInput = document.getElementById(`fix-lat-${index}`) as HTMLInputElement | null;
  const lngInput = document.getElementById(`fix-lon-${index}`) as HTMLInputElement | null;
  const addrInput = document.getElementById(`fix-addr-${index}`) as HTMLInputElement | null;
  const { failedGeocodes, records, geocoded } = getTripState();
  const failure = failedGeocodes[index];
  if (!failure || !button) return;

  button.textContent = Constants.BUTTON_FIXING_TEXT;
  button.disabled = true;

  const latValue = latInput?.value || '';
  const lngValue = lngInput?.value || '';
  const newAddress = addrInput?.value || failure.address;
  let geo: Types.GeocodeLookupResult | null = null;

  if (latValue && lngValue && !Number.isNaN(Number(latValue)) && !Number.isNaN(Number(lngValue))) {
    logTripStatus(`Manual override for ${failure.name}.`);
    geo = { lat: parseFloat(latValue), lng: parseFloat(lngValue), usedVariant: 'manual' };
  } else {
    geo = await geocodeAddressMulti(newAddress, provider, getApiKey());
  }

  if (!geo) {
    logTripStatus(`Failed to fix ${failure.name}. Try a different address or enter coordinates.`);
    button.textContent = Constants.BUTTON_FIX_TEXT;
    button.disabled = false;
    return;
  }

  const original = records.find((row) => row.name === failure.name);
  const nextGeocoded = [
    ...geocoded,
    {
      ...(original || { name: failure.name, address: newAddress, columns: failure.columns }),
      address: newAddress,
      lat: geo.lat,
      lng: geo.lng,
      coordSource: geo.usedVariant === 'manual' ? 'manual' : 'geocode',
    } as Types.TripMapMember,
  ];
  const nextFailed = failedGeocodes.filter((_, idx) => idx !== index);
  const nextRecords = records.map((row) =>
    row.name === failure.name ? { ...row, address: newAddress, lat: geo.lat, lng: geo.lng } : row
  );

  setTripState({ records: nextRecords, geocoded: nextGeocoded, failedGeocodes: nextFailed });
  updateTripStats();
  drawMarkers(nextGeocoded, false);
  displayFailedGeocodes(provider, getApiKey);
  logTripStatus(`Fixed ${failure.name} successfully.`);
}
