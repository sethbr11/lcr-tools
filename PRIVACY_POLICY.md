# Privacy Policy for LCR Tools

**Last Updated:** September 18, 2026

This privacy policy explains how the **LCR Tools** browser extension ("the extension") handles user data. Our core architectural principle is that **your data belongs exclusively to you and your local browser session**.

---

## 1. Core Privacy Principles

- **100% Client-Side Execution:** The extension operates entirely within your local browser. It does not operate any external cloud backend, server database, or remote logging infrastructure.
- **Zero Telemetry and Tracking:** We do not collect analytics, telemetry, user tracking metrics, or crash logs.
- **No Credential Harvesting:** The extension never accesses, prompts for, or handles your Church Account username, password, or authentication credentials. It functions solely within the existing authenticated session established by the authorized user.
- **Calling-Specific Access:** The extension is restricted to official Church domains (`lcr.churchofjesuschrist.org`, `lcrf.churchofjesuschrist.org`, `lcrffe.churchofjesuschrist.org`, and `directory.churchofjesuschrist.org`), which are already protected by Church role-based access control.

---

## 2. Data Collection, Processing, and Storage

### A. Data Read From Active Pages

The extension reads information directly from the active DOM elements of Church webpages to perform user-initiated actions. This includes table rows, member rosters, attendance statuses, calling assignments, and boundary polygons. This information is processed exclusively in transient browser memory to render UI features.

### B. Local Device Storage (`browser.storage.local`)

The extension utilizes your browser's isolated local storage (`browser.storage.local`) for:

1. **User Preferences:** Functional settings such as preferred geocoding providers, sort directions, modal preferences, and passive tool toggles (`lcr_passive_state_dropdown`).
2. **Member Photo Cache:** To support **Member Flashcards** and **Download List of Members with No Photo** without repeatedly requesting images over the network, photo endpoints, has-photo flags, and timestamps may be stored in local extension storage.
   - **Strict Isolation:** Data stored in `browser.storage.local` is partitioned by the browser and cannot be accessed by other websites or extensions. It is never synced to your Google Account (no `storage.sync`).
   - **Photo Privacy Opt-Outs:** The extension strictly checks and respects member privacy flags (e.g. `privacy.photo === 'PRIVATE'`). Members who set their photos to private are never cached or displayed.
3. **Attendance Nickname Mapping:** To prevent repetitive clerical matching of common informal names (e.g. "Jon" for "Jonathan"), user-confirmed nickname pairings are stored in isolated local extension storage (`lcr_attendance_nicknames`).
   - **Client-Side Encryption at Rest:** When a Security PIN is configured, nickname mappings are encrypted at rest with AES-256-GCM using keys derived from PBKDF2 (SHA-256, 200,000 iterations, 16-byte cryptographic salt, and 12-byte initialization vector per write).
   - **Local Partition:** Nickname mappings are stored strictly on-device in `browser.storage.local`. They are never transmitted over the network or synced to cloud accounts.
   - **User Verification:** Saved nicknames are never applied automatically to mutate records without human selection.
   - **PIN Authentication & Host Gating:** Unlocking and viewing stored aliases requires entering the user-configured PIN and is gated strictly to Church LCR pages (`lcr`, `lcrf`, or `lcrffe.churchofjesuschrist.org`). The popup refuses to load or display stored nicknames unless both conditions are met.
   - **User Management & Purge:** Users can review, delete individual aliases without deleting entire member mappings, or purge all nicknames through the in-page "Saved Nicknames" manager, More → Manage Aliases, or by resetting their Security PIN.
4. **Calling Group Pairings & Ignored Callings:** To treat equivalent assignments (for example Bishop across Bishopric and Aaronic Priesthood organizations) as a single calling, and to exclude optional assignments such as Temple Worker from the multiple-callings count, user-editable group definitions and ignored-calling toggles are stored in isolated local extension storage (`lcr_calling_groups`, `lcr_ignored_callings`).
   - **No Member PII:** Stored records contain only calling titles, organization names, group labels, and ignore enabled/disabled flags. Member names are never written to these keys.
   - **Local Partition:** Definitions remain on-device in `browser.storage.local` and are never transmitted or synced.
   - **User Management:** Users can add, edit, remove, or toggle these rules from the in-page "Manage Groups" editor, including deleting the built-in presets.
5. **Trip Planner Working Set:** Member names, addresses, and optional coordinates extracted from the Members Moved In report are stored briefly in `tripPlanningData` / `tripPlanningHeaders` so the planner tab can load them. Geocode results are cached by address string in `geocode_cache` to avoid repeat lookups. An optional user-saved default starting address is stored in `trip_planner_starting_address`.
6. **Catalog API Keys:** Mapbox and LocationIQ keys that the extension asks for may be stored in `lcr_api_keys`.
   - **Client-Side Encryption at Rest:** When a Security PIN is configured, API keys are encrypted at rest with AES-256-GCM using PBKDF2 key derivation.
   - **Host & PIN Gated Access:** Stored keys remain on-device, are masked by default, and are never synced. Popup access to view or modify stored API keys requires active PIN authentication and is gated strictly to authenticated Church LCR domains (`lcr`, `lcrf`, or `lcrffe.churchofjesuschrist.org`); the extension refuses to read or display stored keys unless the active tab is on an LCR host.
