# Privacy Policy for LCR Tools

**Last Updated:** January 18, 2026

This privacy policy explains how the "LCR Tools" Chrome Extension ("the extension") handles your data. Your privacy is very important to us. The core principle of this extension is that **your data is your data**.

## Data Collection and Usage

The extension is designed to interact with the content of Leader and Clerk Resources (LCR) and Directory pages (`lcr.churchofjesuschrist.org`, `lcrf.churchofjesuschrist.org`, `lcrffe.churchofjesuschrist.org`, and `directory.churchofjesuschrist.org`) that you are actively viewing in your browser.

- **Data Read from the Page:** The extension reads information directly from the web page to perform its functions. This includes data from tables in reports, member lists, map boundaries, and other page content required to enable features like data export and boundary analysis.
- **No Data Transmission:** The extension **does not** collect, store, or transmit any of your personal information or browsing data to any external server or third party controlled by the extension developers.
- **Third-Party Geocoding (Trip Planning):** If you use the "Trip Planning" feature to map member addresses, the specific address strings (and only the address strings) are sent to your chosen geocoding provider (Nominatim/OpenStreetMap, LocationIQ, or Mapbox) to convert them into coordinates. This interaction happens directly between your browser and the provider's API. No member names or other personal details are sent.
- **Local Map Processing:** For features like the Boundary Audit, member location data and map boundaries are analyzed entirely within your browser's memory using standard HTML5 Canvas technologies. No location data is sent to external mapping services by the extension.
- **User-Initiated Exports:** Features like "Download Report Data" or "Export Member List" compile data from the page and allow you to save it directly to your computer as a CSV file. This data is never sent anywhere else; the file is created and downloaded entirely within your browser. You are responsible for safeguarding this exported data.

## Data Storage

The extension **does not** store any personal data. It may use Chrome's local storage for benign settings related to the extension's functionality (e.g., trip planning preferences), but not for your personal information from LCR.

## Permissions Justification

The extension requests the following permissions:

- `"host_permissions"`:
    - `https://lcr.churchofjesuschrist.org/*`, `https://lcrf.churchofjesuschrist.org/*`, `https://lcrffe.churchofjesuschrist.org/*`, `https://directory.churchofjesuschrist.org/*`: Required to interact with Church websites to provide extension features.
    - `https://nominatim.openstreetmap.org/*`, `https://us1.locationiq.com/*`, `https://api.mapbox.com/*`: Required *only* for the Trip Planning feature to perform address geocoding via these public APIs.
- `scripting`: This permission is necessary to inject the code that provides the extension's features onto the supported pages.
- `storage`: This permission is used to save user preferences locally (such as trip planning state) to improve the user experience.

## Changes to This Privacy Policy

We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page.

## Contact Us

If you have any questions about this privacy policy, please email seth@brockefni.com.
