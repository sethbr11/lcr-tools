# Chrome Web Store Listing — LCR Tools

> **Extension ID:** `camjilfjkjmgcpmnheoeoomfndedpmbn`  
> **Store URL:** [Chrome Web Store Listing](https://chromewebstore.google.com/detail/lcr-tools/camjilfjkjmgcpmnheoeoomfndedpmbn)  
> **Current Version:** 1.4.2  
> **Last Updated:** 2026-09-02

---

## 1. Store Description (Ready to Copy-Paste)

Copy and paste the text below directly into the **Detailed Description** box in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/):

```text
An extension to help make LCR easier to use.

LCR Tools is a Google Chrome extension designed to enhance the functionality and user experience of LCR (Leader and Clerk Resources) for The Church of Jesus Christ of Latter-day Saints. It provides advanced tools for exporting data, processing attendance, managing member information, and more—streamlining common administrative tasks for clerks, secretaries, and leaders.

Updated for the 2026 React (Eden) UI Overhaul! This extension has been modernized to provide seamless, high-performance support for the latest LCR interface updates. However, the UI overhaul is still recent and issues can be expected. Please email any issues to seth@brockefni.com.

Key Features:
- Effortless Attendance: Upload your Sunday attendance via CSV. The tool handles fuzzy name matching, member pagination, and guest management automatically.
- Trip Planning: A powerful tool for planning visits. Geocode member addresses, cluster households into groups, and optimize travel routes on an interactive map.
- Advanced Report Export: Download any table from LCR directly into CSV format. Automatically identifies granular sub-sections (e.g., "Presidency" vs. "Teachers") and bundles multiple tables into organized ZIP files.
- Synchronized Table Filters: Apply powerful search and filter criteria across all organizational blocks on a page simultaneously.
- Photo Management: Learn names and faces with interactive Flashcards or download a list of individuals missing photos. Includes a high-speed stable photo cache.
- Context-Aware Actions: The extension menu automatically updates to show the most relevant tools for the specific page you are viewing.
- Boundary Audits: Instantly identify households located outside official unit boundaries using geometric analysis.
- Multiple Callings Finder: Quickly identify members holding more than one assignment to ensure ward records remain accurate.

Recent Updates:
(1.4.2)
- Church Directory & Map Integration: Member Flashcards is now fully supported on the Ward Directory & Map page (directory.churchofjesuschrist.org) in addition to LCR member lists.
- Instant Directory Photo Extraction: Intercepts Next.js directory network payloads directly, loading all member photos immediately without slow DOM navigation.
- Individual Member Filtering: Automatically filters out non-individual households (couples, families) to focus flashcards strictly on individual ward members.
- CSP-Compliant Silhouette Fallback: Replaced missing photo placeholders with an inline SVG silhouette, eliminating Content Security Policy errors on missing images.
- Photo Cache Expiration: Enforced a 24-hour expiration rule on cached photo tokens to ensure member photos stay current and avoid broken links.
- Performance & Log Cleanup: Streamlined background operations and removed verbose prototyping logs.

(1.4.1)
- Modern Browser Mapping: Updated browser engine mappings and dependency audits to ensure optimal cross-version performance.
- Script Injection Resilience: Enhanced script injection reliability and error recovery on dynamic LCR sub-routes.
- UI Stability Fixes: Resolved edge cases in modal backdrop handling and loading indicator cleanup.

(1.4.0)
- Accelerated Flashcard Loading: Dramatically faster setup and extraction pipeline for flashcards and members without photos.
- Direct API Acceleration: Bypasses redundant DOM interactions by querying internal member card data endpoints in batched requests.
- Optimized Photo Caching: Improved photo cache validation and hit rate across multiple member study sessions.

---
Note: This tool is an independent open-source project and is not an official application of The Church of Jesus Christ of Latter-day Saints.
```

---

## 2. GitHub Actions Automation Setup

