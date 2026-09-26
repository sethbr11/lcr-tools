import Papa from 'papaparse';
// prettier-ignore
import { callingAssignmentKey, confirmDataStewardshipDownload, downloadCsv, generateFilename,
  getPageTables, showToast, tableToCSV } from './utils';
import { Constants, Regex, Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Scans calling tables, drops ignored assignments, collapses equivalent-calling groups,
 * and returns members with leftover extras.
 *
 * @param groups - Equivalent-calling groups used to collapse matching assignments.
 * @param ignored - Callings excluded from the multiple-callings count while enabled.
 * @returns Members still holding multiple callings plus the page calling catalog.
 */
export function analyzeMembersWithMultipleCallings(
  groups: Types.CallingGroup[],
  ignored: Types.IgnoredCalling[] = []
): Types.CallingAnalysisResult {
  const memberMap = new Map<string, Types.CallingAssignment[]>();
  const catalogMap = new Map<string, Types.CallingAssignment>();

  collectAssignmentsFromTables(memberMap, catalogMap);

  const holders: Types.MemberCallingsRecord[] = [];
  for (const [name, callings] of memberMap.entries()) {
    const remaining = excludeIgnoredCallings(callings, ignored);
    const displayCallings = collapseGroupedCallings(remaining, groups);
    if (displayCallings.length > 1) holders.push({ name, callings: displayCallings });
  }

  const catalog = [...catalogMap.values()].sort((a, b) => {
    const callingCompare = a.calling.localeCompare(b.calling);
    if (callingCompare !== 0) return callingCompare;
    return a.organization.localeCompare(b.organization);
  });

  return {
    holders: holders.sort((a, b) => a.name.localeCompare(b.name)),
    catalog,
  };
}

/**
 * Prompts Handbook 33.8 stewardship confirmation, then downloads the multiple-callings CSV.
 *
 * @param holders - List of members holding multiple callings after grouping.
 * @returns Promise resolving to true so the report modal stays open.
 */
export async function exportMultipleCallingsCsv(
  holders: Types.MemberCallingsRecord[]
): Promise<boolean> {
  const confirmed = await confirmDataStewardshipDownload();
  if (!confirmed) {
    showToast(Constants.STEWARDSHIP_CANCELLED_TOAST, { type: 'info' });
    return true;
  }

  const rows: string[][] = [
    [Constants.CSV_HEADER_MEMBER, Constants.CSV_HEADER_CALLING, Constants.CSV_HEADER_ORGANIZATION],
  ];
  for (const holder of holders) {
    for (const calling of holder.callings) {
      rows.push([holder.name, calling.label, calling.organization]);
    }
  }

  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          let val = cell;
          if (Regex.FORMULA_PREFIX.test(val)) val = `'${val}`;
          return `"${val.replace(Regex.CSV_DOUBLE_QUOTE, '""')}"`;
        })
        .join(',')
    )
    .join('\r\n');

  downloadCsv(csvContent, generateFilename('csv', Constants.CSV_FILENAME_STEM));
  return true;
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Reads visible calling tables into a member map and unique catalog. */
function collectAssignmentsFromTables(
  memberMap: Map<string, Types.CallingAssignment[]>,
  catalogMap: Map<string, Types.CallingAssignment>
): void {
  for (const tableInfo of getPageTables()) {
    const result = tableToCSV(tableInfo);
    if (!result || !result.csvContent) continue;

    const parsed = Papa.parse<string[]>(result.csvContent, { header: false });
    const rows = parsed.data;
    if (rows.length < 2) continue;

    const headers = rows[0].map((h) => h.toLowerCase());
    const memberNameCol = findColumnIndex(headers, Constants.MEMBER_COLUMN_CANDIDATES);
    const callingCol = findColumnIndex(headers, Constants.CALLING_COLUMN_CANDIDATES);
    const orgCol = findColumnIndex(headers, Constants.ORG_COLUMN_CANDIDATES);
    if (memberNameCol === -1 || callingCol === -1) continue;

    for (let i = 1; i < rows.length; i++) {
      // prettier-ignore
      const assignment = parseAssignmentRow(rows[i], memberNameCol, callingCol, orgCol, tableInfo.name);
      if (!assignment) continue;

      const existing = memberMap.get(assignment.memberName) || [];
      existing.push({ calling: assignment.calling, organization: assignment.organization });
      memberMap.set(assignment.memberName, existing);

      const key = callingAssignmentKey(assignment);
      if (!catalogMap.has(key)) {
        catalogMap.set(key, { calling: assignment.calling, organization: assignment.organization });
      }
    }
  }
}

/** Extracts a valid calling assignment from one CSV row, or null when the row should be skipped. */
function parseAssignmentRow(
  row: string[],
  memberNameCol: number,
  callingCol: number,
  orgCol: number,
  fallbackOrg: string
): Types.ParsedAssignmentRow | null {
  const memberName = (row[memberNameCol] || '').trim();
  const calling = (row[callingCol] || '').replace(Regex.CUSTOM_CALLING_LABEL, '').trim();
  const organization = orgCol !== -1 && row[orgCol] ? (row[orgCol] || '').trim() : fallbackOrg;

  if (!memberName || !calling) return null;
  if (Regex.MEMBER_NAME_BLACKLIST.test(memberName)) return null;
  if (Regex.CALLING_EMPTY_PLACEHOLDER.test(calling)) return null;

  return { memberName, calling, organization };
}

/** Drops enabled ignored callings before grouping and leftover counting. */
function excludeIgnoredCallings(
  callings: Types.CallingAssignment[],
  ignored: Types.IgnoredCalling[]
): Types.CallingAssignment[] {
  const ignoredKeys = new Set(
    ignored.filter((item) => item.enabled).map((item) => callingAssignmentKey(item))
  );
  return callings.filter((calling) => !ignoredKeys.has(callingAssignmentKey(calling)));
}

/**
 * Collapses equivalent callings into named group badges when two or more group members are present.
 *
 * @param callings - Raw calling assignments held by one member.
 * @param groups - Equivalent-calling groups to apply in listed order.
 * @returns Display badges after grouping leftover unmatched callings.
 */
function collapseGroupedCallings(
  callings: Types.CallingAssignment[],
  groups: Types.CallingGroup[]
): Types.DisplayCalling[] {
  const keys = callings.map(callingAssignmentKey);
  const used = new Set<number>();
  const display: Types.DisplayCalling[] = [];

  for (const group of groups) {
    const matchedIndexes: number[] = [];
    for (const member of group.members) {
      const memberKey = callingAssignmentKey(member);
      const matchIndex = keys.findIndex((key, index) => !used.has(index) && key === memberKey);
      if (matchIndex !== -1) matchedIndexes.push(matchIndex);
    }
    if (matchedIndexes.length < 2) continue;
    display.push({ label: group.name, organization: '', isGroup: true });
    for (const index of matchedIndexes) used.add(index);
  }

  callings.forEach((calling, index) => {
    if (used.has(index)) return;
    display.push({ label: calling.calling, organization: calling.organization, isGroup: false });
  });

  return display;
}

/** Resolves column index matching one of several candidate name strings. */
function findColumnIndex(headers: string[], candidates: readonly string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].trim().toLowerCase();
    for (const candidate of candidates) {
      if (header.includes(candidate)) return i;
    }
  }
  return -1;
}
