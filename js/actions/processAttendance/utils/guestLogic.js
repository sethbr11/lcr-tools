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
  
  // Mapping from our keys to the input 'name' prefix in the new visitors tab
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
    constructor(logger, targetDate, targetDateColumnIndex) {
      window.lcrToolsShouldStopProcessing = false;
      this.logger = logger;
      this.targetDate = targetDate;
      this.targetDateColumnIndex = targetDateColumnIndex;
      this.wardMembers = [];
      this.presentMembers = new Set();
    }

    setTargetDate(targetDate, targetDateColumnIndex) {
      this.targetDate = targetDate;
      this.targetDateColumnIndex = targetDateColumnIndex;
      this.logger.logAction("Guest handler target date updated", { targetDate, targetDateColumnIndex });
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

      // We rely on input names formatted like "men_2026-02-01"
      for (const [guestKey, prefix] of Object.entries(GUEST_INPUT_NAME_PREFIXES)) {
        if (uiUtils.isAborted()) throw new Error("Process aborted by user.");
        const count = guestCounts[guestKey] || 0;
        if (count <= 0) continue;

        const inputName = prefix + targetDate; // e.g. "men_2026-02-01"
        const allInputs = Array.from(document.querySelectorAll('input[name="' + inputName + '"]'));
        const targetInput = allInputs.find(i => i.offsetParent !== null) || allInputs[0];
        
        if (targetInput && targetInput.offsetParent !== null) {
          const currentValue = parseInt(targetInput.value) || 0;
          const newValue = currentValue + count;
          
          // Human-like: Scroll into view first
          targetInput.scrollIntoView({ behavior: "smooth", block: "center" });
          await uiUtils.sleepWithJitter(100, 50);

          targetInput.focus();
          await uiUtils.sleepWithJitter(50, 50);

          // Use the native setter to bypass React's value tracking
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          if (nativeSetter) {
            nativeSetter.call(targetInput, String(newValue));
          } else {
            targetInput.value = String(newValue);
          }

          // Dispatch events to trigger React's change detection
          targetInput.dispatchEvent(new Event("input", { bubbles: true }));
          await uiUtils.sleepWithJitter(50, 50);
          targetInput.dispatchEvent(new Event("change", { bubbles: true }));
          
          await uiUtils.sleepWithJitter(50, 50);
          targetInput.blur();
          
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
    buildGuestCountsFromInputs,
    GuestAttendanceHandler
  };
})();
