/**
 * Templates for the processAttendance action UI
 */
(() => {
  utils.returnIfLoaded("processAttendanceTemplates");

  const templates = {
    setupModalStructure: `
      <div style="margin-bottom: 20px;">
        <label for="lcr-tools-attendance-date" style="display:block; margin-bottom:8px; font-weight:bold;">1. Select Attendance Date (Sunday):</label>
        <input type="date" id="lcr-tools-attendance-date" style="padding:8px; border:1px solid #ccc; border-radius:4px; min-width:180px; font-size: 1em; display: inline-block;">
        <button id="lcr-tools-download-sample" style="padding:9px 12px; margin-left:10px; background-color:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer; font-size: 0.95em; vertical-align: top;">Download Sample CSV</button>
      </div>

      <div style="margin-bottom: 20px;">
        <label for="lcr-tools-csv-upload" style="display:block; margin-bottom:8px; font-weight:bold;">2. Upload Attendance CSV:</label>
        <input type="file" id="lcr-tools-csv-upload" accept=".csv" style="padding:8px; border:1px solid #ccc; border-radius:4px; width: calc(100% - 22px); font-size: 1em;">
        <p style="font-size:0.85em; color: #555; margin-top: 5px;">CSV must contain 'Date', 'First Name', 'Last Name' columns. All dates in CSV must be the same Sunday.</p>
      </div>

      <div id="lcr-tools-attendance-status" style="margin-top:15px; padding:10px; border-radius:4px; font-size:0.9em; border:1px solid transparent; min-height: 20px;"></div>

      <p style="font-size:0.85em; color: #444; margin-top: 20px; padding: 10px; background-color: #f8f9fa; border-left: 3px solid #007bff; border-radius: 4px;">
        <strong>Note:</strong> After processing, two CSV files will be downloaded:<br>
        - An <strong>update summary report</strong> showing the status of each name from your input file.<br>
        - A <strong>detailed action log</strong> showing all steps taken by the extension.
      </p>`,
    validationError: `<strong>CSV Validation Errors:</strong><ul>{{errorMessages}}</ul> Please correct the CSV and re-upload.`,
    parseSuccess: `CSV successfully parsed: {{nameCount}} names for date {{targetDate}}. {{duplicateMessage}}`,
    resultsPopupStyles: `
      .lcrx-results-wrap { position: relative; }
      .lcrx-results-table { border-collapse: collapse; width: 100%; }
      .lcrx-results-table thead th {
        position: sticky; 
        top: 0;
        background: #f7f8fa;
        z-index: 60000 !important;
        box-shadow: 0 1px 0 rgba(0,0,0,0.1);
      }
      .lcrx-results-table thead {
        position: relative;
        z-index: 60000 !important;
      }
      .lcrx-results-table tbody tr:first-child td { padding-top: 6px; }
      .lcrx-results-table input[type="text"] { 
        position: relative; 
        z-index: 1 !important;
      }
      
      /* Ensure all elements in table cells stay below headers */
      .lcrx-results-table tbody td * {
        position: relative;
        z-index: 1 !important;
      }

      /* Force higher stacking context on modal */
      #lcr-tools-attendance-results-overlay .modal {
        transform: translateZ(0);
      }
      
      .lcrx-skip-col { width: 40px; text-align: center; }
      .lcrx-skip-btn {
        width: 28px; height: 28px;
        border: 1px solid #ffffff00; border-radius: 4px;
        background: #fff; cursor: pointer; line-height: 1; font-size: 16px;
      }
      .lcrx-skip-btn:hover { background: #f1f3f5; }

      .lcrx-skipped-bar {
        display: none; flex-wrap: wrap; gap: 6px;
        margin: 8px 0; padding: 6px; border: 1px dashed #ced4da; border-radius: 6px;
        background: #fafbfc;
      }
      .lcrx-skip-chip {
        display: inline-flex; align-items: center; gap: 6px;
        background: #f1f3f5; border: 1px solid #dee2e6; border-radius: 16px;
        padding: 4px 8px;
      }
      .lcrx-skip-chip button {
        background: transparent; border: none; color: #007bff;
        cursor: pointer; font-weight: 600; padding: 0;
      }
    `,
    resultsPopupUnmatchedSection: `
      <div id="lcr-tools-unmatched-section" style="margin-bottom: 20px;">
        <h3 style="color: #856404; margin-bottom: 15px;">Unmatched Names - Optional Guest Processing ({{unmatchedCount}}):</h3>
        <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead style="background-color: #f8f9fa; position: sticky; top: 0;">
              <tr>
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd; width: 30%;">Name</th>
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd; width: 50%;">Search Ward Members</th>
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd; width: 20%;">Guest Type</th>
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd; width: 40px;">Skip</th>
              </tr>
            </thead>
            <tbody id="lcr-tools-unmatched-table-body">
              {{tableRows}}
            </tbody>
          </table>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
          <h4 style="margin-top: 0; margin-bottom: 15px; color: #495057;">Additional Guest Counts:</h4>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 15px;">
            <div>
              <label style="display: block; font-weight: bold; margin-bottom: 5px;">Men:</label>
              <input type="number" id="lcr-tools-guest-men" min="0" value="0" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div>
              <label style="display: block; font-weight: bold; margin-bottom: 5px;">Women:</label>
              <input type="number" id="lcr-tools-guest-women" min="0" value="0" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div>
              <label style="display: block; font-weight: bold; margin-bottom: 5px;">Young Men:</label>
              <input type="number" id="lcr-tools-guest-ym" min="0" value="0" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div>
              <label style="display: block; font-weight: bold; margin-bottom: 5px;">Young Women:</label>
              <input type="number" id="lcr-tools-guest-yw" min="0" value="0" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div>
              <label style="display: block; font-weight: bold; margin-bottom: 5px;">Children:</label>
              <input type="number" id="lcr-tools-guest-children" min="0" value="0" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
          </div>
          <div style="text-align: center;">
            <button id="lcr-tools-process-guests" style="padding: 12px 20px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; font-weight: bold;">
              Update and Mark Guests
            </button>
          </div>
        </div>
      </div>
    `,
    resultsPopupUnmatchedTableRow: `
      <tr data-index="{{index}}" style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; vertical-align: middle;">{{fullName}}</td>
        <td style="padding: 10px;" id="search-cell-{{index}}">
          <!-- Search component will be inserted here -->
        </td>
        <td style="padding: 10px;" id="category-cell-{{index}}">
          <!-- Category toggle will be inserted here -->
        </td>
        <td class="lcrx-skip-col" style="text-align: center;">
          <button type="button" class="lcrx-skip-btn" title="Skip this name">×</button>
        </td>
      </tr>
    `,
    resultsPopupUnmatchedList: `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #856404; margin-bottom: 10px;">Names Not Found in LCR ({{unmatchedCount}}):</h3>
        <ul style="margin: 0; padding-left: 20px; max-height: 150px; overflow-y: auto;">
          {{nameListItems}}
        </ul>
      </div>
    `,
    logsPopupContent: `
    <div style="margin-bottom: 20px;">
      <pre style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; border: 1px solid #dee2e6; font-family: 'Courier New', monospace; font-size: 0.85em; max-height: 400px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word;">{{logEntries}}</pre>
    </div>
  `,
  };

  window.processAttendanceTemplates = templates;
})();
