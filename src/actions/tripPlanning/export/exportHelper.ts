import { confirmDataStewardshipDownload, downloadCsv, showToast, toCSV } from '../utils';
import { Constants, Types } from '../types';
import { formatCleanAddress } from '../geocoding/addressHelper';
import { getTripState, logTripStatus } from '../ui/stateHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Builds and downloads the trip report CSV after a Handbook 33.8 stewardship confirmation.
 *
 * @returns True when the dialog was handled, even if the user cancelled.
 */
export async function exportTripCsv(): Promise<boolean> {
  const confirmed = await confirmDataStewardshipDownload();
  if (!confirmed) {
    showToast(Constants.STEWARDSHIP_CANCELLED_TOAST, { type: 'info' });
    return true;
  }

  const csv = buildTripCsv();
  downloadCsv(csv, Constants.CSV_FILENAME);
  logTripStatus('CSV downloaded successfully');
  return true;
}

/**
 * Builds the complete trip report CSV string from current planner state.
 *
 * @returns Formatted CSV file text content.
 */
export function buildTripCsv(): string {
  const state = getTripState();
  const baseHeaders = resolveBaseHeaders(state);
  const fields = [...baseHeaders, ...Constants.CSV_CUSTOM_FIELDS];
  const successRows = buildSuccessRows(state, baseHeaders);
  const failureRows = state.failedGeocodes.map((failure) => {
    const baseRow = buildBaseRow(
      { name: failure.name, address: failure.address, columns: failure.columns },
      baseHeaders
    );
    return [
      ...baseHeaders.map((header) => baseRow[header] || ''),
      '',
      '',
      'Failed',
      '',
      failure.reason,
    ];
  });

  const rows = successRows.concat(failureRows);
  if (rows.length === 0) {
    rows.push([...baseHeaders.map(() => ''), '', '', '', '', '']);
  }
  return toCSV(fields, rows);
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Resolves original LCR headers, falling back to Name/Address. */
function resolveBaseHeaders(state: Types.TripPlannerState): string[] {
  if (state.originalHeaders.length > 0) return [...state.originalHeaders];
  const sources: Array<Array<{ columns?: Record<string, string> }>> = [
    state.records,
    state.geocoded,
    state.clustered,
    state.optimized.flatMap((route) => route.points),
  ];
  for (const source of sources) {
    const first = source.find((row) => row.columns);
    if (first?.columns) return Object.keys(first.columns);
  }
  return [...Constants.CSV_FALLBACK_HEADERS];
}

/** Builds CSV value rows from the richest available planner dataset. */
function buildSuccessRows(state: Types.TripPlannerState, baseHeaders: string[]): string[][] {
  if (state.optimized.length > 0) {
    logTripStatus('Preparing optimized data for export...');
    const rows: string[][] = [];
    const routedKeys = new Set<string>();
    for (const route of state.optimized) {
      route.points.forEach((point, index) => {
        routedKeys.add(`${point.name}|${point.address}`);
        rows.push(
          rowFromMember(point, baseHeaders, String((route.cluster ?? 0) + 1), String(index + 1), '')
        );
      });
    }
    // Include any outlier members not part of regular routes
    const outliers = state.clustered.filter(
      (m) => m.cluster === -1 && !routedKeys.has(`${m.name}|${m.address}`)
    );
    for (const outlier of outliers) {
      rows.push(rowFromMember(outlier, baseHeaders, 'Outlier', '', ''));
    }
    return rows;
  }

  if (state.clustered.length > 0) {
    logTripStatus('Preparing clustered data for export...');
    return [...state.clustered]
      .sort((left, right) => {
        if ((left.cluster || 0) !== (right.cluster || 0)) {
          return (left.cluster || 0) - (right.cluster || 0);
        }
        return (left.name || '').localeCompare(right.name || '');
      })
      .map((member) =>
        rowFromMember(
          member,
          baseHeaders,
          member.cluster === -1 ? 'Outlier' : String((member.cluster || 0) + 1),
          '',
          ''
        )
      );
  }

  if (state.geocoded.length > 0) {
    logTripStatus('Preparing geocoded data for export...');
    return state.geocoded.map((member) => rowFromMember(member, baseHeaders, 'N/A', '', ''));
  }

  return [];
}

/** Maps a member into a CSV row aligned to original headers plus custom fields. */
function rowFromMember(
  member: Types.TripPlanningMember,
  baseHeaders: string[],
  cluster: string,
  routeOrder: string,
  failureReason: string
): string[] {
  const baseRow = buildBaseRow(member, baseHeaders);
  return [
    ...baseHeaders.map((header) => baseRow[header] || ''),
    typeof member.lat === 'number' ? String(member.lat) : '',
    typeof member.lng === 'number' ? String(member.lng) : '',
    cluster,
    routeOrder,
    failureReason,
  ];
}

/** Copies original LCR column values onto a dictionary keyed by header. */
function buildBaseRow(
  record: Types.TripPlanningMember,
  baseHeaders: string[]
): Record<string, string> {
  const row: Record<string, string> = {};
  const columns = record.columns || {};
  for (const header of baseHeaders) {
    if (Object.prototype.hasOwnProperty.call(columns, header)) {
      const val = columns[header];
      const lower = header.toLowerCase();
      row[header] = lower.includes('address') ? formatCleanAddress(val) : val;
      continue;
    }
    const lower = header.toLowerCase();
    if (lower.includes('name') && record.name) row[header] = record.name;
    else if (lower.includes('address') && record.address) {
      row[header] = formatCleanAddress(record.address);
    } else {
      row[header] = '';
    }
  }
  return row;
}
