// prettier-ignore
import { confirmDataStewardshipDownload, downloadNoPhotoCsv, ensureLcrIndividualsTab,
  hideLoadingIndicator, isAborted, isChurchDirectoryPage, isLcrMemberDirectoryPage,
  resetAborted, replaceTemplate, scanDirectoryMemberPhotos, scanLcrMemberPhotos,
  showLoadingIndicator, showToast, waitForLcrDirectoryRows } from './utils';
import { membersWithoutPhotoFromScan } from './noPhotoHelper';
import { Constants, Types } from './types';

/**
 * Main entrypoint orchestrating the Download Members with No Photos action.
 * Steps:
 *   1. Confirm the page is an LCR or Church Directory member list.
 *   2. Switch the LCR directory to Individuals when Households is active.
 *   3. Scan members with the shared photo cache (Directory API or LCR rows).
 *   4. Prompt Handbook 33.8 stewardship and download CSV when anyone is missing a photo.
 *
 * @returns Promise resolving to action result.
 */
export async function runNoPhotoList(): Promise<Types.ActionResult<Types.NoPhotoListResult>> {
  resetAborted();

  // Step 1: Confirm we are on a supported directory page
  const onChurchDirectory = isChurchDirectoryPage();
  const onLcrDirectory = isLcrMemberDirectoryPage();
  if (!onChurchDirectory && !onLcrDirectory) {
    showToast(Constants.NOT_ON_DIRECTORY, { type: 'warning' });
    return { success: false, error: 'Not on directory page' };
  }

  // Step 2: Switch LCR Households view to Individuals before scanning
  if (!onChurchDirectory) {
    if (!(await ensureLcrIndividualsTab(Constants.ACTION_NAME))) {
      if (isAborted()) {
        showToast('Report generation cancelled.', { type: 'info' });
        return { success: false, error: 'Aborted' };
      }
      return { success: false, error: 'LCR setup mismatch' };
    }
  }

  // Step 3: Scan members using the shared photo cache
  let scan: Types.MemberPhotoScanResult;
  try {
    showLoadingIndicator('Scanning for missing photos...', 'Press ESC to abort');
    scan = onChurchDirectory
      ? await scanDirectoryMemberPhotos()
      : await scanLcrMemberPhotos(await waitForLcrDirectoryRows());
  } finally {
    hideLoadingIndicator();
  }

  if (isAborted()) {
    showToast('Report generation cancelled.', { type: 'info' });
    return { success: false, error: 'Aborted' };
  }

  if (scan.withPhotos.length === 0 && scan.withoutPhotos.length === 0) {
    showToast(Constants.NO_MEMBERS_FOUND, { type: 'warning' });
    return { success: false, error: 'No members found' };
  }

  const missing = membersWithoutPhotoFromScan(scan);
  if (missing.length === 0) {
    showToast(Constants.ALL_HAVE_PHOTOS, { type: 'success' });
    return { success: true, data: { missingCount: 0 } };
  }

  // Step 4: Stewardship confirmation, then CSV download
  const confirmed = await confirmDataStewardshipDownload();
  if (!confirmed) {
    showToast(Constants.STEWARDSHIP_CANCELLED_TOAST, { type: 'info' });
    return { success: false, error: 'Cancelled by user' };
  }

  downloadNoPhotoCsv(missing);
  showToast(replaceTemplate(Constants.FOUND_MISSING_PHOTOS, { count: missing.length }), {
    type: 'success',
  });
  return { success: true, data: { missingCount: missing.length } };
}
