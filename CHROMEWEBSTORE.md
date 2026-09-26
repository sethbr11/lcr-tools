# Chrome Web Store Listing — LCR Tools

> **Extension ID:** `camjilfjkjmgcpmnheoeoomfndedpmbn`  
> **Store URL:** [Chrome Web Store Listing](https://chromewebstore.google.com/detail/lcr-tools/camjilfjkjmgcpmnheoeoomfndedpmbn)  
> **Current Version:** 2.0.0  
> **Last Updated:** September 2026

---

## 1. Store Description (Ready to Copy-Paste)

Copy and paste the text below directly into the **Detailed Description** box in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/):

```text
[UNOFFICIAL PRODUCTIVITY TOOL]
IMPORTANT NOTICE: LCR Tools is an independent, open-source browser extension developed by and for local Church leaders to assist with administrative calling duties. It is NOT an official application, and is NOT affiliated with, authorized, maintained, sponsored, or endorsed by The Church of Jesus Christ of Latter-day Saints.

---

LCR Tools is a cross-browser extension designed to enhance the efficiency and usability of Leader and Clerk Resources (LCR) for local clerks, secretaries, and presidencies. It provides powerful client-side tools for data analysis, attendance recording, member information management, and travel planning—streamlining repetitive administrative burdens so leaders can focus on ministering.

Updated for the 2026 React (Eden) UI Overhaul! This extension has been modernized to provide seamless, high-performance support for the latest LCR interface updates.

Key Features:
- Effortless Attendance: Enter Sunday attendance via CSV or formatted roster. Automatically matches member names, handles pagination, and routes visitors to proper organization buckets.
- Trip Planning: Plan ministering routes and visits for newly moved-in families. Prefers Church Directory household coordinates and only geocodes unmatched addresses.
- Advanced Report Export: Download table data directly into clean CSV format for authorized spreadsheet tasks. Includes formula-injection protection and multi-table ZIP archiving.
- Synchronized Table Filters: Apply powerful column-based search, date filters, and calling status toggles across multi-table pages simultaneously.
- Name & Face Flashcards: Learn names and faces with interactive study flashcards. Honors member photo privacy opt-outs and automatically manages short-lived local caches.
- Ward Boundary Audit: Instantly detect households located outside official unit boundaries using geometric point-in-polygon analysis.
- Multiple Callings Finder: Audit unit records to find members holding duplicate callings or discover unfilled assignments.
- Missing Photo Tracker: Identify members lacking directory photos to coordinate portrait sessions.

Data Privacy & Security:
- 100% Client-Side: All processing occurs entirely within your local browser. Zero data is transmitted to external servers or cloud databases.
- Calling-Gated: Only operates on official Church pages where you are already signed in with authorized access.
- Zero Tracking: No telemetry, no user tracking, and no credential collection.

Please report issues, suggestions, or feedback to seth@brockefni.com.

Recent Updates:
(2.0.0)
- Cross-Browser Engine Modernization: Complete rebuild on WXT (Manifest V3 for Chrome, Manifest V2 for Firefox and Safari) with strict TypeScript architecture and zero-any safety.
- Integrated Action Directory: Built-in searchable and categorized tools browser within the popup with direct one-click execution and passive tool status badges.
- Passive Actions Framework: Background execution engine for automated page workflows, including Auto-Sync State Dropdown for reliable LCR address persistence.
- Advanced Calling Management: Interactive Calling Groups editor, custom rules configuration, and ignore list management for auditing multiple callings.
- Modernized Boundary Audit: Direct GeoJSON boundary fetching and Turf.js point-in-polygon spatial calculations with tri-state status reporting and formula-injection protected CSV exports.
- Enhanced Trip Planner: International address parsing, Turf spatial clustering, click-to-pin coordinate targeting, and automated Church Directory coordinate lookup.
- Encrypted Storage & Security: Client-side AES-GCM and SHA-256 salted PIN protection for secure API key storage and diagnostic logs.
- Privacy & PII Anonymizer: Automated in-memory DOM anonymizer for safe development without transmitting member records.

(1.5.0)
- 2026 Second-Hour Split Attendance: Full support for the new LCR schedule allowing attendance entry for Sunday School, Class/Quorum (Elders Quorum/Relief Society), or both simultaneously.
- Single Sunday & Single Class Navigation: Modernized navigation flow to operate directly on Single Sunday date bar tabs and dynamic Class/Quorum dropdown filters.
- Automated Multi-Organization Visitor Processing: Visitor counts automatically route to their mapped organization views (Men -> Elders Quorum, Women -> Relief Society, Youth -> Aaronic Priesthood/Young Women, Children -> Primary) and save per organization.
- Smart Organization Reset: Restores the view back to All Classes and Quorums after visitor processing completes.
- Enhanced Modal Usability: Redesigned class selection with high-contrast indicator cards, modal-wide paste detection, and locked top scroll position on launch.

(1.4.2)
- Church Directory & Map Integration: Member Flashcards is now fully supported on the Ward Directory & Map page (directory.churchofjesuschrist.org) in addition to LCR member lists.
- Instant Directory Photo Extraction: Intercepts Next.js directory network payloads directly, loading all member photos immediately without slow DOM navigation.
- Individual Member Filtering: Automatically filters out non-individual households (couples, families) to focus flashcards strictly on individual ward members.
- CSP-Compliant Silhouette Fallback: Replaced missing photo placeholders with an inline SVG silhouette, eliminating Content Security Policy errors on missing images.
- Photo Cache Expiration: Enforced a 24-hour expiration rule on cached photo tokens to ensure member photos stay current and avoid broken links.
- Performance & Log Cleanup: Streamlined background operations and removed verbose prototyping logs.

---
Note: This tool is an independent open-source project and is not an official application of The Church of Jesus Christ of Latter-day Saints.
```

