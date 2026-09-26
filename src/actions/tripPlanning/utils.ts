/**
 * Action-specific utilities for tripPlanning, re-exporting all base utilities.
 */

export * from '@/utils';
import { getCellValue, getRelevantHeaderCells } from '@/utils';
import { Regex, Types } from './types';
import { formatCleanAddress } from './geocoding/addressHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Parses and extracts members equipped with residential addresses from an LCR table element.
 *
 * @param table - Target HTML table element.
 * @returns Object with parsed members and headers, or null if name or address columns are missing.
 */
export function extractMembersForTripPlanning(
  table: HTMLTableElement
): Types.TripTableExtraction | null {
  const { headers, indices } = getRelevantHeaderCells(table);
  const nameIndex = headers.findIndex((header) => Regex.NAME_HEADER.test(header));
  const addressIndex = headers.findIndex((header) => Regex.ADDRESS_HEADER.test(header));
  if (nameIndex === -1 || addressIndex === -1) return null;

  const members: Types.TripPlanningMember[] = [];
  const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr')).filter(
    (row) => row.offsetParent !== null
  );

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('td'));
    const visibleColumns = indices.map((colIndex, headerIndex) => {
      const cell = cells[colIndex];
      const value = cell ? getCellValue(cell as HTMLElement) : '';
      return { header: headers[headerIndex], value };
    });

    const name = visibleColumns[nameIndex]?.value;
    const rawAddress = visibleColumns[addressIndex]?.value;
    if (!name || !rawAddress) continue;
    const address = formatCleanAddress(rawAddress);
    const columns = Object.fromEntries(
      visibleColumns.map(({ header, value }) => [
        header,
        Regex.ADDRESS_HEADER.test(header) ? formatCleanAddress(value) : value,
      ])
    );
    members.push({
      name,
      address,
      columns,
    });
  }

  return { members, headers };
}
