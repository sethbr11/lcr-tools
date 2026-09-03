(() => {
  if (utils.returnIfLoaded("attendanceDomUtils")) return;
  utils.ensureLoaded("dataUtils", "tableUtils", "utils", "uiUtils");

  const SELECTORS = {
    membersTab: "#tab-MEMBERS",
    visitorsTab: "#tab-VISITORS",
    saveButton: "button.eden-button--primary:not([disabled])",
    memberRows: "tbody tr[role='row']",
    nameButton: "td:first-child button.member-card__styled-ghost",
    attendanceButton: "button[class*='attendanceButton'], button.useClassQuorumAttendanceMembers_attendanceButton__toNdf",
    dateHeaders: "th.eden-table-th",
    selectControl: "select.eden-form-part-input__control, select",
    sundayTabButtons: "button.eden-button-bar__button, button",
  };

  const ICON_PATHS = {
    present: "M12 22c5.523", // Present filled icon path
    notPresent: "M12 3.5a8.5", // Empty circle outline
  };

  const MONTH_NAMES = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];

  function getMemberRows() {
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
    const saveBtn =
      document.querySelector(SELECTORS.saveButton) ||
      Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent.trim().toLowerCase() === "save" && !b.disabled
      );
    if (saveBtn) {
      saveBtn.click();
      logger?.logAction?.("Clicked global save button");
      return true;
    }
    return false;
  }

  function clickMemberAttendance(cell, logger) {
    const btn = cell?.querySelector(SELECTORS.attendanceButton);
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }

  function findRowByFullName(fullName) {
    for (const row of getMemberRows()) {
      const a = getNameAnchor(row);
      if (a && a.textContent.trim() === fullName) return row;
    }
    return null;
  }

  function buildWardMember(row, targetDateColumnIndex, pageNum = 1, includeRow = false) {
    const nameAnchor = getNameAnchor(row);
    if (!nameAnchor) return null;
    const fullName = nameAnchor.textContent.trim();
    const parsedName = dataUtils.parseFullName(fullName);
    const cell = targetDateColumnIndex !== undefined ? getAttendanceCell(row, targetDateColumnIndex) : null;
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

    const allTables = Array.from(document.querySelectorAll("table"));
    const table = allTables.find((t) => t.offsetParent !== null) || allTables[0];
    if (!table) return -1;

    const visibleDateHeaders = Array.from(table.querySelectorAll("thead th"));
    const foundHeaders = [];

    for (const th of visibleDateHeaders) {
      let headerText = (th.innerText || th.textContent || "").trim().toLowerCase().replace(/\s+/g, " ");
      if (!headerText) continue;

      const len = headerText.length;
      if (len > 4 && headerText.substring(0, len / 2).trim() === headerText.substring(len / 2).trim()) {
        headerText = headerText.substring(0, len / 2).trim();
      }

      foundHeaders.push(headerText);
      const hasMonth = headerText.includes(monthAbbr);
      const numbersInHeader = headerText.match(/\d+/g) || [];
      const hasDay = numbersInHeader.some((n) => parseInt(n, 10) === dayNum);

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
      foundHeaders: foundHeaders,
    });
    return -1;
  }

  // --- React Synthetic Select Helper ---
  function setNativeSelectValue(select, targetOption) {
    if (!select || !targetOption) return false;
    const val = targetOption.value;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
    if (nativeSetter) {
      nativeSetter.call(select, val);
    } else {
      select.value = val;
    }
    targetOption.selected = true;
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  // --- Month & Class Dropdown Utilities ---
  function isMonthSelect(select) {
    if (!select || !select.options) return false;
    return Array.from(select.options).some((opt) => {
      const text = (opt.textContent || "").trim().toLowerCase();
      return MONTH_NAMES.includes(text) || /^\d{4}-\d{2}$/.test(opt.value);
    });
  }

  function getClassQuorumSelect() {
    const allSelects = Array.from(document.querySelectorAll(SELECTORS.selectControl));
    return allSelects.find((s) => !isMonthSelect(s) && s.options && s.options.length > 1) || null;
  }

  function getMonthSelect() {
    const allSelects = Array.from(document.querySelectorAll(SELECTORS.selectControl));
    return allSelects.find((s) => isMonthSelect(s)) || null;
  }

  function getClassQuorumOptions() {
    const select = getClassQuorumSelect();
    if (!select || !select.options) return [];
    return Array.from(select.options).map((opt) => ({
      value: opt.value,
      text: (opt.textContent || "").trim(),
      selected: opt.selected,
    }));
  }

  async function setClassQuorum(targetValue, logger) {
    const select = getClassQuorumSelect();
    if (!select) {
      logger?.logAction?.("Class/Quorum select dropdown not found on page.");
      return false;
    }

    const isAllTarget = !targetValue || targetValue === "ALL" || String(targetValue).toLowerCase().includes("all");

    let targetOption;
    if (isAllTarget) {
      targetOption = Array.from(select.options).find(
        (opt) => !opt.value || opt.value === "ALL" || (opt.textContent || "").toLowerCase().includes("all")
      );
    } else {
      targetOption = Array.from(select.options).find(
        (opt) =>
          opt.value === targetValue ||
          (opt.textContent || "").trim().toLowerCase() === String(targetValue).toLowerCase() ||
          (opt.textContent || "").trim().toLowerCase().includes(String(targetValue).toLowerCase())
      );
    }

    if (!targetOption) {
      logger?.logError?.("Target class option not found in dropdown", { targetValue });
      return false;
    }

    if (select.value === targetOption.value) {
      logger?.logAction?.("Class/Quorum already set to target value", {
        targetValue: targetOption.value,
        text: targetOption.textContent.trim(),
      });
      return false;
    }

    logger?.logAction?.("Changing Class/Quorum dropdown", {
      from: select.value,
      to: targetOption.value,
      text: targetOption.textContent.trim(),
    });

    setNativeSelectValue(select, targetOption);
    await uiUtils.sleepWithJitter(1500, 500);
    return true;
  }

  async function ensureCorrectMonth(targetDate, logger) {
    const parts = targetDate.split("-");
    const monthIndex = parseInt(parts[1], 10) - 1;
    const targetMonthName = MONTH_NAMES[monthIndex]; // e.g. "august"
    const targetMonthPrefix = targetDate.substring(0, 7); // e.g. "2026-08"

    const monthSelect = getMonthSelect();
    if (!monthSelect) {
      logger?.logAction?.("Month dropdown not found on this page.");
      return false;
    }

    const currentText = (monthSelect.options[monthSelect.selectedIndex]?.textContent || "").trim().toLowerCase();
    if (monthSelect.value === targetMonthPrefix || currentText === targetMonthName) {
      logger?.logAction?.("Month dropdown already set correctly.", { month: currentText });
      return false;
    }

    const targetOption = Array.from(monthSelect.options).find((opt) => {
      const optText = (opt.textContent || "").trim().toLowerCase();
      return opt.value === targetMonthPrefix || optText === targetMonthName || optText.startsWith(targetMonthName.substring(0, 3));
    });

    if (!targetOption) {
      logger?.logError?.("Target month option not found in dropdown", { targetDate, targetMonthName });
      return false;
    }

    logger?.logAction?.("Triggered month change request", {
      to: targetOption.textContent.trim(),
      value: targetOption.value,
    });

    setNativeSelectValue(monthSelect, targetOption);
    logger?.logAction?.("Waiting for data refresh after month change...");
    await uiUtils.sleepWithJitter(2000, 1000);
    return true;
  }

  // --- Single Sunday Navigation & Single-Button Marking ---
  function isTwoHourSplitLayout() {
    return (
      !!getMonthSelect() ||
      Array.from(document.querySelectorAll("button")).some((b) =>
        /\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(b.textContent || "")
      )
    );
  }

  async function selectSundayView(targetDate, logger) {
    const parts = targetDate.split("-");
    const dayNum = parseInt(parts[2], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const monthName = MONTH_NAMES[monthIndex];
    const monthAbbr = monthName.substring(0, 3);

    const allButtons = Array.from(document.querySelectorAll("button"));
    const sundayButton = allButtons.find((btn) => {
      const text = (btn.textContent || "").trim().toLowerCase();
      const numbers = text.match(/\d+/g) || [];
      const hasDay = numbers.some((n) => parseInt(n, 10) === dayNum);
      const hasMonth = text.includes(monthName) || text.includes(monthAbbr);
      return hasDay && hasMonth;
    });

    if (!sundayButton) {
      logger?.logAction?.("Single Sunday button not found on date bar", { targetDate });
      return false;
    }

    const isSelected =
      sundayButton.classList.contains("eden-button-bar__button--selected") ||
      sundayButton.getAttribute("aria-selected") === "true" ||
      sundayButton.getAttribute("aria-pressed") === "true";

    if (isSelected) {
      logger?.logAction?.("Sunday button already selected", { targetDate, buttonText: sundayButton.textContent.trim() });
      return true;
    }

    logger?.logAction?.("Clicking Single Sunday tab button", { targetDate, buttonText: sundayButton.textContent.trim() });
    sundayButton.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    sundayButton.click();
    await uiUtils.sleepWithJitter(1500, 500);
    return true;
  }

  function getRowAttendanceButtons(row) {
    if (!row) return { sundaySchool: null, classQuorum: null, single: null };
    const buttons = Array.from(
      row.querySelectorAll(
        'button[class*="attendanceButton"], button.useClassQuorumAttendanceMembers_attendanceButton__toNdf, td button'
      )
    ).filter((b) => b.getAttribute("aria-label")?.includes(",") || (b.className && b.className.includes("attendanceButton")));

    if (buttons.length === 1) {
      const label = (buttons[0].getAttribute("aria-label") || "").toLowerCase();
      const isSS = label.includes("sunday school");
      return {
        single: buttons[0],
        sundaySchool: isSS ? buttons[0] : null,
        classQuorum: !isSS ? buttons[0] : null,
      };
    }

    let sundaySchool = null;
    let classQuorum = null;

    buttons.forEach((btn) => {
      const label = (btn.getAttribute("aria-label") || "").toLowerCase();
      if (label.includes("sunday school")) {
        sundaySchool = btn;
      } else if (label.length > 0) {
        classQuorum = btn;
      }
    });

    if (!sundaySchool && buttons.length >= 2) sundaySchool = buttons[0];
    if (!classQuorum && buttons.length >= 2) classQuorum = buttons[1];

    return {
      sundaySchool,
      classQuorum,
      single: buttons[0] || null,
    };
  }

  function getSingleClassAttendanceButton(row) {
    if (!row) return null;
    return (
      row.querySelector('button[class*="attendanceButton"]') ||
      row.querySelector("button.useClassQuorumAttendanceMembers_attendanceButton__toNdf") ||
      row.querySelector("td:last-child button")
    );
  }

  function isButtonPresent(button) {
    if (!button) return false;
    const hasPresentPath = !!button.querySelector(`svg path[d*="${ICON_PATHS.present}"]`);
    const ariaChecked = button.getAttribute("aria-checked") === "true";
    const ariaPressed = button.getAttribute("aria-pressed") === "true";
    return hasPresentPath || ariaChecked || ariaPressed;
  }

  async function clickAttendanceButton(button, logger) {
    if (!button) return false;
    button.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    button.click();
    return true;
  }

  function resolveTargetButtons(row, meetingSplit = "BOTH") {
    if (!row) return [];
    const buttons = getRowAttendanceButtons(row);
    if (buttons.sundaySchool && buttons.classQuorum) {
      if (meetingSplit === "FIRST_HALF") return [buttons.sundaySchool];
      if (meetingSplit === "SECOND_HALF") return [buttons.classQuorum];
      return [buttons.sundaySchool, buttons.classQuorum];
    }
    if (buttons.single) return [buttons.single];
    return [];
  }

  async function toggleButtonPresent(button, logger) {
    if (!button) return { marked: false, alreadyPresent: false };
    if (isButtonPresent(button)) {
      return { marked: false, alreadyPresent: true };
    }

    await clickAttendanceButton(button, logger);

    let updated = false;
    const startWait = Date.now();
    const timeout = 2500;

    while (Date.now() - startWait < timeout) {
      if (uiUtils.isAborted()) throw new Error("Process aborted by user.");
      if (isButtonPresent(button)) {
        updated = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    await uiUtils.sleepWithJitter(150, 50);
    return { marked: updated, alreadyPresent: false };
  }

  async function setNativeInputValue(input, newValue) {
    if (!input) return false;
    input.scrollIntoView?.({ behavior: "smooth", block: "center" });
    await uiUtils.sleepWithJitter(100, 50);
    input.focus?.();
    await uiUtils.sleepWithJitter(50, 25);

    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    if (nativeSetter) {
      nativeSetter.call(input, String(newValue));
    } else {
      input.value = String(newValue);
    }

    input.dispatchEvent(new Event("input", { bubbles: true }));
    await uiUtils.sleepWithJitter(50, 25);
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await uiUtils.sleepWithJitter(50, 25);
    input.blur();
    return true;
  }

  window.attendanceDomUtils = {
    SELECTORS,
    ICON_PATHS,
    MONTH_NAMES,
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
    ensureCorrectMonth,
    getClassQuorumSelect,
    getMonthSelect,
    getClassQuorumOptions,
    setClassQuorum,
    isTwoHourSplitLayout,
    selectSundayView,
    getSingleClassAttendanceButton,
    getRowAttendanceButtons,
    resolveTargetButtons,
    isButtonPresent,
    clickAttendanceButton,
    toggleButtonPresent,
    setNativeInputValue,
  };
})();