---

## 2. Permissions Justification (For Store Review)

When submitting updates in the Chrome Developer Dashboard, use these justifications:

| Permission                                                                                                                        | Type            | Justification                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripting`                                                                                                                       | permission      | Used to inject helper tools, flashcard modals, and report utilities into active LCR and Directory tabs upon explicit user action.                         |
| `storage`                                                                                                                         | permission      | Used to cache member photos, catalog API keys, trip planner working data, and user preferences locally on the client.                                     |
| `https://lcr.churchofjesuschrist.org/*`<br>`https://lcrf.churchofjesuschrist.org/*`<br>`https://lcrffe.churchofjesuschrist.org/*` | host_permission | Target web application where the extension provides table filtering, export, and attendance assistance.                                                   |
| `https://directory.churchofjesuschrist.org/*`                                                                                     | host_permission | Target directory page where the extension provides boundary audits, flashcards, and Trip Planner household coordinates.                                   |
| `https://mltp-api.churchofjesuschrist.org/*`<br>`https://ws.churchofjesuschrist.org/*`                                            | host_permission | Official Church API and media endpoints used to fetch portrait metadata and load authenticated profile photos for Member Flashcards and No Photo reports. |
| `https://nominatim.openstreetmap.org/*`<br>`https://us1.locationiq.com/*`<br>`https://api.mapbox.com/*`                           | host_permission | Optional Trip Planning fallback geocoding and Mapbox road routing.                                                                                        |
| `https://*.basemaps.cartocdn.com/*`                                                                                               | host_permission | Carto Voyager map tiles used as the Trip Planner basemap.                                                                                                 |

---

## 3. GitHub Actions Automated Publishing Setup

We use [`mobilefirstllc/cws-publish`](https://github.com/marketplace/actions/publish-chrome-extension-to-chrome-web-store) in `.github/workflows/release.yml`.

### Required GitHub Secrets

To allow automated publishing on version bumps, set the following repository secrets:

| Secret Name            | Description          | Source                      |
| ---------------------- | -------------------- | --------------------------- |
| `CHROME_CLIENT_ID`     | OAuth2 Client ID     | Google Cloud Console        |
| `CHROME_CLIENT_SECRET` | OAuth2 Client Secret | Google Cloud Console        |
| `CHROME_REFRESH_TOKEN` | OAuth2 Refresh Token | Google OAuth 2.0 Playground |

_(The Extension ID `camjilfjkjmgcpmnheoeoomfndedpmbn` is pre-configured in `.github/workflows/release.yml`.)_
