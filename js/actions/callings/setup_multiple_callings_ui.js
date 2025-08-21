(async function () {
  console.log("LCR Tools: setup_multiple_callings_ui.js injected.");

  // Ensure utility functions are available
  if (
    typeof showLoadingIndicator !== "function" ||
    typeof hideLoadingIndicator !== "function" ||
    typeof LCR_TOOLS_FIND_MULTIPLE_CALLINGS !== "function"
  ) {
    console.error(
      "LCR Tools: Essential functions are not available. Ensure scripts are injected in the correct order."
    );
    alert(
      "LCR Tools: Critical error initializing multiple callings finder. Required components are missing. Please try reloading the extension and the page."
    );
    return { result: { error: "Core function(s) missing." } };
  }

  const UI_OVERLAY_ID = "lcr-tools-multiple-callings-ui-overlay";
  let membersWithMultipleCallings = [];
  let isSelectMode = false;
  let selectedMembers = new Set();

  function createMultipleCallingsUI() {
    if (document.getElementById(UI_OVERLAY_ID)) {
      console.log("LCR Tools: Multiple Callings UI already visible.");
      const existingOverlay = document.getElementById(UI_OVERLAY_ID);
      existingOverlay.style.display = "flex";
      return;
    }

    // Check if we're on the ward callings page to show disclaimer
    const isWardCallingsPage = window.location.href.includes(
      "orgs/callings-by-organization"
    );

    // Prepare alerts
    const alerts = [];
    if (isWardCallingsPage) {
      alerts.push({
        message: `
          <div style="display: flex; align-items: center; margin-bottom: 5px;">
            <span style="color: #f39c12; font-size: 1.2em; margin-right: 8px;">ℹ️</span>
            <strong style="color: #856404;">Ward Callings Only</strong>
          </div>
          <p style="margin: 0; font-size: 0.9em; color: #856404; line-height: 1.4;">
            This analysis is limited to ward-level callings visible on this page. 
            To include stake callings and other assignments, run this tool from the 
            <a href="https://lcr.churchofjesuschrist.org/orgs/members-with-callings?lang=eng" target="_blank" style="color: #00509e; text-decoration: underline;">Members with Callings</a> page instead.
          </p>
        `,
        type: "warning",
      });
    }

    // Generate content
    let content = "";
    if (membersWithMultipleCallings.length === 0) {
      const scopeText = isWardCallingsPage ? "ward " : "";
      content = `
        <div style="text-align: center; padding: 20px; color: #28a745;">
          <h3 style="margin: 0; color: #28a745;">✓ No Issues Found</h3>
          <p style="margin: 10px 0 0 0;">All members have only one ${scopeText}calling each.</p>
        </div>
      `;
    } else {
      content = `
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="color: #dc3545; margin: 0;">⚠ Found ${
              membersWithMultipleCallings.length
            } Members with Multiple Callings</h3>
            <div>
              <button id="lcr-tools-select-mode-btn" style="padding: 8px 12px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">Select</button>
            </div>
          </div>
          <div id="lcr-tools-selection-controls" style="display: none; margin-bottom: 15px; padding: 10px; background-color: #e9ecef; border-radius: 4px;">
            <button id="lcr-tools-select-all-btn" style="padding: 5px 10px; margin-right: 10px; background-color: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.85em;">Select All</button>
            <button id="lcr-tools-deselect-all-btn" style="padding: 5px 10px; background-color: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.85em;">Deselect All</button>
          </div>
          <div style="max-height: 400px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 4px; padding: 15px; background-color: #f8f9fa;">
            ${membersWithMultipleCallings
              .map(
                (member, index) => `
              <div style="margin-bottom: 15px; padding: 10px; background-color: #fff; border-radius: 4px; border-left: 3px solid #dc3545;">
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                  <input type="checkbox" id="member-checkbox-${index}" class="member-checkbox" style="display: none; margin-right: 10px;" data-member-name="${member.name.replace(
                  /"/g,
                  "&quot;"
                )}">
                  <div style="font-weight: bold; color: #212529;">${
                    member.name
                  }</div>
                </div>
                <div style="font-size: 0.9em; color: #6c757d;">
                  ${member.callings
                    .map((callingInfo) => {
                      const displayText = callingInfo.organization
                        ? `${callingInfo.calling} (${callingInfo.organization})`
                        : callingInfo.calling;
                      return `<span style="display: inline-block; margin: 2px 5px 2px 0; padding: 2px 8px; background-color: #e9ecef; border-radius: 12px; font-size: 0.8em;">${displayText}</span>`;
                    })
                    .join("")}
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
        <div id="lcr-tools-multiple-callings-status" style="margin-top:15px; padding:10px; border-radius:4px; font-size:0.9em; border:1px solid transparent; min-height: 20px; display: none;"></div>
      `;
    }

    // Prepare buttons
    const buttons = [];
    if (membersWithMultipleCallings.length > 0) {
      buttons.push({
        text: "Download CSV Report",
        onClick: downloadCsvHandler,
        options: {
          id: "lcr-tools-download-csv-btn",
          variant: "success",
        },
      });
    }

    // Create modal
    uiUtils.createStandardModal({
      id: UI_OVERLAY_ID,
      title: "Members with Multiple Callings",
      content,
      alerts,
      buttons,
      onClose: closeMultipleCallingsUI,
      modalOptions: { maxWidth: "700px" },
    });

    // Add event listeners for interactive elements
    if (membersWithMultipleCallings.length > 0) {
      document
        .getElementById("lcr-tools-select-mode-btn")
        ?.addEventListener("click", toggleSelectMode);
      document
        .getElementById("lcr-tools-select-all-btn")
        ?.addEventListener("click", selectAllMembers);
      document
        .getElementById("lcr-tools-deselect-all-btn")
        ?.addEventListener("click", deselectAllMembers);

      document.querySelectorAll(".member-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", updateCsvButtonState);
      });
    }
  }

  function closeMultipleCallingsUI() {
    uiUtils.closeModal(UI_OVERLAY_ID);
  }

  function showUiStatus(message, isError = false) {
    uiUtils.showStatus("lcr-tools-multiple-callings-status", message, isError);
  }

  function toggleSelectMode() {
    isSelectMode = !isSelectMode;
    const selectModeBtn = document.getElementById("lcr-tools-select-mode-btn");
    const selectionControls = document.getElementById(
      "lcr-tools-selection-controls"
    );
    const checkboxes = document.querySelectorAll(".member-checkbox");

    if (isSelectMode) {
      selectModeBtn.textContent = "Cancel";
      selectModeBtn.style.backgroundColor = "#dc3545";
      selectionControls.style.display = "block";
      checkboxes.forEach((checkbox) => {
        checkbox.style.display = "inline-block";
      });
      selectedMembers.clear();
      updateCsvButtonState();
    } else {
      selectModeBtn.textContent = "Select";
      selectModeBtn.style.backgroundColor = "#007bff";
      selectionControls.style.display = "none";
      checkboxes.forEach((checkbox) => {
        checkbox.style.display = "none";
        checkbox.checked = false;
      });
      selectedMembers.clear();
      updateCsvButtonState();
    }
  }

  function selectAllMembers() {
    const checkboxes = document.querySelectorAll(".member-checkbox");
    selectedMembers.clear();
    checkboxes.forEach((checkbox) => {
      checkbox.checked = true;
      selectedMembers.add(checkbox.dataset.memberName);
    });
    updateCsvButtonState();
  }

  function deselectAllMembers() {
    const checkboxes = document.querySelectorAll(".member-checkbox");
    selectedMembers.clear();
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });
    updateCsvButtonState();
  }

  function updateCsvButtonState() {
    const csvBtn = document.getElementById("lcr-tools-download-csv-btn");
    if (!csvBtn) return;

    if (isSelectMode) {
      // Update selected members set
      selectedMembers.clear();
      document
        .querySelectorAll(".member-checkbox:checked")
        .forEach((checkbox) => {
          selectedMembers.add(checkbox.dataset.memberName);
        });

      if (selectedMembers.size === 0) {
        csvBtn.disabled = true;
        csvBtn.style.backgroundColor = "#6c757d";
        csvBtn.style.cursor = "not-allowed";
      } else {
        csvBtn.disabled = false;
        csvBtn.style.backgroundColor = "#28a745";
        csvBtn.style.cursor = "pointer";
      }
    } else {
      csvBtn.disabled = false;
      csvBtn.style.backgroundColor = "#28a745";
      csvBtn.style.cursor = "pointer";
    }
  }

  function downloadCsvHandler() {
    let membersToExport = membersWithMultipleCallings;

    // If in select mode, only export selected members
    if (isSelectMode) {
      if (selectedMembers.size === 0) {
        showUiStatus("No members selected for export.", true);
        return;
      }
      membersToExport = membersWithMultipleCallings.filter((member) =>
        selectedMembers.has(member.name)
      );
    }

    if (membersToExport.length === 0) {
      showUiStatus("No data to download.", true);
      return;
    }

    const csvHeader = `"Name","Number of Callings","Callings","Organizations"\n`;
    const csvRows = membersToExport
      .map((member) => {
        const callings = member.callings.map((c) => c.calling).join("; ");
        const organizations = member.callings
          .map((c) => c.organization || "N/A")
          .join("; ");
        return `"${member.name.replace(/"/g, '""')}","${
          member.count
        }","${callings.replace(/"/g, '""')}","${organizations.replace(
          /"/g,
          '""'
        )}"`;
      })
      .join("\n");

    const csvContent = csvHeader + csvRows;
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;

    const suffix =
      isSelectMode && selectedMembers.size < membersWithMultipleCallings.length
        ? `_selected_${selectedMembers.size}`
        : "";

    csvUtils.downloadCsv(
      csvContent,
      `members_multiple_callings${suffix}_${dateStr}.csv`
    );

    const exportCount = isSelectMode
      ? selectedMembers.size
      : membersWithMultipleCallings.length;
    showUiStatus(
      `CSV report with ${exportCount} members downloaded successfully.`,
      false
    );
  }

  // --- Initialize ---
  showLoadingIndicator("Analyzing members with callings...");

  try {
    membersWithMultipleCallings = LCR_TOOLS_FIND_MULTIPLE_CALLINGS();
    createMultipleCallingsUI();
  } catch (error) {
    console.error("LCR Tools: Error finding multiple callings:", error);
    alert(
      "LCR Tools: Error analyzing the page. Please ensure you are on the correct page and try again."
    );
  } finally {
    hideLoadingIndicator();
  }

  return { result: "success" };
})();
