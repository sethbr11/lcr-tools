/**
 * ACTION: PROCESS ATTENDANCE FROM CSV OR PASTE
 *
 * What this action does:
 * - Opens a setup window where you pick the Sunday date and provide attendance data.
 * - Two input methods:
 *   1. Upload CSV: Upload a CSV file with Date, First Name, Last Name columns.
 *   2. Paste from Spreadsheet: Paste tab/comma-separated rows (Timestamp, First Name, Last Name).
 * - For paste, you can view/edit the parsed data before processing.
 * - Shows how many names were read and enables "Process Attendance on LCR".
 *
 * When you click "Process Attendance on LCR":
 * - The tool ensures the correct month is selected from the dropdown.
 * - It finds the selected date column that's currently visible in LCR.
 * - It scans through members, matching names and marking them present (when needed).
 * - It keeps a running log and builds a summary report for download.
 * - If any names can't be matched, it shows a follow-up screen where you can:
 *   - Search and select the correct ward member (marks them present), or
 *   - Count them as visitors (Men, Women, Young Men, Young Women, Children).
 *   - Optionally skip and later restore individual rows.
 * - It can also add your visitor counts to the Visitors tab and save them.
 *
 * Helpful behavior:
 * - Press ESC to abort the process at any time.
 * - Clear status messages and errors are displayed throughout.
 * - Download buttons let you save the summary report and the processing logs.
 */

(async function () {
  utils.ensureLoaded("attendanceInputHandlers");
  uiUtils.resetAborted();
  attendanceInputHandlers.initializeSetupUI();
})();
