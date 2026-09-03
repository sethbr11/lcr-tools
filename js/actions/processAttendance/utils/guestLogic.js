(() => {
  if (utils.returnIfLoaded("attendanceGuestLogic")) return;
  utils.ensureLoaded("attendanceDomUtils", "utils", "uiUtils");

  const GUEST_CATEGORY_LABELS = {
    M: "Men",
    F: "Women",
    YM: "Young Men",
    YW: "Young Women",
    C: "Children",
  };
  
  // Mapping from visitor category to target organization dropdown patterns in LCR
  const GUEST_CATEGORY_ORG_PATTERNS = {
    M: [/\belders\s+quorum\b/i, /\badult\s+sunday\s+school\b/i, /\bmen\b/i],
    F: [/\brelief\s+society\b/i, /\badult\s+sunday\s+school\b/i, /\bwomen\b/i],
    YM: [/\bpriests\s+quorum\b/i, /\bteachers\s+quorum\b/i, /\bdeacons\s+quorum\b/i, /\baaronic\b/i, /\byoung\s+men\b/i],
    YW: [/\bgatherers\s+of\s+light\b/i, /\byoung\s+women\b/i],
    C: [/\bvaliant\s+10\b/i, /\bvaliant\b/i, /\bprimary\b/i, /\bsunbeam\b/i, /\bchildren\b/i],
  };

  // Row header text regex per category
  const GUEST_ROW_PATTERNS = {
    M: /men\b|elders\s+quorum/i,
    F: /women\b|relief\s+society/i,
    YM: /young\s+men\b|priests|teachers|deacons/i,
    YW: /young\s+women\b|gatherers/i,
    C: /children\b|valiant|primary/i,
  };

  function findOrgOptionForCategory(orgSelect, guestKey) {
    if (!orgSelect || !orgSelect.options) return null;
    const patterns = GUEST_CATEGORY_ORG_PATTERNS[guestKey] || [];
    const options = Array.from(orgSelect.options);

    for (const pattern of patterns) {
      const match = options.find((opt) => pattern.test((opt.textContent || "").trim()));
      if (match) return match;
    }
    return null;
  }

  // Mapping from our keys to the input 'name' prefix in legacy visitors tab
  const GUEST_INPUT_NAME_PREFIXES = {
    M: "men_",
    F: "women_",
    YM: "youngMen_",
    YW: "youngWomen_",
    C: "children_",
  };

  const GUEST_INPUT_IDS = {
    M: "lcr-tools-guest-men",
    F: "lcr-tools-guest-women",
    YM: "lcr-tools-guest-ym",
    YW: "lcr-tools-guest-yw",
    C: "lcr-tools-guest-children",
  };

  function getNumericInputValue(id) {
    const el = document.getElementById(id);
    const n = parseInt(el?.value, 10);
    return Number.isFinite(n) ? n : 0;
  }

  function buildGuestCountsFromInputs(baseCounts, date) {
    const counts = { ...baseCounts };
    if (date) {
      // Read from per-date inputs using data attributes
      const inputs = document.querySelectorAll(`.lcrx-guest-input[data-date="${date}"]`);
      inputs.forEach((input) => {
        const category = input.dataset.category;
        const val = parseInt(input.value, 10);
        if (category && Number.isFinite(val)) {
          counts[category] = (counts[category] || 0) + val;
        }
      });
    } else {
      // Fallback: read from legacy fixed IDs
      Object.keys(GUEST_INPUT_IDS).forEach((k) => {
        counts[k] = (counts[k] || 0) + getNumericInputValue(GUEST_INPUT_IDS[k]);
      });
    }
    return counts;
  }

  class GuestAttendanceHandler {
    constructor(logger, targetDate, targetDateColumnIndex, options = {}) {
      window.lcrToolsShouldStopProcessing = false;
      this.logger = logger;
      this.targetDate = targetDate;
      this.targetDateColumnIndex = targetDateColumnIndex;
      this.options = options;
      this.wardMembers = [];
      this.presentMembers = new Set();
    }

    setTargetDate(targetDate, targetDateColumnIndex, options = null) {
      this.targetDate = targetDate;
      this.targetDateColumnIndex = targetDateColumnIndex;
      if (options) {
        this.options = { ...this.options, ...options };
      }
      this.logger.logAction("Guest handler target date updated", { targetDate, targetDateColumnIndex, options: this.options });
    }

    setWardMembers(wardMembers, presentMembers = new Set()) {
      this.wardMembers = wardMembers;
      this.presentMembers = presentMembers;
      this.logger.logAction("Ward members data provided", {
        totalMembers: this.wardMembers.length,
        presentMembers: this.presentMembers.size,
      });
      window.dispatchEvent(
        new CustomEvent("lcrx:wardMembersReady", {
          detail: { count: this.wardMembers.length },
        })
      );
    }

    async loadWardMembers() {
      this.logger.logAction("Loading all ward members for guest search");

      const membersTab = document.querySelector(attendanceDomUtils.SELECTORS.membersTab);
      if (membersTab) {
        membersTab.click();
        await uiUtils.sleepWithJitter(1000, 500);
      }

      this.wardMembers = [];
      
      const memberRows = attendanceDomUtils.getMemberRows();
      for (const row of memberRows) {
        if (uiUtils.isAborted()) throw new Error("Process aborted by user.");
        const member = attendanceDomUtils.buildWardMember(
          row,
          this.targetDateColumnIndex,
          1, // No pagination
          true
        );
        if (!member) continue;

        this.wardMembers.push(member);
        if (member.isPresent)
          this.presentMembers.add(member.fullName.toLowerCase());
      }

      this.wardMembers.sort((a, b) => a.fullName.localeCompare(b.fullName));

      this.logger.logAction("Ward members loaded", {
        totalMembers: this.wardMembers.length,
        presentMembers: this.presentMembers.size,
      });

      window.dispatchEvent(
        new CustomEvent("lcrx:wardMembersReady", {
          detail: { count: this.wardMembers.length },
        })
      );
    }

    searchMembers(query) {
      if (!query || query.length < 1) return this.wardMembers.slice(0, 20);

      const queryLower = query.toLowerCase();
      return this.wardMembers
        .filter(
          (member) =>
            member.fullName.toLowerCase().includes(queryLower) ||
            member.firstName.toLowerCase().includes(queryLower) ||
            member.lastName.toLowerCase().includes(queryLower)
        )
        .slice(0, 20);
    }

    async markMemberPresent(member) {
      if (uiUtils.isAborted()) throw new Error("Process aborted by user.");
      
      const membersTab = document.querySelector(attendanceDomUtils.SELECTORS.membersTab);
      if (membersTab && membersTab.getAttribute("aria-selected") !== "true") {
         membersTab.click();
         await uiUtils.sleepWithJitter(600, 300);
      }

      const isNewLayout = attendanceDomUtils.isTwoHourSplitLayout?.();
      if (isNewLayout) {
        await attendanceDomUtils.ensureCorrectMonth(this.targetDate, this.logger);
        await attendanceDomUtils.setClassQuorum(this.options?.targetClassValue || "ALL", this.logger);
        await attendanceDomUtils.selectSundayView(this.targetDate, this.logger);

        const targetRow = attendanceDomUtils.findRowByFullName(member.fullName);
        if (!targetRow) {
          this.logger.logError("Member row not found", { memberName: member.fullName });
          return false;
        }

        const meetingSplit = this.options?.meetingSplit || "BOTH";
        const targetButtons = attendanceDomUtils.resolveTargetButtons(targetRow, meetingSplit);
        if (targetButtons.length === 0) return false;

        let anyMarked = false;
        let allAlreadyPresent = true;

        targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
        await uiUtils.sleepWithJitter(150, 50);

        for (const btn of targetButtons) {
          const { marked, alreadyPresent } = await attendanceDomUtils.toggleButtonPresent(btn, this.logger);
          if (marked) {
            anyMarked = true;
            allAlreadyPresent = false;
          } else if (!alreadyPresent) {
            allAlreadyPresent = false;
          }
        }

        if (anyMarked || allAlreadyPresent) {
          return true;
        }
        return false;
      }

      const targetRow = attendanceDomUtils.findRowByFullName(member.fullName);

      if (!targetRow) {
        this.logger.logError("Member row not found", {
          memberName: member.fullName,
        });
        return false;
      }

      const targetCell = attendanceDomUtils.getAttendanceCell(
        targetRow,
        this.targetDateColumnIndex
      );
      if (targetCell) {
        const clickableDiv = attendanceDomUtils.getClickableDivForNotPresent(targetCell);
        const initialIsPresent = attendanceDomUtils.isPresentInCell(targetCell);
        
        if (clickableDiv && !initialIsPresent) {
          // Human-like: scroll and hover
          targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
          await uiUtils.sleepWithJitter(100, 50);

          this.logger.logUserAction(
            "CLICK",
            "attendance_cell",
            "mark_guest_present",
            {
              memberName: member.fullName,
              date: this.targetDate,
            }
          );

          clickableDiv.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
          clickableDiv.click();
          
          // Wait for UI update
          let updated = false;
          const startWait = Date.now();
          const timeout = 2500;
          while (Date.now() - startWait < timeout) {
            if (uiUtils.isAborted()) throw new Error("Process aborted by user.");
            if (attendanceDomUtils.isPresentInCell(targetCell)) {
              updated = true;
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          if (updated) {
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
            
            await uiUtils.sleepWithJitter(150, 100);
            return true;
          } else {
            this.logger.logAction("GUEST_MARK_UI_TIMEOUT", { memberName: member.fullName, date: this.targetDate });
          }
        } else if (initialIsPresent) {
          return true; // Already present
        }
      }
      return false;
    }

    async updateGuestCounts(guestCounts, date = null) {
      if (uiUtils.isAborted()) throw new Error("Process aborted by user.");
      const targetDate = date || this.targetDate;
      this.logger.logAction("Updating guest counts for " + targetDate, guestCounts);

      let updatedCount = 0;

      const isNewLayout = attendanceDomUtils.isTwoHourSplitLayout?.();
      if (isNewLayout) {
        return await this.processMonthVisitorCounts({ [targetDate]: guestCounts });
      }

      // Legacy flow
      for (const [guestKey, prefix] of Object.entries(GUEST_INPUT_NAME_PREFIXES)) {
        if (uiUtils.isAborted()) throw new Error("Process aborted by user.");
        const count = guestCounts[guestKey] || 0;
        if (count <= 0) continue;

        const inputName = prefix + targetDate;
        const allInputs = Array.from(document.querySelectorAll('input[name="' + inputName + '"]'));
        const targetInput = allInputs.find((i) => i.offsetParent !== null) || allInputs[0];

        if (targetInput && targetInput.offsetParent !== null) {
          const currentValue = parseInt(targetInput.value, 10) || 0;
          const newValue = currentValue + count;

          await attendanceDomUtils.setNativeInputValue(targetInput, newValue);
          updatedCount++;

          this.logger.logModification(
            "UPDATE",
            "visitor_count",
            { category: GUEST_CATEGORY_LABELS[guestKey], date: targetDate, count: currentValue },
            { category: GUEST_CATEGORY_LABELS[guestKey], date: targetDate, count: newValue },
            { method: "guest_attendance_handler" }
          );
        } else {
          this.logger.logError("Target guest input not found", { inputName });
        }
      }
      return updatedCount;
    }

    async processMonthVisitorCounts(guestCountsByDate) {
      if (uiUtils.isAborted()) throw new Error("Process aborted by user.");
      this.logger.logAction("Processing month visitor counts across organizations", guestCountsByDate);

      let totalUpdated = 0;
      const isNewLayout = attendanceDomUtils.isTwoHourSplitLayout?.();

      if (isNewLayout) {
        const orgSelect = attendanceDomUtils.getClassQuorumSelect();
        if (!orgSelect) {
          this.logger.logError("Class/Quorum dropdown not found on Visitors tab.");
          return 0;
        }

        const categories = ["M", "F", "YM", "YW", "C"];

        for (const cat of categories) {
          if (uiUtils.isAborted()) throw new Error("Process aborted by user.");

          // Check if there are any counts for this category in any date of the month
          const hasCounts = Object.keys(guestCountsByDate).some(
            (d) => (guestCountsByDate[d]?.[cat] || 0) > 0
          );
          if (!hasCounts) continue;

          // 1. Select the organization matching this category
          const orgOption = findOrgOptionForCategory(orgSelect, cat);
          if (!orgOption) {
            this.logger.logAction("No matching organization dropdown option for visitor category", {
              category: cat,
              label: GUEST_CATEGORY_LABELS[cat],
            });
            continue;
          }

          if (orgSelect.value !== orgOption.value) {
            this.logger.logAction("Switching organization on Visitors tab for category", {
              category: cat,
              to: orgOption.textContent.trim(),
            });
            await attendanceDomUtils.setClassQuorum(orgOption.value, this.logger);
          }

          // 2. Wait for table rows and input elements to render (up to 8 seconds)
          let rows = [];
          const startWait = Date.now();
          const timeout = 8000;
          while (Date.now() - startWait < timeout) {
            if (uiUtils.isAborted()) throw new Error("Process aborted by user.");
            const candidates = Array.from(
              document.querySelectorAll("table tbody tr, table tr[role='row'], table tr")
            ).filter((r) => r.querySelectorAll("td, th").length > 1 && !r.closest("thead"));

            if (candidates.some((r) => r.querySelector("input"))) {
              rows = candidates;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 250));
          }

          if (rows.length === 0) {
            rows = Array.from(
              document.querySelectorAll("table tbody tr, table tr")
            ).filter((r) => !r.closest("thead"));
          }

          const rowsWithInputs = rows.filter((r) => r.querySelector("input"));
          const rowPattern = GUEST_ROW_PATTERNS[cat];

          let targetRow = null;
          if (rowsWithInputs.length === 1) {
            // When an individual organization like Elders Quorum or Relief Society is selected,
            // there is only one row with inputs!
            targetRow = rowsWithInputs[0];
          } else if (rowsWithInputs.length > 1) {
            // Multi-row organization view (e.g. Adult Sunday School)
            targetRow =
              rowsWithInputs.find((r) => rowPattern.test((r.textContent || "").trim())) ||
              rowsWithInputs[0];
          } else if (rows.length > 0) {
            targetRow =
              rows.find((r) => rowPattern.test((r.textContent || "").trim())) ||
              rows[0];
          }

          if (!targetRow) {
            this.logger.logAction("Visitor row not found for category under organization", {
              category: cat,
              organization: orgOption.textContent.trim(),
              totalRowsFound: rows.length,
            });
            continue;
          }

          const thElements = Array.from(
            document.querySelectorAll("table thead tr:last-child th, table thead th")
          );
          let updatedForOrg = false;

          // 3. For each date with counts, update the input
          for (const date of Object.keys(guestCountsByDate)) {
            const count = guestCountsByDate[date]?.[cat] || 0;
            if (count <= 0) continue;

            const parts = date.split("-");
            const dayNum = parseInt(parts[2], 10);
            const monthIndex = parseInt(parts[1], 10) - 1;
            const monthAbbr = attendanceDomUtils.MONTH_NAMES[monthIndex].substring(0, 3);

            let targetColIndex = -1;
            for (let i = 0; i < thElements.length; i++) {
              const thText = (thElements[i].textContent || "").trim().toLowerCase();
              const numbers = thText.match(/\d+/g) || [];
              if (numbers.some((n) => parseInt(n, 10) === dayNum) && thText.includes(monthAbbr)) {
                targetColIndex = i;
                break;
              }
            }

            // Find matching Sunday index among date headers as fallback
            const dateHeaders = thElements.filter((th) => {
              const t = (th.textContent || "").toLowerCase();
              return /\d+/.test(t) && attendanceDomUtils.MONTH_NAMES.some((m) => t.includes(m.substring(0, 3)));
            });
            const sundayIndex = dateHeaders.findIndex((th) => {
              const t = (th.textContent || "").toLowerCase();
              const nums = t.match(/\d+/g) || [];
              return nums.some((n) => parseInt(n, 10) === dayNum);
            });

            const rowInputs = Array.from(targetRow.querySelectorAll("input"));
            const targetInput =
              (targetColIndex !== -1 && targetRow.children[targetColIndex]?.querySelector("input")) ||
              (sundayIndex !== -1 && rowInputs[sundayIndex]) ||
              rowInputs[0];

            if (targetInput) {
              const currentValue = parseInt(targetInput.value, 10) || 0;
              const newValue = currentValue + count;

              await attendanceDomUtils.setNativeInputValue(targetInput, newValue);

              totalUpdated += count;
              updatedForOrg = true;

              this.logger.logModification(
                "UPDATE",
                "visitor_count",
                { category: GUEST_CATEGORY_LABELS[cat], date, count: currentValue },
                { category: GUEST_CATEGORY_LABELS[cat], date, count: newValue },
                { method: "guest_attendance_handler" }
              );
            } else {
              this.logger.logError("Target guest input not found in cell", { category: cat, date, targetColIndex });
            }
          }

          // 4. Save changes for this organization before switching to the next
          if (updatedForOrg) {
            this.logger.logAction("Saving visitor counts for organization", { organization: orgOption.textContent.trim() });
            await uiUtils.sleepWithJitter(500, 200);
            await this.saveVisitorCounts();
            await uiUtils.sleepWithJitter(1500, 500);
          }
        }

        // Reset dropdown back to "All Classes and Quorums" view of visitor counts
        await this.resetVisitorsToAllClasses();

        return totalUpdated;
      }

      // Legacy fallback
      for (const date of Object.keys(guestCountsByDate)) {
        const counts = guestCountsByDate[date];
        const updated = await this.updateGuestCounts(counts, date);
        totalUpdated += updated;
      }
      if (totalUpdated > 0) {
        await this.saveVisitorCounts();
      }
      return totalUpdated;
    }

    async resetVisitorsToAllClasses() {
      this.logger.logAction("Resetting Class/Quorum dropdown to All Classes and Quorums on Visitors tab");
      return await attendanceDomUtils.setClassQuorum("ALL", this.logger);
    }

    async saveVisitorCounts() {
      if (uiUtils.isAborted()) throw new Error("Process aborted by user.");
      this.logger.logAction("Saving all visitor counts for current month");
      
      const saved = attendanceDomUtils.clickSaveButton(this.logger);
      if (saved) {
        // Wait longer for LCR to process the save and for the session to stabilize
        await uiUtils.sleepWithJitter(3000, 1000);
        this.logger.logUserAction(
          "CLICK",
          "save_button",
          "save_visitor_counts"
        );
        return true;
      }
      return false;
    }
  }

  window.attendanceGuestLogic = {
    GUEST_CATEGORY_LABELS,
    GUEST_CATEGORY_ORG_PATTERNS,
    GUEST_ROW_PATTERNS,
    findOrgOptionForCategory,
    buildGuestCountsFromInputs,
    GuestAttendanceHandler,
  };
})();
