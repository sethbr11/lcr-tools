/**
 * @jest-environment jsdom
 */

// Mock dependencies
global.utils = {
  returnIfLoaded: jest.fn(),
  ensureLoaded: jest.fn(),
  sleep: jest.fn((ms) => new Promise((resolve) => setTimeout(resolve, ms))),
};

global.uiUtils = {
  showLoadingIndicator: jest.fn(),
  hideLoadingIndicator: jest.fn(),
  isAborted: jest.fn(() => false),
};

global.modalUtils = {
  createStandardModal: jest.fn((options) => {
    const div = document.createElement("div");
    div.id = options.id || "modal";
    div.innerHTML = options.content || "";
    document.body.appendChild(div);
  }),
  closeModal: jest.fn((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  }),
};

global.storageUtils = {
  getCacheSettings: jest.fn().mockResolvedValue({ enabled: true }),
  getPhotoCache: jest.fn().mockResolvedValue({}),
  updatePhotoCache: jest.fn().mockResolvedValue(),
};

global.lcrApiUtils = {
  fetchMemberCard: jest.fn(),
  processInBatches: jest.fn(
    async (items, batchSize, taskFn, onBatchProgress) => {
      for (let i = 0; i < items.length; i++) {
        await taskFn(items[i]);
      }
    },
  ),
};

// Set location hostname to match directory page for matching logic
Object.defineProperty(window, "location", {
  value: {
    hostname: "directory.churchofjesuschrist.org",
    origin: "https://directory.churchofjesuschrist.org",
    pathname: "/169633",
  },
  writable: true,
});

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

// Mock templates
global.memberFlashcardsTemplates = {
  flashcardStylesTemplate: "<div id='lcr-tools-flashcard-styles'></div>",
  flashcardModalContentTemplate: `
    <div id="lcr-tools-flashcard-container"></div>
    <div id="lcr-tools-flashcard-current"></div>
    <div id="lcr-tools-flashcard-total"></div>
    <button id="lcr-tools-flashcard-prev"></button>
    <button id="lcr-tools-flashcard-next"></button>
  `,
  flashcardTemplate:
    "<div id='lcr-tools-flashcard-{index}' class='flashcard'><div class='front'></div><div class='back'></div></div>",
  directoryWarningTemplate: "<div>warning</div>",
};

