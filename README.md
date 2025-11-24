# LCR Tools Chrome Extension

**LCR Tools** is an open-source Google Chrome extension designed to enhance the functionality and user experience of [LCR (Leader and Clerk Resources)](https://lcr.churchofjesuschrist.org/) for The Church of Jesus Christ of Latter-day Saints. It provides advanced tools for exporting data, processing attendance, managing member information, and more—streamlining common administrative tasks for clerks, secretaries, and leaders.

## Features

This extension aims to streamline common tasks and add helpful utilities for leaders and clerks. Current features include:

- **Context-Aware Actions:** The extension icon displays a menu with actions relevant to the current LCR page.
- **Action Directory:** A directory of all the possible actions and what page they can be used on is available from the main popup screen.
- **Optimized Profile Editing:** Quickly enter edit mode on member profiles with an option to remove performance-impacting elements. This fixes the issue of trying to update the information of a member who has served a mission and not being able to since the screen freezes.
- **Photo Management Utilities:**
  - Download a CSV of individuals who do not have a photo in LCR.
  - Member Flashcards: Learn names and faces with an interactive, keyboard-friendly flashcard interface (shuffle/unshuffle, flip with SPACE, navigate with arrows).
- **Multiple Callings Finder:** Quickly identify which members have more than one calling in your unit.
- **Table Filters (WIP):** Experimentally filter and refine report tables with a modal UI.
- **Advanced Attendance Processing:**
  - Injects a UI onto the LCR attendance page for selecting a date and uploading a CSV of attendees.
  - Validates the CSV for correct formatting (Date, First Name, Last Name columns, all dates same Sunday, no duplicate names).
  - Downloads a sample CSV template.
  - Processes the uploaded CSV to mark attendance on the LCR page, handling LCR's member pagination and date column visibility.
  - Provides fuzzy name matching for finding members.
  - Guest Attendance Management for unmatched names:
    - Interactive search to find members in the complete ward directory with real-time filtering.
    - Members already marked present are grayed out and unselectable.
    - Guest classification system (Men, Women, Young Men, Young Women, Children) with manual count inputs.
    - Automatic navigation to the Visitors tab and updating of guest attendance counts.
    - Integrated logging and downloadable logs.
  - Generates a summary CSV detailing which names were successfully marked, already present, not found, or processed as guests.
  - Generates a detailed action log CSV for debugging and transparency.
  - Allows users to abort long processes by pressing the Escape key.
- **Report Data Export:**
  - Download data from various LCR reports directly into a CSV file.
  - Downloads a ZIP file of CSVs if multiple tables are on one page.
  - Handles LCR's report pagination to export all data.
  - Auto-scrolls pages where applicable to ensure all dynamically loaded content is captured.
  - Correctly interprets and exports boolean values (e.g., checkmarks) from tables.
- **Trip Planning:**
  - Plan trips to newly moved-in members as you walk through the process of geocoding addresses, creating clusters (groups), and creating the routes.
  - Kmeans clustering algorithm through [Turf.js](https://turfjs.org/) for finding natural clusters when splitting visits into multiple groups. Clusters can be created by specifying a desired number of clusters, or by constraining clusters to a certain range of waypoints (e.g. 5-10 people per cluster).
  - Interactive map through [Leaflet.js](https://leafletjs.com/) for visualizing waypoints and optimized routes.
  - Easy export to CSV. Implementing PDF export soon.
- **Comprehensive Logging:** Detailed logging for actions that modify data, with downloadable CSV logs for audit trails and troubleshooting.
- **Loading Indicators:** Visual feedback for long-running operations.

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
   - Or, download the ZIP file from the [latest release](https://github.com/sethbr11/lcr-tools/releases/latest) and extract it.

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
├── babel.config.js
├── build.js
├── css/
│   ├── ...
│   └── vendor/
│       └── leaflet.css
├── html/
│   ├── directory.html
│   ├── popup.html
│   └── trip_planning.html
├── images/
├── jest.config.js
├── js/
│   ├── actions/
│   │   ├── downloadReportData/
│   │   ├── editMemberProfile/
│   │   ├── findMultipleCallings/
│   │   ├── memberFlashcards/
│   │   ├── noPhotoList/
│   │   ├── processAttendance/
│   │   ├── tableFilters/
│   │   └── tripPlanning/
│   ├── actions.js
│   ├── directory.js
│   ├── popup.js
│   ├── utils/
│   │   ├── dataUtils.js
│   │   ├── fileUtils.js
│   │   ├── loggingUtils.js
│   │   ├── modalUtils.js
│   │   ├── navigationUtils.js
│   │   ├── tableUtils.js
│   │   ├── uiUtils.js
│   │   └── utils.js
│   └── vendor/
│       ├── html2canvas.min.js
│       ├── jspdf.umd.min.js
│       ├── jszip.min.js
│       ├── leaflet.js
│       ├── papaparse.min.js
│       └── turf.min.js
├── LICENSE
├── manifest.json
├── package.json
├── PRIVACY_POLICY.md
├── README.md
└── tests/
    ├── actions/
    │   ├── ...
    │   ├── processAttendance/
    │   └── tripPlanning/
    ├── QUICK_TEST_REFERENCE.md
    ├── README.md
    ├── setup.js
    ├── TESTING_GUIDE.md
    ├── TESTING.md
    ├── ui/
    └── utils/
```

A brief overview of the project's organization:

- `manifest.json`: The core configuration file for the extension.
- `build.js`: Node.js script to quickly build the packaged extension for upload to the Chrome Web Store.
- `html/`: All defined standalone HTML files for the extension.
- `html/popup.html` / `js/popup.js`: Defines the UI and logic for the extension's main popup menu.
- `js/actions.js`: Central registry that determines which actions appear for the current page (getActionsForUrl).
- `css/`: Stylesheets for the popup and any injected UI.
- `images/`: Icons for the extension.
- `tests/`: JavaScript tests run with Jest.
- `js/actions/`: Content scripts grouped by LCR page or task (e.g., attendance, photos, flashcards).
- `js/utils/`: Shared utilities for CSV operations, UI creation, logging, navigation, and data handling.
- `js/vendor/`: Third-party libraries (e.g., jszip for ZIP creation).

### Adding New Actions

1. Add a new folder and script files in `js/actions/`.
2. Register the action in `js/actions.js` inside `getActionsForUrl()` for the appropriate LCR page, including any required utility and vendor files.
3. Use the shared utilities in `js/utils/` for common operations like CSV handling, UI creation, file operations, and date manipulation.
4. (Optional) Add UI templates in your action folder if needed.

### Permissions

- `"scripting"`: For script injection.
- `"storage"`: For use of local storage (so far, only implemented in the trip planning action).
- `"host_permissions"`: Restricted to `https://lcr.churchofjesuschrist.org/*`, `https://lcrf.churchofjesuschrist.org/*`, and `https://lcrffe.churchofjesuschrist.org/*`.

## Troubleshooting

This extension is brand new and, admittably, was vibe coded since the author didn't want to spend weeks trying to get an MVP with the basic functionality that he needed yesterday. Please reach out to the author with any concerns and we will work to get it resolved. If you are an experienced developer, feel free to suggest any feature improvements! AI models like ChatGPT (4o-mini, 4.1, 5, etc.), Gemini (2.5 Flash and Pro, 3 Pro), and Claude (3.7 and 4) were used extensively, along with tools like GitHub Copilot, Cursor, Claude Code, Gemini CLI, and Google's Antigravity.

## Security & Privacy

- **Data Handling**: All processing is done locally in your browser. No data is sent to external servers.
- **Permissions**: The extension only runs on LCR pages and does not access other sites.

## Disclaimer

LCR Tools is an independent project and is not an official tool of or endorsed by The Church of Jesus Christ of Latter-day Saints. It is provided "as-is" without any warranty. Use at your own risk. Always ensure you are complying with Church policies and data privacy guidelines when using this tool.
