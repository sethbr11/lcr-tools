/**
 * Input handlers for the processAttendance action.
 * Manages CSV upload, paste-from-spreadsheet, tab switching,
 * the inline edit view, and the process button.
 */
(() => {
  if (utils.returnIfLoaded("attendanceInputHandlers")) return;
  utils.ensureLoaded(
    "attendanceCsvParser",
    "attendanceUi",
    "attendanceCoreLogic",
    "uiUtils",
    "modalUtils",
    "fileUtils",
    "dataUtils"
  );

  // --- State ---
  let parsedCsvDataForProcessing = null;
  let editableRows = [];

  // --- Utilities ---

  function setProcessButtonState(enabled) {
    const btn = document.getElementById("lcr-tools-process-attendance-btn");
    if (!btn) return;
    btn.disabled = !enabled;
    btn.style.backgroundColor = enabled ? "#007bff" : "#6c757d";
    btn.style.cursor = enabled ? "pointer" : "not-allowed";
  }

  function resetState() {
    parsedCsvDataForProcessing = null;
    editableRows = [];
    setProcessButtonState(false);
    const fileInput = document.getElementById("lcr-tools-csv-upload");
    if (fileInput) fileInput.value = "";
    const viewEditBtn = document.getElementById("lcr-tools-view-edit-data");
    if (viewEditBtn) viewEditBtn.style.display = "none";
    const pasteMoreBtn = document.getElementById("lcr-tools-paste-more");
    if (pasteMoreBtn) pasteMoreBtn.style.display = "none";
    const recordCountSpan = document.getElementById("lcr-tools-record-count");
    if (recordCountSpan) recordCountSpan.style.display = "none";
    // Reset paste target visual
    const pasteTarget = document.getElementById("lcr-tools-paste-target");
    if (pasteTarget) {
      pasteTarget.style.borderColor = "#007bff";
      pasteTarget.style.backgroundColor = "#f0f7ff";
    }
  }

  function showParseSuccess(names, targetDate, duplicateCount, namesByDate) {
    parsedCsvDataForProcessing = { names, targetDate, namesByDate: namesByDate || { [targetDate]: names } };
    const duplicateMessage = attendanceCsvParser.computeDuplicateMessage(duplicateCount);
    
    let parsedMessage = "";
    const dates = Object.keys(parsedCsvDataForProcessing.namesByDate).sort();
    if (dates.length > 0) {
      parsedMessage = dates.map(d => `${parsedCsvDataForProcessing.namesByDate[d].length} names for date ${d}`).join(", ");
    } else {
      parsedMessage = `${names.length} names for date ${targetDate}`;
    }

    const successMessage = `Successfully parsed: ${parsedMessage}. ${duplicateMessage}`.trim();
    attendanceUi.showUiStatus(successMessage);
    setProcessButtonState(true);

    const recordCountSpan = document.getElementById("lcr-tools-record-count");
    if (recordCountSpan) {
      recordCountSpan.textContent = `(${names.length} records total)`;
      recordCountSpan.style.display = "inline";
    }
  }

  function showParseErrors(errors) {
    const errorMessages = errors.map((err) => `<li>${err}</li>`).join("");
    const message = utils.replaceTemplate(window.processAttendanceTemplates.validationError, { errorMessages });
    attendanceUi.showUiErrorStatus(message);
  }

  // --- Paste Handler ---

  function handlePasteEvent(event) {
    event.preventDefault();
    const text = (event.clipboardData || window.clipboardData)?.getData("text")?.trim();
    if (!text) {
      return attendanceUi.showUiErrorStatus("No text found in clipboard.");
    }
    
    // Always append if we already have records
    const append = editableRows.length > 0;
    processPastedText(text, append);
  }

  function handlePasteMore() {
    // Focus the paste target so the next Ctrl+V/Cmd+V goes there
    const pasteTarget = document.getElementById("lcr-tools-paste-target");
    if (pasteTarget) {
      pasteTarget.focus();
      attendanceUi.showUiStatus("Ready for more! Paste your next set of records now...");
      
      // Pulse effect to show it's ready
      pasteTarget.style.borderColor = "#28a745";
      setTimeout(() => {
        pasteTarget.style.borderColor = "#007bff";
      }, 500);
    }
  }

  async function processPastedText(text, append) {
    try {
      const result = attendanceCsvParser.parsePastedAttendance(text);
      if (result.errors.length > 0) return showParseErrors(result.errors);
      if (result.names.length === 0) return attendanceUi.showUiErrorStatus("No names found in pasted data.");

      let newEditableRows = result.rawRows.map((r) => ({ 
        firstName: r.firstName, 
        lastName: r.lastName, 
        date: r.normalizedDateStr 
      }));

      // Combine with existing if appending
      let combinedRows = append ? editableRows.concat(newEditableRows) : newEditableRows;

      // Check for multiple dates
      const uniqueDates = [...new Set(combinedRows.map(r => r.date).filter(Boolean))];
      let selectedDate = uniqueDates[0] || document.getElementById("lcr-tools-attendance-date")?.value;

      if (uniqueDates.length > 1) {
        const choice = await new Promise((resolve) => {
          const overlay = document.createElement("div");
          overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:100000; display:flex; align-items:center; justify-content:center;";
          const box = document.createElement("div");
          box.style.cssText = "background:white; padding:25px; border-radius:8px; max-width:400px; width:90%;";
          box.innerHTML = `<h3 style="margin-top:0;">Select Processing Date</h3><p>Your data contains multiple dates. Please select the ONE date you want to process today.</p>` + 
            uniqueDates.map((d, i) => `<div style="margin:10px 0;"><label><input type="radio" name="date-choice" value="${d}" ${i===0?'checked':''}> ${d}</label></div>`).join("") +
            `<div style="margin-top:20px; text-align:right;"><button id="lcrx-cancel-date" style="padding:8px 15px; margin-right:10px; border:1px solid #ccc; background:none; border-radius:4px; cursor:pointer;">Cancel</button><button id="lcrx-confirm-date" style="padding:8px 15px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">Select Date</button></div>`;
          overlay.appendChild(box);
          document.body.appendChild(overlay);
          box.querySelector("#lcrx-cancel-date").onclick = () => { overlay.remove(); resolve(null); };
          box.querySelector("#lcrx-confirm-date").onclick = () => { 
            const selected = box.querySelector('input[name="date-choice"]:checked').value;
            overlay.remove(); 
            resolve(selected); 
          };
        });

        if (!choice) return;
        selectedDate = choice;
      }

      // Filter and finalize
      editableRows = combinedRows.filter(r => r.date === selectedDate || (!r.date && selectedDate));
      const discardedCount = combinedRows.length - editableRows.length;

      // Rebuild namesByDate and flat names
      const namesByDate = { [selectedDate]: [] };
      const allNames = [];
      const nameSet = new Set();
      
      for (const row of editableRows) {
        if (!row.firstName || !row.lastName) continue;
        const key = `${selectedDate}:${row.lastName.toLowerCase()}, ${row.firstName.toLowerCase()}`;
        if (!nameSet.has(key)) {
          nameSet.add(key);
          const nameObj = { firstName: row.firstName, lastName: row.lastName };
          allNames.push(nameObj);
          namesByDate[selectedDate].push(nameObj);
        }
      }

      const duplicateCount = editableRows.length - allNames.length;
      showParseSuccess(allNames, selectedDate, duplicateCount, namesByDate);

      if (discardedCount > 0) {
        attendanceUi.showUiStatus(`Kept ${allNames.length} records for ${selectedDate}. Discarded ${discardedCount} records from other dates.`, false, true);
      }

      // Show action buttons
      const viewEditBtn = document.getElementById("lcr-tools-view-edit-data");
      if (viewEditBtn) viewEditBtn.style.display = "block";
      const pasteMoreBtn = document.getElementById("lcr-tools-paste-more");
      if (pasteMoreBtn) pasteMoreBtn.style.display = "block";

      // Visual feedback on paste target
      const pasteTarget = document.getElementById("lcr-tools-paste-target");
      if (pasteTarget) {
        pasteTarget.style.borderColor = "#28a745";
        pasteTarget.style.backgroundColor = "#e8f5e9";
        setTimeout(() => {
          pasteTarget.style.borderColor = "#007bff";
          pasteTarget.style.backgroundColor = "#f0f7ff";
        }, 1000);
      }
    } catch (parseError) {
      attendanceUi.showUiErrorStatus(`Error parsing pasted data: ${parseError.message}`);
    }
  }

  // --- Edit View ---

  function renderEditView() {
    const container = document.getElementById("lcr-tools-edit-view-container");
    if (!container) return;

    const tableRows = editableRows
      .map((row, i) =>
        utils.replaceTemplate(window.processAttendanceTemplates.pasteDataEditRow, {
          index: i,
          rowNum: i + 1,
          date: row.date || "",
          firstName: row.firstName.replace(/"/g, "&quot;"),
          lastName: row.lastName.replace(/"/g, "&quot;"),
        })
      )
      .join("");

    container.innerHTML = utils.replaceTemplate(
      window.processAttendanceTemplates.pasteDataEditView,
      { rowCount: editableRows.length, tableRows }
    );
    container.style.display = "block";

    // Hide main panels while editing
    document.getElementById("lcr-tools-panel-upload").style.display = "none";
    document.getElementById("lcr-tools-panel-paste").style.display = "none";

    document.getElementById("lcr-tools-edit-done")?.addEventListener("click", handleEditDone);
    document.getElementById("lcr-tools-edit-add-row")?.addEventListener("click", handleEditAddRow);
    document.getElementById("lcr-tools-edit-clear-all")?.addEventListener("click", handleEditClearAll);

    const tbody = document.getElementById("lcr-tools-edit-table-body");
    if (tbody) {
      tbody.addEventListener("click", (e) => {
        const deleteBtn = e.target.closest(".lcrx-edit-delete");
        if (!deleteBtn) return;
        const row = deleteBtn.closest("tr[data-edit-index]");
        if (row) {
          const idx = parseInt(row.dataset.editIndex, 10);
          editableRows.splice(idx, 1);
          renderEditView();
        }
      });
    }
  }

  function handleEditAddRow() {
    const lastDate = editableRows.length > 0 ? editableRows[editableRows.length - 1].date : "";
    editableRows.push({ firstName: "", lastName: "", date: lastDate });
    renderEditView();
    const tbody = document.getElementById("lcr-tools-edit-table-body");
    if (tbody) {
      const lastRow = tbody.querySelector("tr:last-child");
      lastRow?.querySelector(".lcrx-edit-first")?.focus();
    }
  }

  function handleEditClearAll() {
    editableRows = [];
    parsedCsvDataForProcessing = null;
    setProcessButtonState(false);
    
    const container = document.getElementById("lcr-tools-edit-view-container");
    if (container) {
      container.style.display = "none";
      container.innerHTML = "";
    }
    
    // Hide buttons and record count
    const viewEditBtn = document.getElementById("lcr-tools-view-edit-data");
    if (viewEditBtn) viewEditBtn.style.display = "none";
    const pasteMoreBtn = document.getElementById("lcr-tools-paste-more");
    if (pasteMoreBtn) pasteMoreBtn.style.display = "none";
    const recordCountSpan = document.getElementById("lcr-tools-record-count");
    if (recordCountSpan) recordCountSpan.style.display = "none";

    // Ensure main panel is visible
    document.getElementById("lcr-tools-panel-paste").style.display = "block";
    document.getElementById("lcr-tools-panel-upload").style.display = "block";
    
    attendanceUi.showUiStatus("All records cleared. Paste new data to continue.");
    
    // Auto-focus the paste target again
    setTimeout(() => document.getElementById("lcr-tools-paste-target")?.focus(), 100);
  }

  async function handleEditDone() {
    const tbody = document.getElementById("lcr-tools-edit-table-body");
    let tempRows = [];
    if (tbody) {
      const rows = tbody.querySelectorAll("tr[data-edit-index]");
      rows.forEach((row) => {
        const dateRaw = row.querySelector(".lcrx-edit-date")?.value?.trim() || "";
        const firstName = row.querySelector(".lcrx-edit-first")?.value?.trim() || "";
        const lastName = row.querySelector(".lcrx-edit-last")?.value?.trim() || "";
        
        let date = "";
        if (dateRaw) {
           const parsed = dataUtils.parseLCRDate(dateRaw);
           if (parsed) date = dataUtils.formatDate(parsed, "YYYY-MM-DD");
        }

        if (firstName || lastName) {
          tempRows.push({ firstName, lastName, date });
        }
      });
    }

    if (tempRows.length === 0) {
      editableRows = [];
      parsedCsvDataForProcessing = null;
      setProcessButtonState(false);
      attendanceUi.showUiStatus("All rows removed. Paste new data or upload a CSV.");
      const viewEditBtn = document.getElementById("lcr-tools-view-edit-data");
      if (viewEditBtn) viewEditBtn.style.display = "none";
      const pasteMoreBtn = document.getElementById("lcr-tools-paste-more");
      if (pasteMoreBtn) pasteMoreBtn.style.display = "none";
      const container = document.getElementById("lcr-tools-edit-view-container");
      if (container) { container.style.display = "none"; container.innerHTML = ""; }
      document.getElementById("lcr-tools-panel-paste").style.display = "block";
      document.getElementById("lcr-tools-panel-upload").style.display = "block";
      return;
    }

    // Check for multiple dates
    const uniqueDates = [...new Set(tempRows.map(r => r.date).filter(Boolean))];
    let selectedDate = uniqueDates[0] || document.getElementById("lcr-tools-attendance-date")?.value;

    if (uniqueDates.length > 1) {
      const options = uniqueDates.map(d => ({ label: d, value: d }));
      const message = `Your data contains multiple dates. Please select the ONE date you want to process today. (Attendance can only be processed for one date at a time).`;
      
      // We need a simple way to ask within the extension UI. Using a custom prompt or just picking the first?
      // Given the instruction "ask the user", let's use a simple confirm-style choice if possible, 
      // but since we are in handleEditDone (async), let's show a quick selection modal or just alert for now 
      // to keep it simple, or filter based on a selection.
      
      // Let's use a simple radio selection in a modal
      const choice = await new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:100000; display:flex; align-items:center; justify-content:center;";
        const box = document.createElement("div");
        box.style.cssText = "background:white; padding:25px; border-radius:8px; max-width:400px; width:90%;";
        box.innerHTML = `<h3 style="margin-top:0;">Select Processing Date</h3><p>${message}</p>` + 
          uniqueDates.map((d, i) => `<div style="margin:10px 0;"><label><input type="radio" name="date-choice" value="${d}" ${i===0?'checked':''}> ${d}</label></div>`).join("") +
          `<div style="margin-top:20px; text-align:right;"><button id="lcrx-cancel-date" style="padding:8px 15px; margin-right:10px; border:1px solid #ccc; background:none; border-radius:4px; cursor:pointer;">Cancel</button><button id="lcrx-confirm-date" style="padding:8px 15px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">Select Date</button></div>`;
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        box.querySelector("#lcrx-cancel-date").onclick = () => { overlay.remove(); resolve(null); };
        box.querySelector("#lcrx-confirm-date").onclick = () => { 
          const selected = box.querySelector('input[name="date-choice"]:checked').value;
          overlay.remove(); 
          resolve(selected); 
        };
      });

      if (!choice) return; // User cancelled
      selectedDate = choice;
    }

    // Filter to only rows matching the selected date
    editableRows = tempRows.filter(r => r.date === selectedDate || (!r.date && selectedDate));
    const discardedCount = tempRows.length - editableRows.length;

    const container = document.getElementById("lcr-tools-edit-view-container");
    if (container) {
      container.style.display = "none";
      container.innerHTML = "";
    }
    
    // Restore main panels
    document.getElementById("lcr-tools-panel-paste").style.display = "block";
    document.getElementById("lcr-tools-panel-upload").style.display = "block";

    // Rebuild namesByDate and flat names
    const namesByDate = { [selectedDate]: [] };
    const allNames = [];
    const nameSet = new Set();
    
    for (const row of editableRows) {
      if (!row.firstName || !row.lastName) continue;
      const key = `${selectedDate}:${row.lastName.toLowerCase()}, ${row.firstName.toLowerCase()}`;
      if (!nameSet.has(key)) {
        nameSet.add(key);
        const nameObj = { firstName: row.firstName, lastName: row.lastName };
        allNames.push(nameObj);
        namesByDate[selectedDate].push(nameObj);
      }
    }

    allNames.sort((a, b) => {
      const comp = a.lastName.toLowerCase().localeCompare(b.lastName.toLowerCase());
      return comp !== 0 ? comp : a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase());
    });

    const duplicateCount = editableRows.length - allNames.length;
    showParseSuccess(allNames, selectedDate, duplicateCount, namesByDate);
    
    if (discardedCount > 0) {
      attendanceUi.showUiStatus(`Kept ${allNames.length} records for ${selectedDate}. Discarded ${discardedCount} records from other dates.`, false, true);
    }
  }

  // --- Download Sample ---

  function handleDownloadSample() {
    const dateInput = document.getElementById("lcr-tools-attendance-date");
    const selectedDateValue = dateInput.value;

    if (!selectedDateValue) {
      return attendanceUi.showUiErrorStatus("Please select a date first to download the sample.");
    }

    const selectedDate = new Date(selectedDateValue + "T00:00:00");
    if (selectedDate.getDay() !== 0) {
      return attendanceUi.showUiErrorStatus("Please select a Sunday for the attendance date.");
    }

    const formattedDate = dataUtils.formatDate(selectedDate);
    const csvContent = `"Date","First Name","Last Name"\\n"${formattedDate}","John","Doe"\\n"${formattedDate}","Jane","Smith"`;

    fileUtils.downloadCsv(csvContent, `sample_attendance_${selectedDateValue}.csv`);
    attendanceUi.showUiStatus("Sample CSV downloaded.");
  }

  // --- Process Attendance ---

  async function handleProcessAttendance() {
    uiUtils.resetAborted();

    if (!parsedCsvDataForProcessing) {
      return attendanceUi.showUiErrorStatus("No valid data loaded. Please upload a CSV or paste attendance data.");
    }

    const { names, namesByDate } = parsedCsvDataForProcessing;
    if (!names || names.length === 0 || !namesByDate || Object.keys(namesByDate).length === 0) {
      return attendanceUi.showUiErrorStatus("Data for processing is incomplete. Ensure date and names are present.");
    }

    const classSelect = document.getElementById("lcr-tools-class-select");
    const targetClassValue = classSelect ? classSelect.value : null;
    const targetClassText = classSelect?.options[classSelect.selectedIndex]?.textContent?.trim() || null;

    const meetingSplitRadio = document.querySelector('input[name="lcr-tools-meeting-split"]:checked');
    const meetingSplit = meetingSplitRadio ? meetingSplitRadio.value : "BOTH";

    attendanceUi.closeAttendanceUI();

    try {
      await attendanceCoreLogic.LCR_TOOLS_PROCESS_ATTENDANCE(namesByDate, {
        targetClassValue,
        targetClassText,
        meetingSplit,
      });
      if (uiUtils.isAborted()) throw new Error("Process aborted by user.");
    } catch (error) {
      attendanceUi.showUiErrorStatus(`Error processing attendance: ${error.message}`);
    } finally {
      uiUtils.resetAborted();
      resetState();
    }
  }

  // --- Setup Initialization ---

  function initializeSetupUI() {
    if (document.getElementById(attendanceUi.UI_OVERLAY_ID)) {
      console.log("Attendance UI already visible.");
      return;
    }

    const buttons = [
      {
        text: "Process Attendance on LCR",
        onClick: null,
        options: {
          id: "lcr-tools-process-attendance-btn",
          variant: "primary",
          disabled: true,
        },
      },
    ];

    modalUtils.createStandardModal({
      id: attendanceUi.UI_OVERLAY_ID,
      title: "Input Class/Quorum Attendance",
      content: window.processAttendanceTemplates.setupModalStructure,
      buttons,
      onClose: attendanceUi.closeAttendanceUI,
    });

    // Populate Class / Quorum dropdown dynamically from LCR
    const classSelect = document.getElementById("lcr-tools-class-select");
    const splitContainer = document.getElementById("lcr-tools-meeting-split-container");

    const updateSplitVisibility = () => {
      if (!splitContainer || !classSelect) return;
      const val = classSelect.value;
      const text = (classSelect.options[classSelect.selectedIndex]?.textContent || "").toLowerCase();
      const isAll = !val || val === "ALL" || text.includes("all classes");
      splitContainer.style.display = isAll ? "block" : "none";
    };

    if (classSelect) {
      const options = attendanceDomUtils.getClassQuorumOptions?.() || [];
      if (options.length > 0) {
        classSelect.innerHTML = "";
        options.forEach((opt) => {
          const optionEl = document.createElement("option");
          optionEl.value = opt.value;
          optionEl.textContent = opt.text;
          if (opt.selected) optionEl.selected = true;
          classSelect.appendChild(optionEl);
        });
      } else {
        // Fallback default options
        classSelect.innerHTML = `
          <option value="ALL">All Classes and Quorums</option>
          <option value="SUNDAY_SCHOOL">Sunday School</option>
          <option value="ELDERS_QUORUM">Elders Quorum</option>
          <option value="RELIEF_SOCIETY">Relief Society</option>
          <option value="AARONIC_PRIESTHOOD">Aaronic Priesthood Quorums</option>
          <option value="YOUNG_WOMEN">Young Women</option>
          <option value="PRIMARY">Primary</option>
        `;
      }
      classSelect.addEventListener("change", updateSplitVisibility);
      updateSplitVisibility();
    }

    // Set default date to most recent Sunday
    const dateInput = document.getElementById("lcr-tools-attendance-date");
    if (dateInput) {
      const mostRecentSunday = attendanceUi.getMostRecentSunday();
      dateInput.value = dataUtils.formatDate(mostRecentSunday, "YYYY-MM-DD");
    }

    // Bind event listeners
    document.getElementById("lcr-tools-process-attendance-btn")?.addEventListener("click", handleProcessAttendance);
    document.getElementById("lcr-tools-csv-upload")?.addEventListener("change", (e) => {
        setProcessButtonState(false);
        parsedCsvDataForProcessing = null;
        attendanceUi.showUiStatus("Processing uploaded CSV...");

        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const { names, targetDate, errors, duplicateCount, namesByDate } = attendanceCsvParser.parseAttendanceCsv(e.target.result);
            if (errors.length > 0) return showParseErrors(errors);
            if (names.length === 0) return attendanceUi.showUiErrorStatus("CSV parsed, but no names found to process.");
            
            // For CSV upload, we replace the current editableRows
            editableRows = names.map(n => ({ firstName: n.firstName, lastName: n.lastName, date: targetDate }));
            
            showParseSuccess(names, targetDate, duplicateCount, namesByDate);
            
            // Show action buttons
            const viewEditBtn = document.getElementById("lcr-tools-view-edit-data");
            if (viewEditBtn) viewEditBtn.style.display = "block";
            const pasteMoreBtn = document.getElementById("lcr-tools-paste-more");
            if (pasteMoreBtn) pasteMoreBtn.style.display = "block";
          } catch (parseError) {
            attendanceUi.showUiErrorStatus(`Error parsing CSV: ${parseError.message}`);
          }
        };
        reader.onerror = () => attendanceUi.showUiErrorStatus("Error reading the uploaded file.");
        reader.readAsText(file);
    });
    document.getElementById("lcr-tools-download-sample")?.addEventListener("click", handleDownloadSample);
    document.getElementById("lcr-tools-view-edit-data")?.addEventListener("click", renderEditView);
    document.getElementById("lcr-tools-paste-more")?.addEventListener("click", handlePasteMore);

    // Paste target: catch paste events directly
    const pasteTarget = document.getElementById("lcr-tools-paste-target");
    if (pasteTarget) {
      pasteTarget.addEventListener("paste", handlePasteEvent);
      pasteTarget.addEventListener("click", () => pasteTarget.focus({ preventScroll: true }));
    }

    // Modal-wide paste listener so user can paste immediately anywhere in the modal
    const modalEl = document.getElementById(attendanceUi.UI_OVERLAY_ID);
    if (modalEl) {
      modalEl.addEventListener("paste", (e) => {
        if (e.target.tagName === "INPUT" && (e.target.type === "text" || e.target.type === "date")) {
          return;
        }
        handlePasteEvent(e);
      });
    }

    // Ensure the modal stays scrolled to the top
    const resetScrollToTop = () => {
      if (pasteTarget) {
        pasteTarget.focus({ preventScroll: true });
      }
      if (modalEl) {
        modalEl.scrollTop = 0;
        const scrollable = modalEl.querySelector("div[style*='overflow'], .modal-content, .modal-body");
        if (scrollable) scrollable.scrollTop = 0;
      }
    };
    resetScrollToTop();
    setTimeout(resetScrollToTop, 50);
    setTimeout(resetScrollToTop, 300);

    attendanceUi.showUiStatus("Paste your spreadsheet data into the box above to begin.");
  }

  window.attendanceInputHandlers = { initializeSetupUI };
})();
