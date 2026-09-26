# Data Protection, Stewardship & Justification Matrix

This document provides the definitive architectural justification and privacy precautions for every action within **LCR Tools**. It ensures that all functionality remains strictly aligned with the principles set forth in the _General Handbook: Serving in The Church of Jesus Christ of Latter-day Saints_ (specifically **Section 33.8: Confidentiality of Records** and **Section 38.8.31: Privacy of Members**).

---

## 1. General Architectural Safeguards Across All Actions

1. **Zero External Server Infrastructure:** The extension does not operate a remote server, external database, telemetry service, or analytics pipeline. All data processing occurs exclusively within the local browser process.
2. **Session Gating & Role-Based Access:** The extension functions strictly within authenticated browser tabs where the user already holds a valid Church Account and an authorized calling (e.g. Bishopric, Clerk, Presidency).
3. **Transient Memory Processing:** With the exception of the short-lived photo cache, user-approved attendance nicknames, and catalog API keys—which are encrypted at rest using AES-256-GCM with keys derived from a user-configured Security PIN—data is processed in transient JavaScript heap memory and discarded when the tab or modal closes.
4. **Zero AI Ingestion of Live PII:** Development and test suites utilize 100% synthetic mock names and dummy data. Real member records are never fed into external AI models.
5. **Client-Side PIN Encryption-at-Rest:** Sensitive values saved on-device (clerical attendance nicknames and third-party routing API keys) are encrypted in `browser.storage.local` using standard Web Crypto AES-256-GCM with PBKDF2 key derivation (200,000 iterations). Access is protected by a user-configured 4–8 digit PIN, ensuring data cannot be retrieved in plaintext from the device disk or by unauthorized local computer users. Unlocked keys reside exclusively in volatile session memory and are flushed upon browser exit or manual session lock.

---

## 2. Action-by-Action Breakdown

### 2.1 `downloadReportData`

- **Ecclesiastical Purpose:** Clerks and secretaries frequently need to compile lists for presidency meetings or statistical analysis. LCR natively provides "Print" and "Download PDF" buttons, but PDFs are inaccessible for spreadsheet analysis.
- **Data Accessed:** Table headers and row cells from visible LCR reports (names, contact info, callings).
- **Storage & Network:** Creates a local CSV/ZIP blob in memory and triggers a standard browser download directly to the user's computer. Zero network requests.
- **Precautions Taken:**
  - Formula injection mitigation (CSV cells starting with `=`, `+`, `-`, `@` are safely escaped).
  - Prompts users with a Handbook 33.8 data stewardship warning prior to download.
- **Handbook Alignment:** Serves authorized calling duties; users are instructed to delete downloaded files immediately after use (Handbook 33.8).

---

### 2.2 `findMultipleCallings`

- **Ecclesiastical Purpose:** Bishoprics and clerks must audit calling rosters to identify members burdened with multiple callings or discover vacant positions.
- **Data Accessed:** Active calling tables across ward organizations.
- **Storage & Network:** Equivalent-calling group definitions and ignored-calling toggles (calling titles and organization names only, never member names) persist in `browser.storage.local` (`lcr_calling_groups`, `lcr_ignored_callings`). Generates optional CSV report on user request.
- **Precautions Taken:** Operates read-only on rendered DOM. No state modification of LCR records. Prompts users with a Handbook 33.8 data stewardship warning prior to CSV download.
- **Handbook Alignment:** Direct fulfillment of clerk calling responsibilities to maintain accurate unit records (Handbook 33.8).

---

### 2.3 `memberFlashcards`

- **Ecclesiastical Purpose:** Leaders, teachers, and presidency members are encouraged to know the names and faces of ward members and youth in their stewardship.
- **Data Accessed:** Member display names and profile photos from LCR Member Lists or Church Directory & Map.
- **Storage & Network:** Photos are stored in `browser.storage.local` with isolated partition keys.
- **Precautions Taken:**
  - **Photos Only:** Members without a directory portrait, with private photos, or with generic silhouette placeholders are excluded from the study deck.
  - **Strict Privacy Enforcement:** Explicitly skips members whose profile privacy is marked `PRIVATE` (`privacy.photo === 'PRIVATE'`).
  - **Automatic 24-Hour Expiration:** Cached photo tokens expire and are evicted after 24 hours.
  - **One-Click Cache Purge:** Provides a visible "Clear Stored Photos" button in the UI.
