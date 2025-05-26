<div class="options-container">
  <h1>Input Class/Quorum Attendance</h1>

  <div class="form-section">
    <h2>1. Prepare Your CSV</h2>
    <div class="form-group">
      <label for="attendance-date">Select Attendance Date (Sunday):</label>
      <input type="date" id="attendance-date" name="attendance-date" />
      <button id="download-sample-csv" class="secondary">
        Download Sample CSV
      </button>
    </div>
    <p style="font-size: 0.9em; color: #555">
      Download a sample CSV with the selected date. The CSV should have three
      columns: 'Date', 'First Name', and 'Last Name'. Only include names of
      individuals who were present.
    </p>
  </div>

  <div class="form-section">
    <h2>2. Upload Attendance CSV</h2>
    <div class="form-group">
      <label for="csv-file-upload">Upload CSV File:</label>
      <input
        type="file"
        id="csv-file-upload"
        name="csv-file-upload"
        accept=".csv"
      />
    </div>
  </div>

  <div class="form-section">
    <h2>3. Process Attendance</h2>
    <div class="form-group">
      <button id="process-csv-on-lcr" disabled>
        Process Attendance on LCR
      </button>
    </div>
    <div id="status-messages"></div>
    <div class="progress-bar-container" id="progress-bar-container">
      <div class="progress-bar" id="progress-bar">0%</div>
    </div>
  </div>
</div>
<script src="js/actions/attendance/update_attendance_options.js"></script>
