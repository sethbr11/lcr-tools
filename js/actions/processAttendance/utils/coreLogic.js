(() => {
  if (utils.returnIfLoaded("attendanceCoreLogic")) return;
  utils.ensureLoaded("attendanceDomUtils", "attendanceUi", "uiUtils", "loggingUtils", "utils", "dataUtils");

  function buildFinalSummary(attendanceLog, aborted) {
    // For guest processing, we ONLY want names that were actually searched for and not found.
    // We EXCLUDE names where the date column itself was missing.
    const unmatched = attendanceLog
      .filter((e) => e.lcrUpdateStatus === "Not Found in LCR")
      .map((e) => ({ firstName: e.firstName, lastName: e.lastName, date: e.date }));

    let message = aborted
      ? "Attendance processing ABORTED by user. "
      : "Attendance processing complete. ";

    if (attendanceLog.some(log => log.lcrUpdateStatus !== "Marked as Present in LCR" && log.lcrUpdateStatus !== "Already Present in LCR")) {
      const total = attendanceLog.length;
      const marked = attendanceLog.filter(
        (log) =>
          log.lcrUpdateStatus === "Marked as Present in LCR" ||
          log.lcrUpdateStatus === "Marked as Present in LCR (Guest Processing)"
      ).length;
      const dateErrors = attendanceLog.filter(log => log.lcrUpdateStatus === "Date Column Not Found").length;
      
      message += `${marked} out of ${total} names were marked as present. `;
      if (dateErrors > 0) {
        message += `${dateErrors} name(s) skipped because the date column could not be found. `;
      }
      if (unmatched.length > 0) {
        message += `${unmatched.length} name(s) could not be found in LCR. `;
      }
    } else if (!aborted) {
      message += "All names were matched or acted upon in LCR. ";
    }

    return { message, unmatched };
  }

  /**
   * Process a single date's member rows.
   * Navigates to the correct month, finds the date column, and marks members present.
   * Returns { columnIndex, wardMembers, presentMembers } for later guest processing.
   */
  async function processDateBatch(targetDate, namesToMark, attendanceLog, logger) {
    logger.logAction("Processing date batch", { targetDate, count: namesToMark.length });

    // Ensure we are on the Members tab
    const membersTab = document.querySelector(attendanceDomUtils.SELECTORS.membersTab);
    if (membersTab && membersTab.getAttribute("aria-selected") !== "true") {
      logger.logAction("Switching to Members tab");
      membersTab.click();
      await uiUtils.sleepWithJitter(1000, 500);
    }

    // Helper to wait for table headers to appear and have text
    const waitForHeaders = async (timeout = 10000) => {
      const start = Date.now();
      let lastTextCount = -1;
      
      while (Date.now() - start < timeout) {
        if (uiUtils.isAborted()) throw new Error("Process aborted by user.");
        
        // Check for LCR error banner immediately
        const lcrError = document.querySelector(".eden-alert, .alert-danger, [role='alert']");
        if (lcrError && lcrError.textContent.toLowerCase().includes("unexpected error")) {
          throw new Error("LCR_SESSION_ERROR");
        }

        const headers = Array.from(document.querySelectorAll(attendanceDomUtils.SELECTORS.dateHeaders));
        const headersWithText = headers.filter(th => th.textContent.trim().length > 0);
        
        // Stability check: Wait until we have headers AND the number of headers with text is stable
        if (headers.length > 0 && headersWithText.length > 0) {
          if (headersWithText.length === lastTextCount) {
             // Second time seeing the same count of headers with text, we're likely stable
             return true;
          }
          lastTextCount = headersWithText.length;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      return false;
    };

    await waitForHeaders();
    let columnIndex = attendanceDomUtils.findTargetDateColumnIndex(targetDate, logger);

    // If the date column isn't visible, navigate to the correct month and retry
    if (columnIndex === -1) {
      logger.logAction("Target date not visible, navigating to correct month", { targetDate });
      uiUtils.showLoadingIndicator(`Navigating to the correct month for ${targetDate}...`);
      await attendanceDomUtils.ensureCorrectMonth(targetDate, logger);

      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (uiUtils.isAborted()) throw new Error("Process aborted by user.");
        
        uiUtils.showLoadingIndicator(`Waiting for table to update (attempt ${attempt}/${maxRetries})...`);
        await uiUtils.sleepWithJitter(2000, 1000);
        
        await waitForHeaders(); // Check for errors while waiting
        
        columnIndex = attendanceDomUtils.findTargetDateColumnIndex(targetDate, logger);
        if (columnIndex !== -1) {
          logger.logAction("Target date found after month navigation", { attempt });
          break;
        }
        logger.logAction("Target date still not visible, retrying...", { attempt });
      }

      if (columnIndex === -1) {
        const errorMsg = `Could not find date ${targetDate} after navigating to the correct month.`;
        logger.logError(errorMsg);
        // Mark all names for this date as errors in the log
        for (const name of namesToMark) {
          const idx = attendanceLog.findIndex(
            (log) => log.date === targetDate && log.firstName === name.firstName && log.lastName === name.lastName
          );
          if (idx !== -1) attendanceLog[idx].lcrUpdateStatus = "Date Column Not Found";
        }
        return { columnIndex: -1, wardMembers: [], presentMembers: new Set() };
      }
    }

    if (uiUtils.isAborted()) throw new Error("Process aborted by user.");

    // Process member rows
    logger.logAction("Processing member rows for " + targetDate);
    uiUtils.showLoadingIndicator(`Processing members for ${targetDate}...`, "Press ESC to abort");

    const memberRows = attendanceDomUtils.getMemberRows();
    const allWardMembers = [];
    const presentMembers = new Set();
    const namesToSearch = namesToMark.map((name) => ({ ...name, processedThisSession: false }));

    for (const row of memberRows) {
      if (uiUtils.isAborted()) break;
      const nameAnchor = attendanceDomUtils.getNameAnchor(row);
      if (!nameAnchor) continue;

      const lcrFullName = nameAnchor.textContent.trim();
      const lcrNameParsed = dataUtils.parseFullName(lcrFullName);

      const targetCell = attendanceDomUtils.getAttendanceCell(row, columnIndex);
      const isPresent = targetCell ? attendanceDomUtils.isPresentInCell(targetCell) : false;

      allWardMembers.push({
        fullName: lcrFullName,
        firstName: lcrNameParsed.firstName,
        lastName: lcrNameParsed.lastName,
        isPresent,
        pageNum: 1,
      });

      if (isPresent) {
        presentMembers.add(lcrFullName.toLowerCase());
      }

      for (const csvNameEntry of namesToSearch) {
        if (csvNameEntry.processedThisSession) continue;

        const matchResult = dataUtils.fuzzyNameMatch(csvNameEntry, lcrNameParsed);

        if (matchResult.isMatch) {
          logger.logAction("NAME_MATCH_FOUND", {
            csvName: `${csvNameEntry.firstName} ${csvNameEntry.lastName}`,
            lcrName: lcrFullName,
            method: matchResult.method,
            date: targetDate,
          });

          let currentStatusInLog = "Matched in LCR - Icon State Unclear";

          if (targetCell) {
            const notPresentDiv = attendanceDomUtils.getClickableDivForNotPresent(targetCell);
            const initialIsPresent = attendanceDomUtils.isPresentInCell(targetCell);

            if (notPresentDiv && !initialIsPresent) {
              // Human-like interaction: scroll into view and simulate hover
              row.scrollIntoView({ behavior: "smooth", block: "center" });
              await uiUtils.sleepWithJitter(100, 50);

              logger.logUserAction("CLICK", "attendance_cell", "mark_present", {
                memberName: lcrFullName,
                date: targetDate,
                beforeState: "not_present",
                afterState: "present",
              });

              notPresentDiv.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
              notPresentDiv.click();
              
              // Wait for React/LCR to update the icon
              let updated = false;
              const startWait = Date.now();
              const timeout = 2500; // Slightly shorter timeout
              
              while (Date.now() - startWait < timeout) {
                if (uiUtils.isAborted()) throw new Error("Process aborted by user.");
                if (attendanceDomUtils.isPresentInCell(targetCell)) {
                  updated = true;
                  break;
                }
                await new Promise(resolve => setTimeout(resolve, 50)); // Check more frequently
              }

              if (updated) {
                currentStatusInLog = "Marked as Present in LCR";
                presentMembers.add(lcrFullName.toLowerCase());
                allWardMembers[allWardMembers.length - 1].isPresent = true;
                logger.logAction("MEMBER_MARKED_SUCCESSFULLY", { memberName: lcrFullName, date: targetDate });
              } else {
                logger.logAction("MEMBER_MARK_UI_TIMEOUT", { memberName: lcrFullName, date: targetDate });
                currentStatusInLog = "Marked (UI update slow/failed)";
              }
              
              // Extra safety delay with jitter to mimic human hesitation
              await uiUtils.sleepWithJitter(150, 100);

              logger.logModification(
                "UPDATE", "attendance_record",
                { member: lcrFullName, date: targetDate, status: "not_present" },
                { member: lcrFullName, date: targetDate, status: "present" },
                { method: "user_click" }
              );
            } else if (initialIsPresent) {
              logger.logAction("MEMBER_ALREADY_PRESENT", { memberName: lcrFullName, date: targetDate });
              currentStatusInLog = "Already Present in LCR";
            } else {
              logger.logAction("ATTENDANCE_ICON_STATE_UNCLEAR", { memberName: lcrFullName });
              currentStatusInLog = "Matched - Icon State Unknown/Empty";
            }
          } else {
            logger.logError("Column index out of bounds", { memberName: lcrFullName, targetColumnIndex: columnIndex });
            currentStatusInLog = "Matched in LCR - Column Error";
          }

          const idx = attendanceLog.findIndex(
            (log) => log.date === targetDate &&
                     log.firstName.toLowerCase() === csvNameEntry.firstName.toLowerCase() &&
                     log.lastName.toLowerCase() === csvNameEntry.lastName.toLowerCase()
          );
          if (idx !== -1) attendanceLog[idx].lcrUpdateStatus = currentStatusInLog;

          csvNameEntry.processedThisSession = true;
          break;
        }
      }
    }
    
    // Buffer sleep at the end of the batch to allow any pending React requests to resolve
    // before we potentially navigate to another month or tab.
    await uiUtils.sleepWithJitter(1000, 500);

    return { columnIndex, wardMembers: allWardMembers, presentMembers };
  }

  async function LCR_TOOLS_PROCESS_ATTENDANCE(namesByDate) {
    const sortedDates = Object.keys(namesByDate).sort();
    const totalNames = sortedDates.reduce((sum, d) => sum + namesByDate[d].length, 0);

    const logger = loggingUtils.createActionLogger("ATTENDANCE_PROCESSING", {
      includeTimestamp: true,
      includeUrl: true,
      logLevel: "INFO",
    });
    logger.logAction("LCR_TOOLS_PROCESS_ATTENDANCE_STARTED", {
      dates: sortedDates,
      totalNames,
    });

    uiUtils.showLoadingIndicator(`Initializing attendance processing for ${sortedDates.length} date(s)...`);

    // Build combined attendance log
    const attendanceLog = [];
    for (const date of sortedDates) {
      for (const name of namesByDate[date]) {
        attendanceLog.push({
          originalIndex: attendanceLog.length,
          date,
          firstName: name.firstName,
          lastName: name.lastName,
          lcrUpdateStatus: "Not Found in LCR",
        });
      }
    }

    // Per-date results for the guest modal
    const dateResults = {};

    try {
      logger.logAction("Starting batched attendance processing");
      await uiUtils.sleepWithJitter(500, 500);
      if (uiUtils.isAborted()) throw new Error("Process aborted by user.");

      // Phase 1: Process all member tabs for each date
      for (let i = 0; i < sortedDates.length; i++) {
        const date = sortedDates[i];
        if (uiUtils.isAborted()) throw new Error("Process aborted by user.");

        uiUtils.showLoadingIndicator(
          `Processing date ${i + 1} of ${sortedDates.length}: ${date}...`
        );

        const result = await processDateBatch(date, namesByDate[date], attendanceLog, logger);
        dateResults[date] = result;
      }

      // Phase 2: Build results
      logger.logAction("Finalizing report");
      uiUtils.showLoadingIndicator("Finalizing report and generating CSVs...");

      const { message: finalMessage, unmatched: allUnmatched } = buildFinalSummary(attendanceLog, uiUtils.isAborted());

      // Group unmatched by date
      const unmatchedByDate = {};
      for (const u of allUnmatched) {
        if (!unmatchedByDate[u.date]) unmatchedByDate[u.date] = [];
        unmatchedByDate[u.date].push({ firstName: u.firstName, lastName: u.lastName });
      }

      // Combine ward members from all date batches (use last batch's members for search)
      const lastDate = sortedDates[sortedDates.length - 1];
      const lastResult = dateResults[lastDate] || {};
      const allWardMembers = lastResult.wardMembers || [];
      allWardMembers.sort((a, b) => a.fullName.localeCompare(b.fullName));

      attendanceUi.createAttendanceResultsUI({
        message: finalMessage,
        unmatchedNames: allUnmatched,
        unmatchedByDate,
        attendanceLog,
        targetDate: sortedDates.join(", "),
        dates: sortedDates,
        dateResults,
        logger,
        aborted: uiUtils.isAborted(),
        wardMembers: allWardMembers,
        presentMembers: lastResult.presentMembers || new Set(),
      });

      const summary = {
        totalNamesProcessed: totalNames,
        dates: sortedDates,
        successfulMatches: attendanceLog.filter((log) => !log.lcrUpdateStatus.includes("Not Found")).length,
        attendanceMarked: attendanceLog.filter((log) => log.lcrUpdateStatus === "Marked as Present in LCR").length,
        alreadyPresent: attendanceLog.filter((log) => log.lcrUpdateStatus === "Already Present in LCR").length,
        notFound: allUnmatched.length,
        aborted: uiUtils.isAborted(),
      };

      logger.logCompletion(uiUtils.isAborted() ? "ABORTED" : "SUCCESS", summary);
      return { result: "success", unmatchedCount: allUnmatched.length };

    } catch (error) {
      logger.logError(error, { phase: "main_processing" });

      if (error.message === "Process aborted by user.") {
        logger.logCompletion("ABORTED", { reason: "user_request" });
        attendanceUi.createAttendanceResultsUI({
          message: "Process aborted by user.",
          unmatchedNames: [],
          unmatchedByDate: {},
          attendanceLog: [],
          targetDate: sortedDates.join(", "),
          dates: sortedDates,
          dateResults: {},
          logger,
          aborted: true,
          error: true,
        });
      } else if (error.message === "LCR_SESSION_ERROR") {
        logger.logCompletion("FAILED", { reason: "lcr_unexpected_error_banner" });
        attendanceUi.createAttendanceResultsUI({
          message: `LCR encountered an internal error: "An unexpected error occurred."<br><br>
            <strong>To fix this, please:</strong><br>
            1. Navigate back to the <strong>LCR Main Page</strong> (Dashboard).<br>
            2. Return to this Attendance page.<br>
            3. Try processing your data again (perhaps one date at a time if the error persists).<br><br>
            <em>This resets LCR's internal state which often resolves this "Unexpected error" banner.</em>`,
          unmatchedNames: [],
          unmatchedByDate: {},
          attendanceLog: [],
          targetDate: sortedDates.join(", "),
          dates: sortedDates,
          dateResults: {},
          logger,
          aborted: false,
          error: true,
        });
      } else {
        logger.logCompletion("FAILED", { error: error.message });
        console.error("Error during LCR_TOOLS_PROCESS_ATTENDANCE:", error);
        attendanceUi.createAttendanceResultsUI({
          message: `A critical error occurred: ${error.message}. Please refresh and try again.`,
          unmatchedNames: [],
          unmatchedByDate: {},
          attendanceLog: [],
          targetDate: sortedDates.join(", "),
          dates: sortedDates,
          dateResults: {},
          logger,
          aborted: false,
          error: true,
        });
      }
      return { result: { error: error.message } };
    } finally {
      uiUtils.resetAborted();
      uiUtils.hideLoadingIndicator();
    }
  }

  window.attendanceCoreLogic = { LCR_TOOLS_PROCESS_ATTENDANCE };
})();