We use [`mobilefirstllc/cws-publish`](https://github.com/marketplace/actions/publish-chrome-extension-to-chrome-web-store) in `.github/workflows/release.yml`.

### Required GitHub Secrets
To allow GitHub Actions to upload and publish to the Chrome Web Store, add the following secrets in **Repository Settings &rarr; Secrets and variables &rarr; Actions**:

| Secret Name | Description | Source |
|---|---|---|
| `CHROME_CLIENT_ID` | OAuth2 Client ID | Google Cloud Console |
| `CHROME_CLIENT_SECRET` | OAuth2 Client Secret | Google Cloud Console |
| `CHROME_REFRESH_TOKEN` | OAuth2 Refresh Token | Google OAuth Playground / Token Script |

*(Note: The Extension ID `camjilfjkjmgcpmnheoeoomfndedpmbn` is already configured in the workflow.)*

---

## 3. How to Obtain Google API Credentials (One-Time Setup)

Google requires an OAuth Client with the Chrome Web Store API enabled to authenticate deployments.

### Step 1: Enable Chrome Web Store API
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select or create a project (e.g. `Chrome Web Store Publishing`).
3. Navigate to **APIs & Services &rarr; Library**.
4. Search for **Chrome Web Store API** and click **Enable**.

### Step 2: Configure OAuth Consent Screen
1. Go to **APIs & Services &rarr; OAuth consent screen**.
2. Select User Type: **External** and click **Create**.
3. Enter App Name (e.g. `CWS Publisher`), support email, and developer contact info.
4. Under **Scopes**, click **Add or Remove Scopes** and add:
   `https://www.googleapis.com/auth/chromewebstore`
5. Under **Test Users**, add the Google email address that owns your Chrome Web Store developer account.
6. Save and continue.

### Step 3: Create OAuth Client ID
1. Go to **APIs & Services &rarr; Credentials**.
2. Click **Create Credentials &rarr; OAuth client ID**.
3. Choose **Desktop App** (or Web application with `https://developers.google.com/oauthplayground` as an authorized redirect URI).
4. Click **Create** and save your **Client ID** and **Client Secret**.

### Step 4: Generate Refresh Token via OAuth Playground
1. Go to the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Click the gear icon ⚙️ in the upper-right corner:
   - Check **"Use your own OAuth credentials"**.
   - Paste your **OAuth Client ID** and **OAuth Client Secret**.
3. In the left panel (*Step 1: Select & authorize APIs*):
   - Enter `https://www.googleapis.com/auth/chromewebstore` in the text box.
   - Click **Authorize APIs** and log in with your Chrome Web Store developer account.
4. In *Step 2: Exchange authorization code for tokens*:
   - Click **Exchange authorization code for tokens**.
   - Copy the value of **Refresh token**.
5. Add `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, and `CHROME_REFRESH_TOKEN` to your GitHub repo secrets.

---

## 4. Permissions Justification (For Store Review)

When submitting updates in the Chrome Developer Dashboard, use these justifications:

| Permission | Type | Justification |
|---|---|---|
| `scripting` | permission | Used to inject helper tools, flashcard modals, and report utilities into active LCR and Directory tabs upon explicit user action. |
| `storage` | permission | Used to cache member photos and user preferences locally on the client to avoid repeated network requests. |
| `https://lcr.churchofjesuschrist.org/*` | host_permission | Target web application where the extension provides table filtering, export, and attendance assistance. |
| `https://directory.churchofjesuschrist.org/*` | host_permission | Target directory page where the extension provides boundary audits and member flashcard study tools. |
| `https://nominatim.openstreetmap.org/*` | host_permission | Used for client-side address geocoding in the Trip Planning tool. |
| `https://us1.locationiq.com/*` | host_permission | Alternative geocoding provider for address verification in Trip Planning. |
| `https://api.mapbox.com/*` | host_permission | Used to calculate driving routes and distances between households for trip planning. |
