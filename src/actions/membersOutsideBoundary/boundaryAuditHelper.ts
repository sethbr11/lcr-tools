import {
  confirmDataStewardshipDownload,
  createStandardModal,
  downloadCsv,
  isPointInsidePolygon,
  resolveCurrentUnitNumber,
  toCSV,
} from './utils';
import { Constants, Dom, Regex, Types } from './types';
import { Templates } from './templates';
import type { MultiPolygon, Polygon } from 'geojson';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Attempts to retrieve and audit household records from Church APIs or directory DOM.
 *
 * @returns Promise resolving to array of audited household records.
 */
export async function extractDirectoryHouseholds(): Promise<Types.AuditedHousehold[]> {
  // 1. Resolve unit number from URL pathname, query, DOM, or Next.js state
  const unitNumber = resolveCurrentUnitNumber();

  // 2. Fetch live boundary and household data from Church Directory APIs
  if (unitNumber) {
    try {
      const [boundaryRes, householdsRes] = await Promise.all([
        fetch(`/api/maps-proxy/v2/locations/${unitNumber}/boundary`),
        fetch(`/api/v4/households?unit=${unitNumber}`),
      ]);

      if (boundaryRes.ok && householdsRes.ok) {
        const boundaryGeometry = (await boundaryRes.json()) as Polygon | MultiPolygon;
        const rawHouseholds = (await householdsRes.json()) as Array<Record<string, unknown>>;

        const list: Types.AuditedHousehold[] = [];
        for (const h of rawHouseholds) {
          const coords = (h.coordinates as Record<string, number> | undefined) || {};
          const lat = coords.latitude || (h.latitude as number | undefined) || 0;
          const lng = coords.longitude || (h.longitude as number | undefined) || 0;
          const name = String(h.name || h.displayName || 'Unknown Household');
          const rawAddress = typeof h.address === 'string' ? h.address : '';
          const address = rawAddress.replace(Regex.NEWLINE_GLOBAL, ', ');

          let isInside = false;
          let status: Types.BoundaryStatus = 'unmapped';
          if (lat && lng && boundaryGeometry) {
            isInside = isPointInsidePolygon({ lat, lng }, boundaryGeometry);
            status = isInside ? 'inside' : 'outside';
          }

          list.push({
            name,
            address,
            coordinates: { lat, lng },
            isInside,
            status,
          });
        }

        if (list.length > 0) {
          return list;
        }
      }
    } catch {
      // Network or parse failure: reported to the user as "could not load" by the caller
    }
  }

  // No fallback: guessing "inside" for households we couldn't locate would make the audit lie
  return [];
}

/**
 * Builds and renders the interactive modal showing boundary audit results.
 *
 * @param summary - Complete audit results summary containing counts and household records.
 */
export function displayAuditResults(summary: Types.AuditSummary): void {
  const rowsHtml = summary.households.map(Templates.householdItem).join('');
  const modalBody = Templates.resultsModal(
    summary.insideCount,
    summary.outsideCount,
    summary.unmappedCount,
    summary.totalCount,
    rowsHtml
  );

  createStandardModal({
    id: Dom.MODAL_ID,
    title: 'Ward Boundary Audit',
    content: modalBody,
    width: '640px',
    buttons: [
      {
        text: 'Close',
        type: 'secondary',
      },
    ],
  });

  // Attach radio filter behavior
  const radios = document.querySelectorAll<HTMLInputElement>('input[name="boundary-filter"]');
  radios.forEach((radio) => {
    radio.addEventListener('change', () => {
      filterVisibleRows(radio.value);
    });
  });

  // Attach CSV download button
  document.getElementById(Dom.DOWNLOAD_CSV_BTN_ID)?.addEventListener('click', () => {
    const selectedFilter =
      document.querySelector<HTMLInputElement>('input[name="boundary-filter"]:checked')?.value ||
      'all';
    const filteredHouseholds =
      selectedFilter === 'all'
        ? summary.households
        : summary.households.filter((h) => {
            if (selectedFilter === 'inside') return h.status === 'inside';
            if (selectedFilter === 'outside') return h.status === 'outside';
            if (selectedFilter === 'unmapped') return h.status === 'unmapped';
            return true;
          });
    void exportAuditCsv(filteredHouseholds, selectedFilter);
  });
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Toggles visibility of household rows based on selected radio filter. */
function filterVisibleRows(filter: string): void {
  const rows = document.querySelectorAll<HTMLElement>(`.${Dom.HOUSEHOLD_ROW_CLASS}`);
  let visibleCount = 0;
  rows.forEach((row) => {
    const status =
      row.getAttribute('data-status') ||
      (row.getAttribute('data-inside') === 'true' ? 'inside' : 'outside');
    let isVisible = false;
    if (filter === 'all') {
      isVisible = true;
    } else if (filter === status) {
      isVisible = true;
    }
    row.style.display = isVisible ? '' : 'none';
    if (isVisible) visibleCount++;
  });

  const emptyEl = document.getElementById(Dom.EMPTY_STATE_ID);
  if (emptyEl) {
    emptyEl.style.display = visibleCount === 0 ? '' : 'none';
    const filterNameSpan = document.getElementById(Dom.EMPTY_FILTER_NAME_ID);
    if (filterNameSpan) filterNameSpan.textContent = filter;
  }
}

/** Prompts Handbook 33.8 stewardship confirmation, then exports audited households as CSV. */
async function exportAuditCsv(
  households: Types.AuditedHousehold[],
  filter: string = 'all'
): Promise<void> {
  if (!(await confirmDataStewardshipDownload())) return;

  const rows: string[][] = [];

  for (const h of households) {
    const statusLabel =
      h.status === 'inside' ? 'Inside' : h.status === 'unmapped' ? 'Unmapped' : 'Outside';
    rows.push([
      h.name,
      statusLabel,
      h.address,
      String(h.coordinates.lat || ''),
      String(h.coordinates.lng || ''),
    ]);
  }

  const csv = toCSV([...Constants.AUDIT_CSV_HEADERS], rows);

  const suffix = filter === 'all' ? '' : `_${filter}`;
  downloadCsv(csv, `${Constants.AUDIT_CSV_FILENAME_STEM}${suffix}.csv`);
}