7. **Security PIN Sentinel & Session Key:**
   - **Verification Sentinel (`lcr_security_pin_sentinel`):** Stored in `browser.storage.local` as an encrypted payload containing a fixed sentinel string. It validates correct PIN entry without storing the PIN itself in plaintext or as an unkeyed hash.
   - **Volatile Session Cache (`lcr_session_unlocked_pin`):** Kept in transient memory and `browser.storage.session` solely for the duration of the browser session so users do not need to re-enter their PIN on every action. It is immediately cleared upon browser restart, manual "Lock Session", or PIN reset.

### C. File Downloads & CSV Export

Features such as **Download Report Data**, **Find Multiple Callings**, **Ward Boundary Audit**, **Members with No Photo**, attendance action logs, and **Trip Planning** generate CSV files directly within your browser using client-side JavaScript.

- These files are saved directly to your local computer's download folder.
- **Data Stewardship:** In accordance with Church _General Handbook_ Section 33.8, CSV downloads from **Download Report Data**, **Find Multiple Callings**, **Ward Boundary Audit**, **Members with No Photo**, attendance action logs, and **Trip Planning** prompt a stewardship confirmation before the file is saved. Exported files should be used exclusively for authorized calling tasks, stored securely, and deleted promptly once the task is complete.

### D. Trip Planning Coordinates and Mapping

When utilizing the **Trip Planning** route organizer:

- **Preferred method:** The extension first tries to reuse Church Directory household coordinates (`GET /api/v4/households?unit=`) from the signed-in Church Account session. Name matching happens locally. Matched rows are plotted without sending addresses to any third-party geocoder.
- **Fallback method:** Only unmatched rows send **street address strings** to Nominatim, LocationIQ, or Mapbox. **Member names, phone numbers, email addresses, unit numbers, and member IDs are never attached to or transmitted in these requests.**
- **Tiles:** The map loads Carto Voyager raster tiles as `z/x/y` image requests that do not include member data. If a Mapbox key is stored, Mapbox Streets tiles may be used instead.
- **Road routing:** Optional Mapbox Matrix and Directions requests contain coordinates only.

---

## 3. Extension Permissions Justification

| Permission                                                                                                                        | Type | Justification                                                                                                                                                                                        |
| :-------------------------------------------------------------------------------------------------------------------------------- | :--- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripting`                                                                                                                       | API  | Enables injection of UI modals, flashcard overlays, and table filters into active tabs upon user invocation.                                                                                         |
| `storage`                                                                                                                         | API  | Persists user preferences, calling-group and ignored-calling definitions, attendance nicknames, catalog API keys, trip planner working data, and short-lived photo cache locally within the browser. |
| `https://lcr.churchofjesuschrist.org/*`<br>`https://lcrf.churchofjesuschrist.org/*`<br>`https://lcrffe.churchofjesuschrist.org/*` | Host | Target web application where the extension provides table filtering, export, and attendance assistance.                                                                                              |
| `https://directory.churchofjesuschrist.org/*`                                                                                     | Host | Target directory page where the extension provides boundary audits, member flashcard study tools, and Trip Planner household coordinates.                                                            |
| `https://mltp-api.churchofjesuschrist.org/*`<br>`https://ws.churchofjesuschrist.org/*`                                            | Host | Official Church API and media endpoints used to fetch portrait metadata and load authenticated profile photos for Member Flashcards and No Photo reports.                                            |
| `https://nominatim.openstreetmap.org/*`<br>`https://us1.locationiq.com/*`<br>`https://api.mapbox.com/*`                           | Host | Optional Trip Planning fallback geocoding and Mapbox road routing. Address strings only for geocode; coordinates only for routing.                                                                   |
| `https://*.basemaps.cartocdn.com/*`                                                                                               | Host | Carto Voyager map tiles used as the Trip Planner basemap (`z/x/y` requests only).                                                                                                                    |

---

## 4. Changes to This Privacy Policy

If our data handling practices or extension features change, this Privacy Policy will be updated in the extension repository and in the Chrome Web Store listing.

---

## 5. Contact & Inquiries

For questions, bug reports, or privacy inquiries regarding LCR Tools, please contact:

- **Developer:** Seth Brock
- **Email:** seth@brockefni.com
- **Repository:** [GitHub Project](https://github.com/sethbr11/lcr-tools)
