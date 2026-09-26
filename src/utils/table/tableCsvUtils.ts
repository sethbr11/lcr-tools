import { Regex, Types } from '@/types';
import { formatCSVCell } from '../coreUtils';
import { generateFilename } from '../fileUtils';
import { cleanCellContent, getCellValue, getRelevantHeaderCells, isVisible } from './tableUtils';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Converts a detected table element into formatted CSV text with an appropriate filename.
 *
 * @param tableInfo - Metadata descriptor for the table to process.
 * @param customFilename - Optional filename override.
 * @returns Result object with csvContent and filename, or null if table is unprocessable.
 */
export function tableToCSV(
  tableInfo: Types.TableInfo,
  customFilename: string = ''
): Types.TableCsvResult | null {
  const { table, type, name } = tableInfo;
  let csvContent = '';

  switch (type) {
    case 'finance-table':
      csvContent = processFinanceTable(table);
      break;
    case 'labeled-table':
      csvContent = processLabeledTable(table as HTMLTableElement);
      break;
    case 'summary':
      csvContent = processSummaryTable(table as HTMLTableElement);
      break;
    default:
      csvContent = processStandardTable(table as HTMLTableElement);
      break;
  }

  if (!csvContent) return null;

  const filename =
    customFilename || generateFilename('csv', name.replace(Regex.MULTIPLE_SPACES, '_'));
  return { csvContent, filename };
}

/** Alias for tableToCSV to support alternate naming. */
export const processTable = tableToCSV;

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Converts standard HTML table rows into formatted CSV string. */
function processStandardTable(table: HTMLTableElement): string {
  const { headers, indices } = getRelevantHeaderCells(table);
  const rows: string[][] = [];

  const trs = Array.from(table.querySelectorAll('tbody tr, tr:not(thead tr)')).filter((r) =>
    isVisible(r)
  );
  for (const tr of trs) {
    if (tr.querySelectorAll('td').length === 0) continue;

    const tds = Array.from(tr.querySelectorAll('td'));
    if (indices.length > 0) {
      const rowData = indices.map((idx) => (tds[idx] ? getCellValue(tds[idx] as HTMLElement) : ''));
      if (rowData.some((cell) => cell.length > 0)) {
        rows.push(rowData);
      }
    } else {
      const rowData = tds.map((td) => getCellValue(td as HTMLElement));
      if (rowData.some((cell) => cell.length > 0)) {
        rows.push(rowData);
      }
    }
  }

  const headerLine = headers.map(formatCSVCell).join(',');
  const rowLines = rows.map((r) => r.map(formatCSVCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

/** Parses two-column summary category and count tables into CSV format. */
function processSummaryTable(table: HTMLTableElement): string {
  const firstTh = table.querySelector('thead th:first-child, tr:first-child th:first-child');
  const h4 = firstTh?.querySelector('h4');
  const catHeader = h4 ? cleanCellContent(h4 as HTMLElement) : 'Category';
  const rows: string[][] = [[catHeader || 'Category', 'Count']];

  const totalCountSpan = table.querySelector(
    'thead tr th:nth-child(2) span, tr:first-child th:nth-child(2) span'
  );
  const totalCount = totalCountSpan ? cleanCellContent(totalCountSpan as HTMLElement) : '';

  const trs = Array.from(table.querySelectorAll('tbody tr, tr:not(thead tr)')).filter((r) =>
    isVisible(r)
  );
  for (const tr of trs) {
    const tds = Array.from(tr.querySelectorAll('td'));
    if (tds.length >= 2) {
      const category = getCellValue(tds[0] as HTMLElement);
      const count = getCellValue(tds[1] as HTMLElement);
      if (category || count) {
        rows.push([category, count]);
      }
    }
  }

  if (totalCount) {
    rows.push(['Total', totalCount]);
  }

  return rows.map((r) => r.map(formatCSVCell).join(',')).join('\r\n');
}

/** Parses two-column key/value labeled tables into CSV format. */
function processLabeledTable(table: HTMLTableElement): string {
  const rows: string[][] = [];
  const trs = Array.from(table.querySelectorAll('tbody tr')).filter((r) => isVisible(r));

  for (const tr of trs) {
    const cells = Array.from(tr.querySelectorAll('td')).map((td) =>
      getCellValue(td as HTMLElement)
    );
    rows.push(cells);
  }

  return rows.map((r) => r.map(formatCSVCell).join(',')).join('\r\n');
}

/** Formats specialized Church finance tables into category CSV columns. */
function processFinanceTable(financeTable: HTMLElement): string {
  const rows: string[][] = [['Category', 'Budget', 'Balance', '% Spent']];
  const dataRows = financeTable.querySelectorAll('[data-qa="row"]');

  for (const row of Array.from(dataRows)) {
    const cells = row.querySelectorAll('[data-qa="cell"]');
    if (cells.length >= 4) {
      const cat = cleanCellContent(cells[1] as HTMLElement);
      const budget = cleanCellContent(cells[2] as HTMLElement);
      const balance = cleanCellContent(cells[3] as HTMLElement);
      const spent = cells[4] ? cleanCellContent(cells[4] as HTMLElement) : '';
      rows.push([cat, budget, balance, spent]);
    }
  }

  return rows.map((r) => r.map(formatCSVCell).join(',')).join('\r\n');
}