- **Handbook Alignment:** Respects member privacy choices; prevents persistent unofficial image databases (Handbook 38.8.31).

---

### 2.4 `membersOutsideBoundary`

- **Ecclesiastical Purpose:** Bishoprics have a specific ecclesiastical obligation to ensure members reside within unit boundaries. Manually auditing hundreds of addresses against boundary street maps is error-prone.
- **Data Accessed:** Unit boundary GeoJSON and household addresses from active Directory session.
- **Storage & Network:** Analyzes point-in-polygon coordinates in browser memory via Turf.js. Zero external geocoding calls.
- **Precautions Taken:**
  - Requires explicit user confirmation before initiating reload/audit.
  - Session-only pending flag; auto-cleans session storage upon completion.
  - Prompts users with a Handbook 33.8 data stewardship warning before downloading the audit CSV.
- **Handbook Alignment:** Fulfills ward boundary alignment duties without exposing member data to external mapping tools.

---

### 2.5 `noPhotoList`

- **Ecclesiastical Purpose:** Clerks and photo specialists need to know which members lack directory photos to coordinate portrait days.
- **Data Accessed:** LCR Member Directory rows or Church Directory household records, classified against the shared on-device photo cache.
- **Storage & Network:** Reads and updates `browser.storage.local` photo-cache entries (`lcr_photo_cache`) using the same cache as Member Flashcards. Optional local CSV export. On Church Directory, portrait URLs are probed only when a member is not already cached.
- **Precautions Taken:**
  - **Shared Cache:** Reuses flashcard photo-cache hits so members already classified are not re-fetched.
  - **Photos Privacy:** Directory members with `privacy.photo` marked private are omitted from the missing-photo list.
  - Prompts users with a Handbook 33.8 data stewardship warning before downloading the CSV.
- **Handbook Alignment:** Assists with official unit directory completeness (Handbook 33.8 and 38.8.31).

---

### 2.6 `processAttendance`

- **Ecclesiastical Purpose:** Sunday School and Quorum secretaries spend significant time manually entering attendance tick-boxes in LCR and repeatedly resolving common informal names and nicknames (e.g., "Jon" for "Jonathan", "Beth" for "Elizabeth").
- **Data Accessed:** Sunday meeting attendance tables, user-supplied attendance rosters, and local nickname mappings.
- **Storage & Network:** Dispatches DOM click events to native LCR buttons and writes visitor counts once after human review. Optional user-approved nickname mappings are persisted strictly on-device in `browser.storage.local` (`lcr_attendance_nicknames`). Zero external transmission, zero cloud sync.
- **Precautions Taken:**
  - Detailed diagnostic audit log modal showing every member matched, marked, or unmatched, explicitly noting nickname resolutions.
  - Prompts users with a Handbook 33.8 data stewardship warning before downloading the audit log CSV, then returns to the logs modal and completion summary.
  - Strict fuzzy-matching thresholds preventing misattribution.
  - **Never Automatic:** Nickname mappings are never applied automatically during the initial auto-mark pass; they require human one-click confirmation in the unmatched review dialog, and LCR marking for those matches is deferred until the user presses Continue.
  - **Single Visitor Write:** Visitor counts from headcount setup and unmatched visitor designations are applied to LCR once after Continue—not incrementally during review.
  - **Full Data Stewardship & PIN Encryption:** Nicknames stored in `browser.storage.local` are encrypted at rest with AES-256-GCM using keys derived from a user-configured Security PIN. Users can view, individual-delete specific aliases (preserving member mappings if other aliases remain), or clear all locally saved nicknames via the in-page "Manage Nicknames" control or via More → Manage Aliases in the extension popup. Popup access requires both active Church LCR host verification and PIN authentication; stored aliases are never loaded or displayed without unlocking.
- **Handbook Alignment:** Reduces administrative burden on secretaries while ensuring accurate quarterly reporting and maintaining strict data confidentiality (General Handbook 33.8 and 38.8.31).

---

### 2.7 `tableFilters`

- **Ecclesiastical Purpose:** Navigating dense, multi-page ministering and attendance tables is difficult on small screens or during interviews.
- **Data Accessed:** Existing DOM elements rendered in the active LCR tab.
- **Storage & Network:** Strictly client-side DOM manipulation (toggles CSS `display: none`). Zero storage, zero network calls.
- **Precautions Taken:** Completely non-destructive. Hiding a row does not alter underlying Church records.
- **Handbook Alignment:** Lowest-risk assistive UI enhancement; no data copied or extracted.

