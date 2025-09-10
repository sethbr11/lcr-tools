/**
 * ACTION: PROCESS ATTENDANCE FROM CSV
 *
 * What startAttendanceProcessing() does:
 * - Opens a simple setup window where you pick the Sunday date and upload a CSV.
 * - You can download a sample CSV, then upload your real CSV. The file is validated:
 *   - Checks required columns (Date, First Name, Last Name)
 *   - Verifies all rows are the same date
 *   - Cleans names and skips duplicates (with a note)
 * - Shows how many names were read and enables “Process Attendance on LCR”.
 *
 * When you click “Process Attendance on LCR”:
 * - The tool finds the selected date column that’s currently visible in LCR.
 * - It scans through member pages, matching names and marking them present (when needed).
 * - It keeps a running log and builds a summary report for download.
 * - If any names can’t be matched, it shows a follow‑up screen where you can:
 *   - Search and select the correct ward member (marks them present), or
 *   - Count them as visitors (Men, Women, Young Men, Young Women, Children).
 *   - Optionally skip and later restore individual rows.
 * - It can also add your visitor counts to the Visitors tab and save them.
 *
 * Helpful behavior:
 * - Press ESC to abort the process at any time.
 * - Clear status messages and errors are displayed throughout.
 * - Download buttons let you save the summary report and the processing logs.
 *
 * Technical notes (light):
 * - This script ensures required modules are loaded, then calls
 *   attendanceUtils.startAttendanceProcessing(), which manages the UI and workflow above.
 */

(async function () {
  utils.ensureLoaded("attendanceUtils", "uiUtils");
  uiUtils.resetAborted();
  attendanceUtils.startAttendanceProcessing();
})();
