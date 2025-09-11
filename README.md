# LCR Tools Chrome Extension

**LCR Tools** is an open-source Google Chrome extension designed to enhance the functionality and user experience of [LCR (Leader and Clerk Resources)](https://lcr.churchofjesuschrist.org/) for The Church of Jesus Christ of Latter-day Saints. It provides advanced tools for exporting data, processing attendance, managing member information, and more—streamlining common administrative tasks for clerks, secretaries, and leaders.

## Features

This extension aims to streamline common tasks and add helpful utilities for leaders and clerks. Current features include:

- **Context-Aware Actions:** The extension icon displays a menu with actions relevant to the current LCR page.
- **Optimized Profile Editing:** Quickly enter edit mode on member profiles with an option to remove performance-impacting elements. This fixes the issue of trying to update the information of a member who has served a mission and not being able to since the screen freezes.
- **Photo Management Utilities:** Export a list of names for individuals who do not have a photo in LCR.
- **Multiple Callings Finder:** Quickly identify which members have more than one calling in your unit.
- **Advanced Attendance Processing:**
  - Injects a UI onto the LCR attendance page for selecting a date and uploading a CSV of attendees.
  - Validates the CSV for correct formatting (Date, First Name, Last Name columns, all dates same Sunday, no duplicate names).
  - Downloads a sample CSV template.
  - Processes the uploaded CSV to mark attendance on the LCR page, handling LCR's member pagination and date column visibility.
  - Provides fuzzy name matching for finding members.
  - **Guest Attendance Management:** For names not found in the ward directory:
    - Interactive search to find members in the complete ward directory with real-time filtering
    - Members already marked present are grayed out and unselectable
    - Guest classification system (Men, Women, Young Men, Young Women, Children)
    - Additional manual guest count inputs for each category
    - Automatic navigation to visitors tab and updating of guest attendance counts
    - Integrated logging of all guest attendance actions
  - Generates a summary CSV detailing which names were successfully marked, already present, not found, or processed as guests.
  - Generates a detailed action log CSV for debugging and transparency.
  - Allows users to abort long processes by pressing the Escape key.
- **Report Data Export:**
  - Download data from various LCR reports directly into a CSV file.
  - Downloads a ZIP file of CSVs if multiple tables are on one page.
  - Handles LCR's report pagination to export all data.
  - Auto-scrolls pages where applicable to ensure all dynamically loaded content is captured.
  - Correctly interprets and exports boolean values (e.g., checkmarks) from tables.
- **Comprehensive Logging:** Detailed logging for actions that modify data, with downloadable CSV logs for audit trails and troubleshooting.
- **Loading Indicators:** Visual feedback for long-running operations.
- **And more planned!**

## Installation

#### Option 1: From the Chrome Web Store (Recommended for most users)

1. Go to the [LCR Tools page](https://chromewebstore.google.com/detail/lcr-tools/camjilfjkjmgcpmnheoeoomfndedpmbn?hl=en) on the Chrome Web Store.

2. Click **"Add to Chrome"**.

After clicking, you may see one or two pop-up messages:

- **"Proceed with Caution" / "This extension is not trusted by Enhanced Safe Browsing"**: This warning appears because I’m a new publisher on the Chrome Web Store. As [Google explains](https://support.google.com/chrome_webstore/answer/2664769?visit_id=638878101694725064-2717977188&rd=2#10745467&zippy=%2Cinstall-with-enhanced-protection), it typically takes a few months for new developers to become “trusted” status once their extensions comply with all program policies.
- **Permissions Confirmation"**: You’ll be asked to confirm that the extension can **“Read and change your data on lcr.churchofjesuschrist.org.”** This permission is tied to the `host_permissions` in the [manifest.json](https://github.com/sethbr11/lcr-tools/blob/main/manifest.json) file and ensures the extension only runs on the LCR website.

#### Option 2: Manual Installation (For development or testing)

1. Download the Source Code:

   - Clone this repository: `git clone https://github.com/sethbr11/lcr-tools.git`
   - Or, download the [ZIP file](https://github.com/sethbr11/lcr-tools/archive/refs/tags/v1.0.0-alpha.zip) from the repository and extract it.

2. Open Chrome Extensions Page:

   - Open Google Chrome.
   - Navigate to `chrome://extensions`.

3. Enable Developer Mode:

   - In the top right corner of the Extensions page, toggle "Developer mode" ON.

4. Load Unpacked Extension:

   - Click the "Load unpacked" button that appears.
   - Select the directory where you cloned or extracted the LCR Tools source code (the folder containing `manifest.json`).

5. The LCR Tools extension icon should now appear in your Chrome toolbar (you might need to click the puzzle piece icon to pin it).

## Usage

1. Navigate to any page on `lcr.churchofjesuschrist.org`.

2. Click the LCR Tools extension icon in your Chrome toolbar.

3. A popup menu will appear, showing actions available for the specific LCR page you are currently viewing.

4. Click an action to execute it or to open a dedicated options/UI page for more complex tasks (like attendance input).

5. For long-running processes (like attendance input or some report exports), a loading indicator will be displayed. You can typically abort these processes by pressing the `Escape` key.

## Development

### Folder Structure

```
lcr-extension/
├── css/
├── images/
├── js/
│   ├── actions/
│   │   ├── downloadReportData/
│   │   ├── editMemberProfile/
│   │   ├── findMultipleCallings/
│   │   ├── noPhotoList/
│   │   └── processAttendance/
│   ├── utils/
│   │   ├── dataUtils.js
│   │   ├── fileUtils.js
│   │   ├── loggingUtils.js
│   │   ├── modalUtils.js
│   │   ├── navigationUtils.js
│   │   ├── tableUtils.js
│   │   ├── uiUtils.js
│   │   └── utils.js
│   ├── vendor/
│   │   └── jszip.min.js
│   ├── actions.js
│   └── popup.js
├── .gitignore
├── LICENSE
├── manifest.json
├── popup.html
├── PRIVACY_POLICY.md
└── README.md
```

A brief overview of the project's organization:

- `manifest.json`: The core configuration file for the extension.
- `popup.html` / `js/popup.js`: Defines the UI and logic for the extension's popup menu.
- `actions.js`: Logic for `popup.js` to determine which actions to display.
- `css/`: Stylesheets for the popup and any injected UI.
- `images/`: Icons for the extension.
- `js/actions/`: Contains the content scripts that perform specific actions on LCR pages. Subfolders relate to specific action groups which are organized by LCR page.
- `js/utils/`: Contains utility scripts, including `modalUtils.js` and shared utilities for CSV operations, UI creation, web scraping, file operations, and date handling.
- `js/vendor/`: Contains javascript utilities from vendors (like jszip for ZIP file creation)

### Adding New Actions

1. Add a new folder and script files in `js/actions/`.
2. Update `getActionsForUrl()` in `js/popup.js` to register the new action for the appropriate LCR page, including any required utility files.
3. Use the shared utilities in `js/utils/` for common operations like CSV handling, UI creation, web scraping, file operations, and date manipulation.
4. (Optional) Add UI partials in `options_page_partials/` for options page features.

### Permissions

- `"scripting"`: For script injection.
- `"host_permissions"`: Restricted to `https://lcr.churchofjesuschrist.org/*`.

## Troubleshooting

This extension is brand new and, admittably, was vibe coded since the author didn't want to spend weeks trying to get the basic functionality he needed yesterday. Please reach out to the author with any concerns and we will work to get it resolved. If you are an experienced developer, feel free to suggest any feature improvements! AI models like ChatGPT (4o-mini, 4.1, 5, etc.), Gemini (2.5 Flash and Pro), and Claude (3.7 and 4) were used extensively.

## Security & Privacy

- **Data Handling**: All processing is done locally in your browser. No data is sent to external servers.
- **Permissions**: The extension only runs on LCR pages and does not access other sites.

## License

MIT License. See [LICENSE](LICENSE) for details.

## Disclaimer

LCR Tools is an independent project and is not an official tool of or endorsed by The Church of Jesus Christ of Latter-day Saints. It is provided "as-is" without any warranty. Use at your own risk. Always ensure you are complying with Church policies and data privacy guidelines when using this tool.
