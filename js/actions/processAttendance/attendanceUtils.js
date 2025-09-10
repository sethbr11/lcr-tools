(() => {
  utils.returnIfLoaded("attendanceUtils");
  utils.ensureLoaded(
    "modalUtils",
    "fileUtils",
    "dataUtils",
    "uiUtils",
    "tableUtils",
    "navigationUtils"
  );

  const templates = window.processAttendanceTemplates;
  const UI_OVERLAY_ID = "lcr-tools-attendance-ui-overlay";
  let parsedCsvDataForProcessing = null;

  // SECTION: Constants & Selectors
  const SELECTORS = {
    memberRows: "tbody tr.sc-zkgtp5-0.iooGpB",
    nameAnchor: "td:first-child a.sc-14fff288-0",
    attendanceCells: "td.sc-8selpg-0.ABMfH",
    headerDateSpans: "thead th.sc-arbpvo-0.sc-arbpvo-1 span:not(:has(svg))",
    membersTab: ".sc-1bd9vcz-2.cbdfgp",
    visitorsTab: ".sc-1bd9vcz-2.kGMiZu",
    saveButton: "button.sc-1lb7nf5-0.iinUOC:not([disabled])",
  };
  const ICON_PATHS = {
    present: "M12 22c5.523",
    notPresent: "M12 3.5a8.5",
  };

  // Guest categories and input ids (single source of truth)
  const GUEST_CATEGORY_LABELS = {
    M: "Men",
    F: "Women",
    YM: "Young Men",
    YW: "Young Women",
    C: "Children",
  };
  const GUEST_INPUT_IDS = {
    M: "lcr-tools-guest-men",
    F: "lcr-tools-guest-women",
    YM: "lcr-tools-guest-ym",
    YW: "lcr-tools-guest-yw",
    C: "lcr-tools-guest-children",
  };

  // SECTION: Core Helpers
  // Small helpers
  function setButtonEnabled(btn, enabled) {
    if (!btn) return;
    btn.disabled = !enabled;
    btn.style.backgroundColor = enabled ? "#007bff" : "#6c757d";
    btn.style.cursor = enabled ? "pointer" : "not-allowed";
  }
  function getMemberRows() {
    return document.querySelectorAll(SELECTORS.memberRows);
  }
  function getNameAnchor(row) {
    return row.querySelector(SELECTORS.nameAnchor);
  }
  function getAttendanceCells(row) {
    return row.querySelectorAll(SELECTORS.attendanceCells);
  }
  function getAttendanceCell(row, colIndex) {
    const cells = getAttendanceCells(row);
    return cells.length > colIndex ? cells[colIndex] : null;
  }
  function cellHasIconPath(cell, frag) {
    return cell?.querySelector(`div.sc-5ba12d08-0 svg path[d*="${frag}"]`);
  }
  function isPresentInCell(cell) {
    return !!cellHasIconPath(cell, ICON_PATHS.present);
  }
  function getClickableDivForNotPresent(cell) {
    const path = cellHasIconPath(cell, ICON_PATHS.notPresent);
    return path ? path.closest("div.sc-5ba12d08-0") : null;
  }
  function buildWardMember(
    row,
    targetDateColumnIndex,
    pageNum,
    includeRow = false
  ) {
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
    const visibleDateSpans = Array.from(
      document.querySelectorAll(SELECTORS.headerDateSpans)
    );
    for (const span of visibleDateSpans) {
      const headerDateStr = span.textContent.trim();
      const parsedHeaderDate = tableUtils.parseHeaderDate(headerDateStr);
      if (
        parsedHeaderDate &&
        dataUtils.formatDate(parsedHeaderDate, "YYYY-MM-DD") === targetDate
      ) {
        const thElement = span.closest("th");
        if (thElement) {
          const idx = Array.from(thElement.parentElement.children).indexOf(
            thElement
          );
          logger?.logAction?.("Target date column found in current DOM view", {
            date: targetDate,
            columnIndex: idx,
            headerText: headerDateStr,
          });
          return idx;
        }
      }
    }
    logger?.logError?.("Target date not visible", { targetDate });
    return -1;
  }
  function downloadAttendanceSummaryCSV(attendanceLog, targetDate) {
    const header = '"Date","First Name","Last Name","LCR Update Status"\n';
    const rows = attendanceLog
      .map(
        (row) =>
          `"${row.date}","${String(row.firstName).replace(
            /"/g,
            '""'
          )}","${String(row.lastName).replace(/"/g, '""')}","${String(
            row.lcrUpdateStatus
          ).replace(/"/g, '""')}"`
      )
      .join("\n");
    fileUtils.downloadCsv(
      header + rows,
      `attendance_update_summary_report_${targetDate}.csv`
    );
  }
  // Read a numeric input by id (returns 0 if missing/invalid)
  function getNumericInputValue(id) {
    const el = document.getElementById(id);
    const n = parseInt(el?.value, 10);
    return Number.isFinite(n) ? n : 0;
  }
  // Build guest counts by adding any manual entries from inputs
  function buildGuestCountsFromInputs(baseCounts) {
    const counts = { ...baseCounts };
    Object.keys(GUEST_INPUT_IDS).forEach((k) => {
      counts[k] = (counts[k] || 0) + getNumericInputValue(GUEST_INPUT_IDS[k]);
    });
    return counts;
  }
  // Update a single row in attendanceLog by name
  function updateAttendanceLogStatus(attendanceLog, person, status) {
    const idx = attendanceLog.findIndex(
      (log) =>
        log.firstName.toLowerCase() === person.firstName.toLowerCase() &&
        log.lastName.toLowerCase() === person.lastName.toLowerCase()
    );
    if (idx !== -1) attendanceLog[idx].lcrUpdateStatus = status;
  }
  // Compute final message and unmatched list from the log
  function buildFinalSummary(attendanceLog, aborted) {
    const unmatched = attendanceLog
      .filter((e) => e.lcrUpdateStatus === "Not Found in LCR")
      .map((e) => ({ firstName: e.firstName, lastName: e.lastName }));

    let message = aborted
      ? "Attendance processing ABORTED by user. "
      : "Attendance processing complete. ";

    if (unmatched.length > 0) {
      const total = attendanceLog.length;
      const marked = attendanceLog.filter(
        (log) =>
          log.lcrUpdateStatus === "Marked as Present in LCR" ||
          log.lcrUpdateStatus === "Marked as Present in LCR (Guest Processing)"
      ).length;
      const namesList = unmatched
        .map((n) => `${n.firstName} ${n.lastName}`)
        .join(", ");
      message += `${marked} out of ${total} names were marked as present. The following ${unmatched.length} name(s) from your CSV could not be found in LCR: ${namesList}. `;
    } else if (!aborted) {
      message += "All names from the CSV were matched or acted upon in LCR. ";
    }

    return { message, unmatched };
  }
  // Safe remove element by id
  function safeRemoveById(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }
  // Find a table row for a member by exact full name on the current page
  function findRowByFullName(fullName) {
    for (const row of getMemberRows()) {
      const a = getNameAnchor(row);
      if (a && a.textContent.trim() === fullName) return row;
    }
    return null;
  }
  // Build duplicate note for CSV parsing
  function computeDuplicateMessage(duplicateCount) {
    if (!duplicateCount) return "";
    return duplicateCount === 1
      ? "1 duplicate name was skipped."
      : `${duplicateCount} duplicate names were skipped.`;
  }

  // SECTION: UI Helpers
  /**
   * Shows a status message in the UI
   * @param {string} message - The message to show
   * @param {boolean} isError - Whether this is an error message
   */
  function showUiStatus(message, isError = false, autoHide = false) {
    modalUtils.showStatus(
      "lcr-tools-attendance-status",
      message,
      isError,
      autoHide
    );
  }
  function showUiErrorStatus(message) {
    showUiStatus(message, true);
  }

  /**
   * Close the attendance UI
   */
  function closeAttendanceUI() {
    modalUtils.closeModal(UI_OVERLAY_ID);
  }

  /**
   * Gets the most recent Sunday or today if it's Sunday
   * @returns {Date} - The most recent Sunday
   */
  function getMostRecentSunday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mostRecentSunday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    mostRecentSunday.setDate(mostRecentSunday.getDate() - dayOfWeek);
    return mostRecentSunday;
  }

  /**
   * Creates a search input with a floating dropdown of ward members.
   * - Debounced filtering using handler.searchMembers(query)
   * - Dropdown is appended to <body> to avoid clipping; repositions on scroll/resize
   * - Shows a helpful message when no results or while members are loading
   * - Disables selection for members already present; otherwise calls onSelect(member)
   * - Refreshes when the global event 'lcrx:wardMembersReady' is fired
   * Returns an object for embedding and control: { container, input, clear() }
   * @param {Object} handler - Provides wardMembers and searchMembers(query)
   * @param {(member: {fullName:string, firstName:string, lastName:string, isPresent:boolean})=>void} onSelect - Callback when a member is chosen
   * @returns {{container: HTMLElement, input: HTMLInputElement, clear: () => void}}
   */
  function createMemberSearchDropdown(handler, onSelect) {
    const container = document.createElement("div");
    container.style.cssText = "width: 250px;";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Search ward members...";
    input.style.cssText =
      "width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;";

    const dropdown = document.createElement("div");
    dropdown.id = "lcr-tools-member-search-dropdown";
    dropdown.style.cssText = `position: fixed; background: white; border: 1px solid #ccc; border-top: none; 
      max-height: 220px; overflow-y: auto; z-index: 50000 !important; display: none; border-radius: 0 0 4px 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25); min-width: 250px;`;

    // Append dropdown to body to avoid clipping issues
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
        noResults.style.cssText =
          "padding: 8px; color: #666; font-style: italic;";
        dropdown.appendChild(noResults);
      } else {
        results.forEach((member) => {
          const item = document.createElement("div");
          item.textContent = member.fullName;
          item.style.cssText = `padding: 8px; cursor: pointer; border-bottom: 1px solid #eee;
            ${
              member.isPresent
                ? "color: #999; background-color: #f5f5f5; cursor: not-allowed;"
                : ""
            }`;

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

  /**
   * Creates a compact category toggle for guest counts.
   * - Renders one button per standard category (M, F, YM, YW, C)
   * - Tracks the current selection (default 'M') and calls onChange(key) when it changes
   * Returns an object for embedding and querying: { container, getSelected() }
   * @param {(key: 'M'|'F'|'YM'|'YW'|'C')=>void} onChange - Callback when category changes
   * @returns {{container: HTMLElement, getSelected: ()=>('M'|'F'|'YM'|'YW'|'C')}}
   */
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
        font-size: 12px; font-weight: bold; background: ${
          cat.key === selected ? "#007bff" : "white"
        };
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

  // SECTION: CSV Parsing
  /**
   * Parses CSV text for attendance data with validation.
   * @param {string} csvText - The raw CSV text.
   * @returns {Object} - Parsed data with names, targetDate, and errors.
   */
  function parseAttendanceCsv(csvText) {
    // Split the CSV text into lines and filter out empty lines
    const lines = csvText.split(/\r\n|\n/).filter((line) => line.trim() !== "");

    // Return an error if the CSV has no data rows
    if (lines.length < 2) {
      return {
        names: [],
        targetDate: null,
        errors: ["CSV is empty or has no data rows."],
      };
    }

    // Parse the header row and normalize the column names
    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/"/g, "").toLowerCase());

    // Find the indices of required columns
    const dateHeaderIndex = headers.indexOf("date");
    const firstNameHeaderIndex = headers.indexOf("first name");
    const lastNameHeaderIndex = headers.indexOf("last name");

    const errors = [];

    // Validate the presence of required columns
    if (dateHeaderIndex === -1)
      errors.push("CSV missing 'Date' header column.");
    if (firstNameHeaderIndex === -1)
      errors.push("CSV missing 'First Name' header column.");
    if (lastNameHeaderIndex === -1)
      errors.push("CSV missing 'Last Name' header column.");
    if (errors.length > 0) return { names: [], targetDate: null, errors };

    const names = [];
    const nameSet = new Set();
    let firstRowDateObj = null;
    let firstRowDateStr = "";
    let totalRows = 0;

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      totalRows++;
      // Split the row into values, handling quoted fields
      const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];

      // Clean up the values by trimming and unescaping quotes
      const cleanedValues = values.map((v) =>
        v.trim().replace(/^"|"$/g, "").replace(/""/g, '"')
      );

      // Check if the row has enough columns
      if (
        cleanedValues.length <
        Math.max(dateHeaderIndex, firstNameHeaderIndex, lastNameHeaderIndex) + 1
      ) {
        errors.push(
          `Row ${i + 1}: Incorrect number of columns or malformed CSV data.`
        );
        continue;
      }

      // Extract the date, first name, and last name from the row
      const dateStr = cleanedValues[dateHeaderIndex];
      const firstName = cleanedValues[firstNameHeaderIndex];
      const lastName = cleanedValues[lastNameHeaderIndex];

      if (i === 1) {
        // Parse and validate the date from the first row
        try {
          firstRowDateObj = dataUtils.parseDate(dateStr, i + 1);
          firstRowDateStr = dateStr;
        } catch (e) {
          errors.push(e.message);
        }
      } else if (cleanedValues[dateHeaderIndex] !== firstRowDateStr) {
        // Ensure all rows have the same date as the first row
        errors.push(
          `Row ${i + 1}: Date '${
            cleanedValues[dateHeaderIndex]
          }' differs from the first row's date ('${firstRowDateStr}'). All dates in the CSV must be the same.`
        );
      }

      // Validate the presence of first and last names
      if (!firstName) {
        errors.push(
          `Row ${i + 1} (Last Name: ${
            lastName || "N/A"
          }): First Name is missing.`
        );
      }
      if (!lastName) {
        errors.push(
          `Row ${i + 1} (First Name: ${
            firstName || "N/A"
          }): Last Name is missing.`
        );
      }
      if (!firstName || !lastName) continue;

      // Create a unique key for the full name and track duplicates
      const fullNameKey = `${lastName.toLowerCase()}, ${firstName.toLowerCase()}`;
      if (!nameSet.has(fullNameKey)) {
        nameSet.add(fullNameKey);
        names.push({ firstName, lastName });
      }
    }

    // Count duplicate names
    const duplicateCount = totalRows - names.length;

    if (errors.length > 0) return { names: [], targetDate: null, errors };

    // Sort the names alphabetically by last name, then by first name
    names.sort((a, b) => {
      const comp = a.lastName
        .toLowerCase()
        .localeCompare(b.lastName.toLowerCase());
      return comp !== 0
        ? comp
        : a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase());
    });

    // Format the target date as YYYY-MM-DD
    const targetDateString = firstRowDateObj
      ? `${firstRowDateObj.getFullYear()}-${(firstRowDateObj.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${firstRowDateObj
          .getDate()
          .toString()
          .padStart(2, "0")}`
      : null;
    return { names, targetDate: targetDateString, errors: [], duplicateCount };
  }

  // SECTION: Event Handlers (sample download, CSV upload, processing)
  function downloadSampleHandler() {
    const dateInput = document.getElementById("lcr-tools-attendance-date");
    const selectedDateValue = dateInput.value;
    if (!selectedDateValue) {
      showUiErrorStatus("Please select a date first to download the sample.");
      return;
    }
    const selectedDate = new Date(selectedDateValue + "T00:00:00");
    if (selectedDate.getDay() !== 0) {
      showUiErrorStatus("Please select a Sunday for the attendance date.");
      return;
    }
    const formattedDate = dataUtils.formatDate(selectedDate);
    const csvHeader = '"Date","First Name","Last Name"\n';
    const sampleRow = `"${formattedDate}","John","Doe"\n"${formattedDate}","Jane","Smith"`;
    const csvContent = csvHeader + sampleRow;
    fileUtils.downloadCsv(
      csvContent,
      `sample_attendance_${selectedDateValue}.csv`
    );
    showUiStatus("Sample CSV downloaded.");
  }

  function csvUploadHandler(event) {
    const processBtn = document.getElementById(
      "lcr-tools-process-attendance-btn"
    );
    if (processBtn) setButtonEnabled(processBtn, false);
    parsedCsvDataForProcessing = null;
    showUiStatus("Processing uploaded CSV...");
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        try {
          const { names, targetDate, errors, duplicateCount } =
            parseAttendanceCsv(text);
          if (errors.length > 0) {
            const errorMessages = errors
              .map((err) => `<li>${err}</li>`)
              .join("");
            showUiErrorStatus(
              utils.replaceTemplate(templates.validationError, {
                errorMessages,
              })
            );
            return;
          }
          if (names.length === 0) {
            showUiErrorStatus("CSV parsed, but no names found to process.");
            return;
          }
          parsedCsvDataForProcessing = { names, targetDate };
          const duplicateMessage = computeDuplicateMessage(duplicateCount);
          const successMessage = utils.replaceTemplate(templates.parseSuccess, {
            nameCount: names.length,
            targetDate,
            duplicateMessage,
          });
          showUiStatus(successMessage.trim());
          if (processBtn) setButtonEnabled(processBtn, true);
        } catch (parseError) {
          showUiErrorStatus(`Error parsing CSV: ${parseError.message}`);
        }
      };
      reader.onerror = () => {
        showUiErrorStatus("Error reading the uploaded file.");
      };
      reader.readAsText(file);
    } else {
      // Don't clear status when no file is selected
    }
  }

  async function processAttendanceHandler() {
    uiUtils.resetAborted();
    if (!parsedCsvDataForProcessing) {
      showUiErrorStatus("No valid CSV data loaded. Please upload a CSV file.");
      return;
    }
    const { names, targetDate } = parsedCsvDataForProcessing;
    if (!names || names.length === 0 || !targetDate) {
      showUiErrorStatus(
        "Data for processing is incomplete. Ensure date and names are present."
      );
      return;
    }
    closeAttendanceUI();
    try {
      await LCR_TOOLS_PROCESS_ATTENDANCE(targetDate, names);
      if (uiUtils.isAborted()) throw new Error("Process aborted by user.");
    } catch (error) {
      showUiErrorStatus(`Error processing attendance: ${error.message}`);
    } finally {
      uiUtils.resetAborted();
    }
    parsedCsvDataForProcessing = null;
    const processBtn = document.getElementById(
      "lcr-tools-process-attendance-btn"
    );
    if (processBtn) setButtonEnabled(processBtn, false);
    const fileInput = document.getElementById("lcr-tools-csv-upload");
    if (fileInput) fileInput.value = "";
  }

  // SECTION: Class: GuestAttendanceHandler
  class GuestAttendanceHandler {
    constructor(logger, targetDate, targetDateColumnIndex) {
      window.lcrToolsShouldStopProcessing = false; // Reset abort flag
      this.logger = logger;
      this.targetDate = targetDate;
      this.targetDateColumnIndex = targetDateColumnIndex;
      this.wardMembers = [];
      this.presentMembers = new Set();
    }

    /**
     * Set ward members data (used when data is already collected)
     */
    setWardMembers(wardMembers, presentMembers = new Set()) {
      this.wardMembers = wardMembers;
      this.presentMembers = presentMembers;
      this.logger.logAction("Ward members data provided", {
        totalMembers: this.wardMembers.length,
        presentMembers: this.presentMembers.size,
      });
      // Notify any UI that data is now ready
      window.dispatchEvent(
        new CustomEvent("lcrx:wardMembersReady", {
          detail: { count: this.wardMembers.length },
        })
      );
    }

    /**
     * Load all ward members from all pages (fallback method)
     */
    async loadWardMembers() {
      this.logger.logAction("Loading all ward members for guest search");

      // Navigate back to Members tab if not already there
      const membersTab = document.querySelector(SELECTORS.membersTab);
      if (membersTab) {
        membersTab.click();
        await utils.sleep(1000);
      }

      // Navigate to first page
      await navigationUtils.navigateToFirstPage(2000);

      let memberPageNum = 1;
      this.wardMembers = [];

      while (memberPageNum <= 50 && !uiUtils.isAborted()) {
        this.logger.logAction("Loading members from page", {
          pageNum: memberPageNum,
        });

        await utils.sleep(500);
        const memberRows = getMemberRows();

        for (const row of memberRows) {
          const nameAnchor = getNameAnchor(row);
          if (!nameAnchor) continue;

          const member = buildWardMember(
            row,
            this.targetDateColumnIndex,
            memberPageNum,
            true
          );
          if (!member) continue;

          this.wardMembers.push(member);
          if (member.isPresent)
            this.presentMembers.add(member.fullName.toLowerCase());
        }

        if (navigationUtils.isLastPage()) {
          this.logger.logAction("Reached last page while loading members", {
            pageNum: memberPageNum,
            totalMembersLoaded: this.wardMembers.length,
          });
          break;
        }

        const nextPageSuccess = await navigationUtils.goToNextPage(
          3500,
          50,
          memberPageNum
        );
        if (!nextPageSuccess) {
          this.logger.logAction(
            "Could not navigate to next page while loading members",
            {
              pageNum: memberPageNum,
              totalMembersLoaded: this.wardMembers.length,
            }
          );
          break;
        }

        memberPageNum++;
      }

      this.wardMembers.sort((a, b) => a.fullName.localeCompare(b.fullName));

      this.logger.logAction("Ward members loaded from all pages", {
        totalMembers: this.wardMembers.length,
        presentMembers: this.presentMembers.size,
        pagesScanned: memberPageNum,
      });

      window.dispatchEvent(
        new CustomEvent("lcrx:wardMembersReady", {
          detail: { count: this.wardMembers.length },
        })
      );
    }

    /**
     * Search ward members by name (now searches the full loaded list)
     */
    searchMembers(query) {
      if (!query || query.length < 1) return this.wardMembers.slice(0, 20); // Show first 20 if no query

      const queryLower = query.toLowerCase();
      return this.wardMembers
        .filter(
          (member) =>
            member.fullName.toLowerCase().includes(queryLower) ||
            member.firstName.toLowerCase().includes(queryLower) ||
            member.lastName.toLowerCase().includes(queryLower)
        )
        .slice(0, 20); // Limit results to 20 for performance
    }

    /**
     * Mark a member as present (navigate to their page first if needed)
     */
    async markMemberPresent(member) {
      this.logger.logUserAction(
        "CLICK",
        "attendance_cell",
        "mark_guest_present",
        {
          memberName: member.fullName,
          date: this.targetDate,
          memberPage: member.pageNum,
        }
      );

      if (member.pageNum) {
        await navigationUtils.navigateToFirstPage(1000);
        for (let i = 1; i < member.pageNum; i++) {
          const success = await navigationUtils.goToNextPage(1000, 50, i);
          if (!success) {
            this.logger.logError("Failed to navigate to member's page", {
              memberName: member.fullName,
              targetPage: member.pageNum,
              currentAttempt: i,
            });
            return false;
          }
        }
        await utils.sleep(500);
      }

      // Find the member's row on the current page by exact full name
      const targetRow = findRowByFullName(member.fullName);

      if (!targetRow) {
        this.logger.logError("Member row not found on expected page", {
          memberName: member.fullName,
          pageNum: member.pageNum,
        });
        return false;
      }

      const targetCell = getAttendanceCell(
        targetRow,
        this.targetDateColumnIndex
      );
      if (targetCell) {
        const clickableDiv = getClickableDivForNotPresent(targetCell);
        if (clickableDiv) {
          clickableDiv.click();

          this.logger.logModification(
            "UPDATE",
            "attendance_record",
            {
              member: member.fullName,
              date: this.targetDate,
              status: "not_present",
            },
            {
              member: member.fullName,
              date: this.targetDate,
              status: "present",
            },
            { method: "guest_attendance_handler" }
          );

          return true;
        }
      }
      return false;
    }

    /**
     * Navigate to visitors tab and update guest counts
     */
    async updateGuestCounts(guestCounts) {
      this.logger.logAction("Updating guest counts", guestCounts);

      const visitorsTab = document.querySelector(SELECTORS.visitorsTab);
      if (!visitorsTab) throw new Error("Visitors tab not found");

      visitorsTab.click();
      await utils.sleep(2000);

      const visitorHeaders = document.querySelectorAll("thead th span span");
      let visitorColumnIndex = -1;

      for (let i = 0; i < visitorHeaders.length; i++) {
        const headerText = visitorHeaders[i].textContent.trim();
        const parsedDate = dataUtils.parseDate(headerText, [], -1);
        if (
          parsedDate &&
          dataUtils.formatDate(parsedDate, "YYYY-MM-DD") === this.targetDate
        ) {
          visitorColumnIndex = i + 2;
          break;
        }
      }

      if (visitorColumnIndex === -1)
        throw new Error("Target date column not found in visitors view");

      // Iterate over standardized categories
      for (const [guestKey, category] of Object.entries(
        GUEST_CATEGORY_LABELS
      )) {
        const count = guestCounts[guestKey] || 0;
        if (count <= 0) continue;

        const categoryRow = Array.from(
          document.querySelectorAll("tbody tr")
        ).find(
          (row) => row.querySelector("td")?.textContent.trim() === category
        );
        if (!categoryRow) continue;

        const inputCells = categoryRow.querySelectorAll(
          'td input[type="number"]'
        );
        if (inputCells.length > visitorColumnIndex - 2) {
          const targetInput = inputCells[visitorColumnIndex - 2];
          const currentValue = parseInt(targetInput.value) || 0;
          const newValue = currentValue + count;
          targetInput.value = newValue;
          targetInput.dispatchEvent(new Event("input", { bubbles: true }));

          this.logger.logModification(
            "UPDATE",
            "visitor_count",
            { category, date: this.targetDate, count: currentValue },
            { category, date: this.targetDate, count: newValue },
            { method: "guest_attendance_handler" }
          );
        }
      }

      await utils.sleep(500);
      const saveButton = document.querySelector(SELECTORS.saveButton);
      if (saveButton) {
        saveButton.click();
        await utils.sleep(1000);
        this.logger.logUserAction(
          "CLICK",
          "save_button",
          "save_visitor_counts"
        );
      }
    }
  }

  // SECTION: Setup UI
  function showSetupUI() {
    if (document.getElementById(UI_OVERLAY_ID)) {
      console.log("Attendance UI already visible.");
      return;
    }
    const content = templates.setupModalStructure;
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
      id: UI_OVERLAY_ID,
      title: "Input Class/Quorum Attendance",
      content,
      buttons,
      onClose: closeAttendanceUI,
    });
    const dateInput = document.getElementById("lcr-tools-attendance-date");
    if (dateInput) {
      const mostRecentSunday = getMostRecentSunday();
      dateInput.value = dataUtils.formatDate(mostRecentSunday, "YYYY-MM-DD");
    }
    const processBtn = document.getElementById(
      "lcr-tools-process-attendance-btn"
    );
    if (processBtn) {
      processBtn.addEventListener("click", processAttendanceHandler);
    }
    const csvUpload = document.getElementById("lcr-tools-csv-upload");
    if (csvUpload) {
      csvUpload.addEventListener("change", csvUploadHandler);
    }
    const downloadSampleBtn = document.getElementById(
      "lcr-tools-download-sample"
    );
    if (downloadSampleBtn) {
      downloadSampleBtn.addEventListener("click", downloadSampleHandler);
    }
    showUiStatus(
      "Select a Sunday, (optionally) download the sample CSV, then upload your attendance CSV."
    );
  }

  // SECTION: Main Processing
  async function LCR_TOOLS_PROCESS_ATTENDANCE(targetDate, namesToMark) {
    // Create action logger for this attendance processing session
    const logger = loggingUtils.createActionLogger("ATTENDANCE_PROCESSING", {
      includeTimestamp: true,
      includeUrl: true,
      logLevel: "INFO",
    });
    logger.logAction("LCR_TOOLS_PROCESS_ATTENDANCE_STARTED", {
      targetDate: targetDate,
      namesCount: namesToMark.length,
      names: namesToMark.map((n) => `${n.firstName} ${n.lastName}`),
    });

    uiUtils.showLoadingIndicator(
      `Initializing attendance processing for ${targetDate}...`
    );

    const attendanceLog = namesToMark.map((name, index) => ({
      originalIndex: index,
      date: targetDate,
      firstName: name.firstName,
      lastName: name.lastName,
      lcrUpdateStatus: "Not Found in LCR",
    }));
    const namesToSearchInLCR = namesToMark.map((name) => ({
      ...name,
      processedThisSession: false,
    }));
    let finalDomTargetDateColumnIndex = -1;

    const allWardMembers = [];
    const presentMembers = new Set();

    try {
      logger.logAction("Starting simplified date attendance processing");
      await utils.sleep();
      if (uiUtils.isAborted()) throw new Error("Process aborted by user.");

      // --- Find Target Date Column in current DOM view ---
      uiUtils.showLoadingIndicator(
        `Verifying date ${targetDate} is visible...`
      );
      logger.logAction("Verifying target date in DOM header");

      finalDomTargetDateColumnIndex = findTargetDateColumnIndex(
        targetDate,
        logger
      );
      if (finalDomTargetDateColumnIndex === -1) {
        const errorMsg = `Target date ${targetDate} is not visible in the current table columns. Please navigate LCR to show this date and try again.`;
        alert("LCR Tools: " + errorMsg);
        uiUtils.hideLoadingIndicator();
        return { result: { error: errorMsg } };
      }

      if (uiUtils.isAborted()) throw new Error("Process aborted by user.");

      // --- Navigate to First Page of Members ---
      console.log("LCR Tools: Navigating to first page of members...");
      await navigationUtils.navigateToFirstPage(2000);

      let memberPageNum = 1;
      const MAX_MEMBER_PAGES = 50;

      while (memberPageNum <= MAX_MEMBER_PAGES && !uiUtils.isAborted()) {
        logger.logAction("Processing member page", {
          pageNum: memberPageNum,
        });
        uiUtils.showLoadingIndicator(
          `Processing page ${memberPageNum + 1}...`,
          "Press ESC to abort"
        );

        const memberRows = getMemberRows();
        logger.logAction("Processing member rows on page", {
          pageNum: memberPageNum,
          rowCount: memberRows.length,
        });

        for (const row of memberRows) {
          if (uiUtils.isAborted()) break;
          const nameAnchor = getNameAnchor(row);
          if (!nameAnchor) continue;

          const lcrFullName = nameAnchor.textContent.trim();
          const lcrNameParsed = dataUtils.parseFullName(lcrFullName);

          const targetCell = getAttendanceCell(
            row,
            finalDomTargetDateColumnIndex
          );
          const isPresent = targetCell ? isPresentInCell(targetCell) : false;

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

          for (const csvNameEntry of namesToSearchInLCR) {
            if (csvNameEntry.processedThisSession) continue;

            const matchResult = dataUtils.fuzzyNameMatch(
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

              if (targetCell) {
                const notPresentDiv = getClickableDivForNotPresent(targetCell);
                const presentIcon = cellHasIconPath(
                  targetCell,
                  ICON_PATHS.present
                );

                if (notPresentDiv && !presentIcon) {
                  logger.logUserAction(
                    "CLICK",
                    "attendance_cell",
                    "mark_present",
                    {
                      memberName: lcrFullName,
                      date: targetDate,
                      beforeState: "not_present",
                      afterState: "present",
                    }
                  );

                  notPresentDiv.click();
                  currentStatusInLog = "Marked as Present in LCR";

                  presentMembers.add(lcrFullName.toLowerCase());
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
                      date: targetDate,
                      status: "not_present",
                    },
                    {
                      member: lcrFullName,
                      date: targetDate,
                      status: "present",
                    },
                    { method: "user_click" }
                  );
                } else if (presentIcon) {
                  logger.logAction("MEMBER_ALREADY_PRESENT", {
                    memberName: lcrFullName,
                    date: targetDate,
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
                });
                currentStatusInLog = "Matched in LCR - Column Error";
              }

              // Update attendance log via helper
              updateAttendanceLogStatus(
                attendanceLog,
                csvNameEntry,
                currentStatusInLog
              );

              csvNameEntry.processedThisSession = true;
              break;
            }
          }
          if (uiUtils.isAborted()) break;
        }
        if (uiUtils.isAborted()) break;

        if (navigationUtils.isLastPage()) {
          console.log(
            `LCR Tools: Reached last page of members at page ${memberPageNum}`
          );
          logger.logAction("Reached last page of members", {
            pageNum: memberPageNum,
          });
          break;
        }

        const nextPageSuccess = await navigationUtils.goToNextPage(
          3500,
          MAX_MEMBER_PAGES,
          memberPageNum
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
      uiUtils.showLoadingIndicator("Finalizing report and generating CSVs...");

      // Build final message and unmatched list uniformly
      const { message: finalMessage, unmatched: stillUnmatchedForAlert } =
        buildFinalSummary(attendanceLog, uiUtils.isAborted());

      allWardMembers.sort((a, b) => a.fullName.localeCompare(b.fullName));

      logger.logAction("Ward members collected during processing", {
        totalMembers: allWardMembers.length,
        presentMembers: presentMembers.size,
      });

      logger.logAction("Displaying results popup");

      createAttendanceResultsUI({
        message: finalMessage,
        unmatchedNames: stillUnmatchedForAlert,
        attendanceLog: attendanceLog,
        targetDate: targetDate,
        logger: logger,
        aborted: uiUtils.isAborted(),
        wardMembers: allWardMembers,
        presentMembers: presentMembers,
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
        aborted: uiUtils.isAborted(),
      };

      logger.logCompletion(
        uiUtils.isAborted() ? "ABORTED" : "SUCCESS",
        summary
      );

      return {
        result: "success",
        unmatchedCount: stillUnmatchedForAlert.length,
      };
    } catch (error) {
      logger.logError(error, { phase: "main_processing" });

      if (error.message === "Process aborted by user.") {
        logger.logCompletion("ABORTED", { reason: "user_request" });
        createAttendanceResultsUI({
          message: "Process aborted by user.",
          unmatchedNames: [],
          attendanceLog: [],
          targetDate: targetDate,
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
          targetDate: targetDate,
          logger: logger,
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

  // SECTION: Results & Logs UI
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
      style.textContent = templates.resultsPopupStyles;
      document.head.appendChild(style);
    })();

    // Generate unmatched names content
    let content = "";
    if (unmatchedNames.length > 0 && !error) {
      const tableRows = unmatchedNames
        .map((name, index) =>
          utils.replaceTemplate(templates.resultsPopupUnmatchedTableRow, {
            index,
            fullName: `${name.firstName} ${name.lastName}`,
          })
        )
        .join("");

      // Append the summary message before unmatched names content
      content = utils.replaceTemplate(templates.resultsPopupUnmatchedSection, {
        unmatchedCount: unmatchedNames.length,
        tableRows,
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

  // SECTION: Guest Processing UI & Actions
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
      uiUtils.showLoadingIndicator(
        "Loading all ward members for guest search...",
        "This may take a moment to scan all pages"
      );

      try {
        console.log("Fallback: Starting to load ward members...");
        await handler.loadWardMembers();
        console.log(`Loaded ${handler.wardMembers.length} total ward members`);
        uiUtils.hideLoadingIndicator();

        if (handler.wardMembers.length === 0) {
          alert(
            "No ward members were loaded. Guest search may not work properly."
          );
          logger.logError("No ward members loaded for guest search");
        }
      } catch (error) {
        uiUtils.hideLoadingIndicator();
        console.error("Failed to load ward members:", error);
        logger.logError("Failed to load ward members", {
          error: error.message,
        });
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

    uiUtils.showLoadingIndicator("Processing guest attendance...");

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

      // Add manual guest counts via helper
      const mergedGuestCounts = buildGuestCountsFromInputs(guestCounts);

      logger.logAction("Processing guest attendance", {
        membersToMark: membersToMark.length,
        guestCounts: mergedGuestCounts,
      });

      // Mark members as present and update log
      for (const item of membersToMark) {
        const success = await handler.markMemberPresent(item.member);
        updateAttendanceLogStatus(
          attendanceLog,
          item.originalName,
          success
            ? "Marked as Present in LCR (Guest Processing)"
            : "Guest Processing - Mark Failed"
        );
      }

      // Update guest counts if any
      const totalGuests = Object.values(mergedGuestCounts).reduce(
        (sum, count) => sum + count,
        0
      );
      if (totalGuests > 0) {
        await handler.updateGuestCounts(mergedGuestCounts);

        // Add guest entries to attendance log uniformly
        for (const [key, label] of Object.entries(GUEST_CATEGORY_LABELS)) {
          const count = mergedGuestCounts[key] || 0;
          if (count > 0) {
            attendanceLog.push({
              originalIndex: -1,
              date: targetDate,
              firstName: `${count} Guest`,
              lastName: label,
              lcrUpdateStatus: "Marked as Guests in LCR",
            });
          }
        }
      }

      uiUtils.hideLoadingIndicator();

      // Close current results and show updated results
      safeRemoveById("lcr-tools-attendance-results-overlay");

      const updatedMessage = `Guest processing complete. ${membersToMark.length} names found and marked. ${totalGuests} guests added to visitor counts.`;

      createAttendanceResultsUI({
        ...parentOptions,
        message: updatedMessage,
        unmatchedNames: [],
        attendanceLog,
      });
    } catch (error) {
      uiUtils.hideLoadingIndicator();
      logger.logError("Guest processing failed", { error: error.message });
      alert(`Error processing guests: ${error.message}`);
    }
  }

  // Entry Point & Export
  function startAttendanceProcessing() {
    showSetupUI();
  }
  window.attendanceUtils = { startAttendanceProcessing };
})();
