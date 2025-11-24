/**
 * Unit tests for navigationUtils.js
 */

// Mock utils before loading module
window.utils = {
  returnIfLoaded: jest.fn(() => false),
};
window.alert = jest.fn();

// CRITICAL: Restore real querySelector/querySelectorAll for this test suite
// The global setup.js mocks these, but navigationUtils needs real DOM querying
const realQuerySelector = Document.prototype.querySelector;
const realQuerySelectorAll = Document.prototype.querySelectorAll;
document.querySelector = realQuerySelector.bind(document);
document.querySelectorAll = realQuerySelectorAll.bind(document);

require("../../js/utils/navigationUtils.js");

describe("Navigation Utilities", () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = "";

    // Reset mocks
    window.utils.returnIfLoaded.mockClear();
    window.alert.mockClear();
  });

  describe("isLastPage", () => {
    it("should return true if next page button is disabled", () => {
      document.body.innerHTML = `<button data-testid="next" disabled>Next</button>`;
      expect(window.navigationUtils.isLastPage()).toBe(true);
    });

    it("should return true if last page button is disabled", () => {
      document.body.innerHTML = `
        <button data-testid="last" class="disabled">Last</button>
      `;
      expect(window.navigationUtils.isLastPage()).toBe(true);
    });

    it("should return false if next page button is enabled", () => {
      document.body.innerHTML = `
        <button data-testid="next">Next</button>
      `;
      expect(window.navigationUtils.isLastPage()).toBe(false);
    });
  });

  describe("setSelectValue", () => {
    it("should set value and dispatch change event", () => {
      const select = document.createElement("select");
      select.innerHTML = `
        <option value="1">One</option>
        <option value="2">Two</option>
      `;
      document.body.appendChild(select);

      const changeSpy = jest.fn();
      select.addEventListener("change", changeSpy);

      const result = window.navigationUtils.setSelectValue(select, "2");

      expect(result).toBe(true);
      expect(select.value).toBe("2");
      expect(changeSpy).toHaveBeenCalled();
    });

    it("should return false if select element is null", () => {
      const result = window.navigationUtils.setSelectValue(null, "2");
      expect(result).toBe(false);
    });
  });

  describe("getNeeds", () => {
    it("should detect pagination need", () => {
      document.body.innerHTML = `
        <button data-testid="next">Next</button>
      `;
      const needs = window.navigationUtils.getNeeds();
      expect(needs).toContain("pagination");
    });

    it("should detect scroll need", () => {
      document.body.innerHTML = `
        <div infinite-scroll></div>
      `;
      const needs = window.navigationUtils.getNeeds();
      expect(needs).toContain("scroll");
    });

    it("should return empty array if no needs", () => {
      document.body.innerHTML = "<div>Just content</div>";
      const needs = window.navigationUtils.getNeeds();
      expect(needs).toEqual([]);
    });
  });

  describe("navigateToTab", () => {
    it("should click tab link if not active", async () => {
      document.body.innerHTML = `
        <li id="tab-li">
          <a id="tab-link">Tab</a>
        </li>
      `;
      const link = document.getElementById("tab-link");
      const clickSpy = jest.spyOn(link, "click");

      const result = await window.navigationUtils.navigateToTab({
        tabSelector: "#tab-li",
        linkSelector: "#tab-link",
        tabName: "Test Tab",
        delay: 0
      });

      expect(result).toBe(true);
      expect(clickSpy).toHaveBeenCalled();
    });

    it("should skip click if already active", async () => {
      document.body.innerHTML = `
        <li id="tab-li" class="active">
          <a id="tab-link">Tab</a>
        </li>
      `;
      const link = document.getElementById("tab-link");
      const clickSpy = jest.spyOn(link, "click");

      const result = await window.navigationUtils.navigateToTab({
        tabSelector: "#tab-li",
        linkSelector: "#tab-link",
        tabName: "Test Tab",
        delay: 0
      });

      expect(result).toBe(true);
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });
});