describe("memberFlashcardsUtils - Directory Page Integration", () => {
  let mockFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorageMock.clear();
    document.body.innerHTML = "";
    delete window.__NEXT_DATA__;

    // Set up global/window fetch mocks
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    window.fetch = mockFetch;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("should correctly parse DOM, batch fetch details, and normalize names", async () => {
    jest.useFakeTimers();

    // 1. Set up DOM anchors simulating the left pane of the directory page
    document.body.innerHTML = `
      <a href="/169633/households/50c1a650-d20a-4b8b-adcf-521f3c9b5076">Smith, John & Jane</a>
      <a href="/169633/households/eda8f2ea-40cf-4a3c-bb20-09548eb7a247">Doe, Bob</a>
    `;

    // 2. Mock fetch implementation
    mockFetch.mockImplementation(async (url) => {
      if (url.includes("/households/50c1a650-d20a-4b8b-adcf-521f3c9b5076")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              householdName: "Smith",
              members: [
                {
                  uuid: "11111111-2222-3333-4444-555555555555",
                  name: "Smith, John",
                  firstName: "John",
                  lastName: "Smith",
                  photoUrl: "/api/photo/token/abc",
                },
                {
                  uuid: "66666666-7777-8888-9999-000000000000",
                  name: "Smith, Jane",
                  firstName: "Jane",
                  lastName: "Smith",
                  photoUrl: "https://photos.org/jane.jpg",
                },
              ],
            }),
        };
      } else if (
        url.includes("/households/eda8f2ea-40cf-4a3c-bb20-09548eb7a247")
      ) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              householdName: "Doe",
              members: [
                {
                  uuid: "uuid-bob",
                  name: "Bob Doe",
                  firstName: "Bob",
                  lastName: "Doe",
                  // No photo, should be ignored
                },
              ],
            }),
        };
      } else if (url.includes("/households")) {
        // Intercepted main households list
        return {
          ok: true,
          clone: () => ({
            text: async () => JSON.stringify({ households: [] }),
          }),
          text: async () => JSON.stringify({ households: [] }),
        };
      }
      return { ok: false };
    });

    sessionStorageMock.setItem("LCR_FLASHCARDS_PENDING", "true");

    // Load module under test
    jest.resetModules();
    require("../../../js/actions/memberFlashcards/memberFlashcardsUtils.js");

    // Simulate main list request that gets intercepted to extract the LCR_DIRECTORY_BASE_API prefix
    await window.fetch(
      "https://directory.churchofjesuschrist.org/api/v4/households?unitNo=169633",
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(sessionStorageMock.getItem("LCR_DIRECTORY_BASE_API")).toBe(
      "https://directory.churchofjesuschrist.org/api/v4/households",
    );

    // Call waitForDirectoryDataAndProcess
    const membersPromise =
      window.memberFlashcardsUtils.waitForDirectoryDataAndProcess();

    // Advance timers so the setInterval loop finishes instantly
    jest.advanceTimersByTime(1000);

    const members = await membersPromise;

    expect(members).toHaveLength(3);

    // First member: relative photo path should be absolute, name normalized, and token URL should get /MEDIUM suffix
    expect(members[0]).toEqual({
      memberId: "11111111-2222-3333-4444-555555555555",
      firstName: "John",
      lastName: "Smith",
      fullName: "John Smith",
      photoUrl:
        "https://directory.churchofjesuschrist.org/api/photo/token/abc/MEDIUM",
      hasPhoto: true,
    });

    // Second member: absolute path should remain absolute
    expect(members[1]).toEqual({
      memberId: "66666666-7777-8888-9999-000000000000",
      firstName: "Jane",
      lastName: "Smith",
      fullName: "Jane Smith",
      photoUrl: "https://photos.org/jane.jpg",
      hasPhoto: true,
    });

    // Third member: fallback to dynamically generated URL
    expect(members[2]).toEqual({
      memberId: "uuid-bob",
      firstName: "Bob",
      lastName: "Doe",
      fullName: "Bob Doe",
      photoUrl:
        "https://directory.churchofjesuschrist.org/api/v4/photos/members/uuid-bob?thumbnail=true",
      hasPhoto: true,
    });

    // Cache should be updated
    expect(storageUtils.updatePhotoCache).toHaveBeenCalled();
  });

  test("should support direct array format and missing last name", async () => {
    jest.useFakeTimers();

    // 1. Set up DOM anchors simulating the left pane of the directory page
    document.body.innerHTML = `
      <a href="/169633/households/da8f2ea0-40cf-4a3c-bb20-09548eb7a247">Johnson, Alice</a>
    `;

    const mockArrayData = {
      uuid: "da8f2ea0-40cf-4a3c-bb20-09548eb7a247",
      name: "Alice Bob",
      photoUrl: "/api/photo/token/xyz",
    };

    // Mock fetch implementation
    mockFetch.mockImplementation(async (url) => {
      if (url.includes("/households/da8f2ea0-40cf-4a3c-bb20-09548eb7a247")) {
        return {
          ok: true,
          text: async () => JSON.stringify(mockArrayData),
        };
      } else if (url.includes("/households")) {
        return {
          ok: true,
          clone: () => ({
            text: async () => JSON.stringify([mockArrayData]),
          }),
          text: async () => JSON.stringify([mockArrayData]),
        };
      }
      return { ok: false };
    });

    sessionStorageMock.setItem("LCR_FLASHCARDS_PENDING", "true");

    jest.resetModules();
    require("../../../js/actions/memberFlashcards/memberFlashcardsUtils.js");

    await window.fetch(
      "https://directory.churchofjesuschrist.org/api/v4/households",
    );
    await Promise.resolve();
    await Promise.resolve();

    const membersPromise =
      window.memberFlashcardsUtils.waitForDirectoryDataAndProcess();

    jest.advanceTimersByTime(1000);

    const members = await membersPromise;

    expect(members).toHaveLength(1);
    expect(members[0]).toEqual({
      memberId: "da8f2ea0-40cf-4a3c-bb20-09548eb7a247",
      firstName: "Alice",
      lastName: "Bob",
      fullName: "Alice Bob",
      photoUrl:
        "https://directory.churchofjesuschrist.org/api/photo/token/xyz/MEDIUM",
      hasPhoto: true,
    });
  });

  test("should NOT overwrite base API with _next/data URLs", async () => {
    sessionStorageMock.setItem("LCR_FLASHCARDS_PENDING", "true");

    mockFetch.mockImplementation(async (url) => {
      return {
        ok: true,
        clone: () => ({ json: async () => ({}) }),
        json: async () => ({}),
      };
    });

    jest.resetModules();
    require("../../../js/actions/memberFlashcards/memberFlashcardsUtils.js");

    // First: intercept the REST API URL
    await window.fetch(
      "https://directory.churchofjesuschrist.org/api/v4/households?unit=169633",
    );
    await Promise.resolve();

    expect(sessionStorageMock.getItem("LCR_DIRECTORY_BASE_API")).toBe(
      "https://directory.churchofjesuschrist.org/api/v4/households",
    );

    // Then: a _next/data URL should NOT overwrite it
    await window.fetch(
      "https://directory.churchofjesuschrist.org/_next/data/IuFArmltO4Z4miXaFgmnv/169633/households/some-uuid.json",
    );
    await Promise.resolve();

    // Should still be the REST API path
    expect(sessionStorageMock.getItem("LCR_DIRECTORY_BASE_API")).toBe(
      "https://directory.churchofjesuschrist.org/api/v4/households",
    );
  });

  test("checkCacheAndRunOrPrompt should be cache-only (no network)", async () => {
    document.body.innerHTML = `
      <a href="/169633/households/da8f2ea0-40cf-4a3c-bb20-09548eb7a247">Johnson, Alice & Bob</a>
    `;

    // Load without pending flag so interceptor doesn't activate
    sessionStorageMock.removeItem("LCR_FLASHCARDS_PENDING");
    jest.resetModules();
    require("../../../js/actions/memberFlashcards/memberFlashcardsUtils.js");

    // Case 1: No cache — should return false, NO fetch calls
    storageUtils.getPhotoCache.mockResolvedValue({});
    let result = await window.memberFlashcardsUtils.checkCacheAndRunOrPrompt();
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();

    // Case 2: Cache disabled — should return false
    storageUtils.getCacheSettings.mockResolvedValue({ enabled: false });
    result = await window.memberFlashcardsUtils.checkCacheAndRunOrPrompt();
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();

    // Case 3: Everything cached — should return true and show flashcards
    storageUtils.getCacheSettings.mockResolvedValue({ enabled: true });
    storageUtils.getPhotoCache.mockResolvedValue({
      "hh_da8f2ea0-40cf-4a3c-bb20-09548eb7a247": {
        members: [
          {
            memberId: "da8f2ea0-40cf-4a3c-bb20-09548eb7a247",
            fullName: "Alice & Bob Johnson",
            photoUrl: "https://photos.org/fam.jpg",
            hasPhoto: true,
          },
        ],
      },
    });
    result = await window.memberFlashcardsUtils.checkCacheAndRunOrPrompt();
    expect(result).toBe(true);
    // Still no fetch calls — purely from cache
    expect(mockFetch).not.toHaveBeenCalled();
    // Should have created the flashcard modal
    expect(modalUtils.createStandardModal).toHaveBeenCalled();
  });

  test("should extract photos from Next.js pageProps wrapped responses", async () => {
    jest.useFakeTimers();

    document.body.innerHTML = `
      <a href="/169633/households/abc12345-1111-2222-3333-444444444444">Test, Member</a>
    `;

    const nextJsResponse = {
      pageProps: {
        household: {
          uuid: "abc12345-1111-2222-3333-444444444444",
          name: "Test, Member",
          photoUrl: "/api/photo/token/next-photo-token",
          members: [],
        },
      },
    };

    window.__NEXT_DATA__ = { buildId: "test-build-id" };

    mockFetch.mockImplementation(async (url) => {
      if (url.includes("/households/abc12345")) {
        return { ok: true, text: async () => JSON.stringify(nextJsResponse) };
      }
      if (url.includes("/households/da8f2ea0-40cf-4a3c-bb20-09548eb7a247")) {
        return {
          ok: true,
          text: async () => JSON.stringify(mockHouseholdData2),
        };
      }
      return {
        ok: false,
        text: async () => "",
      };
    });

    sessionStorageMock.setItem("LCR_FLASHCARDS_PENDING", "true");
    sessionStorageMock.setItem("LCR_DIRECTORY_BASE_API", "/api/v4/households");

    jest.resetModules();
    require("../../../js/actions/memberFlashcards/memberFlashcardsUtils.js");

    const membersPromise =
      window.memberFlashcardsUtils.waitForDirectoryDataAndProcess();
    jest.advanceTimersByTime(1000);

    const members = await membersPromise;
    expect(members).toHaveLength(1);
    expect(members[0].fullName).toBe("Member Test");
    expect(members[0].photoUrl).toContain(
      "/api/photo/token/next-photo-token/MEDIUM",
    );
  });
});
