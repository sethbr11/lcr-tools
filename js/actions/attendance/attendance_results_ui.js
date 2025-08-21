/**
 * Creates the attendance results popup UI
 */
function createAttendanceResultsUI(options) {
  const {
    message,
    unmatchedNames,
    attendanceLog,
    targetDate,
    logger,
    aborted = false,
    error = false,
  } = options;

  const RESULTS_OVERLAY_ID = "lcr-tools-attendance-results-overlay";

  // Remove existing overlay if present
  const existingOverlay = document.getElementById(RESULTS_OVERLAY_ID);
  if (existingOverlay) {
    existingOverlay.remove();
  }

  // Determine status alert type and message
  const statusType = error ? "error" : aborted ? "warning" : "success";
  const statusTitle = error
    ? "Error"
    : aborted
    ? "Process Aborted"
    : "Complete";

  const alerts = [
    {
      message: `<strong>${statusTitle}:</strong> ${message}`,
      type: statusType,
    },
  ];

  // Inject component-scoped CSS to keep header above inputs and style skip/restore
  (function ensureAttendanceResultsStyles() {
    if (document.getElementById("lcrx-results-styles")) return;
    const style = document.createElement("style");
    style.id = "lcrx-results-styles";
    style.textContent = `
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
    `;
    document.head.appendChild(style);
  })();

  // Generate unmatched names content
  let content = "";
  if (unmatchedNames.length > 0 && !error) {
    content = `
      <div id="lcr-tools-unmatched-section" style="margin-bottom: 20px;">
        <h3 style="color: #856404; margin-bottom: 15px;">Unmatched Names - Optional Guest Processing (${
          unmatchedNames.length
        }):</h3>
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
              ${unmatchedNames
                .map(
                  (name, index) => `
                  <tr data-index="${index}" style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px; vertical-align: middle;">${name.firstName} ${name.lastName}</td>
                    <td style="padding: 10px;" id="search-cell-${index}">
                      <!-- Search component will be inserted here -->
                    </td>
                    <td style="padding: 10px;" id="category-cell-${index}">
                      <!-- Category toggle will be inserted here -->
                    </td>
                    <td class="lcrx-skip-col" style="text-align: center;">
                      <button type="button" class="lcrx-skip-btn" title="Skip this name">×</button>
                    </td>
                  </tr>
                `
                )
                .join("")}
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
    `;
  } else if (unmatchedNames.length > 0) {
    content = `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #856404; margin-bottom: 10px;">Names Not Found in LCR (${
          unmatchedNames.length
        }):</h3>
        <ul style="margin: 0; padding-left: 20px; max-height: 150px; overflow-y: auto;">
          ${unmatchedNames
            .map((name) => `<li>${name.firstName} ${name.lastName}</li>`)
            .join("")}
        </ul>
      </div>
    `;
  }

  const buttons = [
    {
      text: "View Logs",
      onClick: () => createAttendanceLogsUI(logger, null, options),
      options: {
        id: "lcr-tools-view-logs",
        variant: "secondary",
      },
    },
    {
      text: "Download Report",
      onClick: () => {
        // Generate and download the summary CSV
        const summaryCsvHeader = `"Date","First Name","Last Name","LCR Update Status"\n`;
        const summaryCsvRows = attendanceLog
          .map(
            (row) =>
              `"${row.date}","${row.firstName.replace(
                /"/g,
                '""'
              )}","${row.lastName.replace(
                /"/g,
                '""'
              )}","${row.lcrUpdateStatus.replace(/"/g, '""')}"`
          )
          .join("\n");
        const summaryCsvContent = summaryCsvHeader + summaryCsvRows;

        csvUtils.downloadCsv(
          summaryCsvContent,
          `attendance_update_summary_report_${targetDate}.csv`
        );
      },
      options: {
        id: "lcr-tools-download-report",
        variant: "primary",
      },
    },
  ];

  uiUtils.createStandardModal({
    id: RESULTS_OVERLAY_ID,
    title: "Attendance Processing Results",
    content,
    alerts,
    buttons,
    onClose: () => uiUtils.closeModal(RESULTS_OVERLAY_ID),
    modalOptions: { maxWidth: "800px", maxHeight: "90vh" },
  });

  // Initialize guest attendance functionality if there are unmatched names
  if (unmatchedNames.length > 0 && !error) {
    initializeGuestAttendanceUI(unmatchedNames, targetDate, logger, options);
  }
}

