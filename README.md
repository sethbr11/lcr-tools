# LCR Tools Chrome Extension

**LCR Tools** is an open-source Google Chrome extension designed to enhance the functionality and user experience of [LCR (Leader and Clerk Resources)](https://lcr.churchofjesuschrist.org/) for The Church of Jesus Christ of Latter-day Saints. It provides advanced tools for exporting data, processing attendance, managing member information, and more—streamlining common administrative tasks for clerks, secretaries, and leaders.

## Features

This extension aims to streamline common tasks and add helpful utilities for leaders and clerks. Current features include:

- **Context-Aware Actions:** The extension icon displays a menu with actions relevant to the current LCR page.
- **Optimized Profile Editing:** Quickly enter edit mode on member profiles with an option to remove performance-impacting elements. This fixes the issue of trying to update the information of a member who has served a mission and not being able to since the screen freezes.
- **Photo Management Utilities:**
  - Export a list of names for individuals who do not have a photo in LCR.
- **Attendance Input:**
  - Injects a UI onto the LCR attendance page for selecting a date and uploading a CSV of attendees.
  - Validates the CSV for correct formatting (Date, First Name, Last Name columns, all dates same Sunday, no duplicate names).
  - Downloads a sample CSV template.
  - Processes the uploaded CSV to mark attendance on the LCR page, handling LCR's member pagination and date column visibility.
  - Provides fuzzy name matching.
  - Generates a summary CSV detailing which names were successfully marked, already present, or not found.
  - Generates a detailed action log CSV for debugging and transparency.
  - Allows users to abort long processes by pressing the Escape key.
- Report Data Export:
  - Download data from various LCR reports directly into a CSV file.
  - Handles LCR's report pagination to export all data.
  - Correctly interprets and exports boolean values (e.g., checkmarks) from tables.
- Loading Indicators: Visual feedback for long-running operations.
- And more planned!

## Installation

#### Option 1: From the Chrome Web Store (Recommended for most users)

_Unfortunately, this option is not yet available. When it is, it will be linked here!_

1. Go to the LCR Tools page on the Chrome Web Store.

2. Click "Add to Chrome".

#### Option 2: Manual Installation (For development or testing)

1. Download the Source Code:

   - Clone this repository: `git clone https://github.com/sethbr11/lcr-tools.git`
   - Or, download the ZIP file from the repository and extract it.

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
├── background.js
├── js/
│   ├── actions/
│   │   ├── attendance/
│   │   ├── membership/
│   │   ├── member_profile/
│   │   ├── photos/
│   │   └── reports/
│   ├── popup.js
│   └── options_page.js
├── options_page.html
├── options_page_partials/
├── css/
├── images/
├── manifest.json
└── README.md
```

A brief overview of the project's organization:

- `manifest.json`: The core configuration file for the extension.
- `background.js`: The background worker file that handles extension lifecycle events and messaging.
- `popup.html` / `js/popup.js`: Defines the UI and logic for the extension's popup menu.
- `css/`: Stylesheets for the popup and any injected UI.
- `images/`: Icons for the extension.
- `js/utils/`: Contains utility scripts, like `loadingIndicator.js`.
- `js/actions/`: Contains the content scripts that perform specific actions on LCR pages. Subfolders relate to specific action groups which are organized by LCR page.
- `options_page_partials`: Contains `.inc` files, which are basically HTML partial pages to be imported in the parent page of `options_page.html`. These are for page navigation actions instead of the more common script action (see `js/popup.js` for more information), though no options page partials are currently in use.
- `\*.html` (root): Any separate HTML pages used by the extension (e.g., for complex options).

### Adding New Actions

1. Add a new script in `js/actions/`.
2. Update `getActionsForUrl()` in `js/popup.js` to register the new action for the appropriate LCR page.
3. (Optional) Add UI partials in `options_page_partials/` for options page features.

### Permissions

- `"activeTab"`, `"scripting"`: For script injection and tab access.
- `"host_permissions"`: Restricted to `https://lcr.churchofjesuschrist.org/*`.

## Troubleshooting

This extension is brand new and, admittably, was vibe coded since the author didn't want to spend weeks trying to get the basic functionality he needed yesterday. Please reach out to the author with any concerns and we will work to get it resolved. If you are an experienced developer, feel free to suggest any feature improvements!

## Security & Privacy

- **Data Handling**: All processing is done locally in your browser. No data is sent to external servers.
- **Permissions**: The extension only runs on LCR pages and does not access other sites.

## Contributing

This is an open-source project, and contributions are welcome! Whether it's reporting a bug, suggesting a new feature, or writing code, your help is appreciated.

- **Reporting Bugs:** Please open an issue on the GitHub Issues page, providing as much detail as possible, including steps to reproduce, screenshots, and your browser/OS versions.

- **Suggesting Features:** Feel free to open an issue to suggest new features or improvements.

- **Development:**

  1. Fork the repository.

  2. Create a new branch for your feature or bug fix.

  3. Make your changes. Ensure you follow the existing coding style and add comments where necessary.

  4. Test your changes thoroughly.

  5. Submit a pull request with a clear description of your changes.

## License

MIT License. See [LICENSE](LICENSE) for details.

## Disclaimer

LCR Tools is an independent project and is not an official tool of or endorsed by The Church of Jesus Christ of Latter-day Saints. It is provided "as-is" without any warranty. Use at your own risk. Always ensure you are complying with Church policies and data privacy guidelines when using this tool.
