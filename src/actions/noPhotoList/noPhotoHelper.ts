import { Types } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Maps a shared photo-scan result into CSV rows for members who lack portraits.
 *
 * @param scan - Classified photo availability for the active directory.
 * @returns First and last names of members without photos.
 */
export function membersWithoutPhotoFromScan(
  scan: Types.MemberPhotoScanResult
): Types.MemberWithoutPhoto[] {
  return scan.withoutPhotos.map((member) => ({
    firstName: member.firstName,
    lastName: member.lastName,
  }));
}
