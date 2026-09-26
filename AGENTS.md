# AGENTS.md - LCR Tools Architecture & Development Guidelines

This document serves as the single source of truth for AI agents and developers working on the **LCR Tools** extension repository. Follow these strict structural, architectural, typing, and formatting standards.

---

## 1. Project Overview & Tech Stack

- **Location**: `extension/` (cross-browser extension workspace).
- **Legacy Reference**: `chrome/` (retained for reference; do not develop in `chrome/`).
- **Framework**: **WXT** (`v0.21.x`) with **Vite** bundler for unified cross-browser output (`Chrome MV3`, `Firefox MV2`, `Safari MV2`).
- **Language**: **TypeScript** (Strict mode with `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`, `noUnusedParameters`).
- **Test Runner**: **Vitest** with JSDOM and `@testing-library/dom`.
- **Code Formatter**: **Prettier** (`npm run format`, `npm run format:check`).

---

## 2. Directory & Folder Structure

```
extension/
├── package.json              # Extension dependencies and NPM scripts
├── tsconfig.json             # TypeScript compiler options (strict, bundler, paths)
├── wxt.config.ts             # WXT framework configuration
├── vitest.config.ts          # Vitest testing configuration
├── .prettierrc               # Prettier code formatting rules
├── .gitignore                # Ignored build outputs and temporary files
├── src/
│   ├── env.d.ts              # Ambient types (Vite client, CSS imports)
│   ├── types/
│   │   └── index.ts          # Shared global Types, Constants, Regex, and Dom
│   ├── utils/                # Shared utilities across all actions
│   │   ├── types.ts          # Centralized utility types, constants, regex re-exports
│   │   ├── coreUtils.ts      # String, date, debounce, and pipeline utilities
│   │   ├── fileUtils.ts      # CSV and ZIP generation and download helpers
│   │   ├── loggingUtils.ts   # Action and user interaction diagnostic logger
│   │   ├── navigationUtils.ts# Pagination, URL matching, and tab navigation
│   │   ├── security/         # Cryptography, secure storage, and API key management
│   │   ├── church/           # Church MLTP API, directory pages, and photo scan helpers
│   │   ├── ui/               # Loading indicators, modals, templates, and maintenance dialogs
│   │   ├── table/            # Table discovery, selection, CSV export, and attendance detection
│   │   └── index.ts          # Barrel re-export of all shared utilities
│   ├── actions/              # Self-contained feature modules
│   │   ├── <actionName>/
│   │   │   ├── index.ts      # Orchestrating entrypoint showing step-by-step pipeline
│   │   │   ├── <helper>.ts   # Domain-specific logic decomposed into separate files
│   │   │   ├── templates.ts  # HTML template strings (if action renders UI)
│   │   │   ├── types.ts      # Action-specific Types, Constants, Regex, Dom
│   │   │   └── utils.ts      # Re-exports @/utils + action-specific utilities
│   │   └── registry.ts       # Central action metadata registry and URL matching
│   └── entrypoints/          # WXT entrypoint targets
│       ├── popup/            # Extension action popup UI with embedded Action Directory (HTML, TS, CSS)
│       ├── trip-planning/    # Dedicated Leaflet trip planner web app (HTML, TS, CSS)
│       ├── directory-audit.content.ts # Content script for pending boundary audits
│       ├── passive-actions.content.ts # Content script for passive automated actions
│       └── action-*.ts       # 4-line unlisted script launchers for tab injection
└── tests/                    # Vitest functional test suites
    ├── setup.ts              # JSDOM & WebExtension global mocks
    ├── actions/              # Action behavior & integration tests
    └── utils/                # Utility unit tests
```

---

## 3. Module Architecture & Type Separation Rules

### 3.1 Strict Separation of Types and Implementation Functions

- **Never export or re-export types or interfaces from function or helper files**: Function files (`tableUtils.ts`, `lcrApiUtils.ts`, `loggingUtils.ts`, or action `<helper>.ts` files) must only export executable code (functions, classes).
- **All types, interfaces, and type aliases must reside exclusively in designated type files**:
  - Shared global types: `src/types/index.ts`
  - Utility subsystem types: `src/utils/types.ts`
  - Feature action types: `src/actions/<actionName>/types.ts`
