/**
 * Main function to process attendance on the LCR page.
 */
async function LCR_TOOLS_PROCESS_ATTENDANCE(
  targetDateStrYYYYMMDD,
  namesToMark
) {
  window.lcrToolsShouldStopProcessing = false; // Reset abort flag
  // Create action logger for this attendance processing session
  const logger = loggingUtils.createActionLogger("ATTENDANCE_PROCESSING", {
    includeTimestamp: true,
    includeUrl: true,
    logLevel: "INFO",
  });

  logger.logAction("LCR_TOOLS_PROCESS_ATTENDANCE_STARTED", {
    targetDate: targetDateStrYYYYMMDD,
    namesCount: namesToMark.length,
    names: namesToMark.map((n) => `${n.firstName} ${n.lastName}`),
  });

  if (
    typeof showLoadingIndicator !== "function" ||
    typeof hideLoadingIndicator !== "function"
  ) {
    const errorMsg = "Loading indicator functions missing.";
    logger.logError(errorMsg);
    alert("LCR Tools: Critical error - UI functions missing.");
    return { result: { error: errorMsg } };
  }

  showLoadingIndicator(
    `Initializing attendance processing for ${targetDateStrYYYYMMDD}...`
  );

  const attendanceLog = namesToMark.map((name, index) => ({
    originalIndex: index,
    date: targetDateStrYYYYMMDD,
    firstName: name.firstName,
    lastName: name.lastName,
    lcrUpdateStatus: "Not Found in LCR",
  }));
  const namesToSearchInLCR = namesToMark.map((name) => ({
    ...name,
    processedThisSession: false,
  }));
  let finalDomTargetDateColumnIndex = -1;

  // Add collection for all ward members encountered during processing
  const allWardMembers = [];
  const presentMembers = new Set();

  try {
    logger.logAction("Starting simplified date attendance processing");
    await scrapingUtils.sleep(500);
    if (window.lcrToolsShouldStopProcessing)
      throw new Error("Process aborted by user.");

    // --- Find Target Date Column in current DOM view ---
    showLoadingIndicator(
      `Verifying date ${targetDateStrYYYYMMDD} is visible...`
    );
    logger.logAction("Verifying target date in DOM header");

    const visibleDateSpans = Array.from(
      document.querySelectorAll(
        "thead th.sc-arbpvo-0.sc-arbpvo-1 span:not(:has(svg))"
      )
    );
    let dateFoundInDom = false;

    for (const span of visibleDateSpans) {
      const headerDateStr = span.textContent.trim();
      const parsedHeaderDate = dateUtils.parseHeaderDate(headerDateStr);
      if (
        parsedHeaderDate &&
        dateUtils.formatToYYYYMMDD(parsedHeaderDate) === targetDateStrYYYYMMDD
      ) {
        const thElement = span.closest("th");
        if (thElement) {
          finalDomTargetDateColumnIndex = Array.from(
            thElement.parentElement.children
          ).indexOf(thElement);
          dateFoundInDom = true;
          logger.logAction("Target date column found in current DOM view", {
            date: targetDateStrYYYYMMDD,
            columnIndex: finalDomTargetDateColumnIndex,
            headerText: headerDateStr,
          });
          break;
        }
      }
    }

    if (!dateFoundInDom) {
      const errorMsg = `Target date ${targetDateStrYYYYMMDD} is not visible in the current table columns. Please navigate LCR to show this date and try again.`;
      logger.logError("Target date not visible", {
        targetDate: targetDateStrYYYYMMDD,
      });
      alert("LCR Tools: " + errorMsg);
      hideLoadingIndicator();
      return { result: { error: errorMsg } };
    }

    if (window.lcrToolsShouldStopProcessing)
      throw new Error("Process aborted by user.");

    // --- Navigate to First Page of Members ---
    console.log("LCR Tools: Navigating to first page of members...");
    await paginationUtils.navigateToFirstPage(2000); // Use consistent delay

    let memberPageNum = 1;
    const MAX_MEMBER_PAGES = 50; // Safety limit for attendance processing

    // Improved pagination loop
    while (
      memberPageNum <= MAX_MEMBER_PAGES &&
      !window.lcrToolsShouldStopProcessing
    ) {
      logger.logAction("Processing member page", {
        pageNum: memberPageNum,
      });
      showLoadingIndicator(
        `Processing page ${memberPageNum + 1}...`,
        "Press ESC to abort"
      );

      const memberRows = document.querySelectorAll(
        "tbody tr.sc-zkgtp5-0.iooGpB"
      );
      logger.logAction("Processing member rows on page", {
        pageNum: memberPageNum,
        rowCount: memberRows.length,
      });

      for (const row of memberRows) {
        if (window.lcrToolsShouldStopProcessing) break;
        const nameAnchor = row.querySelector("td:first-child a.sc-14fff288-0");
        if (!nameAnchor) continue;

        const lcrFullName = nameAnchor.textContent.trim();
        const lcrNameParsed = stringUtils.parseFullName(lcrFullName);

        // Check if member is already present for target date
        const attendanceCells = row.querySelectorAll("td.sc-8selpg-0.ABMfH");
        let isPresent = false;

        if (attendanceCells.length > finalDomTargetDateColumnIndex) {
          const targetCell = attendanceCells[finalDomTargetDateColumnIndex];
          const isPresentIcon = targetCell.querySelector(
            'div.sc-5ba12d08-0 svg path[d*="M12 22c5.523"]'
          );
          isPresent = !!isPresentIcon;
        }

        // Collect ward member data for guest processing
        allWardMembers.push({
          fullName: lcrFullName,
          firstName: lcrNameParsed.firstName,
          lastName: lcrNameParsed.lastName,
          isPresent,
          pageNum: memberPageNum,
        });

        if (isPresent) {
          presentMembers.add(lcrFullName.toLowerCase());
        }

        // Process attendance matching (existing logic)
        for (const csvNameEntry of namesToSearchInLCR) {
          if (csvNameEntry.processedThisSession) continue;

          const matchResult = stringUtils.fuzzyNameMatch(
            csvNameEntry,
            lcrNameParsed
          );

          if (matchResult.isMatch) {
            logger.logAction("NAME_MATCH_FOUND", {
              csvName: `${csvNameEntry.firstName} ${csvNameEntry.lastName}`,
              lcrName: lcrFullName,
              method: matchResult.method,
            });

            let currentStatusInLog = "Matched in LCR - Icon State Unclear";

            if (attendanceCells.length > finalDomTargetDateColumnIndex) {
              const targetCell = attendanceCells[finalDomTargetDateColumnIndex];
              const notPresentIconPath = "M12 3.5a8.5";
              const isPresentIconPath = "M12 22c5.523";

              const notPresentIcon = targetCell.querySelector(
                `div.sc-5ba12d08-0 svg path[d*="${notPresentIconPath}"]`
              );
              const isPresentIcon = targetCell.querySelector(
                `div.sc-5ba12d08-0 svg path[d*="${isPresentIconPath}"]`
              );

              if (notPresentIcon && !isPresentIcon) {
                logger.logUserAction(
                  "CLICK",
                  "attendance_cell",
                  "mark_present",
                  {
                    memberName: lcrFullName,
                    date: targetDateStrYYYYMMDD,
                    beforeState: "not_present",
                    afterState: "present",
                  }
                );

                const clickableDiv =
                  notPresentIcon.closest("div.sc-5ba12d08-0");
                if (clickableDiv) {
                  clickableDiv.click();
                  currentStatusInLog = "Marked as Present in LCR";

                  // Update present members set since we just marked them
                  presentMembers.add(lcrFullName.toLowerCase());
                  // Update the ward member record too
                  const wardMemberIndex = allWardMembers.findIndex(
                    (m) => m.fullName === lcrFullName
                  );
                  if (wardMemberIndex !== -1) {
                    allWardMembers[wardMemberIndex].isPresent = true;
                  }

                  logger.logModification(
                    "UPDATE",
                    "attendance_record",
                    {
                      member: lcrFullName,
                      date: targetDateStrYYYYMMDD,
                      status: "not_present",
                    },
                    {
                      member: lcrFullName,
                      date: targetDateStrYYYYMMDD,
                      status: "present",
                    },
                    { method: "user_click" }
                  );
                } else {
                  logger.logError(
                    "Clickable div not found for marking attendance",
                    {
                      memberName: lcrFullName,
                    }
                  );
                  currentStatusInLog = "Matched - Clickable Div Not Found";
                }
              } else if (isPresentIcon) {
                logger.logAction("MEMBER_ALREADY_PRESENT", {
                  memberName: lcrFullName,
                  date: targetDateStrYYYYMMDD,
                });
                currentStatusInLog = "Already Present in LCR";
              } else {
                logger.logAction("ATTENDANCE_ICON_STATE_UNCLEAR", {
                  memberName: lcrFullName,
                });
                currentStatusInLog = "Matched - Icon State Unknown/Empty";
              }
            } else {
              logger.logError("Column index out of bounds", {
                memberName: lcrFullName,
                targetColumnIndex: finalDomTargetDateColumnIndex,
                availableCells: attendanceCells.length,
              });
              currentStatusInLog = "Matched in LCR - Column Error";
            }

            // Update attendance log
            const logEntryIndex = attendanceLog.findIndex(
              (log) =>
                log.firstName.toLowerCase() ===
                  csvNameEntry.firstName.toLowerCase() &&
                log.lastName.toLowerCase() ===
                  csvNameEntry.lastName.toLowerCase()
            );
            if (logEntryIndex !== -1) {
              attendanceLog[logEntryIndex].lcrUpdateStatus = currentStatusInLog;
            }

            csvNameEntry.processedThisSession = true;
            break;
          }
        }
        if (window.lcrToolsShouldStopProcessing) break;
      }
      if (window.lcrToolsShouldStopProcessing) break;

      // Check if we're on the last page before trying to navigate
      if (paginationUtils.isLastPage()) {
        console.log(
          `LCR Tools: Reached last page of members at page ${memberPageNum}`
        );
        logger.logAction("Reached last page of members", {
          pageNum: memberPageNum,
        });
        break;
      }

      // Try to navigate to next page
      const nextPageSuccess = await paginationUtils.goToNextPage(
        2000, // delay
        MAX_MEMBER_PAGES, // max pages
        memberPageNum // current page number
      );

      if (!nextPageSuccess) {
        console.log(
          "LCR Tools: Could not navigate to next member page, stopping."
        );
        logger.logAction("Navigation to next page failed", {
          pageNum: memberPageNum,
        });
        break;
      } else {
        memberPageNum++;
      }
    }

    if (memberPageNum >= MAX_MEMBER_PAGES) {
      console.warn(
        `LCR Tools: Reached maximum page limit (${MAX_MEMBER_PAGES}) for attendance processing.`
      );
      logger.logAction("Reached maximum page limit", {
        maxPages: MAX_MEMBER_PAGES,
      });
    }

    logger.logAction("Finalizing report");
    showLoadingIndicator("Finalizing report and generating CSVs...");
    const stillUnmatchedForAlert = attendanceLog.filter(
      (logEntry) => logEntry.lcrUpdateStatus === "Not Found in LCR"
    );

    let finalMessage = "Attendance processing complete. ";
    if (window.lcrToolsShouldStopProcessing) {
      finalMessage = "Attendance processing ABORTED by user. ";
    }
    if (stillUnmatchedForAlert.length > 0) {
      const namesList = stillUnmatchedForAlert
        .map((n) => `${n.firstName} ${n.lastName}`)
        .join(", ");
      finalMessage += `The following ${stillUnmatchedForAlert.length} name(s) from your CSV could not be found in LCR: ${namesList}. `;
    } else if (!window.lcrToolsShouldStopProcessing) {
      finalMessage +=
        "All names from the CSV were matched or acted upon in LCR. ";
    }

    // Sort collected ward members alphabetically
    allWardMembers.sort((a, b) => a.fullName.localeCompare(b.fullName));

    logger.logAction("Ward members collected during processing", {
      totalMembers: allWardMembers.length,
      presentMembers: presentMembers.size,
    });

    logger.logAction("Displaying results popup");

    // Create results popup with ward members data
    createAttendanceResultsUI({
      message: finalMessage,
      unmatchedNames: stillUnmatchedForAlert,
      attendanceLog: attendanceLog,
      targetDate: targetDateStrYYYYMMDD,
      logger: logger,
      aborted: window.lcrToolsShouldStopProcessing,
      wardMembers: allWardMembers, // Pass collected ward members
      presentMembers: presentMembers, // Pass present members set
      targetDateColumnIndex: finalDomTargetDateColumnIndex,
    });

    const summary = {
      totalNamesProcessed: namesToMark.length,
      successfulMatches: attendanceLog.filter(
        (log) => !log.lcrUpdateStatus.includes("Not Found")
      ).length,
      attendanceMarked: attendanceLog.filter(
        (log) => log.lcrUpdateStatus === "Marked as Present in LCR"
      ).length,
      alreadyPresent: attendanceLog.filter(
        (log) => log.lcrUpdateStatus === "Already Present in LCR"
      ).length,
      notFound: stillUnmatchedForAlert.length,
      aborted: window.lcrToolsShouldStopProcessing,
    };

    logger.logCompletion(
      window.lcrToolsShouldStopProcessing ? "ABORTED" : "SUCCESS",
      summary
    );

    return { result: "success", unmatchedCount: stillUnmatchedForAlert.length };
  } catch (error) {
    logger.logError(error, { phase: "main_processing" });

    if (error.message === "Process aborted by user.") {
      logger.logCompletion("ABORTED", { reason: "user_request" });
      createAttendanceResultsUI({
        message: "Process aborted by user.",
        unmatchedNames: [],
        attendanceLog: [],
        targetDate: targetDateStrYYYYMMDD,
        logger: logger,
        aborted: true,
        error: true,
      });
    } else {
      logger.logCompletion("FAILED", { error: error.message });
      console.error("Error during LCR_TOOLS_PROCESS_ATTENDANCE:", error);
      createAttendanceResultsUI({
        message: `A critical error occurred during attendance processing: ${error.message}`,
        unmatchedNames: [],
        attendanceLog: [],
        targetDate: targetDateStrYYYYMMDD,
        logger: logger,
        aborted: false,
        error: true,
      });
    }
    return { result: { error: error.message } };
  } finally {
    window.lcrToolsShouldStopProcessing = false; // Ensure flag is reset
    hideLoadingIndicator();
  }
}
