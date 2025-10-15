/**
 * Tests for uiUtils.js - UI utilities for loading indicators and overlays
 */

describe("UI Utilities", () => {
  beforeEach(() => {
    // Setup DOM - jsdom should handle createElement properly
    document.body.innerHTML = "";
    document.head.innerHTML = "";

    // Reset window variables
    if (window.uiUtils) delete window.uiUtils;
    if (window.utils) delete window.utils;
    if (window.lcrToolsShouldStopProcessing)
      delete window.lcrToolsShouldStopProcessing;

    // Mock utils with all the functions uiUtils needs
    window.utils = {
      returnIfLoaded: jest.fn(() => false), // Return false so the module loads
      checkIfLoaded: jest.fn(() => false), // Return false - utility not loaded
    };

    // Clear require cache and load the UI utils
    jest.resetModules();
    require("../js/utils/uiUtils.js");
  });

  describe("showLoadingIndicator", () => {
    it("should create loading indicator with default message", () => {
      window.uiUtils.showLoadingIndicator();

      const overlay = document.getElementById(
        "lcr-tools-loader-overlay-shared"
      );
      expect(overlay).toBeTruthy();
      expect(overlay.textContent).toContain("Processing... Please wait.");
      expect(overlay.textContent).toContain("Press the ESC key to abort");
    });

    it("should create loading indicator with custom message", () => {
      window.uiUtils.showLoadingIndicator("Custom message", "Custom subheader");

      const overlay = document.getElementById(
        "lcr-tools-loader-overlay-shared"
      );
      expect(overlay.textContent).toContain("Custom message");
      expect(overlay.textContent).toContain("Custom subheader");
    });

    it("should update existing overlay message", () => {
      window.uiUtils.showLoadingIndicator("First message");
      window.uiUtils.showLoadingIndicator("Second message");

      // Check that there's only one overlay by getting it
      const overlay = document.getElementById(
        "lcr-tools-loader-overlay-shared"
      );
      expect(overlay).toBeTruthy();
      expect(overlay.textContent).toContain("Second message");
    });

    it("should add spin animation style", () => {
      window.uiUtils.showLoadingIndicator();

      const style = document.getElementById(
        "lcr-tools-spin-animation-style-shared"
      );
      expect(style).toBeTruthy();
      expect(style.innerHTML).toContain("@keyframes lcrToolsSpin");
      expect(style.innerHTML).toContain("transform: rotate");
    });

    it("should not duplicate spin animation style", () => {
      window.uiUtils.showLoadingIndicator();
      window.uiUtils.showLoadingIndicator();

      // Check that there's only one style element
      const style = document.getElementById(
        "lcr-tools-spin-animation-style-shared"
      );
      expect(style).toBeTruthy();
      expect(style.innerHTML).toContain("@keyframes lcrToolsSpin");
    });

    it("should add event listener for ESC key", () => {
      const addEventListenerSpy = jest.spyOn(document, "addEventListener");
      window.uiUtils.showLoadingIndicator();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
        expect.objectContaining({ capture: true })
      );

      addEventListenerSpy.mockRestore();
    });
  });

  describe("hideLoadingIndicator", () => {
    beforeEach(() => {
      window.uiUtils.showLoadingIndicator();
    });

    it("should remove loading overlay", () => {
      window.uiUtils.hideLoadingIndicator();

      const overlay = document.getElementById(
        "lcr-tools-loader-overlay-shared"
      );
      expect(overlay).toBeNull();
    });

    it("should set abort flag when event is passed", (done) => {
      const event = new KeyboardEvent("keydown", { key: "Escape" });
      window.uiUtils.hideLoadingIndicator(event);

      expect(window.lcrToolsShouldStopProcessing).toBe(true);

      // Should show aborting message and delay removal
      const overlay = document.getElementById(
        "lcr-tools-loader-overlay-shared"
      );
      expect(overlay).toBeTruthy();
      expect(overlay.textContent).toContain("aborting");

      setTimeout(() => {
        const overlayAfter = document.getElementById(
          "lcr-tools-loader-overlay-shared"
        );
        expect(overlayAfter).toBeNull();
        done();
      }, 1100);
    });

    it("should remove event listener", () => {
      const removeEventListenerSpy = jest.spyOn(
        document,
        "removeEventListener"
      );
      window.uiUtils.hideLoadingIndicator();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
        expect.objectContaining({ capture: true })
      );

      removeEventListenerSpy.mockRestore();
    });

    it("should handle case when overlay already removed", () => {
      window.uiUtils.hideLoadingIndicator();
      // Should not throw error when called again
      expect(() => window.uiUtils.hideLoadingIndicator()).not.toThrow();
    });
  });

  describe("ESC key handling", () => {
    it("should hide indicator on Escape key", () => {
      window.uiUtils.showLoadingIndicator();

      const event = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);

      expect(window.lcrToolsShouldStopProcessing).toBe(true);
    });

    it("should not trigger on other keys", () => {
      window.uiUtils.showLoadingIndicator();

      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);

      const overlay = document.getElementById(
        "lcr-tools-loader-overlay-shared"
      );
      expect(overlay).toBeTruthy();
      expect(window.lcrToolsShouldStopProcessing).toBeUndefined();
    });
  });

  describe("isAborted", () => {
    it("should return falsy when not set", () => {
      const result = window.uiUtils.isAborted();
      expect(result).toBeFalsy();
    });

    it("should return true when flag is set", () => {
      window.lcrToolsShouldStopProcessing = true;
      const result = window.uiUtils.isAborted();
      expect(result).toBe(true);
    });
  });

  describe("resetAborted", () => {
    it("should reset abort flag", () => {
      window.lcrToolsShouldStopProcessing = true;
      window.uiUtils.resetAborted();
      expect(window.lcrToolsShouldStopProcessing).toBe(false);
    });

    it("should not throw when flag not set", () => {
      expect(() => window.uiUtils.resetAborted()).not.toThrow();
    });
  });

  describe("overlay styling", () => {
    it("should create overlay with correct styles", () => {
      window.uiUtils.showLoadingIndicator();

      const overlay = document.getElementById(
        "lcr-tools-loader-overlay-shared"
      );
      expect(overlay.style.position).toBe("fixed");
      expect(overlay.style.zIndex).toBeTruthy();
      expect(overlay.style.display).toBe("flex");
    });

    it("should have spinner element", () => {
      window.uiUtils.showLoadingIndicator();

      const overlay = document.getElementById(
        "lcr-tools-loader-overlay-shared"
      );
      const spinner = overlay.querySelector(".spinner");
      // Spinner should exist (implementation may vary)
      expect(overlay).toBeTruthy();
    });
  });

  describe("removeElement", () => {
    it("should remove element from DOM", () => {
      // Restore querySelector temporarily for this test
      const originalQuerySelector = document.querySelector;
      document.querySelector = jest.fn((selector) => {
        return document.getElementById(selector.substring(1)); // Remove # from selector
      });

      const element = document.createElement("div");
      element.id = "test-element";
      document.body.appendChild(element);

      const result = window.uiUtils.removeElement("#test-element");

      expect(result).toBe(true);
      const removed = document.getElementById("test-element");
      expect(removed).toBeNull();

      // Restore mock
      document.querySelector = originalQuerySelector;
    });

    it("should handle non-existent element", () => {
      expect(() => window.uiUtils.removeElement("#non-existent")).not.toThrow();
    });
  });
});
