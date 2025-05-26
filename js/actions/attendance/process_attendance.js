/**
 * Main function to process attendance on the LCR page.
 * Assumes the target date is already visible in one of the table columns.
 * @param {string} targetDateStrYYYYMMDD - The target date in 'YYYY-MM-DD' format.
 * @param {Array<Object>} namesToMark - Array of objects like { firstName: 'John', lastName: 'Doe' }.
 */
async function LCR_TOOLS_PROCESS_ATTENDANCE(
  targetDateStrYYYYMMDD,
  namesToMark
) {
  const detailedActionLog = [];
  // window.lcrToolsShouldStopProcessing is now managed by loadingIndicator.js

  const logAction = (action, details = {}) => {
    const timestamp = new Date().toISOString();
    const consoleDetails =
      JSON.stringify(details).length > 200
        ? JSON.stringify(details).substring(0, 197) + "..."
        : details;
    console.log(`LCR_TOOLS_LOG: [${timestamp}] ${action}`, consoleDetails);
    detailedActionLog.push({
      timestamp,
      action,
      details: JSON.stringify(details),
    });
  };

  logAction("LCR_TOOLS_PROCESS_ATTENDANCE_SIMPLIFIED_DATE called", {
    targetDate: targetDateStrYYYYMMDD,
    namesCount: namesToMark.length,
  });

  if (
    typeof showLoadingIndicator !== "function" ||
    typeof hideLoadingIndicator !== "function"
  ) {
    const errorMsg = "Loading indicator functions missing.";
    logAction("ERROR_CRITICAL", { message: errorMsg });
    alert("LCR Tools: Critical error - UI functions missing.");
    return { result: { error: errorMsg } };
  }

  showLoadingIndicator(
    `Initializing attendance processing for ${targetDateStrYYYYMMDD}...`
  );

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function parseHeaderDate(dateStr) {
    // "DD Mon"
    try {
      const parts = dateStr.split(" ");
      if (parts.length !== 2) return null;
      const day = parseInt(parts[0]);
      const monthStr = parts[1];
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const monthIndex = monthNames.findIndex(
        (m) => m.toLowerCase() === monthStr.toLowerCase()
      );
      if (day && monthIndex !== -1) {
        const currentYear = new Date().getFullYear();
        let yearToUse = currentYear;
        const currentMonth = new Date().getMonth();
        if (monthIndex === 11 && currentMonth === 0)
          yearToUse = currentYear - 1;
        else if (monthIndex === 0 && currentMonth === 11)
          yearToUse = currentYear + 1;
        return new Date(yearToUse, monthIndex, day);
      }
      return null;
    } catch (e) {
      logAction("ERROR_parseHeaderDate", { dateStr, error: e.message });
      console.error("Error parsing header date:", dateStr, e);
      return null;
    }
  }

  function formatDateToYYYYMMDD(dateObj) {
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return null;
    const year = dateObj.getFullYear();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const day = dateObj.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function levenshteinDistance(a, b) {
    // Standard Levenshtein distance implementation
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

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

  try {
    logAction("Starting simplified date attendance processing");
    await sleep(500);
    if (window.lcrToolsShouldStopProcessing)
      throw new Error("Process aborted by user.");

    // --- Find Target Date Column in current DOM view ---
    showLoadingIndicator(
      `Verifying date ${targetDateStrYYYYMMDD} is visible...`
    );
    logAction("Verifying target date in DOM header");

    const visibleDateSpans = Array.from(
      document.querySelectorAll(
        "thead th.sc-arbpvo-0.sc-arbpvo-1 span:not(:has(svg))"
      )
    );
    let dateFoundInDom = false;
    for (const span of visibleDateSpans) {
      const headerDateStr = span.textContent.trim();
      const parsedHeaderDate = parseHeaderDate(headerDateStr);
      if (
        parsedHeaderDate &&
        formatDateToYYYYMMDD(parsedHeaderDate) === targetDateStrYYYYMMDD
      ) {
        const thElement = span.closest("th");
        if (thElement) {
          finalDomTargetDateColumnIndex = Array.from(
            thElement.parentElement.children
          ).indexOf(thElement);
          dateFoundInDom = true;
          logAction("Target date column found in current DOM view", {
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
      logAction("ERROR_TARGET_DATE_NOT_VISIBLE", {
        targetDate: targetDateStrYYYYMMDD,
      });
      alert("LCR Tools: " + errorMsg);
      hideLoadingIndicator(); // Hide before returning
      return { result: { error: errorMsg } };
    }

    if (window.lcrToolsShouldStopProcessing)
      throw new Error("Process aborted by user.");

    // --- Navigate to First Page of Members (if pagination exists) ---
    const firstPageMembersButton = document.querySelector(
      "div.sc-f155593d-0.jVFBIX"
    );
    if (
      firstPageMembersButton &&
      firstPageMembersButton.offsetParent !== null
    ) {
      const firstPageNumDiv = document.querySelector(
        ".sc-9d92d0db-0.lnnvp .sc-66e0b3ee-0:first-child"
      );
      if (firstPageNumDiv && !firstPageNumDiv.classList.contains("ghqlVx")) {
        logAction("Navigating to first page of members");
        showLoadingIndicator("Navigating to first page of members...");
        firstPageMembersButton.click();
        await sleep(2500);
      } else {
        logAction("Already on first page of members or no page numbers found");
      }
    } else {
      logAction("Member pagination 'Go to First Page' button not found");
    }
    if (window.lcrToolsShouldStopProcessing)
      throw new Error("Process aborted by user.");

    let hasMoreMemberPages = true;
    let memberPageNum = 1;

    while (hasMoreMemberPages && !window.lcrToolsShouldStopProcessing) {
      logAction("Processing member page", { pageNum: memberPageNum + 1 });
      showLoadingIndicator(
        `Processing member page ${
          memberPageNum + 1
        } for date ${targetDateStrYYYYMMDD}...`
      );

      const memberRows = document.querySelectorAll(
        "tbody tr.sc-zkgtp5-0.iooGpB"
      );
      logAction("Processing member rows on page", {
        pageNum: memberPageNum,
        rowCount: memberRows.length,
      });
      for (const row of memberRows) {
        if (window.lcrToolsShouldStopProcessing) break;
        const nameAnchor = row.querySelector("td:first-child a.sc-14fff288-0");
        if (!nameAnchor) continue;

        const lcrFullName = nameAnchor.textContent.trim();
        let lcrLastName = "",
          lcrFirstName = "";
        const commaIdx = lcrFullName.indexOf(",");
        if (commaIdx !== -1) {
          lcrLastName = lcrFullName.substring(0, commaIdx).trim().toLowerCase();
          lcrFirstName = lcrFullName
            .substring(commaIdx + 1)
            .trim()
            .toLowerCase();
        } else {
          const parts = lcrFullName.split(" ").filter((p) => p);
          if (parts.length > 0) lcrLastName = parts[0].toLowerCase();
          if (parts.length > 1)
            lcrFirstName = parts.slice(1).join(" ").toLowerCase();
        }

        const lcrFirstNamesArray = lcrFirstName
          ? lcrFirstName
              .split(/\s+/)
              .map((n) => n.trim())
              .filter(Boolean)
          : [];

        for (let i = 0; i < namesToSearchInLCR.length; i++) {
          if (window.lcrToolsShouldStopProcessing) break;
          const csvNameEntry = namesToSearchInLCR[i];
          if (csvNameEntry.processedThisSession) continue;

          const csvLastName = csvNameEntry.lastName.toLowerCase();
          const csvFirstName = csvNameEntry.firstName.toLowerCase();

          let isMatch = false;
          let matchMethod = "No Match";

          if (lcrLastName === csvLastName) {
            // Check if any first name in LCR matches exactly to CSV first name
            if (
              lcrFirstNamesArray.some((lcrFirst) => lcrFirst === csvFirstName)
            ) {
              isMatch = true;
              matchMethod = "Exact First Name (Any in LCR)";
            } else if (
              lcrFirstName.includes(csvFirstName) &&
              lcrFirstName.length - csvFirstName.length <= 3 &&
              csvFirstName.length >= Math.max(1, lcrFirstName.length - 3) &&
              csvFirstName.length > 1
            ) {
              isMatch = true;
              matchMethod = "LCR First Name Includes CSV First Name (Relaxed)";
            } else if (
              csvFirstName.includes(lcrFirstName) &&
              csvFirstName.length - lcrFirstName.length <= 3 &&
              lcrFirstName.length >= Math.max(1, csvFirstName.length - 3) &&
              lcrFirstName.length > 1
            ) {
              isMatch = true;
              matchMethod = "CSV First Name Includes LCR First Name (Relaxed)";
            } else if (
              lcrFirstName.charAt(0) === csvFirstName.charAt(0) &&
              levenshteinDistance(lcrFirstName, csvFirstName) === 1
            ) {
              isMatch = true;
              matchMethod = "Levenshtein = 1 (Same First Letter)";
            }
          }

          if (isMatch) {
            logAction("Name match found", {
              csvName: `${csvNameEntry.firstName} ${csvNameEntry.lastName}`,
              lcrName: lcrFullName,
              method: matchMethod,
            });
            const attendanceCells = row.querySelectorAll(
              "td.sc-8selpg-0.ABMfH"
            );
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
                logAction("Marking as present", { lcrName: lcrFullName });
                const clickableDiv =
                  notPresentIcon.closest("div.sc-5ba12d08-0");
                if (clickableDiv) {
                  clickableDiv.click();
                  currentStatusInLog = "Marked as Present in LCR";
                } else {
                  logAction("WARN_ClickableDivNotFoundForMarking", {
                    lcrName: lcrFullName,
                  });
                  currentStatusInLog = "Matched - Clickable Div Not Found";
                }
              } else if (isPresentIcon) {
                logAction("Already present", { lcrName: lcrFullName });
                currentStatusInLog = "Already Present in LCR";
              } else {
                logAction("Attendance icon state unclear", {
                  lcrName: lcrFullName,
                });
                currentStatusInLog = "Matched - Icon State Unknown/Empty";
              }
            } else {
              logAction("WARN_ColumnIndexOutOfBounds", {
                lcrName: lcrFullName,
                targetDomColIndex: finalDomTargetDateColumnIndex,
                cellCount: attendanceCells.length,
              });
              currentStatusInLog = "Matched in LCR - Column Error";
            }

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

      const nextMemberPageButton = document.querySelector(
        "div.sc-b87b8e2-0.cLfglj"
      );
      let onLastMemberPage = false;
      if (!nextMemberPageButton || nextMemberPageButton.offsetParent === null) {
        onLastMemberPage = true;
        logAction("Next Member Page button not found or hidden");
      } else {
        const pageIndicatorTextElement = document.querySelector(
          "div.sc-lf3bj0-0.biBXLT > div:last-of-type:not([class^='sc-'])"
        );
        if (
          pageIndicatorTextElement &&
          pageIndicatorTextElement.textContent.includes("/")
        ) {
          const parts = pageIndicatorTextElement.textContent.split("/");
          if (parts.length === 2) {
            const currentRange = parts[0];
            const totalItems = parseInt(parts[1], 10);
            const currentMaxShown = parseInt(currentRange.split("-").pop(), 10);
            if (
              !isNaN(totalItems) &&
              !isNaN(currentMaxShown) &&
              currentMaxShown >= totalItems
            ) {
              onLastMemberPage = true;
              logAction("Member page indicator shows all items displayed");
            }
          }
        }
        const lastMemberPageButton = document.querySelector(
          "div.sc-cb69f8b7-0.cXraMi"
        );
        if (
          lastMemberPageButton &&
          lastMemberPageButton.offsetParent === null
        ) {
          onLastMemberPage = true;
          logAction("'Go to Last Member Page' button hidden");
        }
      }

      if (onLastMemberPage) {
        logAction("Reached last page of members");
        hasMoreMemberPages = false;
      } else {
        logAction("Clicking to next member page");
        memberPageNum++;
        nextMemberPageButton.click();
        await sleep(2500);
      }
    }
    if (window.lcrToolsShouldStopProcessing)
      throw new Error("Process aborted by user.");

    logAction("Finalizing report");
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
    finalMessage +=
      "Please review the generated CSVs for detailed status of each name and actions taken.";

    logAction("Displaying final alert", { message: finalMessage });
    alert("LCR Tools: " + finalMessage);

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

    const summaryBlob = new Blob([summaryCsvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const summaryLink = document.createElement("a");
    const summaryUrl = URL.createObjectURL(summaryBlob);
    summaryLink.setAttribute("href", summaryUrl);
    summaryLink.setAttribute(
      "download",
      `attendance_update_summary_report_${targetDateStrYYYYMMDD}.csv`
    );
    document.body.appendChild(summaryLink);
    summaryLink.click();
    document.body.removeChild(summaryLink);
    URL.revokeObjectURL(summaryUrl);
    logAction("Summary report CSV downloaded");

    return { result: "success", unmatchedCount: stillUnmatchedForAlert.length };
  } catch (error) {
    if (error.message === "Process aborted by user.") {
      logAction("PROCESS_ABORTED_BY_USER_FINAL", { message: error.message });
      alert("LCR Tools: Process aborted by user.");
    } else {
      logAction("ERROR_PROCESS_ATTENDANCE_MAIN_TRY_CATCH", {
        error: error.message,
        stack: error.stack,
      });
      console.error("Error during LCR_TOOLS_PROCESS_ATTENDANCE:", error);
      alert(
        `LCR Tools: A critical error occurred during attendance processing: ${error.message}`
      );
    }
    return { result: { error: error.message } };
  } finally {
    logAction("Process finished. Generating detailed action log CSV.");
    try {
      const actionLogHeader = `"Timestamp","Action","Details"\n`;
      const actionLogRows = detailedActionLog
        .map(
          (log) =>
            `"${log.timestamp}","${log.action.replace(
              /"/g,
              '""'
            )}","${log.details.replace(/"/g, '""')}"`
        )
        .join("\n");
      const actionLogCsvContent = actionLogHeader + actionLogRows;
      const actionLogBlob = new Blob([actionLogCsvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const actionLogLink = document.createElement("a");
      const actionLogUrl = URL.createObjectURL(actionLogBlob);
      actionLogLink.setAttribute("href", actionLogUrl);
      actionLogLink.setAttribute(
        "download",
        `lcr_attendance_detailed_action_log_${targetDateStrYYYYMMDD}.csv`
      );
      document.body.appendChild(actionLogLink);
      actionLogLink.click();
      document.body.removeChild(actionLogLink);
      URL.revokeObjectURL(actionLogUrl);
      console.log("LCR Tools: Detailed action log CSV downloaded.");
    } catch (logError) {
      logAction("ERROR_GENERATING_ACTION_LOG_CSV", {
        error: logError.message,
        stack: logError.stack,
      });
      console.error("Error generating detailed action log CSV:", logError);
    }
    hideLoadingIndicator();
    // Reset the stop flag in the utility if the process completes or errors out,
    // so the next run isn't immediately aborted.
    window.lcrToolsShouldStopProcessing = false;
    logAction("Event listener removed and loading indicator hidden.");
  }
}
