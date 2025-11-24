/**
 * Unit tests for directory.js
 */

// CRITICAL: Restore real querySelector/querySelectorAll for this test suite
const realQuerySelector = Document.prototype.querySelector;
const realQuerySelectorAll = Document.prototype.querySelectorAll;
document.querySelector = realQuerySelector.bind(document);
document.querySelectorAll = realQuerySelectorAll.bind(document);

// Mock ACTION_METADATA before loading directory.js
window.ACTION_METADATA = [
  {
    title: "Export Members",
    category: "Data Export",
    description: "Export member data to CSV",
    directoryPages: [
      { name: "Members", url: "https://example.com/members" },
      { name: "Households" },
    ],
    directoryExcluded: ["Ministering"],
  },
  {
    title: "Process Attendance",
    category: "Attendance",
    description: "Process attendance records",
    directoryPages: [{ name: "Attendance", url: "https://example.com/attendance" }],
    directoryExcluded: [],
  },
  {
    title: "Download Report",
    category: "Data Export",
    description: "Download reports in various formats",
    directoryPages: [{ name: "Reports" }],
    directoryExcluded: ["Members"],
  },
];

require("../../js/directory.js");

describe("Directory Utilities", () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = "";
  });

  describe("createActionCard", () => {
    it("should create action card with basic info", () => {
      const action = {
        title: "Test Action",
        description: "Test description",
        availableOn: [{ name: "Test Page" }],
        excludedPages: [],
      };

      const card = window.directoryUtils.createActionCard(action);

      expect(card.className).toBe("action-card");
      expect(card.textContent).toContain("Test Action");
      expect(card.textContent).toContain("Test description");
      expect(card.textContent).toContain("Available on:");
      expect(card.textContent).toContain("Test Page");
    });

    it("should create clickable links for pages with URLs", () => {
      const action = {
        title: "Test Action",
        description: "Test description",
        availableOn: [
          { name: "Page 1", url: "https://example.com/page1" },
          { name: "Page 2", url: "https://example.com/page2" },
        ],
        excludedPages: [],
      };

      const card = window.directoryUtils.createActionCard(action);
      const links = card.querySelectorAll("a.page-link");

      expect(links.length).toBe(2);
      expect(links[0].href).toBe("https://example.com/page1");
      expect(links[0].target).toBe("_blank");
      expect(links[0].textContent.trim()).toContain("Page 1");
      expect(links[1].href).toBe("https://example.com/page2");
    });

    it("should create text spans for pages without URLs", () => {
      const action = {
        title: "Test Action",
        description: "Test description",
        availableOn: [{ name: "Page Without URL" }],
        excludedPages: [],
      };

      const card = window.directoryUtils.createActionCard(action);
      const textSpan = card.querySelector("span.page-text");

      expect(textSpan).not.toBeNull();
      expect(textSpan.textContent).toBe("Page Without URL");
    });

    it("should show excluded pages section when present", () => {
      const action = {
        title: "Test Action",
        description: "Test description",
        availableOn: [{ name: "Test Page" }],
        excludedPages: ["Excluded 1", "Excluded 2"],
      };

      const card = window.directoryUtils.createActionCard(action);

      expect(card.textContent).toContain("Not available on:");
      expect(card.textContent).toContain("Excluded 1, Excluded 2");
    });

    it("should not show excluded pages section when empty", () => {
      const action = {
        title: "Test Action",
        description: "Test description",
        availableOn: [{ name: "Test Page" }],
        excludedPages: [],
      };

      const card = window.directoryUtils.createActionCard(action);

      expect(card.textContent).not.toContain("Not available on:");
    });
  });

  describe("filterActions", () => {
    const actions = [
      {
        title: "Export Members",
        category: "Data Export",
        description: "Export member data",
      },
      {
        title: "Process Attendance",
        category: "Attendance",
        description: "Process attendance records",
      },
      {
        title: "Download Report",
        category: "Data Export",
        description: "Download reports",
      },
    ];

    it("should return all actions when no filters applied", () => {
      const result = window.directoryUtils.filterActions(actions, "", "all");
      expect(result.length).toBe(3);
    });

    it("should filter by category", () => {
      const result = window.directoryUtils.filterActions(
        actions,
        "",
        "Data Export"
      );
      expect(result.length).toBe(2);
      expect(result[0].title).toBe("Export Members");
      expect(result[1].title).toBe("Download Report");
    });

    it("should filter by search query in title", () => {
      const result = window.directoryUtils.filterActions(
        actions,
        "attendance",
        "all"
      );
      expect(result.length).toBe(1);
      expect(result[0].title).toBe("Process Attendance");
    });

    it("should filter by search query in description", () => {
      const result = window.directoryUtils.filterActions(
        actions,
        "export",
        "all"
      );
      expect(result.length).toBe(1);
      expect(result[0].title).toBe("Export Members");
    });

    it("should combine category and search filters", () => {
      const result = window.directoryUtils.filterActions(
        actions,
        "report",
        "Data Export"
      );
      expect(result.length).toBe(1);
      expect(result[0].title).toBe("Download Report");
    });

    it("should return empty array when no matches", () => {
      const result = window.directoryUtils.filterActions(
        actions,
        "nonexistent",
        "all"
      );
      expect(result.length).toBe(0);
    });

    it("should be case insensitive", () => {
      const result = window.directoryUtils.filterActions(
        actions,
        "attendance", // Search query should be lowercased by caller
        "all"
      );
      expect(result.length).toBe(1);
      expect(result[0].title).toBe("Process Attendance");
    });
  });

  describe("groupActionsByCategory", () => {
    it("should group actions by category", () => {
      const actions = [
        { title: "Action 1", category: "Category A" },
        { title: "Action 2", category: "Category B" },
        { title: "Action 3", category: "Category A" },
      ];

      const result = window.directoryUtils.groupActionsByCategory(actions);

      expect(Object.keys(result).length).toBe(2);
      expect(result["Category A"].length).toBe(2);
      expect(result["Category B"].length).toBe(1);
      expect(result["Category A"][0].title).toBe("Action 1");
      expect(result["Category A"][1].title).toBe("Action 3");
    });

    it("should handle empty array", () => {
      const result = window.directoryUtils.groupActionsByCategory([]);
      expect(Object.keys(result).length).toBe(0);
    });

    it("should handle single category", () => {
      const actions = [
        { title: "Action 1", category: "Category A" },
        { title: "Action 2", category: "Category A" },
      ];

      const result = window.directoryUtils.groupActionsByCategory(actions);

      expect(Object.keys(result).length).toBe(1);
      expect(result["Category A"].length).toBe(2);
    });
  });

  describe("renderActionsToDOM", () => {
    let directoryList;
    let mockCreateCard;

    beforeEach(() => {
      directoryList = document.createElement("div");
      directoryList.id = "directory-list";
      document.body.appendChild(directoryList);

      mockCreateCard = jest.fn((action) => {
        const card = document.createElement("div");
        card.className = "action-card";
        card.textContent = action.title;
        return card;
      });
    });

    it("should render actions grouped by category", () => {
      const actions = [
        { title: "Action 1", category: "Category A" },
        { title: "Action 2", category: "Category B" },
        { title: "Action 3", category: "Category A" },
      ];

      window.directoryUtils.renderActionsToDOM(
        directoryList,
        actions,
        mockCreateCard
      );

      const sectionHeaders = directoryList.querySelectorAll(".section-header");
      const actionCards = directoryList.querySelectorAll(".action-card");

      expect(sectionHeaders.length).toBe(2);
      expect(actionCards.length).toBe(3);
      expect(mockCreateCard).toHaveBeenCalledTimes(3);
    });

    it("should show no results message when no actions", () => {
      window.directoryUtils.renderActionsToDOM(directoryList, [], mockCreateCard);

      const noResults = directoryList.querySelector(".no-results-message");
      expect(noResults).not.toBeNull();
      expect(noResults.textContent).toContain("No actions found");
      expect(mockCreateCard).not.toHaveBeenCalled();
    });

    it("should clear previous content before rendering", () => {
      directoryList.innerHTML = "<div>Previous content</div>";

      const actions = [{ title: "Action 1", category: "Category A" }];

      window.directoryUtils.renderActionsToDOM(
        directoryList,
        actions,
        mockCreateCard
      );

      expect(directoryList.textContent).not.toContain("Previous content");
      expect(directoryList.querySelectorAll(".action-card").length).toBe(1);
    });

    it("should render section headers for each category", () => {
      const actions = [
        { title: "Action 1", category: "Data Export" },
        { title: "Action 2", category: "Attendance" },
      ];

      window.directoryUtils.renderActionsToDOM(
        directoryList,
        actions,
        mockCreateCard
      );

      const headers = Array.from(
        directoryList.querySelectorAll(".section-header")
      ).map((h) => h.textContent);

      expect(headers).toContain("Data Export");
      expect(headers).toContain("Attendance");
    });
  });
});