- **Internal typing within function files**: Function files must reference types through the imported `Types` namespace (e.g. `Types.TableInfo`, `Types.ActionLogger`, `Types.MemberRowInfo`).
- **External type consumption**: Consumers must import types strictly from the corresponding `types.ts` module or `@/types`, never from function implementation files (e.g., `import type { TableInfo } from '@/utils/table/tableUtils'` is strictly prohibited; use `import { Types } from '@/types'` or `import { Types } from './types'`).
- **Prevents bundle warnings & barrel ambiguity**: Re-exporting types from function files causes Vite/Rollup duplicate symbol warnings and TypeScript TS2308 export ambiguity during barrel exports (`export *`).

### 3.2 Action Module Architecture (`src/actions/<actionName>/`)

Every action directory **must** adhere to this pattern:

1. **`index.ts` (Action Index Purity)**:
   - Contains **only** the single primary orchestration entrypoint function (`run<ActionName>()`).
   - **Zero secondary functions**: All other functions (DOM construction, modal rendering, CSV exporting, event setup, data transformations) must reside in dedicated `<helper>.ts` files.
   - Outlines the high-level steps in sequential order (`Step 1`, `Step 2`, `Step 3`...).
   - **Zero top-level self-execution**: Action modules must never execute code at top level upon import. Execution is handled exclusively by entrypoint targets (`src/entrypoints/action-*.ts` via `browser.scripting.executeScript` or content scripts on pending reload).

2. **`types.ts`**:
   - Re-exports base types: `import * as Base from '@/types';`.
   - Exports dot-indexed objects:
     - `export namespace Types { ... }`
     - `export const Constants = { ...Base.Constants, ... } as const;` (Strictly data/configuration: storage keys, API endpoints, numeric limits, copy text, calendar months, retry counts).
     - `export const Regex = { ...Base.Regex, ... } as const;`
     - `export const Dom = { ...Base.Dom, ... } as const;` (Strictly HTML/DOM elements: DOM element IDs, CSS classes, query selectors, CSS styles like `z-index`, and data attributes).
   - Every type, interface, property, constant, DOM identifier, and regex **must have its own individual, meaningful one-line JSDoc comment** (`/** ... */`). Group comments spanning multiple properties or constants are strictly prohibited.

3. **`utils.ts`**:
   - Re-exports all global utilities: `export * from '@/utils';`.
   - Contains only action-specific utilities.

4. **`<helper>.ts`**:
   - Decomposes parsing, DOM manipulation, or algorithm steps into focused helper files.

### 3.3 Strict 400-Line Limit Across All Files

- **No file may exceed 400 lines**: Every TypeScript file (`.ts`), stylesheet (`.css`), HTML file, and test file (`.test.ts`) across `src/` and `tests/` must remain strictly at or under 400 lines.
- When any file approaches 400 lines, decompose it into focused helper modules (e.g. `filterControlsHelper.ts`, `tableCsvUtils.ts`, `directory.css`) or split test suites by domain.

### 3.4 Global Types & Subsystem Decomposition

- **Modular Types in `src/types/`**:
  - `src/types/types.ts`: Interface and type alias declarations (`export namespace Types { ... }`).
  - `src/types/constants.ts`: Pure system data and configuration (`export const Constants = { ... } as const;`).
  - `src/types/regex.ts`: Centralized regular expressions (`export const Regex = { ... } as const;`).
  - `src/types/dom.ts`: Shared DOM element IDs, CSS classes, query selectors, and style properties (`export const Dom = { ... } as const;`).
  - `src/types/index.ts`: Clean barrel re-exporting `Types`, `Constants`, `Regex`, and `Dom`.
- Subsystem utilities (like `tableUtils.ts`) must extract specialized functionality into separate helper modules (e.g., `tableCsvUtils.ts`, `tableAttendanceUtils.ts`) and re-export them cleanly.

### 3.5 Code Reuse & Balanced Granularity

- **Zero Duplicated Logic**: Consolidate repeated code blocks into shared utilities or action helpers.
- **Readable Granularity**: Keep code readable and direct without excessive micro-abstractions; functions should represent coherent steps.
- **Zero Shim / Compatibility Re-Export Files**: Never create or retain shim files, dummy files, or pass-through re-exports solely to maintain existing or legacy import paths. Always update consuming call sites directly to import from the canonical implementation file.

---

## 4. Documentation & Section Conventions

All source files must follow this section divider and Docstring convention:

```ts
/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Full TypeDoc comment for all exported functions.
 * Explains purpose, pipeline steps, and side effects.
 *
 * @param paramName - Description of parameter.
 * @returns Description of returned result.
 */
export async function myFunction(paramName: string): Promise<Types.ActionResult> {
  // Step 1: Sequential step comment
  ...
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Meaningful one-line docstring explaining what helper function does. */
function myHelper(item: string): boolean {
  return item.length > 0;
}

/* ==========================================================================
   TESTING FUNCTIONS
   ========================================================================== */

/** Meaningful one-line docstring for any testing export helpers. */
```

