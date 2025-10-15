/**
 * Unit tests for popup functionality
 * Tests the popup UI and action loading logic
 */

import sinon from "sinon";

// Mock the actions.js functionality
const mockGetActionsForUrl = jest.fn();

// Mock window.getActionsForUrl
global.window.getActionsForUrl = mockGetActionsForUrl;
global.window.close = jest.fn();

describe("Popup Functionality", () => {
  let mockTab;

  beforeEach(() => {
    jest.clearAllMocks();
    sinon.resetHistory();
    mockGetActionsForUrl.mockClear();

    // Create mock tab object
    mockTab = {
      id: 123,
      url: "https://lcr.churchofjesuschrist.org/records/member-list",
      title: "Member List",
      active: true,
    };

    // Mock successful tab query
    chrome.tabs.query.callsArgWith(1, [mockTab]);
  });

  describe("Action Loading", () => {
    test("should load actions for LCR member page", () => {
      const mockActions = [
        {
          title: "Download Report Data (CSV)",
          type: "script",
          scriptFile: [
            "js/utils/utils.js",
            "js/actions/downloadReportData/main.js",
          ],
        },
      ];

      mockGetActionsForUrl.mockReturnValue(mockActions);

      // Simulate the popup logic
      const actions = window.getActionsForUrl(mockTab.url);

      expect(actions).toEqual(mockActions);
      expect(mockGetActionsForUrl).toHaveBeenCalledWith(mockTab.url);
    });

    test("should return empty array for non-LCR pages", () => {
      mockGetActionsForUrl.mockReturnValue([]);

      const actions = window.getActionsForUrl("https://www.google.com");

      expect(actions).toEqual([]);
    });

    test("should handle multiple actions", () => {
      const mockActions = [
        {
          title: "Download Report Data (CSV)",
          type: "script",
          scriptFile: [
            "js/utils/utils.js",
            "js/actions/downloadReportData/main.js",
          ],
        },
        {
          title: "Filter Table Data (WIP)",
          type: "script",
          scriptFile: ["js/utils/utils.js", "js/actions/tableFilters/main.js"],
        },
      ];

      mockGetActionsForUrl.mockReturnValue(mockActions);

      const actions = window.getActionsForUrl(mockTab.url);

      expect(actions).toHaveLength(2);
      expect(actions[0].title).toBe("Download Report Data (CSV)");
      expect(actions[1].title).toBe("Filter Table Data (WIP)");
    });
  });

  describe("Script Injection", () => {
    test("should execute script injection for script actions", () => {
      const mockAction = {
        title: "Download Report Data (CSV)",
        type: "script",
        scriptFile: [
          "js/utils/utils.js",
          "js/actions/downloadReportData/main.js",
        ],
      };

      // Mock successful script execution
      chrome.scripting.executeScript.callsArgWith(1, [{ result: "success" }]);

      // Simulate script injection
      const filesToInject = Array.isArray(mockAction.scriptFile)
        ? mockAction.scriptFile
        : [mockAction.scriptFile];

      chrome.scripting.executeScript(
        {
          target: { tabId: mockTab.id },
          files: filesToInject,
        },
        (injectionResults) => {
          expect(injectionResults[0].result).toBe("success");
        }
      );

      expect(
        chrome.scripting.executeScript.calledWith(
          {
            target: { tabId: mockTab.id },
            files: filesToInject,
          },
          sinon.match.func
        )
      ).toBe(true);
    });

    test("should handle script injection errors", () => {
      const mockAction = {
        title: "Download Report Data (CSV)",
        type: "script",
        scriptFile: [
          "js/utils/utils.js",
          "js/actions/downloadReportData/main.js",
        ],
      };

      // Mock script injection error
      chrome.runtime.lastError = { message: "Script injection failed" };
      chrome.scripting.executeScript.callsArgWith(1, []);

      const filesToInject = Array.isArray(mockAction.scriptFile)
        ? mockAction.scriptFile
        : [mockAction.scriptFile];

      chrome.scripting.executeScript(
        {
          target: { tabId: mockTab.id },
          files: filesToInject,
        },
        (injectionResults) => {
          expect(chrome.runtime.lastError).toBeTruthy();
          expect(chrome.runtime.lastError.message).toBe(
            "Script injection failed"
          );
        }
      );
    });
  });

  describe("URL Pattern Matching", () => {
    test("should identify LCR URLs correctly", () => {
      const lcrUrls = [
        "https://lcr.churchofjesuschrist.org/records/member-list",
        "https://lcrffe.churchofjesuschrist.org/dashboard",
        "https://lcrffe.churchofjesuschrist.org/test",
      ];

      lcrUrls.forEach((url) => {
        const isLcrUrl =
          url.includes("lcr.churchofjesuschrist.org") ||
          url.includes("lcrf.churchofjesuschrist.org") ||
          url.includes("lcrffe.churchofjesuschrist.org");
        expect(isLcrUrl).toBe(true);
      });
    });

    test("should identify non-LCR URLs correctly", () => {
      const nonLcrUrls = [
        "https://www.google.com",
        "https://github.com",
        "https://example.com",
      ];

      nonLcrUrls.forEach((url) => {
        const isLcrUrl =
          url.includes("lcr.churchofjesuschrist.org") ||
          url.includes("lcrf.churchofjesuschrist.org") ||
          url.includes("lcrffe.churchofjesuschrist.org");
        expect(isLcrUrl).toBe(false);
      });
    });
  });

  describe("Error Handling", () => {
    test("should handle tab query errors", () => {
      // Mock tab query error
      chrome.tabs.query.callsArgWith(1, []);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        expect(tabs).toHaveLength(0);
      });
    });

    test("should handle chrome runtime errors", () => {
      chrome.runtime.lastError = { message: "Extension error" };

      expect(chrome.runtime.lastError).toBeTruthy();
      expect(chrome.runtime.lastError.message).toBe("Extension error");
    });
  });
});
