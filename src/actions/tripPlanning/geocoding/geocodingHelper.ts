import { browser } from 'wxt/browser';
import { sleep } from '../utils';
import { Constants, Regex, Types } from '../types';
import { advancedNormalizeAddress } from './addressHelper';
import {
  getTripState,
  logTripStatus,
  setTripState,
  toMapMember,
  updateTripStats,
} from '../ui/stateHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Resolves coordinates for an address using cache, then provider lookups on variants.
 *
 * @param address - Street address string only (never a member name).
 * @param provider - Selected geocoding provider.
 * @param apiKey - Provider key when required.
 * @returns Coordinate result or null when every variant fails.
 */
export async function geocodeAddressMulti(
  address: string,
  provider: Types.GeocodeProvider,
  apiKey: string
): Promise<Types.GeocodeLookupResult | null> {
  const cache = await readGeocodeCache();
  const cached = cache[address];
  if (cached) return cached;

  const { variants } = advancedNormalizeAddress(address);
  for (let i = 0; i < variants.length; i += 1) {
    const attempt = variants[i];
    if (i > 0) {
      // Enforce rate limit delay between consecutive variant queries
      await sleep(
        provider === 'nominatim'
          ? Constants.NOMINATIM_RATE_LIMIT_MS
          : Constants.PAID_GEOCODE_RATE_LIMIT_MS
      );
    }
    const result = await lookupGeocodeVariant(attempt, provider, apiKey);
    if (!result) continue;
    cache[address] = result;
    await writeGeocodeCache(cache);
    return result;
  }
  return null;
}

/**
 * Geocodes members that do not already have Church or manual coordinates.
 *
 * @param provider - Selected geocoding provider.
 * @param apiKey - Provider key when required.
 * @param onProgress - Optional percent-complete callback.
 */
export async function geocodePendingRecords(
  provider: Types.GeocodeProvider,
  apiKey: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const { records, geocoded } = getTripState();
  const alreadyMapped = new Set(geocoded.map((member) => member.name + '|' + member.address));
  const pending = records.filter((member) => {
    if (member.lat && member.lng) return false;
    return !alreadyMapped.has(member.name + '|' + member.address);
  });

  const nextGeocoded = [...geocoded];
  const nextFailed: Types.FailedGeocode[] = [];

  for (let index = 0; index < pending.length; index += 1) {
    const row = pending[index];
    const addr = row.address;
    if (!addr) {
      nextFailed.push({
        name: row.name || '(Unknown)',
        address: addr,
        reason: 'No address',
        columns: row.columns || {},
      });
      continue;
    }

    logTripStatus(`  ${index + 1}/${pending.length}: ${addr}`);
    const geo = await geocodeAddressMulti(addr, provider, apiKey);
    if (geo) {
      nextGeocoded.push({
        ...row,
        lat: geo.lat,
        lng: geo.lng,
        coordSource: 'geocode',
      });
      logTripStatus(`    [${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}] via "${geo.usedVariant}"`);
    } else {
      const reason = classifyFailure(addr);
      nextFailed.push({
        name: row.name || '(Unknown)',
        address: addr,
        reason,
        columns: row.columns || {},
      });
      logTripStatus(`    Failed (${reason})`);
    }

    await sleep(
      provider === 'nominatim'
        ? Constants.NOMINATIM_RATE_LIMIT_MS
        : Constants.PAID_GEOCODE_RATE_LIMIT_MS
    );
    if (onProgress) onProgress(Math.round(((index + 1) / pending.length) * 100));
  }

  const churchMapped = records
    .map(toMapMember)
    .filter((member): member is Types.TripMapMember => Boolean(member));
  const merged = mergeMappedMembers([...churchMapped, ...nextGeocoded]);

  setTripState({ geocoded: merged, failedGeocodes: nextFailed, clustered: [], optimized: [] });
  updateTripStats();
}

/**
 * Classifies why an address could not be geocoded based on formatting rules.
 *
 * @param address - Address string to inspect.
 * @returns Classification reason string.
 */
