# LCR Tools Chrome Extension

[![CI Testing](https://github.com/sethbr11/lcr-tools/actions/workflows/tests.yml/badge.svg)](https://github.com/sethbr11/lcr-tools/actions/workflows/tests.yml)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/camjilfjkjmgcpmnheoeoomfndedpmbn.svg)](https://chromewebstore.google.com/detail/lcr-tools/camjilfjkjmgcpmnheoeoomfndedpmbn)
[![Version](https://img.shields.io/badge/version-1.5.0-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**LCR Tools** makes managing ward and branch records faster, easier, and more powerful. Built for the modern 2026 LCR interface, this extension automates tedious administrative tasks so you can focus more on people and less on paperwork.

## Core Benefits

- **Effortless Attendance:** Upload your Sunday attendance lists via CSV. The tool automatically matches names (even with fuzzy matching) and handles guests with ease.
- **Save Time on Reports:** Download any table from LCR directly to Excel-friendly CSV files. If there are multiple tables (like on the Organizations page), it bundles them into a single, organized ZIP file for you.
- **Learn Names & Faces:** Use the interactive **Flashcards** tool to study your ward directory. It even includes a "Photo Cache" to keep things fast, ensuring names and faces load instantly.
- **Smarter Visit Planning:** Automatically geocode member addresses, group them into natural clusters, and visualize optimized routes on an interactive map. Perfect for new move-in visits or high-council assignments.
- **Catch Data Gaps:** Quickly identify members missing photos or those who have been assigned multiple callings, helping you keep ward records accurate and up-to-date.
- **Boundary Audits:** Instantly see which households in your directory actually live outside your official unit boundaries using advanced geometric analysis.

## How to Use

1. **Install:** Add the extension to your Chrome browser.
2. **Navigate:** Open [Leader and Clerk Resources (LCR)](https://lcr.churchofjesuschrist.org/).
3. **Launch:** Click the LCR Tools icon in your toolbar. The menu will automatically show you the most helpful actions for the specific page you are viewing.
4. **Export & Filter:** Use the built-in filters to find exactly who you're looking for across all organizations at once.

## Privacy & Security

Your data stays with you. **LCR Tools** processes all member information locally within your browser. No names, addresses, or sensitive records are ever uploaded to external servers or shared with third parties.

## Contributing

We welcome contributions from the community! Whether you're fixing a bug or adding a new feature, here's how to get started.

### Repository Structure

- `js/actions/`: Contains the logic for specific features (e.g., flashcards, attendance). Each action typically has its own folder.
- `js/utils/`: Shared utility modules for DOM manipulation, networking, and data processing.
- `html/`: HTML templates for popovers and modals.
- `css/`: Styling for the extension UI.
- `tests/`: Comprehensive unit tests using Jest and JSDOM.

### Adding a New Action

1. **Create a folder** in `js/actions/` for your feature.
2. **Implement your logic** (use `js/utils/` modules where possible to stay framework-agnostic).
3. **Register your action** in `js/actions.js` by adding a new entry to the actions array. This tells the extension which LCR pages your action should appear on.
4. **Add tests** in `tests/actions/` to verify your feature.

### Local Setup

1. Clone the repo and run `npm install`.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** and click **Load unpacked**.
4. Select the project directory to load the extension.

### Testing & Validation

- **Run all tests:** `npm test`
- **Coverage report:** `npm run test:coverage`
- Please ensure all tests pass before submitting a Pull Request.

### Automated Releases

This project uses GitHub Actions for CI/CD. When a PR is merged into `main`, a release is automatically generated.

- **Versioning:** Update the `"version"` in `manifest.json` to trigger a new tagged release.
- **Release Notes:** Automatically generated from commit history.

---

_Note: This tool is an independent open-source project and is not an official application of The Church of Jesus Christ of Latter-day Saints._
