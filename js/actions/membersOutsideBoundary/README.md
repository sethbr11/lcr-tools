# Members Outside Boundary (Boundary Audit)

This action performs a geometric audit of the ward directory to identify households located outside the official unit boundaries.

## 1. User Experience

From the user's perspective, the process is seamless and integrated:

1.  **Navigate** to the [Church Directory Map](https://directory.churchofjesuschrist.org/).
2.  **Click** the "Get Boundary Report (CSV)" button in the extension popup.
3.  **Confirm** the action in the custom modal: _"To capture the most recent member data, the page needs to reload. Proceed?"_
4.  The page **reloads** automatically.
5.  A **loading indicator** appears: _"Waiting for map data..."_ then _"Processing boundary data..."_
6.  A **Results Modal** appears displaying:
    - Counts of members **Inside** vs **Outside**.
    - A filterable list of households.
    - A **"Download CSV"** button to export the detailed report.

## 2. Technical Architecture

The feature is split into three modular files to maintain clean separation of concerns:

- **`main.js`**: The simple entry point that initializes the action.
- **`membersOutsideBoundaryUtils.js`**: The core logic engine (formerly "Sleeper Agent") that handles state, network interception, geometric analysis, and UI orchestration.
- **`templates.js`**: Stores all HTML strings and view logic for the modal and lists.

### Workflow Lifecycle

#### Phase 1: The Trigger

- **User Action:** Click extension button.
- **Logic:** `membersOutsideBoundaryUtils.triggerAudit()` sets a `sessionStorage` flag (`LCR_AUDIT_PENDING = "true"`) and reloads the page. This is required because the full member list is only fetched once during the initial page load.

#### Phase 2: The Trap (Network Interception)

- **Context:** Page reloads. The script runs at `document_start` (injected via manifest).
- **Wake Up:** `init()` checks for the `LCR_AUDIT_PENDING` flag.
- **Interception:** The script overrides `window.fetch` with a wrapper.
- **Capture:** As the page requests the `member-list` or `households` endpoint, the wrapper clones the response, parses the JSON, and stores the household data and Unit ID in memory.

#### Phase 3: The Analysis (Canvas Geometry)

- **Metadata:** The script utilizes the globally available `MapsService` to fetch the unit's boundary extent (North/South/East/West).
- **Overlay:** It requests a high-contrast polygon overlay image of the boundary from the map server.
- **Canvas Processing:**
  - The image is drawn onto an in-memory HTML5 Canvas.
  - **Optimization:** The canvas context uses `{ willReadFrequently: true }` to accelerate multiple pixel readback operations.
- **Point-in-Polygon Check:**
  - Each member's latitude/longitude is converted to pixel coordinates (Web Mercator projection).
  - The script checks the alpha channel of the pixel at that coordinate.
  - **Filled Pixel** = Inside Boundary.
  - **Transparent Pixel** = Outside Boundary.

#### Phase 4: Reporting

- **Visualization:** The data is passed to `templates.js` to render the results modal.
- **Export:** The `fileUtils` module is used to generate a CSV containing Name, Status (Inside/Outside), Address, and Coordinates.
- **Cleanup:** The `LCR_AUDIT_PENDING` flag is cleared to prevent loops.

## 3. Key Advantages

- **Security:** Uses the user's existing session cookies. No credentials are ever handled or stored.
- **Accuracy:** Relies on the official server-generated boundary image, ensuring the audit matches exactly what the Church sees.
- **Safety:** Zero API spam. Instead of making 300+ individual geocoding requests, it piggybacks on the single initial data load and makes one extra request for the map image.