### Inline Comments:

- Keep inline comments **sparing**.
- Only comment on non-obvious logic, subtle DOM behaviors, rate-limiting, or browser workarounds.
- Do **not** restate trivial operations.

---

## 5. Strict Type System & No `any` Policy

- **NEVER use `any`**: There is no exception. Every function, parameter, variable, and API response must have a representative type.
- If data structure is arbitrary or unverified, use `unknown` with type-guard narrowing or `Record<string, unknown>`.
- **Explicit Named Types for All Return Values**: For readability and maintainability, always define and assign an explicit named type or interface for every function's return value instead of returning raw inline object definitions or literals.
  - **Never return anonymous inline object types**: Avoid `Promise<{ success: boolean; updated: string[]; error?: string }>` or `Promise<Types.ActionResult<{ memberCount: number }>>`.
  - Always declare an explicit named interface (e.g., `Types.ProcessVisitorCountsResult`, `Types.TripPlanningResult`, `Types.AttendanceSetupResult`) in the corresponding `types.ts` or module type definitions, and reference that named type for the return signature.
- **Docstrings for All Types, Properties, Constants, Dom Identifiers, and Regexes**: Every type, interface, property, constant in `Constants`, identifier in `Dom`, and pattern in `Regex` must have its own dedicated, individual one-line JSDoc docstring (`/** ... */`). Group comments spanning multiple constants or regexes are strictly prohibited.
- The following compiler flags are strictly enforced in `tsconfig.json`:
  - `"strict": true`
  - `"noImplicitAny": true`
  - `"strictNullChecks": true`
  - `"noUnusedLocals": true`
  - `"noUnusedParameters": true`

---

## 6. Constants, Dom & Regular Expressions Centralization

