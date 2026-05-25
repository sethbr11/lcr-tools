(() => {
  if (utils.returnIfLoaded("attendanceDomUtils")) return;
  utils.ensureLoaded("dataUtils", "tableUtils", "utils", "uiUtils");

  const SELECTORS = {
    membersTab: "#tab-MEMBERS",
    visitorsTab: "#tab-VISITORS",
    saveButton: "button.eden-button--primary:not([disabled])",
    memberRows: "tbody tr[role='row']",
    nameButton: "td:first-child button.member-card__styled-ghost",
    attendanceButton: "button.useClassQuorumAttendanceMembers_attendanceButton__toNdf",
    dateHeaders: "th.eden-table-th",
    monthSelect: "select.eden-form-part-input__control",
  };

  const ICON_PATHS = {
    present: "M12 22c5.523", // Assuming this is still used for present
    notPresent: "M12 3.5a8.5", // Confirmed from HTML
  };

  function getMemberRows() {
    // Only get rows from the members table by ensuring we are in the members tab
    return document.querySelectorAll(SELECTORS.memberRows);
  }

  function getNameAnchor(row) {
    return row.querySelector(SELECTORS.nameButton);
  }

  function getAttendanceCells(row) {
    return row.querySelectorAll("td");
  }

  function getAttendanceCell(row, colIndex) {
    const cells = getAttendanceCells(row);
    return cells.length > colIndex ? cells[colIndex] : null;
  }

  function cellHasIconPath(cell, frag) {
    return cell?.querySelector(`svg path[d*="${frag}"]`);
  }

  function isPresentInCell(cell) {
    return !!cellHasIconPath(cell, ICON_PATHS.present);
  }

  function getClickableDivForNotPresent(cell) {
    const path = cellHasIconPath(cell, ICON_PATHS.notPresent);
    return path ? path.closest("button") : null;
  }

  function clickSaveButton(logger) {
    const saveBtn = document.querySelector(SELECTORS.saveButton);
    if (saveBtn) {
      saveBtn.click();
      logger?.logAction?.("Clicked global save button");
      return true;
    }
    return false;
  }

  function clickMemberAttendance(cell, logger) {
    const btn = cell.querySelector(SELECTORS.attendanceButton);
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }

  function findRowByFullName(fullName) {
    for (const row of getMemberRows()) {
      const a = getNameAnchor(row);
      // Wait, name format is "Last, First Middle"
      // LCR might format it differently, but fullName passed here is already parsed into expected format or we use fuzzy
      if (a && a.textContent.trim() === fullName) return row;
    }
    return null;
  }

  function buildWardMember(row, targetDateColumnIndex, pageNum = 1, includeRow = false) {
    const nameAnchor = getNameAnchor(row);
    if (!nameAnchor) return null;
    const fullName = nameAnchor.textContent.trim();
    const parsedName = dataUtils.parseFullName(fullName);
    const cell = getAttendanceCell(row, targetDateColumnIndex);
    const isPresent = cell ? isPresentInCell(cell) : false;
    const member = {
      fullName,
      firstName: parsedName.firstName,
      lastName: parsedName.lastName,
      isPresent,
      pageNum,
    };
    if (includeRow) member.row = row;
    return member;
  }

  function findTargetDateColumnIndex(targetDate, logger) {
    const parts = targetDate.split("-");
    const dayNum = parseInt(parts[2], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthAbbr = monthNames[monthIndex].toLowerCase();

    // Focus on headers within the visible main attendance table
    const allTables = Array.from(document.querySelectorAll("table"));
    const table = allTables.find(t => t.offsetParent !== null) || allTables[0];
    if (!table) return -1;

    const visibleDateHeaders = Array.from(table.querySelectorAll("thead th"));
    const foundHeaders = [];

    for (const th of visibleDateHeaders) {
      // Use innerText as it's closer to what the user actually sees
      let headerText = (th.innerText || th.textContent || "").trim().toLowerCase().replace(/\s+/g, " ");
      if (!headerText) continue;

      // Clean up duplicates (e.g. "07 Mar 07 Mar")
      const len = headerText.length;
      if (len > 4 && headerText.substring(0, len / 2).trim() === headerText.substring(len / 2).trim()) {
        headerText = headerText.substring(0, len / 2).trim();
      }

      foundHeaders.push(headerText);

      const hasMonth = headerText.includes(monthAbbr);
      
      // Extract all numbers from the header text to check against dayNum
      const numbersInHeader = headerText.match(/\d+/g) || [];
      const hasDay = numbersInHeader.some(n => parseInt(n, 10) === dayNum);

      if (hasMonth && hasDay) {
        const idx = Array.from(th.parentElement.children).indexOf(th);
        logger?.logAction?.("Target date column found", {
          date: targetDate,
          columnIndex: idx,
          headerText: headerText,
        });
        return idx;
      }
    }

    logger?.logError?.("Target date not visible", { 
      targetDate, 
      expectedDay: dayNum,
      expectedMonth: monthAbbr,
      foundHeaders: foundHeaders
    });
    return -1;
  }
  async function ensureCorrectMonth(targetDate, logger) {
    const targetMonthPrefix = targetDate.substring(0, 7); // "YYYY-MM"
    
    // Helper to wait for a dropdown to have options
    const waitForOptions = async (select, timeout = 3000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (select.options.length > 1) return true;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      return false;
    };

    // Find all select elements that could be the month dropdown
    const allSelects = Array.from(document.querySelectorAll(SELECTORS.monthSelect));
    logger?.logAction?.("Scanning select elements for month dropdown", { totalCount: allSelects.length });

    // Find the relevant month select (prefer visible one)
    let monthSelect = null;
    for (const select of allSelects) {
      await waitForOptions(select); // Give options a moment to appear
      const isMonthSelect = Array.from(select.options).some(opt => /^\d{4}-\d{2}$/.test(opt.value));
      if (isMonthSelect) {
        if (!monthSelect || select.offsetParent !== null) {
          monthSelect = select;
          if (select.offsetParent !== null) break; 
        }
      }
    }

    if (!monthSelect) {
      logger?.logAction?.("Month dropdown not found on this page.");
      return false;
    }

    logger?.logAction?.("Targeting month dropdown", {
      currentValue: monthSelect.value,
      targetValue: targetMonthPrefix,
      id: monthSelect.id,
      isVisible: monthSelect.offsetParent !== null
    });

    if (monthSelect.value === targetMonthPrefix) {
      logger?.logAction?.("Month dropdown already set correctly.");
      return false;
    }

    // Check if the target month option exists
    const targetOption = Array.from(monthSelect.options).find(opt => opt.value === targetMonthPrefix);
    if (!targetOption) {
      logger?.logError?.("Target month option not found in dropdown", { targetMonthPrefix });
      return false;
    }

    // Use the native setter to bypass React's value tracking
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
    if (nativeSetter) {
      nativeSetter.call(monthSelect, targetMonthPrefix);
    } else {
      monthSelect.value = targetMonthPrefix;
    }

    // Also mark the option as selected
    targetOption.selected = true;

    // Dispatch events to trigger React's change detection
    monthSelect.dispatchEvent(new Event("input", { bubbles: true }));
    await uiUtils.sleepWithJitter(100, 100);
    monthSelect.dispatchEvent(new Event("change", { bubbles: true }));

    logger?.logAction?.("Triggered month change request", {
      to: targetMonthPrefix
    });

    logger?.logAction?.("Waiting for data refresh...");
    await uiUtils.sleepWithJitter(4000, 1000); // More human-like wait time
    
    return true;
  }

  window.attendanceDomUtils = {
    SELECTORS,
    ICON_PATHS,
    getMemberRows,
    getNameAnchor,
    getAttendanceCell,
    isPresentInCell,
    getClickableDivForNotPresent,
    clickSaveButton,
    clickMemberAttendance,
    findRowByFullName,
    buildWardMember,
    findTargetDateColumnIndex,
    ensureCorrectMonth
  };
})();
