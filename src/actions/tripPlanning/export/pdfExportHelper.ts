import { jsPDF } from 'jspdf';
import {
  confirmDataStewardshipDownload,
  downloadFile,
  generateFilename,
  showToast,
} from '../utils';
import { Constants, Types } from '../types';
import { buildBaseRow, resolveBaseHeaders } from './exportHelper';
import { ClusterMapInput, renderClusterMap } from './staticMapHelper';
import {
  getClusterColors,
  getClusterStartAddresses,
  getTripState,
  logTripStatus,
} from '../ui/stateHelper';
import { promptPdfFields } from '../ui/pdfFieldsModalHelper';

/** Letter page layout in millimeters. */
const PAGE_MARGIN = 12;
const MAP_ASPECT = 500 / 800;
const TABLE_FONT_SIZE = 9;
const LINE_HEIGHT = 4;
const CELL_PADDING = 1.5;
const STOP_COLUMN_WIDTH = 9;

/** One group's page content. */
export interface PdfClusterSection {
  /** Zero-based cluster id. */
  clusterId: number;
  /** Cluster color as a CSS hex string. */
  color: string;
  /** Stops in visit order (route order when optimized, otherwise by name). */
  stops: Types.TripMapMember[];
  /** Starting point coordinates, when the route has one. */
  startPoint?: Types.CoordinatePoint;
  /** Starting address text, when the group has one. */
  startAddress?: string;
  /** Road path as [lat, lng] pairs, when routed with Mapbox. */
  geometry?: [number, number][];
  /** True when stops are in optimized route order. */
  isRouted: boolean;
  /** Route length in miles, when routed. */
  miles?: number;
}

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Exports one section per group: a map of the group's numbered stops and route, then a table of
 * the chosen columns. Each group starts on a new page.
 *
 * @param mapboxToken - Optional Mapbox key so map tiles match the on-screen map.
 */
export async function exportTripPdf(mapboxToken: string = ''): Promise<void> {
  const state = getTripState();
  const sections = buildPdfSections(state, getClusterStartAddresses());
  if (sections.length === 0) {
    showToast('Cluster the addresses before exporting a PDF.', { type: 'warning' });
    return;
  }

  const fields = await promptPdfFields(resolveBaseHeaders(state));
  if (!fields) return;
  if (!(await confirmDataStewardshipDownload())) {
    showToast(Constants.STEWARDSHIP_CANCELLED_TOAST, { type: 'info' });
    return;
  }

  showToast('Building PDF…', { type: 'info' });
  const doc = await buildTripPdf(sections, fields, resolveBaseHeaders(state), (input) =>
    renderClusterMap({ ...input, mapboxToken })
  );

  downloadFile(doc.output('blob'), generateFilename('pdf', 'routes'), 'application/pdf');
  logTripStatus(`PDF exported with ${sections.length} groups.`);
}

/**
 * Lays out the PDF: each group starts a new page with its heading, map, and table.
 *
 * @param sections - Groups to print, in order.
 * @param fields - Chosen table columns (the stop number column is always added first).
 * @param baseHeaders - Every report header, used to look up each member's values.
 * @param renderMap - Map renderer (injectable for tests).
 * @returns The finished jsPDF document.
 */
export async function buildTripPdf(
  sections: PdfClusterSection[],
  fields: string[],
  baseHeaders: string[],
  renderMap: (input: ClusterMapInput) => Promise<string | null> = renderClusterMap
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'letter', compress: true });
  for (let index = 0; index < sections.length; index += 1) {
    if (index > 0) doc.addPage();
    const section = sections[index];
    const map = await renderMap({
      stops: section.stops,
      startPoint: section.startPoint,
      geometry: section.geometry,
      drawRoute: section.isRouted,
      color: section.color,
    });
    drawSection(doc, section, map, fields, baseHeaders);
  }
  addPageNumbers(doc);
  return doc;
}

/**
 * Builds one PDF section per cluster from the current planner state, skipping outliers.
 * Uses optimized route order, start point, and road path when routes exist.
 *
 * @param state - Current planner state.
 * @param startAddresses - Per-cluster starting addresses.
 * @returns Sections in cluster order.
 * @internal
 */
export function buildPdfSections(
  state: Types.TripPlannerState,
  startAddresses: Record<number, string>
): PdfClusterSection[] {
  const colors = getClusterColors();
  const colorFor = (id: number) => colors[((id % colors.length) + colors.length) % colors.length];
  const ids = Array.from(
    new Set(state.clustered.map((m) => m.cluster ?? -1).filter((id) => id !== -1))
  ).sort((a, b) => a - b);

  return ids.map((clusterId) => {
    const route = state.optimized.find((r) => r.cluster === clusterId);
    if (route && route.points.length > 0) {
      return {
        clusterId,
        color: colorFor(clusterId),
        stops: route.points,
        startPoint: route.startPoint,
        startAddress: startAddresses[clusterId],
        geometry: route.geometry,
        isRouted: true,
        miles: route.displayDistance,
      };
    }
    const members = state.clustered
      .filter((m) => m.cluster === clusterId)
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      clusterId,
      color: colorFor(clusterId),
      stops: members,
      startAddress: startAddresses[clusterId],
      isRouted: false,
    };
  });
}

/**
 * Splits the usable table width across the stop column and chosen fields, giving each field room
 * in proportion to its longest value (within limits).
 *
 * @param fields - Chosen column headers.
 * @param rows - Cell text for each row, aligned to fields.
 * @param tableWidth - Total table width in millimeters.
 * @returns Column widths in millimeters, stop column first.
 * @internal
 */