export function classifyFailure(address: string): string {
  if (!address || address.trim() === '') return 'Empty';
  const trimmed = address.trim();
  if (!Regex.LEADING_STREET_NUMBER.test(trimmed)) return 'No leading number';
  if (Regex.INCOMPLETE_STREET.test(trimmed)) return 'Incomplete street';
  const hasStateOrRegion =
    Regex.STATE_CODE.test(address) ||
    Regex.REGION_OR_STATE_CODE.test(address) ||
    Regex.COUNTRY_NAME.test(address);
  const hasZip = Regex.ZIP_CODE.test(address) || Regex.POSTAL_CODE_INTL.test(address);
  Regex.ZIP_CODE.lastIndex = 0;
  Regex.POSTAL_CODE_INTL.lastIndex = 0;
  if (!hasStateOrRegion && !hasZip) return 'Missing state';
  if (hasStateOrRegion && !hasZip) return 'Missing zip';
  return 'Not found';
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Reads the address-keyed geocode cache from extension storage. */
async function readGeocodeCache(): Promise<Record<string, Types.GeocodeLookupResult>> {
  try {
    if (!browser?.storage?.local) return {};
    const result = await browser.storage.local.get(Constants.GEOCODE_CACHE_KEY);
    const raw = result[Constants.GEOCODE_CACHE_KEY];
    if (!raw || typeof raw !== 'object') return {};
    return normalizeCache(raw as Record<string, unknown>);
  } catch {
    return {};
  }
}

/** Persists the address-keyed geocode cache. */
async function writeGeocodeCache(cache: Record<string, Types.GeocodeLookupResult>): Promise<void> {
  try {
    if (!browser?.storage?.local) return;
    await browser.storage.local.set({ [Constants.GEOCODE_CACHE_KEY]: cache });
  } catch {
    // Cache persistence is best-effort.
  }
}

/** Accepts both `lng` and legacy `lon` cache payloads. */
function normalizeCache(raw: Record<string, unknown>): Record<string, Types.GeocodeLookupResult> {
  const cache: Record<string, Types.GeocodeLookupResult> = {};
  for (const [address, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') continue;
    const entry = value as { lat?: number; lng?: number; lon?: number; usedVariant?: string };
    const lng = entry.lng ?? entry.lon;
    if (typeof entry.lat !== 'number' || typeof lng !== 'number') continue;
    cache[address] = { lat: entry.lat, lng, usedVariant: entry.usedVariant || 'original' };
  }
  return cache;
}

/** Queries one address variant against the selected geocoder. */
async function lookupGeocodeVariant(
  attempt: string,
  provider: Types.GeocodeProvider,
  apiKey: string
): Promise<Types.GeocodeLookupResult | null> {
  const url = buildGeocodeUrl(attempt, provider, apiKey);
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        logTripStatus(`    [Warning] Authentication failed (${response.status}). Verify API key.`);
      } else if (response.status === 429) {
        logTripStatus('    [Warning] Rate limit exceeded (429). Pausing for 5 seconds...');
        await sleep(Constants.RATE_LIMIT_BACKOFF_MS);
      }
      return null;
    }
    const payload = (await response.json()) as unknown;
    const coords = parseGeocodePayload(payload, provider);
    if (!coords) return null;
    return { ...coords, usedVariant: attempt || 'original' };
  } catch {
    return null;
  }
}

/** Builds a provider-specific geocode URL containing only the address query. */
function buildGeocodeUrl(
  attempt: string,
  provider: Types.GeocodeProvider,
  apiKey: string
): string | null {
  const encoded = encodeURIComponent(attempt);
  if (provider === 'nominatim') {
    return `${Constants.NOMINATIM_SEARCH_URL}?format=json&q=${encoded}&limit=1&email=${encodeURIComponent(Constants.NOMINATIM_EMAIL)}`;
  }
  if (provider === 'locationiq') {
    return `${Constants.LOCATIONIQ_SEARCH_URL}?key=${encodeURIComponent(apiKey)}&q=${encoded}&format=json&limit=1`;
  }
  if (provider === 'mapbox') {
    return `${Constants.MAPBOX_GEOCODE_URL}/${encoded}.json?access_token=${encodeURIComponent(apiKey)}&limit=1`;
  }
  return null;
}

/** Parses Nominatim, LocationIQ, or Mapbox JSON into a coordinate pair. */
function parseGeocodePayload(
  payload: unknown,
  provider: Types.GeocodeProvider
): Types.CoordinatePoint | null {
  if (provider === 'mapbox') {
    const data = payload as Types.MapboxApiResponse;
    const center = data.features?.[0]?.center;
    if (!center || center.length < 2) return null;
    return { lat: center[1], lng: center[0] };
  }
  if (!Array.isArray(payload) || payload.length === 0) return null;
  const hit = payload[0] as Types.NominatimGeocodeHit;
  const lat = parseFloat(hit.lat || '');
  const lng = parseFloat(hit.lon || '');
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

/** Deduplicates mapped members by name and address, preferring later sources. */
function mergeMappedMembers(members: Types.TripMapMember[]): Types.TripMapMember[] {
  const map = new Map<string, Types.TripMapMember>();
  for (const member of members) {
    map.set(`${member.name}|${member.address}`, member);
  }
  return Array.from(map.values());
}
