(() => {
  utils.returnIfLoaded("attendanceUi");
  utils.ensureLoaded("modalUtils", "uiUtils", "attendanceGuestLogic", "utils", "fileUtils", "attendanceDomUtils");

  const UI_OVERLAY_ID = "lcr-tools-attendance-ui-overlay";
  const templates = window.processAttendanceTemplates;

  function showUiStatus(message, isError = false, autoHide = false) {
    modalUtils.showStatus("lcr-tools-attendance-status", message, isError, autoHide);
  }

  function showUiErrorStatus(message) {
    showUiStatus(message, true);
  }

  function closeAttendanceUI() {
    modalUtils.closeModal(UI_OVERLAY_ID);
  }

  function safeRemoveById(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function getMostRecentSunday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mostRecentSunday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    mostRecentSunday.setDate(mostRecentSunday.getDate() - dayOfWeek);
    return mostRecentSunday;
  }

  function createMemberSearchDropdown(handler, onSelect) {
    const container = document.createElement("div");
    container.style.cssText = "width: 250px;";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Search ward members...";
    input.style.cssText = "width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;";

    const dropdown = document.createElement("div");
    dropdown.id = "lcr-tools-member-search-dropdown";
    dropdown.style.cssText = `position: fixed; background: white; border: 1px solid #ccc; border-top: none; 
      max-height: 220px; overflow-y: auto; z-index: 50000 !important; display: none; border-radius: 0 0 4px 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25); min-width: 250px;`;

    document.body.appendChild(dropdown);

    let debounceTimer;

    const positionDropdown = () => {
      const rect = input.getBoundingClientRect();
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.top = `${rect.bottom}px`;
      dropdown.style.width = `${rect.width}px`;
    };

    const updateDropdown = (query = "") => {
      const results = handler.searchMembers(query);
      dropdown.innerHTML = "";

      if (!Array.isArray(results) || results.length === 0) {
        const noResults = document.createElement("div");
        noResults.textContent =
          handler.wardMembers?.length === 0
            ? "Loading ward members..."
            : query && query.length >= 1
            ? "No members found"
            : "Start typing to search...";
        noResults.style.cssText = "padding: 8px; color: #666; font-style: italic;";
        dropdown.appendChild(noResults);
      } else {
        results.forEach((member) => {
          const item = document.createElement("div");
          item.textContent = member.fullName;
          item.style.cssText = `padding: 8px; cursor: pointer; border-bottom: 1px solid #eee;
            ${member.isPresent ? "color: #999; background-color: #f5f5f5; cursor: not-allowed;" : ""}`;

          if (member.isPresent) {
            item.title = "Already marked as present";
          } else {
            item.addEventListener("click", () => {
              input.value = member.fullName;
              dropdown.style.display = "none";
              onSelect(member);
            });
          }
          dropdown.appendChild(item);
        });
      }

      positionDropdown();
      dropdown.style.display = "block";
    };

    input.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => updateDropdown(e.target.value), 150);
    });

    input.addEventListener("focus", () => updateDropdown(input.value));

    input.addEventListener("blur", () => {
      setTimeout(() => {
        if (!dropdown.contains(document.activeElement)) {
          dropdown.style.display = "none";
        }
      }, 150);
    });

    document.addEventListener("click", (e) => {
      if (!container.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });

    window.addEventListener("resize", positionDropdown);
    window.addEventListener("scroll", positionDropdown);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node.contains && node.contains(container)) {
            dropdown.remove();
            observer.disconnect();
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("lcrx:wardMembersReady", () => {
      if (dropdown.style.display === "block") {
        updateDropdown(input.value);
      }
    });

    container.appendChild(input);

    return {
      container,
      input,
      clear: () => {
        input.value = "";
        dropdown.style.display = "none";
      },
    };
  }

  function createGuestCategoryToggle(onChange) {
    const container = document.createElement("div");
    container.style.cssText = "display: flex; gap: 2px;";

    const categories = [
      { key: "M", label: "Men" },
      { key: "F", label: "Women" },
      { key: "YM", label: "Young Men" },
      { key: "YW", label: "Young Women" },
      { key: "C", label: "Children" },
    ];

    let selected = "M";

    categories.forEach((cat) => {
      const button = document.createElement("button");
      button.textContent = cat.key;
      button.title = cat.label;
      button.style.cssText = `width: 35px; height: 35px; border: 1px solid #ccc; cursor: pointer;
        font-size: 12px; font-weight: bold; background: ${cat.key === selected ? "#007bff" : "white"};
        color: ${cat.key === selected ? "white" : "#333"};`;

      button.addEventListener("click", () => {
        container.querySelectorAll("button").forEach((btn) => {
          btn.style.background = "white";
          btn.style.color = "#333";
        });
        button.style.background = "#007bff";
        button.style.color = "white";
        selected = cat.key;
        onChange(selected);
      });

      container.appendChild(button);
    });

    return { container, getSelected: () => selected };
  }

  function downloadAttendanceSummaryCSV(attendanceLog, targetDate) {
    const header = '"Date","First Name","Last Name","LCR Update Status"\n';
    const rows = attendanceLog
      .map(
        (row) =>
          `"${row.date}","${String(row.firstName).replace(/"/g, '""')}","${String(row.lastName).replace(/"/g, '""')}","${String(row.lcrUpdateStatus).replace(/"/g, '""')}"`
      )
      .join("\n");
    fileUtils.downloadCsv(header + rows, `attendance_update_summary_report_${targetDate}.csv`);
  }

  function createAttendanceResultsUI(options) {
    const {
      message,
      unmatchedNames,
      unmatchedByDate,
      attendanceLog,
      targetDate,
      dates,
      dateResults,
      logger,
      aborted = false,
      error = false,
    } = options;

    const RESULTS_OVERLAY_ID = "lcr-tools-attendance-results-overlay";

    safeRemoveById(RESULTS_OVERLAY_ID);

    const statusType = error ? "error" : aborted ? "warning" : "success";
    const statusTitle = error ? "Error" : aborted ? "Process Aborted" : "Complete";

    const alerts = [
      {
        message: `<strong>${statusTitle}:</strong> ${message}`,
        type: statusType,
      },
    ];

    (function ensureAttendanceResultsStyles() {
      if (document.getElementById("lcrx-results-styles")) return;
      const style = document.createElement("style");
      style.id = "lcrx-results-styles";
      style.textContent = templates.resultsPopupStyles;
      document.head.appendChild(style);
    })();

    let content = "";
    if (unmatchedNames.length > 0 && !error) {
      // Build table rows with date dividers if multiple dates
      const sortedDates = unmatchedByDate ? Object.keys(unmatchedByDate).sort() : [];
      const hasMultipleDates = sortedDates.length > 1;
      let globalIndex = 0;
      let tableRows = "";

      if (hasMultipleDates && unmatchedByDate) {
        for (const date of sortedDates) {
          const namesForDate = unmatchedByDate[date] || [];
          if (namesForDate.length === 0) continue;
          tableRows += utils.replaceTemplate(templates.unmatchedDateDivider, { date });
          for (const name of namesForDate) {
            tableRows += utils.replaceTemplate(templates.resultsPopupUnmatchedTableRow, {
              index: globalIndex,
              fullName: `${name.firstName} ${name.lastName}`,
            });
            globalIndex++;
          }
        }
      } else {
        tableRows = unmatchedNames
          .map((name, index) =>
            utils.replaceTemplate(templates.resultsPopupUnmatchedTableRow, {
              index,
              fullName: `${name.firstName} ${name.lastName}`,
            })
          )
          .join("");
      }

      // Build per-date guest count rows
      const guestDates = (dates && dates.length > 0) ? dates : (sortedDates.length > 0 ? sortedDates : [targetDate]);
      const guestCountRows = guestDates
        .map((date) => utils.replaceTemplate(templates.guestCountDateRow, { date }))
        .join("");

      content = utils.replaceTemplate(templates.resultsPopupUnmatchedSection, {
        unmatchedCount: unmatchedNames.length,
        tableRows,
        guestCountRows,
      });
    } else if (unmatchedNames.length > 0) {
      const nameListItems = unmatchedNames
        .map((name) => `<li>${name.firstName} ${name.lastName}</li>`)
        .join("");
      content = utils.replaceTemplate(templates.resultsPopupUnmatchedList, {
        unmatchedCount: unmatchedNames.length,
        nameListItems,
      });
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
        onClick: () => downloadAttendanceSummaryCSV(attendanceLog, targetDate),
        options: {
          id: "lcr-tools-download-report",
          variant: "primary",
        },
      },
    ];

    modalUtils.createStandardModal({
      id: RESULTS_OVERLAY_ID,
      title: "Attendance Processing Results",
      content,
      alerts,
      buttons,
      onClose: () => modalUtils.closeModal(RESULTS_OVERLAY_ID),
      modalOptions: { maxWidth: "800px", maxHeight: "90vh" },
    });

    if (unmatchedNames.length > 0 && !error) {
      initializeGuestAttendanceUI(unmatchedNames, targetDate, logger, options);
    }
  }

  function createAttendanceLogsUI(logger, parentOverlay, parentOptions) {
    const LOGS_OVERLAY_ID = "lcr-tools-attendance-logs-overlay";

    const logs = logger.getLogs();
    const logEntries = logs
      .map((log) => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const level = log.level || "INFO";
        const action = log.action || "UNKNOWN";
        const details = log.details ? JSON.stringify(log.details, null, 2) : "";

        return `[${timestamp}] ${level}: ${action}${details ? "\n  " + details : ""}`;
      })
      .join("\n\n");

    const content = utils.replaceTemplate(templates.logsPopupContent, {
      logEntries,
    });

    const buttons = [
      {
        text: "Back to Results",
        onClick: () => {
          modalUtils.closeModal(LOGS_OVERLAY_ID);
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

    modalUtils.createStandardModal({
      id: LOGS_OVERLAY_ID,
      title: "Processing Logs",
      content,
      buttons,
      onClose: () => modalUtils.closeModal(LOGS_OVERLAY_ID),
      modalOptions: { maxWidth: "800px", maxHeight: "80vh" },
    });
  }

  async function initializeGuestAttendanceUI(unmatchedNames, targetDate, logger, parentOptions) {
    const handler = new attendanceGuestLogic.GuestAttendanceHandler(
      logger,
      targetDate,
      parentOptions.targetDateColumnIndex || -1
    );

    if (parentOptions.wardMembers && parentOptions.wardMembers.length > 0) {
      handler.setWardMembers(parentOptions.wardMembers, parentOptions.presentMembers);
    } else {
      uiUtils.showLoadingIndicator(
        "Loading all ward members for guest search...",
        "This may take a moment to scan all pages"
      );

      try {
        await handler.loadWardMembers();
        uiUtils.hideLoadingIndicator();

        if (handler.wardMembers.length === 0) {
          alert("No ward members were loaded. Guest search may not work properly.");
          logger.logError("No ward members loaded for guest search");
        }
      } catch (error) {
        uiUtils.hideLoadingIndicator();
        console.error("Failed to load ward members:", error);
        logger.logError("Failed to load ward members", { error: error.message });
        alert("Failed to load ward members for guest search. Guest processing may not work properly.");
      }
    }

    const selections = {};

    const unmatchedSection = document.getElementById("lcr-tools-unmatched-section");
    const listContainer = unmatchedSection ? unmatchedSection.querySelector('div[style*="max-height"]') : null;

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

      selections[index] = { type: "guest", category: "M" };

      searchCell.appendChild(searchComponent.container);
      categoryCell.appendChild(categoryToggle.container);

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

    const processButton = document.getElementById("lcr-tools-process-guests");
    if (processButton) {
      processButton.addEventListener("click", async () => {
        await processGuestAttendance(handler, selections, unmatchedNames, parentOptions, skippedIndices);
      });
    }
  }

  async function processGuestAttendance(handler, selections, unmatchedNames, parentOptions, skippedIndices = new Set()) {
    const { logger, attendanceLog, dates, dateResults } = parentOptions;
    const processingDates = (dates && dates.length > 0) ? dates : [parentOptions.targetDate];

    uiUtils.showLoadingIndicator("Batching guest attendance updates...");

    try {
      // 1. Group all data by month
      const updatesByMonth = {}; // { "YYYY-MM": { members: [], guestCounts: { date: counts } } }

      // Map unmatched index to date
      const indexToDate = {};
      if (parentOptions.unmatchedByDate) {
        let idx = 0;
        const sortedDates = Object.keys(parentOptions.unmatchedByDate).sort();
        for (const date of sortedDates) {
          for (let i = 0; i < (parentOptions.unmatchedByDate[date] || []).length; i++) {
            indexToDate[idx] = date;
            idx++;
          }
        }
      }

      Object.keys(selections).forEach((key) => {
        const index = Number(key);
        if (skippedIndices.has(index)) return;

        const selection = selections[key];
        const unmatchedName = unmatchedNames[index];
        if (!unmatchedName) return;

        const nameDate = indexToDate[index] || processingDates[0];
        const monthPrefix = nameDate.substring(0, 7);

        if (!updatesByMonth[monthPrefix]) {
          updatesByMonth[monthPrefix] = { members: [], guestCounts: {} };
        }

        if (selection.type === "member") {
          updatesByMonth[monthPrefix].members.push({
            member: selection.member,
            originalName: unmatchedName,
            date: nameDate,
          });
        } else {
          if (!updatesByMonth[monthPrefix].guestCounts[nameDate]) {
            updatesByMonth[monthPrefix].guestCounts[nameDate] = { M: 0, F: 0, YM: 0, YW: 0, C: 0 };
          }
          updatesByMonth[monthPrefix].guestCounts[nameDate][selection.category]++;
        }
      });

      // Also merge in any manual guest counts from the date rows
      for (const date of processingDates) {
        const monthPrefix = date.substring(0, 7);
        if (!updatesByMonth[monthPrefix]) {
          updatesByMonth[monthPrefix] = { members: [], guestCounts: {} };
        }
        
        const manualCounts = attendanceGuestLogic.buildGuestCountsFromInputs({ M: 0, F: 0, YM: 0, YW: 0, C: 0 }, date);
        const hasManual = Object.values(manualCounts).some(c => c > 0);
        
        if (hasManual) {
          if (!updatesByMonth[monthPrefix].guestCounts[date]) {
            updatesByMonth[monthPrefix].guestCounts[date] = manualCounts;
          } else {
            // Merge manual with selection counts
            for (const [k, v] of Object.entries(manualCounts)) {
              updatesByMonth[monthPrefix].guestCounts[date][k] += v;
            }
          }
        }
      }

      const sortedMonths = Object.keys(updatesByMonth).sort();
      let totalGuestsProcessed = 0;
      let totalMembersMarked = 0;

      // 2. Process each month in batches
      for (const month of sortedMonths) {
        if (uiUtils.isAborted()) throw new Error("Process aborted by user.");
        
        const monthData = updatesByMonth[month];
        const firstDateInMonth = Object.keys(monthData.guestCounts)[0] || (monthData.members[0]?.date) || (month + "-01");

        uiUtils.showLoadingIndicator(`Processing updates for ${month}...`);
        await attendanceDomUtils.ensureCorrectMonth(firstDateInMonth, logger);

        // A. Process Member Marking (Members Tab)
        if (monthData.members.length > 0) {
          const membersTab = document.querySelector(attendanceDomUtils.SELECTORS.membersTab);
          if (membersTab && membersTab.getAttribute("aria-selected") !== "true") {
            membersTab.click();
            await uiUtils.sleepWithJitter(1000, 500);
          }

          for (const item of monthData.members) {
            if (uiUtils.isAborted()) throw new Error("Process aborted by user.");
            
            // Set the handler to the right date/column
            const result = dateResults && dateResults[item.date];
            if (result && result.columnIndex !== -1) {
              handler.setTargetDate(item.date, result.columnIndex);
            } else {
              handler.setTargetDate(item.date, attendanceDomUtils.findTargetDateColumnIndex(item.date, logger));
            }

            const success = await handler.markMemberPresent(item.member);
            if (success) totalMembersMarked++;

            const logIdx = attendanceLog.findIndex(log =>
              log.date === item.date &&
              log.firstName === item.originalName.firstName &&
              log.lastName === item.originalName.lastName
            );
            if (logIdx !== -1) {
              attendanceLog[logIdx].lcrUpdateStatus = success ? "Marked as Present in LCR (Guest Processing)" : "Guest Processing - Mark Failed";
            }
          }
        }

        // B. Process Guest Counts (Visitors Tab)
        const datesInMonthWithGuests = Object.keys(monthData.guestCounts).filter(d => 
          Object.values(monthData.guestCounts[d]).some(c => c > 0)
        );

        if (datesInMonthWithGuests.length > 0) {
          const visitorsTab = document.querySelector(attendanceDomUtils.SELECTORS.visitorsTab);
          if (!visitorsTab) throw new Error("Visitors tab not found");
          
          visitorsTab.click();
          await uiUtils.sleepWithJitter(2000, 500);

          // Re-verify month on the visitors tab to be safe
          await attendanceDomUtils.ensureCorrectMonth(datesInMonthWithGuests[0], logger);

          let updatedAny = false;
          for (const date of datesInMonthWithGuests) {
            if (uiUtils.isAborted()) throw new Error("Process aborted by user.");
            
            const counts = monthData.guestCounts[date];
            const updatedCount = await handler.updateGuestCounts(counts, date);
            
            if (updatedCount > 0) {
              updatedAny = true;
              const dateTotal = Object.values(counts).reduce((sum, c) => sum + c, 0);
              totalGuestsProcessed += dateTotal;

              for (const [key, label] of Object.entries(attendanceGuestLogic.GUEST_CATEGORY_LABELS)) {
                const count = counts[key] || 0;
                if (count > 0) {
                  attendanceLog.push({
                    originalIndex: -1,
                    date,
                    firstName: `${count} Guest`,
                    lastName: label,
                    lcrUpdateStatus: "Marked as Guests in LCR",
                  });
                }
              }
            }
          }

          if (updatedAny) {
            await uiUtils.sleepWithJitter(1000, 500); // Let React settle
            await handler.saveVisitorCounts();
          }
        }
      }

      uiUtils.hideLoadingIndicator();
      safeRemoveById("lcr-tools-attendance-results-overlay");

      const updatedMessage = `Guest processing complete. ${totalMembersMarked} names found and marked. ${totalGuestsProcessed} guests added to visitor counts.`;

      createAttendanceResultsUI({
        ...parentOptions,
        message: updatedMessage,
        unmatchedNames: [],
        unmatchedByDate: {},
        attendanceLog,
      });
    } catch (error) {
      uiUtils.hideLoadingIndicator();
      logger.logError("Guest processing failed", { error: error.message });
      alert(`Error processing guests: ${error.message}`);
    }
  }

  window.attendanceUi = {
    UI_OVERLAY_ID,
    showUiStatus,
    showUiErrorStatus,
    closeAttendanceUI,
    getMostRecentSunday,
    createAttendanceResultsUI
  };
})();