/**
 * Creates the attendance logs viewing UI
 */
function createAttendanceLogsUI(logger, parentOverlay, parentOptions) {
  const LOGS_OVERLAY_ID = "lcr-tools-attendance-logs-overlay";

  const logs = logger.getLogs();
  const logEntries = logs
    .map((log) => {
      const timestamp = new Date(log.timestamp).toLocaleString();
      const level = log.level || "INFO";
      const action = log.action || "UNKNOWN";
      const details = log.details ? JSON.stringify(log.details, null, 2) : "";

      return `[${timestamp}] ${level}: ${action}${
        details ? "\n  " + details : ""
      }`;
    })
    .join("\n\n");

  const content = `
    <div style="margin-bottom: 20px;">
      <pre style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; border: 1px solid #dee2e6; font-family: 'Courier New', monospace; font-size: 0.85em; max-height: 400px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word;">${logEntries}</pre>
    </div>
  `;

  const buttons = [
    {
      text: "Back to Results",
      onClick: () => {
        uiUtils.closeModal(LOGS_OVERLAY_ID);
        createAttendanceResultsUI(parentOptions);
      },
      options: {
        id: "lcr-tools-back-to-results",
        variant: "secondary",
      },
    },
    {
      text: "Download Logs",
      onClick: () => logger.downloadLog(),
      options: {
        id: "lcr-tools-download-logs",
        variant: "primary",
      },
    },
  ];

  uiUtils.createStandardModal({
    id: LOGS_OVERLAY_ID,
    title: "Processing Logs",
    content,
    buttons,
    onClose: () => uiUtils.closeModal(LOGS_OVERLAY_ID),
    modalOptions: { maxWidth: "800px", maxHeight: "80vh" },
  });
}

/**
 * Initialize guest attendance UI components
 */
