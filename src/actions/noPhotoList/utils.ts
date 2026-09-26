/**
 * Action-specific utilities for noPhotoList, re-exporting all base utilities.
 */

export * from '@/utils';
import { downloadCsv, generateFilename, toCSV } from '@/utils';
import { Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Formats members without photos into a two-column CSV and initiates browser download.
 *
 * @param members - Array of member records lacking photos.
 */
export function downloadNoPhotoCsv(members: Types.MemberWithoutPhoto[]): void {
  const headers = ['First Name', 'Last Name'];
  const rows = members.map((m) => [m.firstName, m.lastName]);
  const csvContent = toCSV(headers, rows);

  downloadCsv(csvContent, generateFilename('csv', 'no_photos'));
}
