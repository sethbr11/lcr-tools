if (!window.__lcrx_guest_attendance_handler_loaded__) {
  window.__lcrx_guest_attendance_handler_loaded__ = true;

  /**
   * Guest Attendance Handler
   * Manages searching for ward members and processing guest attendance
   */
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
      const membersTab = document.querySelector(".sc-1bd9vcz-2.cbdfgp");
      if (membersTab) {
        membersTab.click();
        await scrapingUtils.sleep(1000);
      }

      // Navigate to first page
      await paginationUtils.navigateToFirstPage(2000);

      let memberPageNum = 1;
      this.wardMembers = [];

      while (memberPageNum <= 50 && !window.lcrToolsShouldStopProcessing) {
        this.logger.logAction("Loading members from page", {
          pageNum: memberPageNum,
        });

        // Wait for page to load completely
        await scrapingUtils.sleep(500);
        const memberRows = document.querySelectorAll(
          "tbody tr.sc-zkgtp5-0.iooGpB"
        );

        for (const row of memberRows) {
          const nameAnchor = row.querySelector(
            "td:first-child a.sc-14fff288-0"
          );
          if (!nameAnchor) continue;

          const fullName = nameAnchor.textContent.trim();
          const parsedName = stringUtils.parseFullName(fullName);

          // Check if member is already present for target date
          const attendanceCells = row.querySelectorAll("td.sc-8selpg-0.ABMfH");
          let isPresent = false;

          if (attendanceCells.length > this.targetDateColumnIndex) {
            const targetCell = attendanceCells[this.targetDateColumnIndex];
            const isPresentIcon = targetCell.querySelector(
              'div.sc-5ba12d08-0 svg path[d*="M12 22c5.523"]'
            );
            isPresent = !!isPresentIcon;
          }

          this.wardMembers.push({
            fullName,
            firstName: parsedName.firstName,
            lastName: parsedName.lastName,
            isPresent,
            row,
            pageNum: memberPageNum,
          });

          if (isPresent) {
            this.presentMembers.add(fullName.toLowerCase());
          }
        }

        // Check if we're on the last page before trying to navigate
        if (paginationUtils.isLastPage()) {
          this.logger.logAction("Reached last page while loading members", {
            pageNum: memberPageNum,
            totalMembersLoaded: this.wardMembers.length,
          });
          break;
        }

        const nextPageSuccess = await paginationUtils.goToNextPage(
          2000,
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

      // Sort members alphabetically by full name
      this.wardMembers.sort((a, b) => a.fullName.localeCompare(b.fullName));

      this.logger.logAction("Ward members loaded from all pages", {
        totalMembers: this.wardMembers.length,
        presentMembers: this.presentMembers.size,
        pagesScanned: memberPageNum,
      });

      // Notify any UI that data is now ready
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

      // Navigate to the page where this member is located
      if (member.pageNum) {
        await paginationUtils.navigateToFirstPage(1000);
        for (let i = 1; i < member.pageNum; i++) {
          const success = await paginationUtils.goToNextPage(1000, 50, i);
          if (!success) {
            this.logger.logError("Failed to navigate to member's page", {
              memberName: member.fullName,
              targetPage: member.pageNum,
              currentAttempt: i,
            });
            return false;
          }
        }
        await scrapingUtils.sleep(500); // Allow page to load
      }

      // Find the member's row on the current page
      const memberRows = document.querySelectorAll(
        "tbody tr.sc-zkgtp5-0.iooGpB"
      );
      let targetRow = null;

      for (const row of memberRows) {
        const nameAnchor = row.querySelector("td:first-child a.sc-14fff288-0");
        if (nameAnchor && nameAnchor.textContent.trim() === member.fullName) {
          targetRow = row;
          break;
        }
      }

      if (!targetRow) {
        this.logger.logError("Member row not found on expected page", {
          memberName: member.fullName,
          pageNum: member.pageNum,
        });
        return false;
      }

      const attendanceCells = targetRow.querySelectorAll(
        "td.sc-8selpg-0.ABMfH"
      );
      if (attendanceCells.length > this.targetDateColumnIndex) {
        const targetCell = attendanceCells[this.targetDateColumnIndex];
        const notPresentIcon = targetCell.querySelector(
          'div.sc-5ba12d08-0 svg path[d*="M12 3.5a8.5"]'
        );

        if (notPresentIcon) {
          const clickableDiv = notPresentIcon.closest("div.sc-5ba12d08-0");
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
      }
      return false;
    }

    /**
     * Navigate to visitors tab and update guest counts
     */
    async updateGuestCounts(guestCounts) {
      this.logger.logAction("Updating guest counts", guestCounts);

      // Click on Visitors tab
      const visitorsTab = document.querySelector(".sc-1bd9vcz-2.kGMiZu");
      if (!visitorsTab) throw new Error("Visitors tab not found");

      visitorsTab.click();
      await scrapingUtils.sleep(2000);

      // Find the correct date column in visitors view
      const visitorHeaders = document.querySelectorAll("thead th span span");
      let visitorColumnIndex = -1;

      for (let i = 0; i < visitorHeaders.length; i++) {
        const headerText = visitorHeaders[i].textContent.trim();
        const parsedDate = dateUtils.parseHeaderDate(headerText);
        if (
          parsedDate &&
          dateUtils.formatToYYYYMMDD(parsedDate) === this.targetDate
        ) {
          visitorColumnIndex = i + 2;
          break;
        }
      }

      if (visitorColumnIndex === -1)
        throw new Error("Target date column not found in visitors view");

      const categories = [
        "Men",
        "Women",
        "Young Men",
        "Young Women",
        "Children",
      ];
      const guestKeys = ["M", "F", "YM", "YW", "C"];

      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const guestKey = guestKeys[i];
        const count = guestCounts[guestKey] || 0;

        if (count > 0) {
          const categoryRow = Array.from(
            document.querySelectorAll("tbody tr")
          ).find(
            (row) => row.querySelector("td")?.textContent.trim() === category
          );

          if (categoryRow) {
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
        }
      }

      // Save changes
      await scrapingUtils.sleep(500);
      const saveButton = document.querySelector(
        "button.sc-1lb7nf5-0.iinUOC:not([disabled])"
      );
      if (saveButton) {
        saveButton.click();
        await scrapingUtils.sleep(1000);
        this.logger.logUserAction(
          "CLICK",
          "save_button",
          "save_visitor_counts"
        );
      }
    }
  }

  // Replace the dropdown to be body-level (fixed) to avoid clipping in table cells
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

  if (!window.GuestAttendanceHandler)
    window.GuestAttendanceHandler = GuestAttendanceHandler;
  if (!window.createMemberSearchDropdown)
    window.createMemberSearchDropdown = createMemberSearchDropdown;
  if (!window.createGuestCategoryToggle)
    window.createGuestCategoryToggle = createGuestCategoryToggle;
}