async function initializeGuestAttendanceUI(
  unmatchedNames,
  targetDate,
  logger,
  parentOptions
) {
  // Check if GuestAttendanceHandler class is available
  if (typeof GuestAttendanceHandler === "undefined") {
    console.error("GuestAttendanceHandler class not available");
    return;
  }

  // Find target date column index from parent options
  const targetDateColumnIndex = parentOptions.targetDateColumnIndex || -1;

  // Initialize guest attendance handler with collected ward members
  const handler = new GuestAttendanceHandler(
    logger,
    targetDate,
    targetDateColumnIndex
  );

  // Use ward members collected during main processing instead of loading separately
  if (parentOptions.wardMembers && parentOptions.wardMembers.length > 0) {
    if (typeof handler.setWardMembers === "function") {
      handler.setWardMembers(
        parentOptions.wardMembers,
        parentOptions.presentMembers
      );
      console.log(
        `Using ${parentOptions.wardMembers.length} ward members collected during processing`
      );
    } else {
      // Fallback to prevent crash; keeps UI functional
      handler.wardMembers = parentOptions.wardMembers;
      console.warn(
        `setWardMembers not available, using fallback method. Ward members count: ${parentOptions.wardMembers.length}`
      );
    }
  } else {
    // Fallback to loading ward members if not provided (shouldn't happen in normal flow)
    showLoadingIndicator(
      "Loading all ward members for guest search...",
      "This may take a moment to scan all pages"
    );

    try {
      console.log("Fallback: Starting to load ward members...");
      await handler.loadWardMembers();
      console.log(`Loaded ${handler.wardMembers.length} total ward members`);
      hideLoadingIndicator();

      if (handler.wardMembers.length === 0) {
        alert(
          "No ward members were loaded. Guest search may not work properly."
        );
        logger.logError("No ward members loaded for guest search");
      }
    } catch (error) {
      hideLoadingIndicator();
      console.error("Failed to load ward members:", error);
      logger.logError("Failed to load ward members", { error: error.message });
      alert(
        "Failed to load ward members for guest search. Guest processing may not work properly."
      );
    }
  }

  // Track selections
  const selections = {};

  // Skipping support: create skipped bar and delegated handlers
  const unmatchedSection = document.getElementById(
    "lcr-tools-unmatched-section"
  );
  const listContainer = unmatchedSection
    ? unmatchedSection.querySelector('div[style*="max-height"]')
    : null;

  const skippedBar = document.createElement("div");
  skippedBar.className = "lcrx-skipped-bar";
  skippedBar.id = "lcrx-skipped-bar";
  if (unmatchedSection && listContainer) {
    unmatchedSection.insertBefore(skippedBar, listContainer);
  }

  const updateSkippedBarVisibility = () => {
    skippedBar.style.display = skippedBar.children.length ? "flex" : "none";
  };

  const skippedIndices = new Set();
  const addSkipChip = (idx) => {
    const name = unmatchedNames[idx];
    const label = `${name.firstName} ${name.lastName}`.trim() || "Unnamed";
    const chip = document.createElement("span");
    chip.className = "lcrx-skip-chip";
    chip.dataset.index = String(idx);
    chip.innerHTML = `${label} `;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Restore";
    btn.addEventListener("click", () => {
      const row = document.querySelector(`tr[data-index="${idx}"]`);
      if (row) row.style.display = "";
      skippedIndices.delete(idx);
      chip.remove();
      updateSkippedBarVisibility();
    });
    chip.appendChild(btn);
    skippedBar.appendChild(chip);
    updateSkippedBarVisibility();
  };

  // Delegate skip button clicks
  const tbody = document.getElementById("lcr-tools-unmatched-table-body");
  if (tbody) {
    tbody.addEventListener("click", (e) => {
      const btn = e.target.closest(".lcrx-skip-btn");
      if (!btn) return;
      const row = btn.closest("tr[data-index]");
      if (!row) return;
      const idx = Number(row.dataset.index);
      if (Number.isNaN(idx) || skippedIndices.has(idx)) return;
      row.style.display = "none";
      skippedIndices.add(idx);
      addSkipChip(idx);
      logger.logAction("UNMATCHED_ROW_SKIPPED", {
        index: idx,
        name: `${unmatchedNames[idx].firstName} ${unmatchedNames[idx].lastName}`,
      });
    });
  }

  // Create UI components for each unmatched name
  unmatchedNames.forEach((name, index) => {
    const searchCell = document.getElementById(`search-cell-${index}`);
    const categoryCell = document.getElementById(`category-cell-${index}`);
    if (!searchCell || !categoryCell) return;

    const searchComponent = createMemberSearchDropdown(handler, (member) => {
      selections[index] = { type: "member", member };
      categoryToggle.container.style.display = "none";
      logger.logAction("Member selected for unmatched name", {
        unmatchedName: `${name.firstName} ${name.lastName}`,
        selectedMember: member.fullName,
      });
    });

    const categoryToggle = createGuestCategoryToggle((category) => {
      if (!selections[index] || selections[index].type !== "member") {
        selections[index] = { type: "guest", category };
      }
    });

    // Default selection (guest M) unless user picks a member
    selections[index] = { type: "guest", category: "M" };

    searchCell.appendChild(searchComponent.container);
    categoryCell.appendChild(categoryToggle.container);

    // If user clears input, show category toggle again
    searchComponent.input.addEventListener("input", (e) => {
      if (e.target.value.trim() === "") {
        categoryToggle.container.style.display = "flex";
        if (selections[index] && selections[index].type === "member") {
          selections[index] = {
            type: "guest",
            category: categoryToggle.getSelected(),
          };
        }
      }
    });
  });

  // Handle process guests button
  const processButton = document.getElementById("lcr-tools-process-guests");
  if (processButton) {
    processButton.addEventListener("click", async () => {
      await processGuestAttendance(
        handler,
        selections,
        unmatchedNames,
        parentOptions,
        skippedIndices // pass the skipped set so we ignore those rows
      );
    });
  }
}

