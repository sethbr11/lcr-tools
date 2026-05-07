/**
 * Templates for the processAttendance action UI
 */
(() => {
  utils.returnIfLoaded("processAttendanceTemplates");

  const templates = {
    setupModalStructure: `
      <div style="margin-bottom: 20px;">
        <label for="lcr-tools-attendance-date" style="display:block; margin-bottom:8px; font-weight:bold;">1. Select Attendance Date (Sunday):</label>
        <div style="display: flex; align-items: flex-start; gap: 10px;">
          <input type="date" id="lcr-tools-attendance-date" style="padding:8px; border:1px solid #ccc; border-radius:4px; min-width:180px; font-size: 1em;">
          <button id="lcr-tools-download-sample" style="padding:9px 12px; background-color:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer; font-size: 0.95em;">Download Sample CSV</button>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <label style="display:block; margin-bottom:8px; font-weight:bold;">2. Provide Attendance Data:</label>
        
        <div id="lcr-tools-input-panels">
          <!-- Main Paste Target -->
          <div id="lcr-tools-panel-paste">
            <div id="lcr-tools-paste-target" tabindex="0" style="width:calc(100% - 22px); min-height:120px; padding:20px; border:2px dashed #007bff; border-radius:8px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; transition: all 0.2s ease; background-color:#f0f7ff;" aria-label="Click here then paste your spreadsheet data">
              <div style="font-size:2.5em; margin-bottom:8px;">📋</div>
              <div style="font-weight:bold; color:#0056b3; margin-bottom:4px; font-size: 1.1em;">Ready to Receive Paste</div>
              <div style="font-size:0.9em; color:#495057; text-align: center;">Copy rows from your spreadsheet (Timestamp, First Name, Last Name)<br>then press <strong>Ctrl+V</strong> or <strong>⌘V</strong> here.</div>
            </div>
            
            <div id="lcr-tools-paste-actions" style="margin-top:12px; display:flex; gap:10px; align-items: center;">
              <button id="lcr-tools-paste-more" type="button" style="padding:8px 16px; background-color:#28a745; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.95em; display:none; font-weight: 500;">+ Add More Records</button>
              <button id="lcr-tools-view-edit-data" type="button" style="padding:8px 16px; background-color:#007bff; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.95em; display:none; font-weight: 500;">View / Edit Records</button>
              <span id="lcr-tools-record-count" style="font-size: 0.9em; color: #666; font-weight: 500; display: none;"></span>
            </div>
          </div>

          <!-- Legacy CSV Upload (Smaller/Secondary) -->
          <div id="lcr-tools-panel-upload" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
            <label for="lcr-tools-csv-upload" style="display:block; margin-bottom:5px; font-size:0.85em; color:#666; font-weight:bold;">Or upload a CSV file:</label>
            <input type="file" id="lcr-tools-csv-upload" accept=".csv" style="padding:6px; border:1px solid #ccc; border-radius:4px; width: calc(100% - 18px); font-size: 0.9em;">
          </div>
        </div>
      </div>

      <div id="lcr-tools-attendance-status" style="margin-top:15px; padding:12px; border-radius:4px; font-size:0.95em; border:1px solid transparent; min-height: 20px; line-height: 1.4;"></div>

      <div id="lcr-tools-edit-view-container" style="display:none; margin-top: 15px; border-top: 2px solid #eee; padding-top: 15px;"></div>

      <p style="font-size:0.85em; color: #444; margin-top: 20px; padding: 12px; background-color: #f8f9fa; border-left: 4px solid #007bff; border-radius: 4px; line-height: 1.4;">
        Paste directly into the blue box above. Duplicates for the same person on the same date are automatically filtered.
      </p>`,
    pasteDataEditView: `
      <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
        <h4 style="margin:0; color:#495057;">Current Records ({{rowCount}})</h4>
        <div style="display:flex; gap:8px;">
          <button id="lcr-tools-edit-add-row" type="button" style="padding:6px 12px; background-color:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.9em;">+ Manual Row</button>
          <button id="lcr-tools-edit-clear-all" type="button" style="padding:6px 12px; background-color:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.9em;">Clear All Records</button>
          <button id="lcr-tools-edit-done" type="button" style="padding:6px 12px; background-color:#007bff; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.9em; font-weight: bold;">Apply Changes</button>
        </div>
      </div>
      <div style="max-height:300px; overflow-y:auto; border:1px solid #ddd; border-radius:4px;">
        <table style="width:100%; border-collapse:collapse;">
          <thead style="background-color:#f8f9fa; position:sticky; top:0;">
            <tr>
              <th style="padding:8px; text-align:left; border-bottom:1px solid #ddd; width:5%;">#</th>
              <th style="padding:8px; text-align:left; border-bottom:1px solid #ddd; width:25%;">Date (YYYY-MM-DD)</th>
              <th style="padding:8px; text-align:left; border-bottom:1px solid #ddd; width:25%;">First Name</th>
              <th style="padding:8px; text-align:left; border-bottom:1px solid #ddd; width:25%;">Last Name</th>
              <th style="padding:8px; text-align:center; border-bottom:1px solid #ddd; width:20%;"></th>
            </tr>
          </thead>
          <tbody id="lcr-tools-edit-table-body">
            {{tableRows}}
          </tbody>
        </table>
      </div>`,
    pasteDataEditRow: `
      <tr data-edit-index="{{index}}" style="border-bottom:1px solid #eee;">
        <td style="padding:6px 8px; color:#888; font-size:0.85em;">{{rowNum}}</td>
        <td style="padding:6px 8px;"><input type="text" class="lcrx-edit-date" value="{{date}}" placeholder="YYYY-MM-DD" style="width:100%; padding:4px 6px; border:1px solid #ccc; border-radius:3px; font-size:0.9em;"></td>
        <td style="padding:6px 8px;"><input type="text" class="lcrx-edit-first" value="{{firstName}}" style="width:100%; padding:4px 6px; border:1px solid #ccc; border-radius:3px; font-size:0.9em;"></td>
        <td style="padding:6px 8px;"><input type="text" class="lcrx-edit-last" value="{{lastName}}" style="width:100%; padding:4px 6px; border:1px solid #ccc; border-radius:3px; font-size:0.9em;"></td>
        <td style="padding:6px 8px; text-align:center;"><button type="button" class="lcrx-edit-delete" style="background:#dc3545; color:white; border:none; border-radius:3px; padding:4px 8px; cursor:pointer; font-size:0.85em;">Remove</button></td>
      </tr>`,
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
          <div style="margin-bottom: 10px;">
            <div style="display: grid; grid-template-columns: 120px repeat(5, 1fr); gap: 10px; margin-bottom: 5px; padding: 0 5px;">
              <div></div>
              <div style="font-weight: bold; font-size: 0.85em; text-align: center;">Men</div>
              <div style="font-weight: bold; font-size: 0.85em; text-align: center;">Women</div>
              <div style="font-weight: bold; font-size: 0.85em; text-align: center;">Young Men</div>
              <div style="font-weight: bold; font-size: 0.85em; text-align: center;">Young Women</div>
              <div style="font-weight: bold; font-size: 0.85em; text-align: center;">Children</div>
            </div>
            <div id="lcr-tools-guest-count-rows">
              {{guestCountRows}}
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
    unmatchedDateDivider: `
      <tr class="lcrx-date-divider" style="background-color: #e9ecef;">
        <td colspan="4" style="padding: 8px 10px; font-weight: bold; color: #495057; font-size: 0.95em; border-bottom: 2px solid #dee2e6;">📅 {{date}}</td>
      </tr>`,
    guestCountDateRow: `
      <div style="display: grid; grid-template-columns: 120px repeat(5, 1fr); gap: 10px; margin-bottom: 8px; padding: 5px; background: white; border: 1px solid #dee2e6; border-radius: 4px;" data-guest-date="{{date}}">
        <div style="display: flex; align-items: center; font-weight: bold; font-size: 0.85em; color: #495057;">{{date}}</div>
        <div><input type="number" class="lcrx-guest-input" data-category="M" data-date="{{date}}" min="0" value="0" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px; text-align: center;"></div>
        <div><input type="number" class="lcrx-guest-input" data-category="F" data-date="{{date}}" min="0" value="0" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px; text-align: center;"></div>
        <div><input type="number" class="lcrx-guest-input" data-category="YM" data-date="{{date}}" min="0" value="0" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px; text-align: center;"></div>
        <div><input type="number" class="lcrx-guest-input" data-category="YW" data-date="{{date}}" min="0" value="0" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px; text-align: center;"></div>
        <div><input type="number" class="lcrx-guest-input" data-category="C" data-date="{{date}}" min="0" value="0" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px; text-align: center;"></div>
      </div>`,
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
