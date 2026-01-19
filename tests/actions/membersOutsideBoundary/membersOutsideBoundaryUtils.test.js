/**
 * @jest-environment jsdom
 */

// Mock dependencies
global.utils = {
  returnIfLoaded: jest.fn(),
  ensureLoaded: jest.fn(),
  replaceTemplate: jest.fn((tmpl, data) => {
    // Basic replacement for testing
    let res = tmpl;
    for (const [k, v] of Object.entries(data || {})) {
      res = res.replace(`{{${k}}}`, v);
    }
    return res;
  }),
};

global.uiUtils = {
  showConfirmationModal: jest.fn(),
  showLoadingIndicator: jest.fn(),
  hideLoadingIndicator: jest.fn(),
};

global.modalUtils = {
  createStandardModal: jest.fn(),
};

global.fileUtils = {
  downloadCsv: jest.fn(),
  formatCsvCell: jest.fn((x) => x),
};

global.MapsService = {
  getLocation: jest.fn(),
  getLocationExtent: jest.fn(),
  getLocationsOverlay: jest.fn(),
};

// Mock SessionStorage
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, "sessionStorage", { value: sessionStorageMock });

// Mock Window Properties
const originalLocation = window.location;
delete window.location;
window.location = { reload: jest.fn(), pathname: "/maps/12345" };

// Mock Templates
window.membersOutsideBoundaryTemplates = {
  resultsModalStructure: "<div>Inside: {{insideCount}}, Outside: {{outsideCount}}</div>",
  listItem: "<div>{{name}} - {{status}}</div>",
  reasonBadge: "<span>{{reason}}</span>",
  emptyState: "Empty",
};

// Mock Canvas
const mockContext = {
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({
    data: [0, 0, 0, 255], // Black pixel (Inside)
  })),
};
HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext);

// Mock Image
global.Image = class {
  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 10);
  }
};

// Load the file under test
require("../../../js/actions/membersOutsideBoundary/membersOutsideBoundaryUtils.js");

describe("membersOutsideBoundaryUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorageMock.clear();
    window.location.reload.mockClear();
    global.fetch.mockReset();
    global.MapsService.getLocation.mockReset();
    global.MapsService.getLocationExtent.mockReset();
    global.MapsService.getLocationsOverlay.mockReset();
    
    // Reset mock implementation for confirm/prompt
    global.confirm.mockReset();
    global.prompt.mockReset();
    
    // Default fetch behavior
    global.fetch.mockResolvedValue({
      clone: () => ({
        json: async () => ({}),
      }),
      json: async () => ({}),
    });
  });

  describe("triggerAudit", () => {
    test("should prompt user and reload page on confirmation (uiUtils)", async () => {
      uiUtils.showConfirmationModal.mockResolvedValue(true);
      await window.membersOutsideBoundaryUtils.triggerAudit();
      expect(uiUtils.showConfirmationModal).toHaveBeenCalled();
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        "LCR_AUDIT_PENDING",
        "true"
      );
      expect(window.location.reload).toHaveBeenCalled();
    });

    test("should not reload if user cancels (uiUtils)", async () => {
      uiUtils.showConfirmationModal.mockResolvedValue(false);
      await window.membersOutsideBoundaryUtils.triggerAudit();
      expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
      expect(window.location.reload).not.toHaveBeenCalled();
    });

    test("should prevent double-triggering", async () => {
      sessionStorageMock.setItem("LCR_AUDIT_PENDING", "true");
      await window.membersOutsideBoundaryUtils.triggerAudit();
      expect(uiUtils.showConfirmationModal).not.toHaveBeenCalled();
    });
  });

  describe("Audit Flow (init)", () => {
    test("should do nothing if LCR_AUDIT_PENDING is not set", () => {
      window.membersOutsideBoundaryUtils.init();
      // Should effectively return early. No real observable side-effect other than console log.
      // But we can check that it didn't intercept fetch if we could inspect it, 
      // but the interceptor is set globally.
      // We can verify that uiUtils.showLoadingIndicator wasn't called.
      expect(uiUtils.showLoadingIndicator).not.toHaveBeenCalled();
    });

    test("should intercept fetch and process data if LCR_AUDIT_PENDING is set", async () => {
      jest.useFakeTimers();
      sessionStorageMock.setItem("LCR_AUDIT_PENDING", "true");

      // Setup the fetch mock response BEFORE init() captures it
      const mockMembers = [
        { name: "Family A", latitude: 10, longitude: 10 },
        { name: "Family B", latitude: 20, longitude: 20 },
      ];
      
      const mockResponse = {
        clone: () => ({
          json: async () => ({ households: mockMembers, unit: { unitNo: "555" } }),
        }),
        json: async () => ({ households: mockMembers, unit: { unitNo: "555" } }),
        ok: true,
      };
      
      global.fetch.mockResolvedValue(mockResponse);

      // Re-init to trigger the active state and capture the mocked fetch
      window.membersOutsideBoundaryUtils.init();
      
      expect(uiUtils.showLoadingIndicator).toHaveBeenCalledWith(
        expect.stringContaining("Waiting"),
        expect.any(String)
      );
      
      // We need to call the INTERCEPTED fetch
      const interceptedFetch = window.fetch;
      await interceptedFetch({ url: "https://lcr.churchofjesuschrist.org/api/member-list" });

      // Allow the .then() block of the fetch to execute
      await Promise.resolve();
      await Promise.resolve();

      // Mock MapsService responses
      global.MapsService.getLocation.mockResolvedValue({ type: "WARD" });
      global.MapsService.getLocationExtent.mockResolvedValue({
        getNorthEast: () => ({ lat: () => 30, lng: () => 30 }),
        getSouthWest: () => ({ lat: () => 0, lng: () => 0 }),
      });
      global.MapsService.getLocationsOverlay.mockResolvedValue("blob:fake-image");

      // Advance timers to trigger the check inside waitForMapAndRun
      jest.advanceTimersByTime(1000);

      // Wait for the async logic in runAuditLogic to complete
      await Promise.resolve(); // getLocation
      await Promise.resolve(); // getLocationExtent
      await Promise.resolve(); // getLocationsOverlay
      await Promise.resolve(); // Image creation
      jest.advanceTimersByTime(20); // Image load timeout
      await Promise.resolve(); // Image onload promise
      await Promise.resolve(); // ctx.drawImage

      expect(global.MapsService.getLocation).toHaveBeenCalledWith("555");
      expect(mockContext.drawImage).toHaveBeenCalled();
      expect(mockContext.getImageData).toHaveBeenCalledTimes(2); // 2 families
      expect(modalUtils.createStandardModal).toHaveBeenCalled();
      
      // Cleanup
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith("LCR_AUDIT_PENDING");
      
      jest.useRealTimers();
    });
  });
});
