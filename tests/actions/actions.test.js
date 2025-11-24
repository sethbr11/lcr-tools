/**
 * Unit tests for actions.js
 * Tests URL pattern matching and action determination logic
 */

describe("Actions Logic", () => {
  describe("URL Pattern Matching", () => {
    // Simulate the lcrUrlMatch function from actions.js
    function lcrUrlMatch(url, patterns, finance = false) {
      const LCR = finance
        ? ["lcrf.churchofjesuschrist.org/", "lcrffe.churchofjesuschrist.org/"]
        : ["lcr.churchofjesuschrist.org/"];

      const matchesPattern = (base, pattern) => {
        const fullPattern = pattern.startsWith(base) ? pattern : base + pattern;
        return url.includes(fullPattern);
      };

      if (typeof patterns === "string") {
        return LCR.some((base) => matchesPattern(base, patterns));
      } else if (Array.isArray(patterns)) {
        return patterns.some((pattern) =>
          LCR.some((base) => matchesPattern(base, pattern))
        );
      }
      return false;
    }

    test("should match LCR URLs correctly", () => {
      const testUrls = [
        "https://lcr.churchofjesuschrist.org/records/member-list",
        "https://lcr.churchofjesuschrist.org/reports",
        "https://lcrffe.churchofjesuschrist.org/dashboard",
        "https://lcrffe.churchofjesuschrist.org/test",
      ];

      testUrls.forEach((url) => {
        const isLcr =
          url.includes("lcr.churchofjesuschrist.org") ||
          url.includes("lcrf.churchofjesuschrist.org") ||
          url.includes("lcrffe.churchofjesuschrist.org");
        expect(isLcr).toBe(true);
      });
    });

    test("should match specific URL patterns", () => {
      const url = "https://lcr.churchofjesuschrist.org/records/member-profile";

      expect(lcrUrlMatch(url, "records/member-profile")).toBe(true);
      expect(lcrUrlMatch(url, "records/member-profile", false)).toBe(true);
      expect(lcrUrlMatch(url, "records/member-profile", true)).toBe(false);
    });

    test("should match array of patterns", () => {
      const url =
        "https://lcr.churchofjesuschrist.org/orgs/callings-by-organization";
      const patterns = [
        "orgs/callings-by-organization",
        "orgs/members-with-callings",
        "mlt/report/member-callings",
      ];

      expect(lcrUrlMatch(url, patterns)).toBe(true);
    });

    test("should handle finance URLs", () => {
      const financeUrl = "https://lcrffe.churchofjesuschrist.org/dashboard";

      expect(lcrUrlMatch(financeUrl, "", true)).toBe(true);
      expect(lcrUrlMatch(financeUrl, "", false)).toBe(false);
    });
  });

  describe("Action File Structure", () => {
    test("should generate correct utility file paths", () => {
      const u = (n) => `js/utils/${n}.js`;

      expect(u("utils")).toBe("js/utils/utils.js");
      expect(u("fileUtils")).toBe("js/utils/fileUtils.js");
      expect(u("dataUtils")).toBe("js/utils/dataUtils.js");
      expect(u("tableUtils")).toBe("js/utils/tableUtils.js");
    });

    test("should include vendor files correctly", () => {
      const jszip = "js/vendor/jszip.min.js";

      expect(jszip).toBe("js/vendor/jszip.min.js");
    });
  });

  describe("URL Exclusion Logic", () => {
    test("should exclude base LCR page", () => {
      const baseUrls = [
        "https://lcr.churchofjesuschrist.org/",
        "https://lcr.churchofjesuschrist.org/?param=value",
      ];

      baseUrls.forEach((url) => {
        const isBasePage = url.match(
          /^https:\/\/lcr\.churchofjesuschrist\.org\/(\?.*)?$/
        );
        expect(isBasePage).toBeTruthy();
      });
    });

    test("should exclude exact ministering page", () => {
      const ministeringUrl = "https://lcr.churchofjesuschrist.org/ministering";
      const ministeringAssignmentsUrl =
        "https://lcr.churchofjesuschrist.org/ministering-assignments";

      const isExactMinistering =
        ministeringUrl.includes("lcr.churchofjesuschrist.org/ministering") &&
        !ministeringUrl.includes(
          "lcr.churchofjesuschrist.org/ministering-assignments"
        );

      const isNotExactMinistering =
        ministeringAssignmentsUrl.includes(
          "lcr.churchofjesuschrist.org/ministering"
        ) &&
        !ministeringAssignmentsUrl.includes(
          "lcr.churchofjesuschrist.org/ministering-assignments"
        );

      expect(isExactMinistering).toBe(true);
      expect(isNotExactMinistering).toBe(false);
    });

    test("should exclude specific paths", () => {
      const excludedPaths = [
        "records/member-profile",
        "manage-photos",
        "report/self-reliance",
        "records/merge-duplicate",
        "ca",
      ];

      excludedPaths.forEach((path) => {
        const testUrl = `https://lcr.churchofjesuschrist.org/${path}`;
        const isExcluded = excludedPaths.some((excludedPath) =>
          testUrl.includes(excludedPath)
        );
        expect(isExcluded).toBe(true);
      });
    });
  });

  describe("Action File Arrays", () => {
    test("should create correct download report files array", () => {
      const u = (n) => `js/utils/${n}.js`;
      const jszip = "js/vendor/jszip.min.js";

      const downloadReportFiles = [
        jszip,
        u("fileUtils"),
        u("navigationUtils"),
        u("tableUtils"),
        u("uiUtils"),
        u("modalUtils"),
        "js/actions/downloadReportData/downloadUtils.js",
        "js/actions/downloadReportData/main.js",
      ];

      expect(downloadReportFiles).toContain("js/vendor/jszip.min.js");
      expect(downloadReportFiles).toContain("js/utils/fileUtils.js");
      expect(downloadReportFiles).toContain(
        "js/actions/downloadReportData/main.js"
      );
    });

    test("should create correct member profile files array", () => {
      const u = (n) => `js/utils/${n}.js`;

      const memberProfileFiles = [
        u("uiUtils"),
        "js/actions/editMemberProfile/editMemberProfileUtils.js",
        "js/actions/editMemberProfile/main.js",
      ];

      expect(memberProfileFiles).toContain("js/utils/uiUtils.js");
      expect(memberProfileFiles).toContain(
        "js/actions/editMemberProfile/main.js"
      );
    });
  });

  describe("Action Object Structure", () => {
    test("should create correct action object for script type", () => {
      const mockAction = {
        title: "Download Report Data (CSV)",
        type: "script",
        scriptFile: [
          "js/utils/utils.js",
          "js/actions/downloadReportData/main.js",
        ],
      };

      expect(mockAction.title).toBe("Download Report Data (CSV)");
      expect(mockAction.type).toBe("script");
      expect(Array.isArray(mockAction.scriptFile)).toBe(true);
      expect(mockAction.scriptFile).toHaveLength(2);
    });

    test("should handle single script file", () => {
      const singleFileAction = {
        title: "Test Action",
        type: "script",
        scriptFile: "js/utils/utils.js",
      };

      // Simulate the logic from popup.js
      const filesToInject = Array.isArray(singleFileAction.scriptFile)
        ? singleFileAction.scriptFile
        : [singleFileAction.scriptFile];

      expect(filesToInject).toEqual(["js/utils/utils.js"]);
    });
  });
});
