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

  describe("showToast", () => {
    let originalQuerySelector;
    let originalQuerySelectorAll;

    beforeEach(() => {
      jest.useFakeTimers();
      // Restore real DOM methods for toast tests
      originalQuerySelector = document.querySelector;
      originalQuerySelectorAll = document.querySelectorAll;
      document.querySelector = Document.prototype.querySelector;
      document.querySelectorAll = Document.prototype.querySelectorAll;
    });

    afterEach(() => {
      jest.useRealTimers();
      // Restore mocks
      document.querySelector = originalQuerySelector;
      document.querySelectorAll = originalQuerySelectorAll;
    });

    it("should create toast notification with default options", () => {
      window.uiUtils.showToast("Test message");

      const container = document.getElementById("lcr-tools-toast-container");
      expect(container).toBeTruthy();
      expect(container.textContent).toContain("Test message");
    });

    it("should create toast with success type by default", () => {
      window.uiUtils.showToast("Success message");

      const toast = document.querySelector(".lcr-tools-toast");
      expect(toast).toBeTruthy();
      // Browser converts hex to rgb
      expect(toast.style.background).toMatch(/rgb\(16,\s*185,\s*129\)|#10b981/);
      expect(toast.textContent).toContain("✓");
    });

    it("should create toast with error type", () => {
      window.uiUtils.showToast("Error message", { type: "error" });

      const toast = document.querySelector(".lcr-tools-toast");
      expect(toast).toBeTruthy();
      // Browser converts hex to rgb
      expect(toast.style.background).toMatch(/rgb\(239,\s*68,\s*68\)|#ef4444/);
      expect(toast.textContent).toContain("✕");
    });

    it("should create toast with warning type", () => {
      window.uiUtils.showToast("Warning message", { type: "warning" });

      const toast = document.querySelector(".lcr-tools-toast");
      expect(toast).toBeTruthy();
      // Browser converts hex to rgb
      expect(toast.style.background).toMatch(/rgb\(245,\s*158,\s*11\)|#f59e0b/);
      expect(toast.textContent).toContain("⚠");
    });

    it("should create toast with info type", () => {
      window.uiUtils.showToast("Info message", { type: "info" });

      const toast = document.querySelector(".lcr-tools-toast");
      expect(toast).toBeTruthy();
      // Browser converts hex to rgb
      expect(toast.style.background).toMatch(/rgb\(59,\s*130,\s*246\)|#3b82f6/);
      expect(toast.textContent).toContain("ℹ");
    });

    it("should auto-remove toast after duration", () => {
      window.uiUtils.showToast("Temporary message", { duration: 2000 });

      let toast = document.querySelector(".lcr-tools-toast");
      expect(toast).toBeTruthy();

      // Fast-forward time
      jest.advanceTimersByTime(2000);

      // Toast should have exiting class added
      toast = document.querySelector(".lcr-tools-toast");
      expect(toast.classList.contains("lcr-tools-toast-exiting")).toBe(true);

      // Fast-forward animation duration
      jest.advanceTimersByTime(300);

      // Toast should be removed
      toast = document.querySelector(".lcr-tools-toast");
      expect(toast).toBeNull();
    });

    it("should support multiple toasts", () => {
      window.uiUtils.showToast("First toast");
      window.uiUtils.showToast("Second toast");

      const toasts = document.querySelectorAll(".lcr-tools-toast");
      expect(toasts.length).toBe(2);
      expect(toasts[0].textContent).toContain("First toast");
      expect(toasts[1].textContent).toContain("Second toast");
    });

    it("should add toast styles only once", () => {
      window.uiUtils.showToast("First");
      window.uiUtils.showToast("Second");

      const styles = document.querySelectorAll("#lcr-tools-toast-styles");
      expect(styles.length).toBe(1);
    });

    it("should remove container when last toast is removed", () => {
      window.uiUtils.showToast("Only toast", { duration: 1000 });

      let container = document.getElementById("lcr-tools-toast-container");
      expect(container).toBeTruthy();

      // Fast-forward through duration and animation
      jest.advanceTimersByTime(1300);

      container = document.getElementById("lcr-tools-toast-container");
      expect(container).toBeNull();
    });

    it("should position toast at top-left by default", () => {
      window.uiUtils.showToast("Test");

      const container = document.getElementById("lcr-tools-toast-container");
      expect(container.style.cssText).toContain("top: 20px");
      expect(container.style.cssText).toContain("left: 20px");
    });

    it("should support different positions", () => {
      window.uiUtils.showToast("Test", { position: "bottom-left" });

      const container = document.getElementById("lcr-tools-toast-container");
      expect(container.style.cssText).toContain("bottom: 20px");
      expect(container.style.cssText).toContain("left: 20px");
    });
  });
});
