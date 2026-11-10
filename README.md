# LCR Tools Extension

[![CI Testing](https://github.com/sethbr11/lcr-tools/actions/workflows/tests.yml/badge.svg)](https://github.com/sethbr11/lcr-tools/actions/workflows/tests.yml)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/camjilfjkjmgcpmnheoeoomfndedpmbn.svg)](https://chromewebstore.google.com/detail/lcr-tools/camjilfjkjmgcpmnheoeoomfndedpmbn)
[![Version](https://img.shields.io/badge/version-2.0.2-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A modern, cross-browser extension for Chrome (Manifest V3), Firefox (Manifest V2), and Safari (Manifest V2) that enhances and streamlines functionality on the Church of Jesus Christ of Latter-day Saints **Leader and Clerk Resources (LCR)** platform.

---

## Features

- **Attendance Processing**: Automatically parses pasted attendance rosters or CSV files, matches names against ward rosters, checks off attendances for target Sunday dates, and breaks down unmatched names and visitors.
- **Report Data Export**: Automatically detects tabular data across LCR report pages and exports them as clean CSV files or multi-table ZIP archives.
- **Trip Route Planning**: Extracts newly moved-in members, prefers Church Directory household coordinates, groups members (keeping households together) into visit groups, orders each group's stops from its own starting address, and shows the routes on a Leaflet map with a per-group PDF export.
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
- **PDF Export**: [jsPDF](https://github.com/parallax/jsPDF) (loaded on demand by the Trip Planner)
- **Testing**: [Vitest](https://vitest.dev/) with JSDOM and `@testing-library/dom`
- **Formatting**: [Prettier](https://prettier.io/)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20.19+ or 22.12+ (required by Vite 7; CI uses Node 20)
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

### Reproducing the Firefox build (for AMO reviewers)

The Firefox package is bundled and minified by [WXT](https://wxt.dev/) (built on Vite), so the
full source is submitted with each release as `lcr-tools-extension-<version>-sources.zip`
(created by `npx wxt zip -b firefox`). Every file under `src/` is hand-written TypeScript, CSS, or
HTML; the only third-party code comes from open-source npm packages pinned in `package-lock.json`.

**Build environment**

- Operating system: macOS, Linux, or Windows (any OS that runs Node.js). Release builds run on
  Ubuntu (GitHub Actions `ubuntu-latest`) and are also verified on macOS.
- Node.js **20.19+ or 22.12+** (Vite 7 requirement) with the npm that ships with it (npm 10+).
  Install from [nodejs.org](https://nodejs.org/en/download) or with a version manager, for example
  `nvm install 22 && nvm use 22`. Check with `node --version` and `npm --version`.
- No other programs, global packages, environment variables, or API keys are needed. `npm ci`
  needs network access to the npm registry to download the pinned dependencies.

**Build steps**

1. Unzip the sources zip and open a terminal in that folder (the one containing `package.json`).
2. Run the build script, which checks the Node.js version, installs the exact locked dependencies
   (`npm ci`), and builds the Firefox package (`npm run build:firefox`):

   ```bash
   sh scripts/build-firefox.sh
   ```

3. The built extension is in `output/firefox-mv2`. Its files are identical to the contents of
   `lcr-tools-extension-<version>-firefox.zip`.

**Build-time adjustments to dependencies** (Vite plugins and aliases in `wxt.config.ts`, applied
automatically by the build; nothing to do by hand):

- jsPDF's optional `html2canvas`, `dompurify`, and `canvg` imports resolve to an empty module
  (`src/vendor/optionalDependencyStub.ts`), since LCR Tools never uses jsPDF's HTML/SVG rendering.
- `innerHTML` assignments in Leaflet and jsPDF are rewritten to `textContent`, `replaceChildren()`,
  or `DOMParser`-based insertion, so the bundle has no `innerHTML` writes.

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
