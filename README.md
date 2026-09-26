# LCR Tools Extension

[![CI Testing](https://github.com/sethbr11/lcr-tools/actions/workflows/tests.yml/badge.svg)](https://github.com/sethbr11/lcr-tools/actions/workflows/tests.yml)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/camjilfjkjmgcpmnheoeoomfndedpmbn.svg)](https://chromewebstore.google.com/detail/lcr-tools/camjilfjkjmgcpmnheoeoomfndedpmbn)
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A modern, cross-browser extension for Chrome (Manifest V3), Firefox (Manifest V2), and Safari (Manifest V2) that enhances and streamlines functionality on the Church of Jesus Christ of Latter-day Saints **Leader and Clerk Resources (LCR)** platform.

---

## Features

- **Attendance Processing**: Automatically parses pasted attendance rosters or CSV files, matches names against ward rosters, checks off attendances for target Sunday dates, and breaks down unmatched names and visitors.
- **Report Data Export**: Automatically detects tabular data across LCR report pages and exports them as clean CSV files or multi-table ZIP archives.
- **Trip Route Planning**: Extracts newly moved-in members, prefers Church Directory household coordinates, clusters remaining locations with Turf.js, and visualizes routes on a Leaflet map.
- **Members with Multiple Callings**: Analyzes organizational rosters to discover members holding simultaneous callings, presenting an interactive review dialog with CSV export.
- **Ward Boundary Audit**: Evaluates household geolocations against unit boundary polygons, identifying members residing outside ward boundaries.
- **Missing Photo Report**: Quickly audits member directory cards to identify and export records of members without uploaded directory photographs.
- **Member Flashcards**: Interactive 3D flip-card memory quiz leveraging cached directory portrait photos to help leaders learn member names and faces.
- **Dynamic Table Filters**: In-page column-level filtering allowing instant searching and toggling of rows without page reloads.

---

## Tech Stack

- **Framework**: [WXT](https://wxt.dev/) (`v0.21.x`) with Vite bundler
- **Language**: TypeScript (`v5.8.x`) in Strict Mode (zero-`any` policy)
- **Mapping & Geospatial**: [Leaflet](https://leafletjs.com/) and [@turf/turf](https://turfjs.org/)
- **Data Parsing & Archiving**: [PapaParse](https://www.papaparse.com/) and [JSZip](https://stuk.github.io/jszip/)
- **Testing**: [Vitest](https://vitest.dev/) with JSDOM and `@testing-library/dom`
- **Formatting**: [Prettier](https://prettier.io/)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm`

### Installation

```bash
cd extension
npm install
```

---

## Development

Run development servers with hot-module reloading and automatic extension reloading:

```bash
# Chrome (Manifest V3)
npm run dev

# Firefox (Manifest V2)
npm run dev:firefox

# Safari (Manifest V2)
npm run dev:safari
```

---

## Testing & Quality Assurance

All verification commands are enforced in CI and development:

```bash
# Type check without emitting files
npm run compile

# Run Vitest unit and functional test suites
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:coverage

# Format all files with Prettier
npm run format

# Verify Prettier code formatting compliance
npm run format:check

# Check for package dependency vulnerabilities
npm audit
```

---

## Building for Production

Compile production bundles for all target browsers:

```bash
# Compile bundles for Chrome MV3, Firefox MV2, and Safari MV2
npm run build:all

# Or compile individually:
npm run build          # Chrome MV3  -> output/chrome-mv3
npm run build:firefox  # Firefox MV2 -> output/firefox-mv2
npm run build:safari   # Safari MV2  -> output/safari-mv2

# Package production builds into distributable zip archives
npm run zip:all
```

---

## Loading Unpacked Extension in Browsers

### Google Chrome / Chromium Browsers (Brave, Edge)

1. Open `chrome://extensions` in the URL bar.
2. Toggle **Developer mode** in the upper right corner.
3. Click **Load unpacked**.
4. Select the `output/chrome-mv3` directory.

### Mozilla Firefox

1. Open `about:debugging#/runtime/this-firefox` in the URL bar.
2. Click **Load Temporary Add-on...**.
3. Select `output/firefox-mv2/manifest.json`.

### Apple Safari

1. Run `npm run build:safari`.
2. Convert or package the `output/safari-mv2` build using Xcode or `xcrun safari-web-extension-converter output/safari-mv2`.

---

## Architecture & Code Guidelines

Please consult [AGENTS.md](../AGENTS.md) for strict architectural rules:

- **Action Module Architecture**: 4-file pattern per action (`index.ts`, `types.ts`, `utils.ts`, `<helper>.ts`).
- **No `any` policy**: Every variable, function parameter, and return value must have an explicit representative type.
- **Section Dividers & Docstrings**: All functions, types, constants, classes, and regular expressions must have meaningful one-line docstrings.
- **Central Registry**: Actions are configured in [`src/actions/registry.ts`](src/actions/registry.ts).

---

## Privacy & Disclaimer

All data processing is conducted locally in memory within your browser session. No church member data or personal records are ever tracked, logged remotely, or transmitted to third-party servers.

_Note: LCR Tools is an independent open-source project and is not affiliated with or endorsed by The Church of Jesus Christ of Latter-day Saints._