- **Zero Inline / Raw Regular Expressions**: Every regular expression must be declared in the centralized `Regex` dictionary (`src/types/index.ts` or the action's `types.ts`), even if only used once. Never write raw regex literals (e.g., `/\s+/`) in function bodies.
- **Zero Magic Strings & Numbers**: All data configurations, storage keys, API paths, copy strings, and timeout delays must be declared in `Constants` (`src/types/index.ts` or the action's `types.ts`). Reference `Constants.<NAME>` instead of hardcoding literals.
- **Strict Dom vs Constants Separation**: All HTML- and CSS-related constants (CSS classes, DOM element IDs, CSS selector lists, styling attributes like `z-index`, data attributes) must reside exclusively in `Dom` (`src/types/index.ts` or the action's `types.ts`). Reference `Dom.<NAME>` for all DOM operations. Never place HTML/DOM identifiers in `Constants` or data constants in `Dom`.

---

## 7. Code Formatting & Styling

Prettier configuration is defined in `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### Preferred Code Syntax:

- **Single-line guard clauses**: Prefer `if (!condition) return;` or `if (condition) return result;` on a single line for straightforward early returns and checks.
- **Compact & tightly coupled imports**: Group imports logically and keep import statements compact and clean.

Run before submitting any changes:

- `npm run format` — formats all files.
- `npm run format:check` — verifies formatting.

---

## 8. Build, Verification & Testing

Always verify all of the following commands exit with code 0:

```bash
npm run compile    # Runs tsc --noEmit with strict type and unused check
npm test           # Runs Vitest unit & functional test suites
npm run format:check # Verifies Prettier code formatting
npm run build:all  # Compiles production bundles for Chrome MV3, Firefox MV2, and Safari MV2
```

---

## 9. ZERO PERSONALLY IDENTIFIABLE INFORMATION (PII) POLICY

# **CRITICAL MANDATE: NEVER USE REAL INFO FOR TESTING OR PUT IT IN THE CODE**

> ### **NEVER COMMIT, HARDCODE, OR RECORD REAL PERSONALLY IDENTIFIABLE INFORMATION (PII).**
>
> **Every name, address, phone number, email address, member ID, unit number, calling, photo, and scrap of Church or member data used in source code, mock fixtures, tests, comments, or documentation MUST BE 100% SYNTHETIC.**

### Strict Enforcement Rules:

1. **Zero Real Member Data in Repository**:
   - **NEVER** use real names (e.g., real ward/stake members, leaders, or personal acquaintances).
   - **NEVER** use real unit numbers (always use synthetic numbers like `12345` or `99999`).
   - **NEVER** use real addresses, phone numbers, or email addresses (use standard dummy values like `555-0101`, `123 Main St`, `user@example.com`).
   - **NEVER** commit real member UUIDs, photo URLs, or tokens.
2. **Synthetic Fixtures Only**:
   - Test suites and mock datasets must exclusively use obvious synthetic placeholders (e.g., `Smith, John`, `Doe, Jane`, `Member 1`, `member-uuid-1`).
3. **Storage & Scrape Isolation**:
   - Live scraped member data in production must reside strictly in extension-isolated storage (`browser.storage.local`).
   - **NEVER** store live member records in host page `window.localStorage` or unencrypted DOM attributes.
   - **NEVER** export or log member data to external servers or telemetry.
4. **Cloud Agent Live Site Access Prohibition**:
   - **Cloud AI agents and automated subagents are strictly prohibited from accessing, browsing, or inspecting live Church or LCR sites** (e.g. `lcr.churchofjesuschrist.org`, `directory.churchofjesuschrist.org`, `mltp-api.churchofjesuschrist.org`).
   - Because cloud models process screenshots, network payloads, and DOM contents on remote inference servers, pointing a cloud agent at a live session risks transmitting confidential member PII off-device.
   - All agent-assisted development, debugging, and verification must rely exclusively on synthetic fixtures, local test harnesses, or pre-sanitized DOM skeletons.

---

## 10. Data Stewardship, Justification Matrix & Safe AI Workflow

### 10.1 Mandatory Justification & Privacy Policy Synchronization

- **`JUSTIFICATION.md` Requirement**: Every action in `src/actions/` must have a corresponding entry in [`JUSTIFICATION.md`](file:///Users/sethbrock/Workspace/lcr-extension/extension/JUSTIFICATION.md) documenting its ecclesiastical purpose, data scope, storage boundaries, privacy precautions, and alignment with Church General Handbook Section 33.8 and Section 38.8.31.
- **New Actions Gate**: PRs or agents adding new actions or modifying data collection MUST update `JUSTIFICATION.md` before completion.
- **`PRIVACY_POLICY.md` Synchronization**: Any change to permissions, host matches, or storage keys must be reflected immediately in [`PRIVACY_POLICY.md`](file:///Users/sethbrock/Workspace/lcr-extension/extension/PRIVACY_POLICY.md).

### 10.2 Safe AI Development Workflow

- **Prohibition on Live LCR Navigation**: Cloud AI agents are strictly forbidden from navigating to, taking screenshots of, or scraping live Church or LCR pages containing real member records. Doing so transmits member PII to third-party model inference servers.
- **Sanitized DOM Skeletons**: When designing parsers or UI features, developers must first run the DOM Anonymizer utility (or strip all text/attributes to generic tokens like `[MOCK_TEXT]`, `555-0101`, `123 Main St`) before sharing HTML structures with AI models.
- **Synthetic Test Suites**: All Vitest test suites must be written using pure synthetic mock fixtures with zero real names, unit numbers, or real addresses.

### 10.3 Defensive DOM Pre-Verification & Fail-Safe Abort on LCR Updates

- **Preventing Unintended Mutations & Record Corruption**: The primary objective of defensive DOM verification is ensuring the extension **never executes unintended clicks, keystrokes, form submissions, or checkbox toggles** if Church engineers alter page layouts. Blindly automating against changed markup risks mutating the wrong member records, clearing valid data, or corrupting attendance/calling records.
- **Defensive DOM Pre-Verification**: Every action interacting with Church LCR pages must verify the expected DOM structure (table existence, row formats, column positions, tabs, or input controls) _before_ executing any mutations or clicks.
- **Fail-Safe Immediate Abortion**: If the DOM does not match expected selectors or contracts, the action must immediately and cleanly terminate without performing any mutations, leaving zero dangling overlays, loaders, or timers. It is always safer to do nothing than risk an inaccurate mutation on live ecclesiastical records.
- **Shared Maintenance Modal Notification**: Upon detecting a layout mismatch, the action must invoke `showLcrMaintenanceModal(actionName, reason)` from `@/utils` to dismiss any active loaders and display a clear modal informing the user that an LCR layout update was detected.
- **Centralized Email Constant**: All maintenance notifications and mailto links must strictly reference `Constants.MAINTENANCE_EMAIL` (`seth@brockefni.com`), never a hardcoded email literal.