export function computeColumnWidths(
  fields: string[],
  rows: string[][],
  tableWidth: number
): number[] {
  const weights = fields.map((field, col) => {
    const longest = Math.max(field.length, ...rows.map((row) => (row[col] || '').length));
    return Math.min(40, Math.max(8, longest));
  });
  const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;
  const available = tableWidth - STOP_COLUMN_WIDTH;
  return [STOP_COLUMN_WIDTH, ...weights.map((w) => (w / totalWeight) * available)];
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Draws a group's heading, map, and table, continuing the table onto new pages as needed. */
function drawSection(
  doc: jsPDF,
  section: PdfClusterSection,
  mapDataUrl: string | null,
  fields: string[],
  baseHeaders: string[]
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  // Heading
  const [r, g, b] = hexToRgb(section.color);
  doc.setFillColor(r, g, b);
  doc.rect(PAGE_MARGIN, y, 4, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(26, 32, 44);
  doc.text(`Group ${section.clusterId + 1}`, PAGE_MARGIN + 7, y + 5.5);
  y += 11;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(74, 85, 104);
  const facts = [
    `${section.stops.length} ${section.stops.length === 1 ? 'stop' : 'stops'}`,
    typeof section.miles === 'number' ? `${section.miles.toFixed(1)} mi` : null,
    section.startAddress ? `Start: ${section.startAddress}` : 'Starts at stop 1',
    section.isRouted ? null : 'Not yet routed: stops listed by name',
  ].filter(Boolean);
  doc.text(doc.splitTextToSize(facts.join('  ·  '), contentWidth), PAGE_MARGIN, y);
  y += 6;

  // Map
  const mapHeight = contentWidth * MAP_ASPECT;
  if (mapDataUrl) {
    doc.addImage(mapDataUrl, 'JPEG', PAGE_MARGIN, y, contentWidth, mapHeight);
    doc.setDrawColor(203, 213, 224);
    doc.rect(PAGE_MARGIN, y, contentWidth, mapHeight);
    y += mapHeight + 6;
  } else {
    doc.text('Map unavailable.', PAGE_MARGIN, y + 4);
    y += 10;
  }

  // Table
  const rows = section.stops.map((stop) => {
    const values = buildBaseRow(stop, baseHeaders);
    return fields.map((field) => values[field] || '');
  });
  const widths = computeColumnWidths(fields, rows, contentWidth);
  doc.setFontSize(TABLE_FONT_SIZE);
  y = drawHeaderRow(doc, fields, widths, y);
  const pageBottom = doc.internal.pageSize.getHeight() - PAGE_MARGIN - 6;

  rows.forEach((row, index) => {
    const cells = [String(index + 1), ...row].map((text, col) =>
      doc.splitTextToSize(text, widths[col] - CELL_PADDING * 2)
    );
    const height = Math.max(...cells.map((lines) => lines.length)) * LINE_HEIGHT + CELL_PADDING * 2;
    if (y + height > pageBottom) {
      doc.addPage();
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(113, 128, 150);
      doc.text(`Group ${section.clusterId + 1} (continued)`, PAGE_MARGIN, PAGE_MARGIN + 3);
      doc.setFontSize(TABLE_FONT_SIZE);
      y = drawHeaderRow(doc, fields, widths, PAGE_MARGIN + 7);
    }

    if (index % 2 === 1) {
      doc.setFillColor(247, 250, 252);
      doc.rect(PAGE_MARGIN, y, contentWidth, height, 'F');
    }
    let x = PAGE_MARGIN;
    cells.forEach((lines, col) => {
      doc.setFont('helvetica', col === 0 ? 'bold' : 'normal');
      doc.setTextColor(45, 55, 72);
      doc.text(lines, x + CELL_PADDING, y + CELL_PADDING + 3);
      x += widths[col];
    });
    doc.setDrawColor(226, 232, 240);
    doc.line(PAGE_MARGIN, y + height, PAGE_MARGIN + contentWidth, y + height);
    y += height;
  });
}

/** Draws the shaded table header row and returns the y position below it. */
function drawHeaderRow(doc: jsPDF, fields: string[], widths: number[], top: number): number {
  const total = widths.reduce((sum, w) => sum + w, 0);
  const height = LINE_HEIGHT + CELL_PADDING * 2 + 1;
  doc.setFillColor(237, 242, 247);
  doc.rect(PAGE_MARGIN, top, total, height, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 32, 44);
  let x = PAGE_MARGIN;
  ['#', ...fields].forEach((field, col) => {
    const label = doc.splitTextToSize(field, widths[col] - CELL_PADDING * 2)[0] ?? '';
    doc.text(label, x + CELL_PADDING, top + CELL_PADDING + 3.5);
    x += widths[col];
  });
  return top + height;
}

/** Adds "Page N of M" and a confidentiality reminder to every page footer. */
function addPageNumbers(doc: jsPDF): void {
  const pages = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const bottom = doc.internal.pageSize.getHeight() - PAGE_MARGIN + 4;
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(160, 174, 192);
    doc.text('Confidential: contains member information', PAGE_MARGIN, bottom);
    doc.text(`Page ${page} of ${pages}`, width - PAGE_MARGIN, bottom, { align: 'right' });
  }
}

/** Converts a #rrggbb color to an [r, g, b] tuple (falls back to gray). */
function hexToRgb(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return [113, 128, 150];
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}
