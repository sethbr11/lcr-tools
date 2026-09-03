/**
 * @jest-environment jsdom
 */

// Mock globals
global.utils = {
  returnIfLoaded: jest.fn(() => false),
  ensureLoaded: jest.fn(),
  replaceTemplate: jest.fn((template, data) => {
    let result = template;
    for (const key in data) {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), data[key]);
    }
    return result;
  }),
};

global.modalUtils = {
  showStatus: jest.fn(),
};

global.uiUtils = {
  sleepWithJitter: jest.fn().mockResolvedValue(true),
  isAborted: jest.fn().mockReturnValue(false),
  showLoadingIndicator: jest.fn(),
  hideLoadingIndicator: jest.fn(),
};

global.tableUtils = {};
global.dataUtils = {
  parseFullName: jest.fn((name) => {
    const parts = name.split(",").map((p) => p.trim());
    return { firstName: parts[1] || "", lastName: parts[0] || "" };
  }),
};

// Restore native jsdom querySelector and querySelectorAll which tests/setup.js stubs
document.querySelector = Document.prototype.querySelector;
document.querySelectorAll = Document.prototype.querySelectorAll;

require("../../../js/actions/processAttendance/utils/domUtils.js");

describe("attendanceDomUtils (Single Sunday & Single Class View)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  test("should identify month and class dropdowns correctly", () => {
    document.body.innerHTML = `
      <select id="class-select" class="eden-form-part-input__control">
        <option value="ALL">All Classes and Quorums</option>
        <option value="EQ">Elders Quorum</option>
        <option value="RS">Relief Society</option>
      </select>
      <select id="month-select" class="eden-form-part-input__control">
        <option value="0">July</option>
        <option value="1" selected>August</option>
        <option value="2">September</option>
      </select>
    `;

    const classSelect = window.attendanceDomUtils.getClassQuorumSelect();
    const monthSelect = window.attendanceDomUtils.getMonthSelect();
    expect(classSelect).not.toBeNull();
    expect(classSelect.id).toBe("class-select");
    expect(monthSelect).not.toBeNull();
    expect(monthSelect.id).toBe("month-select");

    const options = window.attendanceDomUtils.getClassQuorumOptions();
    expect(options).toHaveLength(3);
    expect(options[1].text).toBe("Elders Quorum");
    expect(options[1].value).toBe("EQ");
  });

  test("should detect two-hour split layout", () => {
    document.body.innerHTML = `
      <select class="eden-form-part-input__control">
        <option>August</option>
      </select>
      <button class="eden-button-bar__button">2 August</button>
      <button class="eden-button-bar__button">9 August</button>
    `;
    expect(window.attendanceDomUtils.isTwoHourSplitLayout()).toBe(true);
  });

  test("should set class/quorum dropdown value", async () => {
    document.body.innerHTML = `
      <select id="class-select" class="eden-form-part-input__control">
        <option value="ALL">All Classes and Quorums</option>
        <option value="EQ">Elders Quorum</option>
      </select>
    `;
    const changed = await window.attendanceDomUtils.setClassQuorum("EQ");
    expect(changed).toBe(true);
    const select = document.getElementById("class-select");
    expect(select.value).toBe("EQ");
  });

  test("should set class/quorum dropdown to ALL when starting on Elders Quorum", async () => {
    document.body.innerHTML = `
      <select id="class-select" class="eden-form-part-input__control">
        <option value="">All Classes and Quorums</option>
        <option value="EQ" selected>Elders Quorum</option>
      </select>
    `;
    const changed = await window.attendanceDomUtils.setClassQuorum("ALL");
    expect(changed).toBe(true);
    const select = document.getElementById("class-select");
    expect(select.value).toBe("");
  });

  test("should click matching single Sunday button", async () => {
    document.body.innerHTML = `
      <button id="btn-2aug" class="eden-button-bar__button">2 August</button>
      <button id="btn-9aug" class="eden-button-bar__button">9 August</button>
      <button id="btn-16aug" class="eden-button-bar__button">16 August</button>
    `;
    const btn = document.getElementById("btn-2aug");
    let clicked = false;
    btn.addEventListener("click", () => {
      clicked = true;
    });

    const result = await window.attendanceDomUtils.selectSundayView("2026-08-02");
    expect(result).toBe(true);
    expect(clicked).toBe(true);
  });

  test("should detect single class attendance button and present state", () => {
    document.body.innerHTML = `
      <table>
        <tbody>
          <tr role="row">
            <td>Tyler Ackley</td>
            <td>M</td>
            <td>
              <button class="useClassQuorumAttendanceMembers-module__qUZPeG__attendanceButton" aria-label="Tyler Ackley, 2026-08-02, Elders Quorum">
                <svg><path d="M12 22c5.523 0 10-4.477 10-10"></path></svg>
              </button>
            </td>
          </tr>
          <tr role="row" id="row-absent">
            <td>John Doe</td>
            <td>M</td>
            <td>
              <button class="useClassQuorumAttendanceMembers-module__qUZPeG__attendanceButton" aria-label="John Doe, 2026-08-02, Elders Quorum">
                <svg><path d="M12 3.5a8.5"></path></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    `;

    const rows = document.querySelectorAll("tr[role='row']");
    const btnPresent = window.attendanceDomUtils.getSingleClassAttendanceButton(rows[0]);
    const btnAbsent = window.attendanceDomUtils.getSingleClassAttendanceButton(rows[1]);

    expect(btnPresent).not.toBeNull();
    expect(btnAbsent).not.toBeNull();
    expect(window.attendanceDomUtils.isButtonPresent(btnPresent)).toBe(true);
    expect(window.attendanceDomUtils.isButtonPresent(btnAbsent)).toBe(false);
  });

  test("should identify both Sunday School and Class/Quorum buttons in All Classes view", () => {
    document.body.innerHTML = `
      <table>
        <tbody>
          <tr role="row">
            <td>Jane Doe</td>
            <td>F</td>
            <td>
              <button class="useClassQuorumAttendanceMembers-module__attendanceButton" aria-label="Jane Doe, 2026-08-02, Adult Sunday School">
                <svg><path d="M12 3.5a8.5"></path></svg>
              </button>
            </td>
            <td>
              <button class="useClassQuorumAttendanceMembers-module__attendanceButton" aria-label="Jane Doe, 2026-08-02, Relief Society">
                <svg><path d="M12 22c5.523"></path></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    `;

    const row = document.querySelector("tr[role='row']");
    const buttons = window.attendanceDomUtils.getRowAttendanceButtons(row);

    expect(buttons.sundaySchool).not.toBeNull();
    expect(buttons.classQuorum).not.toBeNull();
    expect(buttons.sundaySchool.getAttribute("aria-label")).toContain("Adult Sunday School");
    expect(buttons.classQuorum.getAttribute("aria-label")).toContain("Relief Society");

    expect(window.attendanceDomUtils.isButtonPresent(buttons.sundaySchool)).toBe(false);
    expect(window.attendanceDomUtils.isButtonPresent(buttons.classQuorum)).toBe(true);
  });

  test("should map visitor categories to appropriate class/quorum dropdown options", () => {
    require("../../../js/actions/processAttendance/utils/guestLogic.js");

    document.body.innerHTML = `
      <select id="class-select">
        <option value="ALL">All Classes and Quorums</option>
        <option value="EQ">Elders Quorum</option>
        <option value="RS">Relief Society</option>
        <option value="PQ">Priests Quorum</option>
        <option value="GOL">Gatherers of Light</option>
        <option value="V10">Valiant 10</option>
      </select>
    `;

    const select = document.getElementById("class-select");
    const { findOrgOptionForCategory } = window.attendanceGuestLogic;

    const optM = findOrgOptionForCategory(select, "M");
    expect(optM).not.toBeNull();
    expect(optM.value).toBe("EQ");

    const optF = findOrgOptionForCategory(select, "F");
    expect(optF).not.toBeNull();
    expect(optF.value).toBe("RS");

    const optYM = findOrgOptionForCategory(select, "YM");
    expect(optYM).not.toBeNull();
    expect(optYM.value).toBe("PQ");

    const optYW = findOrgOptionForCategory(select, "YW");
    expect(optYW).not.toBeNull();
    expect(optYW.value).toBe("GOL");

    const optC = findOrgOptionForCategory(select, "C");
    expect(optC).not.toBeNull();
    expect(optC.value).toBe("V10");
  });

  test("should reset dropdown to All Classes and Quorums on Visitors tab", async () => {
    document.body.innerHTML = `
      <select id="select-class">
        <option value="ALL">All Classes and Quorums</option>
        <option value="EQ" selected>Elders Quorum</option>
      </select>
    `;

    const logger = { logAction: jest.fn(), logError: jest.fn(), logModification: jest.fn(), logUserAction: jest.fn() };
    const handler = new window.attendanceGuestLogic.GuestAttendanceHandler(logger, "2026-08-02", 0);
    await handler.resetVisitorsToAllClasses();

    const select = document.getElementById("select-class");
    expect(select.value).toBe("ALL");
  });

  test("should resolve target buttons based on meetingSplit", () => {
    const table = document.createElement("table");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><button aria-label="John Doe, Sunday School">SS</button></td>
      <td><button aria-label="John Doe, Elders Quorum">EQ</button></td>
    `;
    table.appendChild(tr);

    const both = window.attendanceDomUtils.resolveTargetButtons(tr, "BOTH");
    expect(both).toHaveLength(2);

    const first = window.attendanceDomUtils.resolveTargetButtons(tr, "FIRST_HALF");
    expect(first).toHaveLength(1);
    expect(first[0].textContent).toBe("SS");

    const second = window.attendanceDomUtils.resolveTargetButtons(tr, "SECOND_HALF");
    expect(second).toHaveLength(1);
    expect(second[0].textContent).toBe("EQ");
  });

  test("should set native input value and dispatch events", async () => {
    const input = document.createElement("input");
    input.value = "10";
    let inputFired = false;
    let changeFired = false;
    input.addEventListener("input", () => { inputFired = true; });
    input.addEventListener("change", () => { changeFired = true; });

    await window.attendanceDomUtils.setNativeInputValue(input, 25);
    expect(input.value).toBe("25");
    expect(inputFired).toBe(true);
    expect(changeFired).toBe(true);
  });
});