---

### 2.8 `tripPlanning`

- **Ecclesiastical Purpose:** Bishoprics, ministering companionships, and clerks must plan ministering routes and visits to newly moved-in families.
- **Data Accessed:** Visible name and address columns from the LCR Members Moved In report. When a Church unit number is available, household coordinates are read from the Church Directory households API used by Ward Boundary Audit.
- **Storage & Network:**
  - **Preferred:** Church Directory `GET /api/v4/households?unit=` using the signed-in Church Account session. Matching is performed locally by name. Matched rows receive Church `latitude` / `longitude` and are never sent to a third-party geocoder.
  - **Fallback:** Unmatched rows send **street address strings only** to Nominatim, LocationIQ, or Mapbox. Member names, phones, emails, UUIDs, and unit numbers are never attached to those requests. Results are cached locally by address (`geocode_cache`).
  - **Basemap:** Carto Voyager raster tiles (`z/x/y` only). Optional Mapbox Streets tiles if a stored Mapbox key is present.
  - **Optional road routing:** Mapbox Matrix and Directions receive coordinates only.
  - **Storage keys:** `tripPlanningData`, `tripPlanningHeaders`, `geocode_cache`, `trip_planner_starting_address` (optional default starting address), and catalog API keys in `lcr_api_keys`.
- **Precautions Taken:**
  - Church coordinates are preferred so residential addresses are not disclosed to third-party geocoders when a Directory match exists.
  - Geocode and routing requests never include member identity fields.
  - Catalog API keys (Mapbox, LocationIQ) are stored only on this device in `browser.storage.local` and encrypted at rest with AES-256-GCM when a Security PIN is configured; users cannot add custom key names. Popup access to view, edit, or reveal stored keys is strictly gated to active Church LCR domains and requires PIN unlock.
  - Prompts users with a Handbook 33.8 data stewardship warning before CSV download.
- **Handbook Alignment:** Minimizes third-party disclosure of member addresses while assisting with authorized pastoral visits (Handbook 33.8 and 38.8.31).

---

### 2.9 `autoSyncStateDropdown`

- **Ecclesiastical Purpose:** Clerks and bishoprics recording move-in and move-out records frequently encounter submission errors due to an LCR form framework bug where pre-selected default states (e.g. "UT") are not dispatched to the server unless physically toggled. This tool is designed strictly as a temporary clerical convenience workaround until Church engineering resolves the upstream form state bug in LCR.
- **Data Accessed:** DOM `<select>` elements and address input elements (`street1`, `city`, `postalCode`) within active LCR forms.
- **Storage & Network:** Stores a single boolean user preference flag in `browser.storage.local` (`lcr_passive_state_dropdown`). Zero network transmission. Zero member data stored.
- **Precautions Taken:**
  - **Temporary Lifecycle:** Designed as a temporary workaround for the active upstream LCR defect; once the bug is resolved in Church production systems, this tool will be deprecated and removed.
  - **Passive & Optional:** Off by default; requires explicit user toggle in the extension popup to activate.
  - **Non-Destructive:** Cycles the dropdown value to an alternate state and immediately restores the original pre-selected value using native prototype setters, firing synthetic change events without altering user-intended input.
  - **Single Execution:** Marks synchronized elements (`data-lcr-state-synced="true"`) to prevent duplicate cycles.
- **Handbook Alignment:** Ensures membership records are accurately processed and promptly assigned to the correct ecclesiastical unit boundaries without clerical data entry errors (Handbook 33.8).

---

## 3. Mandatory Governance for New Actions

Whenever a new action or feature is proposed or modified in this repository:

1. **Justification Entry:** A comprehensive subsection must be added to Section 2 of this file detailing ecclesiastical purpose, data scope, precautions, and Handbook alignment.
2. **Privacy Policy Synchronization:** If any new storage key, permission, or network host is introduced, [`PRIVACY_POLICY.md`](./PRIVACY_POLICY.md) must be updated in the same commit.
3. **Synthetic Test Coverage:** Unit and integration tests must exclusively use synthetic placeholders (`John Doe`, `123 Main St`). Real member records are strictly prohibited.
