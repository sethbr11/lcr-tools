(async function () {
  /**
   * Finds members with multiple callings by analyzing the table data
   * @returns {Array<Object>} Array of members with their callings
   */
  function LCR_TOOLS_FIND_MULTIPLE_CALLINGS() {
    // Check if we're on the members-with-callings page (has sub-org elements)
    const subOrgElements = document.querySelectorAll("sub-org");
    const isGroupedByOrg = subOrgElements.length > 0;

    if (isGroupedByOrg) {
      return findMultipleCallingsGroupedByOrg(subOrgElements);
    } else {
      return findMultipleCallingsStandardTable();
    }
  }

  /**
   * Handles the standard single table format (orgs/callings-by-organization)
   */
  function findMultipleCallingsStandardTable() {
    const table = document.querySelector("table.table.ng-scope");
    if (!table) {
      console.error("LCR Tools: Could not find the members table.");
      return [];
    }

    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    if (!thead || !tbody) {
      console.error("LCR Tools: Could not find table head or body.");
      return [];
    }

    // Find column indices from header
    const headerCells = thead.querySelectorAll("th");
    let nameColumnIndex = -1;
    let organizationColumnIndex = -1;
    let callingColumnIndex = -1;

    headerCells.forEach((th, index) => {
      const id = th.id;
      if (id === "name") nameColumnIndex = index;
      else if (id === "organization") organizationColumnIndex = index;
      else if (id === "position") callingColumnIndex = index;
    });

    if (nameColumnIndex === -1 || callingColumnIndex === -1) {
      console.error(
        "LCR Tools: Could not find required columns in table header."
      );
      return [];
    }

    return processTableRows(
      table.querySelector("tbody"),
      nameColumnIndex,
      callingColumnIndex,
      organizationColumnIndex
    );
  }

  /**
   * Handles the grouped by organization format (orgs/members-with-callings)
   */
  function findMultipleCallingsGroupedByOrg(subOrgElements) {
    const memberCallingsMap = new Map();

    subOrgElements.forEach((subOrg) => {
      const table = subOrg.querySelector("table");
      if (!table) return;

      const thead = table.querySelector("thead");
      const tbody = table.querySelector("tbody");
      if (!thead || !tbody) return;

      // Find column indices - different structure for grouped view
      const headerCells = thead.querySelectorAll("th");
      let nameColumnIndex = -1;
      let callingColumnIndex = -1;

      headerCells.forEach((th, index) => {
        const linkText = th
          .querySelector("a")
          ?.textContent?.trim()
          .toLowerCase();
        if (linkText === "name") {
          nameColumnIndex = index;
        } else if (linkText === "position") {
          callingColumnIndex = index;
        }
      });

      if (nameColumnIndex === -1 || callingColumnIndex === -1) {
        console.log(
          "LCR Tools: Skipping table - could not find required columns."
        );
        return;
      }

      // Get organization name from the sub-org context
      const organizationName = getOrganizationName(subOrg);

      // Process rows in this table
      const rows = tbody.querySelectorAll("tr");
      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length <= Math.max(nameColumnIndex, callingColumnIndex))
          return;

        // Get name from name column
        const nameCell = cells[nameColumnIndex];
        const nameLink = nameCell.querySelector("a");
        if (!nameLink) return;

        const memberName = nameLink.textContent.trim();
        if (!memberName) return;

        // Get calling from calling column
        const callingCell = cells[callingColumnIndex];
        const rawCalling = callingCell.textContent.trim();
        if (!rawCalling) return;

        // Clean the calling text (remove asterisks and other formatting)
        const calling = cleanCallingText(rawCalling);
        if (!calling) return;

        // Create calling info object
        const callingInfo = {
          calling: calling,
          organization: organizationName,
        };

        // Add to map
        if (!memberCallingsMap.has(memberName)) {
          memberCallingsMap.set(memberName, []);
        }
        memberCallingsMap.get(memberName).push(callingInfo);
      });
    });

    // Process the callings to remove duplicates and redundant entries
    const processedMap = new Map();
    memberCallingsMap.forEach((callings, memberName) => {
      const filteredCallings = filterRedundantCallings(callings);
      if (filteredCallings.length > 0) {
        processedMap.set(memberName, filteredCallings);
      }
    });

    return filterMembersWithMultipleCallings(processedMap);
  }

  /**
   * Processes table rows and returns member callings map
   */
  function processTableRows(
    tbody,
    nameColumnIndex,
    callingColumnIndex,
    organizationColumnIndex
  ) {
    const rows = tbody.querySelectorAll("tr");
    const memberCallingsMap = new Map();

    rows.forEach((row, index) => {
      const cells = row.querySelectorAll("td");
      if (
        cells.length <=
        Math.max(nameColumnIndex, callingColumnIndex, organizationColumnIndex)
      )
        return;

      // Get name from name column
      const nameCell = cells[nameColumnIndex];
      const nameLink = nameCell.querySelector("a");
      if (!nameLink) return;

      const memberName = nameLink.textContent.trim();
      if (!memberName) return;

      // Get calling from calling column
      const callingCell = cells[callingColumnIndex];
      const calling = callingCell.textContent.trim();
      if (!calling) return;

      // Get organization if available
      let organization = "";
      if (organizationColumnIndex !== -1 && cells[organizationColumnIndex]) {
        organization = cells[organizationColumnIndex].textContent.trim();
      }

      // Create calling info object
      const callingInfo = {
        calling: calling,
        organization: organization,
      };

      // Add to map
      if (!memberCallingsMap.has(memberName)) {
        memberCallingsMap.set(memberName, []);
      }
      memberCallingsMap.get(memberName).push(callingInfo);
    });

    // For standard table, only do basic filtering - no advanced organizational duplicate detection
    return filterMembersWithMultipleCallingsBasic(memberCallingsMap);
  }

  /**
   * Gets organization name from sub-org element
   */
  function getOrganizationName(subOrg) {
    try {
      // Look for the organization header in the sub-org structure
      // Try different selectors that might contain the organization name

      // Method 1: Look for heading elements within the sub-org
      const headings = subOrg.querySelectorAll("h1, h2, h3, h4, h5, h6");
      for (const heading of headings) {
        const text = heading.textContent?.trim();
        if (
          text &&
          text.length > 1 &&
          !text.toLowerCase().includes("position") &&
          !text.toLowerCase().includes("name") &&
          !text.toLowerCase().includes("sustained") &&
          !text.toLowerCase().includes("set apart")
        ) {
          return text;
        }
      }

      // Method 2: Look for elements with specific classes that might contain org names
      const possibleOrgElements = subOrg.querySelectorAll(
        ".org-title, .organization-name, .org-header, strong, b"
      );
      for (const element of possibleOrgElements) {
        const text = element.textContent?.trim();
        if (
          text &&
          text.length > 2 &&
          !text.includes("Position") &&
          !text.includes("Name")
        ) {
          return text;
        }
      }

      // Method 3: Look for any text content in div elements that might be organization names
      const divElements = subOrg.querySelectorAll("div");
      for (const div of divElements) {
        // Only check divs that have direct text content (not nested elements)
        const directText = Array.from(div.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent.trim())
          .join(" ")
          .trim();

        if (
          directText &&
          directText.length > 2 &&
          !directText.toLowerCase().includes("position") &&
          !directText.toLowerCase().includes("name")
        ) {
          return directText;
        }
      }

      // Method 4: Look at the previous sibling elements for organization headers
      let previousElement = subOrg.previousElementSibling;
      while (previousElement) {
        const text = previousElement.textContent?.trim();
        if (text && text.length > 1) {
          return text;
        }
        previousElement = previousElement.previousElementSibling;
      }
    } catch (error) {
      console.log("LCR Tools: Error getting organization name:", error);
    }

    return "Unknown Organization";
  }

  /**
   * Filters members with multiple callings from the callings map
   */
  function filterMembersWithMultipleCallings(memberCallingsMap) {
    const membersWithMultipleCallings = [];
    memberCallingsMap.forEach((callings, memberName) => {
      if (callings.length > 1) {
        // Remove duplicate callings (same calling + organization)
        const uniqueCallings = callings.filter(
          (calling, index, arr) =>
            index ===
            arr.findIndex(
              (c) =>
                c.calling === calling.calling &&
                c.organization === calling.organization
            )
        );

        if (uniqueCallings.length > 1) {
          membersWithMultipleCallings.push({
            name: memberName,
            callings: uniqueCallings,
            count: uniqueCallings.length,
          });
        }
      }
    });

    // Sort by name
    membersWithMultipleCallings.sort((a, b) => a.name.localeCompare(b.name));

    console.log(
      `LCR Tools: Found ${membersWithMultipleCallings.length} members with multiple callings.`
    );
    return membersWithMultipleCallings;
  }

  /**
   * Basic filtering for standard table - only removes exact duplicates
   */
  function filterMembersWithMultipleCallingsBasic(memberCallingsMap) {
    const membersWithMultipleCallings = [];
    memberCallingsMap.forEach((callings, memberName) => {
      if (callings.length > 1) {
        // Remove only exact duplicates (same calling + organization)
        const uniqueCallings = callings.filter(
          (calling, index, arr) =>
            index ===
            arr.findIndex(
              (c) =>
                c.calling === calling.calling &&
                c.organization === calling.organization
            )
        );

        if (uniqueCallings.length > 1) {
          membersWithMultipleCallings.push({
            name: memberName,
            callings: uniqueCallings,
            count: uniqueCallings.length,
          });
        }
      }
    });

    // Sort by name
    membersWithMultipleCallings.sort((a, b) => a.name.localeCompare(b.name));

    console.log(
      `LCR Tools: Found ${membersWithMultipleCallings.length} members with multiple callings.`
    );
    return membersWithMultipleCallings;
  }

  /**
   * Cleans calling text by removing asterisks and other unwanted formatting
   */
  function cleanCallingText(text) {
    return text
      .replace(/\*+/g, "") // Remove asterisks
      .replace(/^\s*\*\s*/, "") // Remove leading asterisks with spaces
      .replace(/\s*\*\s*$/, "") // Remove trailing asterisks with spaces
      .trim();
  }

  /**
   * Filters out redundant callings for a member (grouped view only)
   */
  function filterRedundantCallings(callings) {
    // Remove exact duplicates
    const uniqueCallings = callings.filter(
      (calling, index, arr) =>
        index ===
        arr.findIndex(
          (c) =>
            c.calling === calling.calling &&
            c.organization === calling.organization
        )
    );

    // Remove organizational duplicates (same calling in related organizations)
    const groupedCallings = [];
    const processedIndices = new Set();

    uniqueCallings.forEach((calling, index) => {
      if (processedIndices.has(index)) return;

      const similarCallings = [calling];

      // Look for the same calling in different but related organizations
      uniqueCallings.forEach((otherCalling, otherIndex) => {
        if (index === otherIndex || processedIndices.has(otherIndex)) return;

        if (calling.calling === otherCalling.calling) {
          const isDuplicate = areOrganizationalDuplicates(
            calling.organization,
            otherCalling.organization
          );

          if (isDuplicate) {
            similarCallings.push(otherCalling);
            processedIndices.add(otherIndex);
          }
        }
      });

      // Choose the best representative calling
      const bestCalling = chooseBestCalling(similarCallings);
      groupedCallings.push(bestCalling);
      processedIndices.add(index);
    });

    // Filter out redundant Aaronic Priesthood roles for Bishopric members
    return filterAaronicPriesthoodRedundancy(groupedCallings);
  }

  /**
   * Determines if two organizations represent duplicates
   */
  function areOrganizationalDuplicates(org1, org2) {
    if (org1 === org2) return true;

    // "Other Callings" vs specific organization
    if (
      (org1 === "Other Callings" && org2 !== "Other Callings") ||
      (org2 === "Other Callings" && org1 !== "Other Callings")
    ) {
      return true;
    }

    // Organization variations (presidency vs main organization)
    const organizationGroups = [
      ["Relief Society", "Relief Society Presidency"],
      ["Young Women", "Young Women Presidency"],
      ["Primary", "Primary Presidency"],
      ["Sunday School", "Sunday School Presidency"],
      ["Elders Quorum", "Elders Quorum Presidency"],
    ];

    return organizationGroups.some(
      (group) => group.includes(org1) && group.includes(org2)
    );
  }

  /**
   * Chooses the best representative calling from similar callings
   */
  function chooseBestCalling(callings) {
    if (callings.length === 1) return callings[0];

    // Prefer non-"Other Callings" organizations
    const nonOtherCallings = callings.filter(
      (c) => c.organization !== "Other Callings"
    );

    if (nonOtherCallings.length > 0) {
      // Prefer specific organizations over presidency organizations
      const specificOrgs = nonOtherCallings.filter(
        (c) => !c.organization.includes("Presidency")
      );
      return specificOrgs.length > 0 ? specificOrgs[0] : nonOtherCallings[0];
    }

    return callings[0];
  }

  /**
   * Filters out redundant Aaronic Priesthood roles for Bishopric members
   */
  function filterAaronicPriesthoodRedundancy(callings) {
    const bishopricRoles = ["Bishop", "First Counselor", "Second Counselor"];
    const hasBishopricRole = callings.some((calling) =>
      bishopricRoles.some((role) => calling.calling.includes(role))
    );

    if (!hasBishopricRole) return callings;

    // Check if this person is the Bishop
    const isBishop = callings.some(
      (calling) =>
        calling.calling.includes("Bishop") &&
        !calling.calling.includes("Counselor")
    );

    const aaronicPriesthoodOrgs = [
      "Aaronic Priesthood",
      "Aaronic Priesthood Quorums",
      "Presidency of the Aaronic Priesthood",
      "Priests Quorum",
      "Priests Quorum Presidency",
    ];

    return callings.filter((calling) => {
      const isAaronicPriesthoodOrg = aaronicPriesthoodOrgs.includes(
        calling.organization
      );
      const isBishopricCalling = bishopricRoles.some((role) =>
        calling.calling.includes(role)
      );

      // Filter out "Priests Quorum President" for Bishops
      if (isBishop && calling.calling.includes("Priests Quorum President")) {
        return false;
      }

      // Filter out bishopric callings in Aaronic Priesthood organizations
      if (isAaronicPriesthoodOrg && isBishopricCalling) {
        return false;
      }

      return true;
    });
  }

  // Make function globally available
  window.LCR_TOOLS_FIND_MULTIPLE_CALLINGS = LCR_TOOLS_FIND_MULTIPLE_CALLINGS;

  return { result: "success" };
})();
