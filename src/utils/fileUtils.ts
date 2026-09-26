import JSZip from 'jszip';
import { Regex, Types } from '@/types';
import { formatCSVCell } from './coreUtils';
import { showToast } from './ui/uiUtils';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Triggers a browser download of text or blob data using an anchor element.
 *
 * @param content - Text string or binary Blob data to download.
 * @param filename - Intended name of the downloaded file.
 * @param contentType - MIME type of the file payload.
 * @param showNotification - Whether to present a success toast alert.
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  contentType: string = 'text/plain',
  showNotification: boolean = true
): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: contentType });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Defer object URL revocation to allow browser download managers time to stream blob
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 15000);

  if (showNotification) showToast(`Downloaded: ${filename}`, { type: 'success', duration: 3000 });
}

/**
 * Downloads formatted CSV text as a file.
 *
 * @param csvContent - Valid comma-separated CSV text.
 * @param filename - Intended output filename.
 * @param showNotification - Whether to present a success toast alert.
 */
export function downloadCsv(
  csvContent: string,
  filename: string,
  showNotification: boolean = true
): void {
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;', showNotification);
}

/**
 * Compresses an array of CSV documents into a single ZIP archive and initiates download.
 *
 * @param files - Array of objects with filename and csvContent properties.
 * @param zipName - Output filename for the created archive.
 * @param showNotification - Whether to present a success toast alert.
 */
export async function downloadCsvZip(
  files: Types.GeneratedCsvFile[],
  zipName: string = 'lcr_reports.zip',
  showNotification: boolean = true
): Promise<void> {
  if (!Array.isArray(files) || files.length === 0) {
    showToast('No files to zip.', { type: 'warning' });
    return;
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const file of files) {
    const uniqueName = resolveUniqueFilename(file.filename || 'report.csv', usedNames);
    usedNames.add(uniqueName);
    zip.file(uniqueName, file.csvContent);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadFile(blob, zipName, 'application/zip', showNotification);
}

/**
 * Produces a standardized, descriptive filename incorporating current page title or context.
 *
 * @param extension - File extension without leading dot (e.g. 'csv' or 'zip').
 * @param suffix - Optional custom suffix appended before the extension.
 * @returns Clean, formatted filename.
 */
export function generateFilename(extension: string = 'csv', suffix?: string): string {
  let baseName = document.title || 'lcr_export';
  baseName = baseName
    .replace(Regex.CHURCH_LCR_TITLE, '')
    .replace(Regex.LCR_ACRONYM, '')
    .replace(Regex.CHURCH_FULL_NAME, '')
    .replace(Regex.FILENAME_SANITIZE, '')
    .trim()
    .replace(Regex.MULTIPLE_SPACES, '_')
    .toLowerCase();

  if (!baseName) baseName = 'lcr_report';

  const dateTag = new Date().toISOString().slice(0, 10);
  const suffixPart = suffix ? `_${suffix}` : '';

  return `${baseName}${suffixPart}_${dateTag}.${extension}`;
}

/**
 * Re-export CSV cell formatting function from coreUtils for backwards compatibility.
 *
 * @param value - Cell value to escape.
 * @returns Escaped CSV cell string.
 */
export function formatCsvCell(value: unknown): string {
  return formatCSVCell(value);
}

/**
 * Converts a Blob object into a base64 Data URL string.
 *
 * @param blob - Binary blob instance.
 * @returns Promise resolving to base64 Data URL.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Appends numerical suffixes if candidate filename is already present in set. */
function resolveUniqueFilename(name: string, used: Set<string>): string {
  if (!used.has(name)) return name;
  const dotIndex = name.lastIndexOf('.');
  const base = dotIndex !== -1 ? name.slice(0, dotIndex) : name;
  const ext = dotIndex !== -1 ? name.slice(dotIndex) : '';

  let counter = 2;
  while (used.has(`${base}_${counter}${ext}`)) {
    counter++;
  }
  return `${base}_${counter}${ext}`;
}
