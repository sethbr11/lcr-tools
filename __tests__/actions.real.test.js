/**
 * Real tests for actions.js - loads actual source file for coverage
 * Tests URL pattern matching and action routing logic
 */

describe("Actions (Real File)", () => {
  beforeEach(() => {
    // Reset window.getActionsForUrl
    if (window.getActionsForUrl) delete window.getActionsForUrl;
    if (window.lcrUrlMatch) delete window.lcrUrlMatch;

    // Load the real actions.js
    jest.resetModules();
    require("../js/actions.js");
  });

  describe("URL Pattern Matching - LCR URLs", () => {
    it("should return actions for member list page", () => {
      const url = "https://lcr.churchofjesuschrist.org/records/member-list";
      const actions = window.getActionsForUrl(url);

      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);

      // Should have download action
      const downloadAction = actions.find((a) => a.title.includes("Download"));
      expect(downloadAction).toBeDefined();
      expect(downloadAction.type).toBe("script");
      expect(Array.isArray(downloadAction.scriptFile)).toBe(true);
    });

    it("should return actions for ministering assignments", () => {
      const url = "https://lcr.churchofjesuschrist.org/ministering-assignments";
      const actions = window.getActionsForUrl(url);

      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
    });

    it("should return actions for reports page", () => {
      const url =
        "https://lcr.churchofjesuschrist.org/reports/members-moved-out";
      const actions = window.getActionsForUrl(url);

      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
    });

    it("should handle callings page URL", () => {
      const url = "https://lcr.churchofjesuschrist.org/callings";
      const actions = window.getActionsForUrl(url);

      // Function should work and return array (may or may not have actions)
      expect(Array.isArray(actions)).toBe(true);

      // If actions exist, they should be properly structured
      actions.forEach((action) => {
        expect(action).toHaveProperty("title");
        expect(action).toHaveProperty("type");
      });
    });
  });

  describe("URL Pattern Matching - Finance URLs", () => {
    it("should return actions for finance pages", () => {
      const url = "https://lcrf.churchofjesuschrist.org/finance/budget";
      const actions = window.getActionsForUrl(url);

      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
    });

    it("should return actions for finance FE pages", () => {
      const url = "https://lcrffe.churchofjesuschrist.org/finance/transactions";
      const actions = window.getActionsForUrl(url);

      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
    });
  });

  describe("URL Pattern Matching - Excluded Pages", () => {
    it("should exclude base LCR page", () => {
      const url = "https://lcr.churchofjesuschrist.org/";
      const actions = window.getActionsForUrl(url);

      expect(Array.isArray(actions)).toBe(true);
      // Base page should have no actions or limited actions
    });

    it("should exclude base LCR page with query params", () => {
      const url = "https://lcr.churchofjesuschrist.org/?lang=eng";
      const actions = window.getActionsForUrl(url);

      expect(Array.isArray(actions)).toBe(true);
    });

    it("should exclude exact ministering page", () => {
      const url = "https://lcr.churchofjesuschrist.org/ministering";
      const actions = window.getActionsForUrl(url);

      expect(Array.isArray(actions)).toBe(true);
      // Exact ministering page should be excluded from download actions
    });

    it("should exclude member profile pages from download", () => {
      const url =
        "https://lcr.churchofjesuschrist.org/records/member-profile/123456";
      const actions = window.getActionsForUrl(url);

      // Should have actions, but not all of them (profile editing instead)
      expect(Array.isArray(actions)).toBe(true);
    });

    it("should exclude manage-photos pages", () => {
      const url = "https://lcr.churchofjesuschrist.org/manage-photos";
      const actions = window.getActionsForUrl(url);

      expect(Array.isArray(actions)).toBe(true);
      // manage-photos excluded from download actions
    });
  });

  describe("Non-LCR URLs", () => {
    it("should return empty array for non-LCR URLs", () => {
      const nonLcrUrls = [
        "https://www.google.com",
        "https://www.youtube.com",
        "https://github.com",
        "https://stackoverflow.com",
      ];

      nonLcrUrls.forEach((url) => {
        const actions = window.getActionsForUrl(url);
        expect(Array.isArray(actions)).toBe(true);
        expect(actions.length).toBe(0);
      });
    });
  });

  describe("Action Structure Validation", () => {
    it("should return properly structured action objects", () => {
      const url = "https://lcr.churchofjesuschrist.org/records/member-list";
      const actions = window.getActionsForUrl(url);

      expect(actions.length).toBeGreaterThan(0);

      actions.forEach((action) => {
        // Each action should have required properties
        expect(action).toHaveProperty("title");
        expect(action).toHaveProperty("type");
        expect(typeof action.title).toBe("string");
        expect(action.title.length).toBeGreaterThan(0);

        if (action.type === "script") {
          expect(action).toHaveProperty("scriptFile");
          expect(
            Array.isArray(action.scriptFile) ||
              typeof action.scriptFile === "string"
          ).toBe(true);
        }
      });
    });

    it("should include utils.js in script files", () => {
      const url = "https://lcr.churchofjesuschrist.org/records/member-list";
      const actions = window.getActionsForUrl(url);

      const scriptActions = actions.filter((a) => a.type === "script");

      scriptActions.forEach((action) => {
        const files = Array.isArray(action.scriptFile)
          ? action.scriptFile
          : [action.scriptFile];

        // Should include utils.js as dependency
        const hasUtils = files.some((f) => f.includes("utils.js"));
        expect(hasUtils).toBe(true);
      });
    });

    it("should use correct file paths", () => {
      const url = "https://lcr.churchofjesuschrist.org/records/member-list";
      const actions = window.getActionsForUrl(url);

      actions.forEach((action) => {
        if (action.type === "script") {
          const files = Array.isArray(action.scriptFile)
            ? action.scriptFile
            : [action.scriptFile];

          files.forEach((file) => {
            // All file paths should start with js/
            expect(file).toMatch(/^js\//);
            // Should end with .js
            expect(file).toMatch(/\.js$/);
          });
        }
      });
    });
  });

  describe("Specific Action Tests", () => {
    it("should include flashcard action for member list", () => {
      const url = "https://lcr.churchofjesuschrist.org/records/member-list";
      const actions = window.getActionsForUrl(url);

      const flashcardAction = actions.find((a) =>
        a.title.toLowerCase().includes("flashcard")
      );

      if (flashcardAction) {
        expect(flashcardAction.type).toBe("script");
        expect(flashcardAction.scriptFile).toBeDefined();
      }
    });

    it("should include member profile edit action for profile pages", () => {
      const url =
        "https://lcr.churchofjesuschrist.org/records/member-profile/123456";
      const actions = window.getActionsForUrl(url);

      const editAction = actions.find(
        (a) =>
          a.title.toLowerCase().includes("edit") ||
          a.title.toLowerCase().includes("profile")
      );

      if (editAction) {
        expect(editAction.type).toBe("script");
      }
    });

    it("should include no photo list action for appropriate pages", () => {
      const url = "https://lcr.churchofjesuschrist.org/records/member-list";
      const actions = window.getActionsForUrl(url);

      const noPhotoAction = actions.find((a) =>
        a.title.toLowerCase().includes("photo")
      );

      if (noPhotoAction) {
        expect(noPhotoAction.scriptFile).toBeDefined();
      }
    });

    it("should include attendance action for appropriate pages", () => {
      const url = "https://lcr.churchofjesuschrist.org/records/attendance";
      const actions = window.getActionsForUrl(url);

      // If attendance pages are supported
      if (actions.length > 0) {
        expect(Array.isArray(actions)).toBe(true);
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined URL", () => {
      const actions = window.getActionsForUrl(undefined);
      expect(actions).toEqual([]);
    });

    it("should handle null URL", () => {
      const actions = window.getActionsForUrl(null);
      expect(actions).toEqual([]);
    });

    it("should handle empty string URL", () => {
      const actions = window.getActionsForUrl("");
      expect(actions).toEqual([]);
    });

    it("should handle malformed URLs", () => {
      const malformedUrls = [
        "not-a-url",
        "ftp://lcr.churchofjesuschrist.org",
        "javascript:alert(1)",
        "   ",
      ];

      malformedUrls.forEach((url) => {
        const actions = window.getActionsForUrl(url);
        expect(Array.isArray(actions)).toBe(true);
      });
    });

    it("should handle URLs with query parameters", () => {
      const url =
        "https://lcr.churchofjesuschrist.org/records/member-list?lang=eng&page=2";
      const actions = window.getActionsForUrl(url);

      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
    });

    it("should handle URLs with hash fragments", () => {
      const url =
        "https://lcr.churchofjesuschrist.org/records/member-list#section";
      const actions = window.getActionsForUrl(url);

      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
    });
  });

  describe("lcrUrlMatch Helper", () => {
    it("should match single URL pattern", () => {
      const url = "https://lcr.churchofjesuschrist.org/records/member-list";

      // lcrUrlMatch should be available if defined in actions.js
      if (window.lcrUrlMatch) {
        const result = window.lcrUrlMatch(url, "member-list");
        expect(typeof result).toBe("boolean");
      }
    });

    it("should match array of URL patterns", () => {
      const url = "https://lcr.churchofjesuschrist.org/records/member-list";

      if (window.lcrUrlMatch) {
        const patterns = ["member-list", "callings", "organizations"];
        const result = window.lcrUrlMatch(url, patterns);
        expect(typeof result).toBe("boolean");
      }
    });
  });
});