/**
 * Process guest attendance updates
 */
async function processGuestAttendance(
  handler,
  selections,
  unmatchedNames,
  parentOptions,
  skippedIndices = new Set()
) {
  const { logger, targetDate, attendanceLog } = parentOptions;

  showLoadingIndicator("Processing guest attendance...");

  try {
    const membersToMark = [];
    const guestCounts = { M: 0, F: 0, YM: 0, YW: 0, C: 0 };

    // Process selections, ignoring skipped rows
    Object.keys(selections).forEach((key) => {
      const index = Number(key);
      if (skippedIndices.has(index)) return;

      const selection = selections[key];
      const unmatchedName = unmatchedNames[index];
      if (!unmatchedName) return;

      if (selection.type === "member") {
        membersToMark.push({
          member: selection.member,
          originalName: unmatchedName,
        });
      } else {
        guestCounts[selection.category]++;
      }
    });

    // Add manual guest counts
    guestCounts.M +=
      parseInt(document.getElementById("lcr-tools-guest-men").value) || 0;
    guestCounts.F +=
      parseInt(document.getElementById("lcr-tools-guest-women").value) || 0;
    guestCounts.YM +=
      parseInt(document.getElementById("lcr-tools-guest-ym").value) || 0;
    guestCounts.YW +=
      parseInt(document.getElementById("lcr-tools-guest-yw").value) || 0;
    guestCounts.C +=
      parseInt(document.getElementById("lcr-tools-guest-children").value) || 0;

    logger.logAction("Processing guest attendance", {
      membersToMark: membersToMark.length,
      guestCounts,
    });

    // Mark members as present
    for (const item of membersToMark) {
      const success = await handler.markMemberPresent(item.member);

      // Update attendance log
      const logEntryIndex = attendanceLog.findIndex(
        (log) =>
          log.firstName.toLowerCase() ===
            item.originalName.firstName.toLowerCase() &&
          log.lastName.toLowerCase() ===
            item.originalName.lastName.toLowerCase()
      );

      if (logEntryIndex !== -1) {
        attendanceLog[logEntryIndex].lcrUpdateStatus = success
          ? "Marked as Present in LCR (Guest Processing)"
          : "Guest Processing - Mark Failed";
      }
    }

    // Update guest counts if any
    const totalGuests = Object.values(guestCounts).reduce(
      (sum, count) => sum + count,
      0
    );
    if (totalGuests > 0) {
      await handler.updateGuestCounts(guestCounts);

      // Add guest entries to attendance log
      Object.keys(guestCounts).forEach((category) => {
        const count = guestCounts[category];
        if (count > 0) {
          const categoryLabels = {
            M: "Men",
            F: "Women",
            YM: "Young Men",
            YW: "Young Women",
            C: "Children",
          };
          attendanceLog.push({
            originalIndex: -1,
            date: targetDate,
            firstName: `${count} Guest`,
            lastName: categoryLabels[category],
            lcrUpdateStatus: "Marked as Guests in LCR",
          });
        }
      });
    }

    hideLoadingIndicator();

    // Close current results and show updated results
    document.getElementById("lcr-tools-attendance-results-overlay").remove();

    const updatedMessage = `Guest processing complete. ${membersToMark.length} names found and marked. ${totalGuests} guests added to visitor counts.`;

    createAttendanceResultsUI({
      ...parentOptions,
      message: updatedMessage,
      unmatchedNames: [], // Clear unmatched names since we processed them
      attendanceLog,
    });
  } catch (error) {
    hideLoadingIndicator();
    logger.logError("Guest processing failed", { error: error.message });
    alert(`Error processing guests: ${error.message}`);
  }
}
