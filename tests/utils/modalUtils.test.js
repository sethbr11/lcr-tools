/**
 * Unit tests for modalUtils.js
 */

// Mock utils before loading module
window.utils = {
  returnIfLoaded: jest.fn(() => false),
};

// CRITICAL: Restore real querySelector/querySelectorAll for this test suite
// The global setup.js mocks these, but modalUtils needs real DOM querying
const realQuerySelector = Document.prototype.querySelector;
const realQuerySelectorAll = Document.prototype.querySelectorAll;
document.querySelector = realQuerySelector.bind(document);
document.querySelectorAll = realQuerySelectorAll.bind(document);

require("../../js/utils/modalUtils.js");

describe("Modal Utilities", () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = "";

    // Reset mocks
    window.utils.returnIfLoaded.mockClear();
  });

  describe("createStandardModal", () => {
    it("should create a modal with basic options", () => {
      window.modalUtils.createStandardModal({
        id: "test-modal",
        title: "Test Modal",
        content: "<p>Test content</p>",
      });

      const modal = document.getElementById("test-modal");
      expect(modal).not.toBeNull();
      expect(modal.textContent).toContain("Test Modal");
      expect(modal.textContent).toContain("Test content");
    });

    it("should create modal with alerts", () => {
      window.modalUtils.createStandardModal({
        id: "test-modal-alerts",
        title: "Test",
        content: "<p>Content</p>",
        alerts: [
          { type: "warning", message: "Warning message" },
          { type: "error", message: "Error message" },
          { type: "info", message: "Info message" },
          { type: "success", message: "Success message" },
        ],
      });

      const modal = document.getElementById("test-modal-alerts");
      expect(modal.textContent).toContain("Warning message");
      expect(modal.textContent).toContain("Error message");
      expect(modal.textContent).toContain("Info message");
      expect(modal.textContent).toContain("Success message");
    });

    it("should create modal with buttons", () => {
      const onClick = jest.fn();
      
      window.modalUtils.createStandardModal({
        id: "test-modal-buttons",
        title: "Test",
        content: "<p>Content</p>",
        buttons: [
          {
            text: "Primary",
            onClick,
            options: { id: "primary-btn", variant: "success" },
          },
          {
            text: "Secondary",
            onClick,
            options: { variant: "danger" },
          },
        ],
      });

      const primaryBtn = document.getElementById("primary-btn");
      expect(primaryBtn).not.toBeNull();
      expect(primaryBtn.textContent).toBe("Primary");

      primaryBtn.click();
      expect(onClick).toHaveBeenCalled();
    });

    it("should close modal when clicking close button", () => {
      window.modalUtils.createStandardModal({
        id: "test-modal-close",
        title: "Test",
        content: "<p>Content</p>",
      });

      const modal = document.getElementById("test-modal-close");
      expect(modal).not.toBeNull();

      // Find and click the close button (×)
      const closeButton = modal.querySelector("button");
      closeButton.click();

      expect(document.getElementById("test-modal-close")).toBeNull();
    });

    it("should close modal when clicking outside", () => {
      window.modalUtils.createStandardModal({
        id: "test-modal-outside",
        title: "Test",
        content: "<p>Content</p>",
      });

      const modal = document.getElementById("test-modal-outside");
      expect(modal).not.toBeNull();

      // Click on the modal overlay (not the content)
      modal.click();

      expect(document.getElementById("test-modal-outside")).toBeNull();
    });

    it("should call onClose callback when closed", () => {
      const onClose = jest.fn();

      window.modalUtils.createStandardModal({
        id: "test-modal-callback",
        title: "Test",
        content: "<p>Content</p>",
        onClose,
      });

      window.modalUtils.closeModal("test-modal-callback", onClose);

      expect(onClose).toHaveBeenCalled();
    });

    it("should replace existing modal with same ID", () => {
      window.modalUtils.createStandardModal({
        id: "test-modal-replace",
        title: "First",
        content: "<p>First content</p>",
      });

      window.modalUtils.createStandardModal({
        id: "test-modal-replace",
        title: "Second",
        content: "<p>Second content</p>",
      });

      const modal = document.getElementById("test-modal-replace");
      expect(modal.textContent).toContain("Second");
      expect(modal.textContent).not.toContain("First");
    });
  });

  describe("createSideModal", () => {
    it("should create a side modal on the right", () => {
      window.modalUtils.createSideModal({
        id: "test-side-modal-right",
        title: "Side Modal",
        content: "<p>Side content</p>",
        side: "right",
      });

      const modal = document.getElementById("test-side-modal-right");
      expect(modal).not.toBeNull();
      expect(modal.textContent).toContain("Side Modal");
      expect(modal.style.right).toBe("0px");
    });

    it("should create a side modal on the left", () => {
      window.modalUtils.createSideModal({
        id: "test-side-modal-left",
        title: "Side Modal",
        content: "<p>Side content</p>",
        side: "left",
      });

      const modal = document.getElementById("test-side-modal-left");
      expect(modal).not.toBeNull();
      expect(modal.style.left).toBe("0px");
    });

    it("should create side modal with custom width", () => {
      window.modalUtils.createSideModal({
        id: "test-side-modal-width",
        title: "Side Modal",
        content: "<p>Content</p>",
        width: "500px",
      });

      const modal = document.getElementById("test-side-modal-width");
      expect(modal.style.width).toBe("500px");
    });

    it("should create side modal with buttons", () => {
      const onClick = jest.fn();

      window.modalUtils.createSideModal({
        id: "test-side-modal-buttons",
        title: "Side Modal",
        content: "<p>Content</p>",
        buttons: [
          {
            text: "Action",
            onClick,
            options: { id: "side-action-btn" },
          },
        ],
      });

      const button = document.getElementById("side-action-btn");
      expect(button).not.toBeNull();
      button.click();
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe("closeModal", () => {
    it("should remove modal from DOM", () => {
      window.modalUtils.createStandardModal({
        id: "test-modal-remove",
        title: "Test",
        content: "<p>Content</p>",
      });

      expect(document.getElementById("test-modal-remove")).not.toBeNull();

      window.modalUtils.closeModal("test-modal-remove");

      expect(document.getElementById("test-modal-remove")).toBeNull();
    });

    it("should handle closing non-existent modal", () => {
      expect(() => {
        window.modalUtils.closeModal("non-existent-modal");
      }).not.toThrow();
    });

    it("should call onClose callback", () => {
      const onClose = jest.fn();

      window.modalUtils.createStandardModal({
        id: "test-modal-onclose",
        title: "Test",
        content: "<p>Content</p>",
      });

      window.modalUtils.closeModal("test-modal-onclose", onClose);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("showStatus", () => {
    it("should show success status message", () => {
      document.body.innerHTML = '<div id="status-element"></div>';

      window.modalUtils.showStatus(
        "status-element",
        "Success message",
        false,
        false
      );

      const statusElement = document.getElementById("status-element");
      expect(statusElement.style.display).toBe("block");
      expect(statusElement.textContent).toBe("Success message");
      expect(statusElement.style.backgroundColor).toBe("rgb(212, 237, 218)");
    });

    it("should show error status message", () => {
      document.body.innerHTML = '<div id="status-element"></div>';

      window.modalUtils.showStatus(
        "status-element",
        "Error message",
        true,
        false
      );

      const statusElement = document.getElementById("status-element");
      expect(statusElement.style.display).toBe("block");
      expect(statusElement.textContent).toBe("Error message");
      expect(statusElement.style.backgroundColor).toBe("rgb(248, 215, 218)");
    });

    it("should auto-hide status message after 3 seconds", (done) => {
      document.body.innerHTML = '<div id="status-element"></div>';

      window.modalUtils.showStatus("status-element", "Auto-hide message", false);

      const statusElement = document.getElementById("status-element");
      expect(statusElement.style.display).toBe("block");

      setTimeout(() => {
        expect(statusElement.style.display).toBe("none");
        done();
      }, 3100);
    });

    it("should handle non-existent element", () => {
      expect(() => {
        window.modalUtils.showStatus("non-existent", "Message", false);
      }).not.toThrow();
    });
  });

  describe("getSelectionState", () => {
    it("should return initial selection state", () => {
      const state = window.modalUtils.getSelectionState();
      expect(state.isSelectMode).toBe(false);
      expect(state.selectedItems).toBeInstanceOf(Set);
      expect(state.selectedItems.size).toBe(0);
    });
  });
});
