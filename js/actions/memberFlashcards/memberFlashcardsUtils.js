/**
 * Utility file specifically for the memberFlashcards action.
 * Handles the navigation, filtering, data extraction, and flashcard interface creation
 * required to generate an interactive flashcard experience for learning member names and faces.
 * This includes:
 * - Extracting member photos and names by clicking on members to reveal popovers
 * - Creating an interactive flashcard interface with flip functionality
 * - Caching photo data to avoid redundant page interactions
 *
 * Integrates with navigationUtils for page navigation and uiUtils for interface management.
 */
(() => {
  if (utils.returnIfLoaded("memberFlashcardsUtils")) return;
  utils.ensureLoaded(
    "navigationUtils",
    "uiUtils",
    "modalUtils",
    "storageUtils",
    "lcrApiUtils",
    "memberFlashcardsTemplates",
  );

  let currentFlashcardIndex = 0;
  let memberData = [];
  let shuffledData = [];
  let isShuffled = false;

  let capturedDirectoryData = null;

  // Set up network interceptor if we are on the directory page and flashcards are pending
  const isDirectoryPage = window.location.hostname.includes(
    "directory.churchofjesuschrist.org",
  );
  const isFlashcardsPending =
    sessionStorage.getItem("LCR_FLASHCARDS_PENDING") === "true";

  if (isDirectoryPage && isFlashcardsPending) {
    console.log("LCR Tools: Intercepting network for directory flashcards...");

    // Show early loading indicator
    if (document.body) {
      uiUtils.showLoadingIndicator(
        "Waiting for directory data...",
        "Loading member information",
      );
    } else {
      window.addEventListener("DOMContentLoaded", () => {
        uiUtils.showLoadingIndicator(
          "Waiting for directory data...",
          "Loading member information",
        );
      });
    }

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [resource] = args;
      const url = resource && resource.url ? resource.url : resource;

      if (
        typeof url === "string" &&
        (url.includes("/api/") ||
          url.includes("_next/data/") ||
          url.includes("households") ||
          url.includes("members") ||
          url.includes("directory"))
      ) {
        // Save the REST API base path if we see households (just for legacy fallback)
        if (url.includes("households") && !url.includes("_next/data")) {
          const basePath = url.split("?")[0];
          const match = basePath.match(/(.*\/households)(\/|$)/);
          if (match) {
            let currentApi = sessionStorage.getItem("LCR_DIRECTORY_BASE_API");
            if (currentApi && currentApi.includes("_next/data")) {
              sessionStorage.removeItem("LCR_DIRECTORY_BASE_API");
              currentApi = null;
            }
            if (!currentApi) {
              sessionStorage.setItem("LCR_DIRECTORY_BASE_API", match[1]);
              console.log("LCR Tools: Captured directory API base path.");
            }
          }
        }

        try {
          const response = await originalFetch(...args);
          if (response && typeof response.clone === "function") {
            const clone = response.clone();
            clone
              .json()
              .then((json) => {
                if (!Array.isArray(capturedDirectoryData)) {
                  capturedDirectoryData = [];
                }
                capturedDirectoryData.push({ url, data: json });
              })
              .catch(() => {
                // Silently ignore non-JSON responses (e.g. _next/data HTML fallbacks)
              });
          }
          return response;
        } catch (e) {
          // Network error — fall through to original fetch
        }
      }
      return originalFetch(...args);
    };
  }

  /**
   * Processes a single member/person JSON node and extracts details.
   * @param {Object} m - Member JSON object
   * @param {string} householdName - Fallback household name
   * @returns {Object|null} - Processed member object or null
   */
  function parseMemberNode(m, householdName = "") {
    let fullName = m.name || m.displayName || m.fullName || "";
    if (!fullName) {
      const first = m.firstName || m.givenName || "";
      const last = m.lastName || m.familyName || householdName || "";
      if (first || last) {
        fullName = `${first} ${last}`.trim();
      }
    }
    if (!fullName) return null;

    fullName = normalizeName(fullName);

    // Filter out household objects (we only want individual members)
    if (m.members || m.householdMembers || m.isHousehold) {
      return null;
    }
    if (fullName.includes("&") || fullName.toLowerCase().includes(" and ")) {
      return null;
    }

    let memberId = m.uuid || m.memberId || m.id;
    if (!memberId) return null;

    let photoUrl = m.photoUrl || m.imageUrl || m.thumbnailUrl || "";
    if (!photoUrl && m.photo) {
      photoUrl = m.photo.url || m.photo.tokenUrl || m.photo.token || "";
    }
    if (!photoUrl && m.individualPhoto) {
      photoUrl =
        typeof m.individualPhoto === "string"
          ? m.individualPhoto
          : m.individualPhoto.url || m.individualPhoto.tokenUrl || "";
    }
    if (!photoUrl && m.householdPhoto) {
      photoUrl =
        typeof m.householdPhoto === "string"
          ? m.householdPhoto
          : m.householdPhoto.url || m.householdPhoto.tokenUrl || "";
    }

    // New API doesn't send photoUrl, it just constructs it dynamically
    if (!photoUrl) {
      photoUrl = `https://directory.churchofjesuschrist.org/api/v4/photos/members/${memberId}?thumbnail=true`;
    }

    if (typeof photoUrl === "string" && photoUrl.startsWith("/")) {
      photoUrl = window.location.origin + photoUrl;
    }

    if (
      typeof photoUrl === "string" &&
      photoUrl.includes("/api/photo/token/") &&
      !photoUrl.endsWith("/MEDIUM") &&
      !photoUrl.includes("/MEDIUM/")
    ) {
      photoUrl = `${photoUrl}/MEDIUM`;
    }

    return {
      memberId: memberId,
      firstName: m.firstName || m.givenName || "",
      lastName: m.lastName || m.familyName || "",
      fullName: fullName,
      photoUrl: photoUrl,
      hasPhoto: true, // We assume they have a photo; if it's a placeholder, it still works.
    };
  }

  function extractMembersFromHouseholdJson(data) {
    if (!data) return [];

    const members = [];
    const seenUuids = new Set();
    let householdName = "";

    // Helper to try parsing a node as a member
    function tryParseAndAdd(node, fallbackHouseholdName) {
      if (
        node &&
        typeof node === "object" &&
        (node.uuid || node.memberId || node.id) &&
        (node.name || node.firstName || node.lastName || node.displayName)
      ) {
        const parsed = parseMemberNode(node, fallbackHouseholdName);
        if (parsed && !seenUuids.has(parsed.memberId)) {
          seenUuids.add(parsed.memberId);
          members.push(parsed);
          return true;
        }
      }
      return false;
    }

    // Helper to find household name (often higher up in the tree)
    function findHouseholdName(obj) {
      if (!obj || typeof obj !== "object") return;
      if (obj.householdName) householdName = obj.householdName;
      else if (obj.name && obj.headOfHouse) householdName = obj.name;
      else if (Array.isArray(obj)) obj.forEach(findHouseholdName);
      else Object.values(obj).forEach(findHouseholdName);
    }

    findHouseholdName(data);

    // Recursive search for members or member arrays
    function searchForMembers(obj) {
      if (!obj || typeof obj !== "object") return;

      // 1. Is this node an array of members?
      if (Array.isArray(obj)) {
        obj.forEach((item) => {
          if (!tryParseAndAdd(item, householdName)) {
            searchForMembers(item);
          }
        });
        return;
      }

      // 2. Is this node a household containing members?
      if (obj.members && Array.isArray(obj.members)) {
        obj.members.forEach((m) =>
          tryParseAndAdd(m, householdName || obj.name || obj.householdName),
        );
      }
      if (obj.householdMembers && Array.isArray(obj.householdMembers)) {
        obj.householdMembers.forEach((m) =>
          tryParseAndAdd(m, householdName || obj.name || obj.householdName),
        );
      }

      // 3. Is this node itself a member?
      if (tryParseAndAdd(obj, householdName)) {
        return;
      }

      // 4. Continue traversing down
      Object.values(obj).forEach((val) => searchForMembers(val));
    }

    searchForMembers(data);

    return members;
  }

  function normalizeName(name) {
    if (!name || typeof name !== "string") return "";
    const commaIdx = name.indexOf(",");
    if (commaIdx !== -1) {
      const lastName = name.substring(0, commaIdx).trim();
      const firstName = name.substring(commaIdx + 1).trim();
      return `${firstName} ${lastName}`.trim();
    }
    return name.trim();
  }

  /**
   * Helper to extract household UUIDs from anchor tags on the directory page.
   * @returns {Array<{householdUuid: string, name: string}>}
   */
  function getHouseholdsFromDOM() {
    const anchors = Array.from(document.getElementsByTagName("a")).filter(
      (a) => {
        const href = a.getAttribute("href") || "";
        return href.includes("/households/");
      },
    );

    const households = [];
    const seenUuids = new Set();
    anchors.forEach((a) => {
      const href = a.getAttribute("href") || "";
      const uuidMatch = href.match(/households\/([a-f0-9-]+)/);
      if (!uuidMatch) return;

      const householdUuid = uuidMatch[1];
      if (seenUuids.has(householdUuid)) return;
      seenUuids.add(householdUuid);

      households.push({
        householdUuid,
        name: a.textContent.trim(),
      });
    });

    return households;
  }

  /**
   * Builds the best URL to fetch individual household details.
   * Prefers the stable REST API (/api/v4/households/{uuid}).
   * Falls back to Next.js data route using __NEXT_DATA__ build ID.
   *
   * @param {string} basePath - The captured REST API base (e.g. /api/v4/households)
   * @param {string} householdUuid - The household UUID
   * @returns {string} - The URL to fetch
   */
  function buildHouseholdDetailUrl(basePath, householdUuid) {
    let unitNo = "";
    if (typeof window !== "undefined") {
      const unitMatch = window.location.pathname.match(/\/(\d{5,})/);
      if (unitMatch) unitNo = unitMatch[1];
    }

    if (unitNo) {
      return `/${unitNo}/households/${householdUuid}`;
    }
    return null;
  }

  /**
   * Waits for the directory data base API and DOM elements, then pulls details.
   * Runs in MAIN world after page reload (via bootstrap injection).
   * @returns {Promise<Array>} - Array of member data objects for flashcards
   */
  async function waitForDirectoryDataAndProcess() {
    return new Promise(async (resolve) => {
      let basePath = sessionStorage.getItem("LCR_DIRECTORY_BASE_API");
      if (basePath && basePath.includes("_next/data")) {
        sessionStorage.removeItem("LCR_DIRECTORY_BASE_API");
        basePath = null;
      }
      let households = getHouseholdsFromDOM();
      const startTime = Date.now();

      // Wait up to 15s for the API base path and DOM anchors to appear
      while (
        (!basePath || households.length === 0) &&
        Date.now() - startTime < 15000
      ) {
        await utils.sleep(500);
        basePath = sessionStorage.getItem("LCR_DIRECTORY_BASE_API");
        if (basePath && basePath.includes("_next/data")) {
          sessionStorage.removeItem("LCR_DIRECTORY_BASE_API");
          basePath = null;
        }
        households = getHouseholdsFromDOM();
      }

      if (!basePath) {
        console.warn(
          "LCR Tools: Could not intercept LCR API base path for flashcards.",
        );
        uiUtils.hideLoadingIndicator();
        uiUtils.showToast(
          "Failed to load flashcards (API not found). Please try refreshing the page.",
          "error",
        );
        return resolve([]);
      }

      // FAST PATH: Try parsing the captured directory data directly!
      // If the main /api/v4/households request contains all the photos, we don't need to fetch anything else!
      if (
        Array.isArray(capturedDirectoryData) &&
        capturedDirectoryData.length > 0
      ) {
        console.log(
          `LCR Tools Debug: Trying to extract members from ${capturedDirectoryData.length} captured API payloads directly...`,
        );
        const allFastMembers = [];
        const seenMemberIds = new Set();

        capturedDirectoryData.forEach((payload) => {
          const members = extractMembersFromHouseholdJson(payload.data);
          members.forEach((m) => {
            if (!seenMemberIds.has(m.memberId)) {
              seenMemberIds.add(m.memberId);
              allFastMembers.push(m);
            }
          });
        });

        if (allFastMembers.length > 0) {
          console.log(
            `LCR Tools Debug: Fast path succeeded! Found ${allFastMembers.length} unique members directly from captured data.`,
          );
          uiUtils.hideLoadingIndicator();
          return resolve(allFastMembers);
        }
      }

      if (households.length === 0) {
        console.warn("LCR Tools: Timed out waiting for directory member list.");
        resolve([]);
        return;
      }

      if (!basePath) {
        console.warn(
          "LCR Tools: No API base path captured. Trying Next.js fallback...",
        );
      }

      const cacheSettings = await storageUtils.getCacheSettings();
      const currentCache = cacheSettings.enabled
        ? await storageUtils.getPhotoCache()
        : {};

      const membersToFetch = [];
      const finalMembersList = [];
      const newCacheEntries = {};

      households.forEach((hh) => {
        const cacheKey = "hh_" + hh.householdUuid;
        if (cacheSettings.enabled && currentCache[cacheKey]) {
          const cached = currentCache[cacheKey];
          if (cached.members && cached.members.length > 0) {
            finalMembersList.push(...cached.members);
            return;
          }
        }
        membersToFetch.push(hh);
      });

      if (membersToFetch.length === 0) {
        resolve(finalMembersList);
        return;
      }

      let successCount = 0;
      let failCount = 0;
      let loggedSample = false;

      await lcrApiUtils.processInBatches(
        membersToFetch,
        10,
        async (hh) => {
          try {
            const url = buildHouseholdDetailUrl(basePath, hh.householdUuid);
            if (!url) {
              failCount++;
              if (!loggedSample)
                console.warn(
                  "LCR Tools Debug: buildHouseholdDetailUrl returned null. basePath:",
                  basePath,
                );
              return;
            }
            // HTML requests don't need Next.js specific headers
            const response = await fetch(url, { credentials: "include" });
            if (!response.ok) {
              failCount++;
              if (!loggedSample) {
                console.warn(
                  `LCR Tools Debug: Fetch failed. URL: ${url} | Status: ${response.status}`,
                );
                loggedSample = true;
              }
              return;
            }

            const text = await response.text();

            // Look for any object containing "uuid" and "name" (and optionally photoUrl) anywhere in the raw text
            const members = [];
            const regex = /{"uuid":"([^"]+)"[^}]*?"name":"([^"]+)"/g;
            let match;
            while ((match = regex.exec(text)) !== null) {
              const rawName = match[2];
              let firstName = "";
              let lastName = "";
              const commaIdx = rawName.indexOf(",");
              if (commaIdx !== -1) {
                lastName = rawName.substring(0, commaIdx).trim();
                firstName = rawName.substring(commaIdx + 1).trim();
              } else {
                const parts = rawName
                  .trim()
                  .split(" ")
                  .filter((p) => p);
                if (parts.length > 1) {
                  lastName = parts.pop();
                  firstName = parts.join(" ");
                } else {
                  firstName = rawName.trim();
                }
              }

              // See if photoUrl exists in the object string (up to the next closing brace)
              const objSubstring = text.substring(
                match.index,
                text.indexOf("}", match.index),
              );
              const photoMatch = objSubstring.match(/"photoUrl":"([^"]+)"/);
              let photoUrl = "";
              if (photoMatch) {
                photoUrl = photoMatch[1].replace(/\\u002F/g, "/"); // Unescape forward slashes
              }

              const parsed = parseMemberNode({
                uuid: match[1],
                name: rawName,
                firstName: firstName,
                lastName: lastName,
                photoUrl: photoUrl,
              });
              if (parsed) members.push(parsed);
            }

            // Fallback regex if the properties are in a different order
            const fallbackRegex = /{"memberId":"([^"]+)"/g;
            while ((match = fallbackRegex.exec(text)) !== null) {
              if (!members.find((m) => m.memberId === match[1])) {
                // See if photoUrl exists in the object string (up to the next closing brace)
                const objSubstring = text.substring(
                  match.index,
                  text.indexOf("}", match.index),
                );
                const photoMatch = objSubstring.match(/"photoUrl":"([^"]+)"/);
                let photoUrl = "";
                if (photoMatch) {
                  photoUrl = photoMatch[1].replace(/\\u002F/g, "/");
                }

                const parsed = parseMemberNode({
                  uuid: match[1],
                  name: "Household Member",
                  photoUrl: photoUrl,
                });
                if (parsed) members.push(parsed);
              }
            }

            if (!loggedSample) {
              loggedSample = true;
            }

            if (members.length > 0) {
              finalMembersList.push(...members);
              newCacheEntries["hh_" + hh.householdUuid] = {
                timestamp: Date.now(),
                members: members,
              };
              successCount++;
            }
          } catch (e) {
            failCount++;
            if (!loggedSample) {
              console.warn(
                "LCR Tools Debug: Fetch exception:",
                e.message,
                "URL was:",
                buildHouseholdDetailUrl(basePath, hh.householdUuid),
              );
              loggedSample = true;
            }
          }
        },
        (start, end, total) => {
          uiUtils.showLoadingIndicator(
            `Fetching photo details (${start + 1}-${end} of ${total})...`,
            "Press ESC to cancel",
          );
        },
      );

      if (failCount > 0 && successCount === 0) {
        console.warn(
          `LCR Tools: All ${failCount} household fetches failed. The API may have changed.`,
        );
      } else {
        console.log(
          `LCR Tools Debug: Fetch summary - ${successCount} successful household fetches, ${failCount} failed. Found ${finalMembersList.length} members with photos.`,
        );
        if (finalMembersList.length === 0) {
          console.warn(
            "LCR Tools Debug: Fetches succeeded but 0 members with photos were found. This indicates the photo data is either missing from the API or the field names have changed.",
          );
        }
      }

      if (cacheSettings.enabled && Object.keys(newCacheEntries).length > 0) {
        await storageUtils.updatePhotoCache(newCacheEntries);
      }

      resolve(finalMembersList);
    });
  }

  /**
   * Checks ONLY the local photo cache to see if all households are already cached.
   * If yes, launches the flashcard modal instantly. Does NOT make any network requests.
   * This runs in the ISOLATED world (from popup click) where fetch may have cookie issues.
   *
   * @returns {Promise<boolean>} - true if flashcards were launched from cache
   */
  async function checkCacheAndRunOrPrompt() {
    const households = getHouseholdsFromDOM();
    if (households.length === 0) {
      return false;
    }

    const cacheSettings = await storageUtils.getCacheSettings();
    if (!cacheSettings.enabled) {
      return false;
    }

    const currentCache = await storageUtils.getPhotoCache();
    const cachedMembers = [];
    let allCached = true;

    for (const hh of households) {
      const cacheKey = "hh_" + hh.householdUuid;
      const cached = currentCache[cacheKey];
      if (cached && cached.members && cached.members.length > 0) {
        cachedMembers.push(...cached.members);
      } else {
        allCached = false;
        break; // No need to check further
      }
    }

    if (allCached && cachedMembers.length > 0) {
      uiUtils.showLoadingIndicator("Creating flashcards from cache...");
      await createFlashcardInterface(cachedMembers);
      uiUtils.hideLoadingIndicator();
      return true;
    }

    return false;
  }

  /**
   * Creates the flashcard interface modal
   * @param {Array} members - Array of member data objects
   */
  async function createFlashcardInterface(members) {
    if (!members || members.length === 0) {
      alert("LCR Tools: No member data available to create flashcards.");
      return;
    }

    memberData = members;
    // Shuffle the data by default for better learning experience using Fisher-Yates shuffle
    shuffledData = [...members];
    for (let i = shuffledData.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledData[i], shuffledData[j]] = [shuffledData[j], shuffledData[i]];
    }
    currentFlashcardIndex = 0;
    isShuffled = true; // Start in shuffled mode

    // Add styles to the page
    const stylesElement = document.createElement("div");
    stylesElement.innerHTML = memberFlashcardsTemplates.flashcardStylesTemplate;
    document.head.appendChild(stylesElement.firstElementChild);

    // Use template content imported from templates.js
    const content = memberFlashcardsTemplates.flashcardModalContentTemplate;

    // Create the modal using modalUtils
    modalUtils.createStandardModal({
      id: "lcr-tools-flashcard-modal",
      title: "Member Flashcards",
      content,
      modalOptions: {
        maxWidth: "800px",
      },
      onClose: () => {
        // Clean up styles when modal closes
        const stylesElement = document.getElementById(
          "lcr-tools-flashcard-styles",
        );
        if (stylesElement) {
          stylesElement.remove();
        }
      },
    });

    // Set up event listeners
    setupFlashcardEventListeners();

    // Show the first flashcard
    showFlashcard(0);
  }

  /**
   * Sets up all event listeners for the flashcard interface
   */
  function setupFlashcardEventListeners() {
    const modal = document.getElementById("lcr-tools-flashcard-modal");
    const prevBtn = document.getElementById("lcr-tools-flashcard-prev");
    const nextBtn = document.getElementById("lcr-tools-flashcard-next");

    // Navigation buttons
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (currentFlashcardIndex > 0) {
          showFlashcard(currentFlashcardIndex - 1);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        const currentData = isShuffled ? shuffledData : memberData;
        if (currentFlashcardIndex < currentData.length - 1) {
          showFlashcard(currentFlashcardIndex + 1);
        }
      });
    }

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (!modal || modal.style.display !== "flex") return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (prevBtn) prevBtn.click();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (nextBtn) nextBtn.click();
          break;
        case "Escape":
          e.preventDefault();
          modalUtils.closeModal("lcr-tools-flashcard-modal");
          break;
        case " ":
          e.preventDefault();
          flipCurrentFlashcard();
          break;
      }
    });
  }

  /**
   * Shows a specific flashcard
   * @param {number} index - Index of the flashcard to show
   */
  function showFlashcard(index) {
    const currentData = isShuffled ? shuffledData : memberData;

    if (index < 0 || index >= currentData.length) {
      return;
    }

    currentFlashcardIndex = index;
    const member = currentData[index];
    const container = document.getElementById("lcr-tools-flashcard-container");

    // Create flashcard HTML
    const flashcardHtml = memberFlashcardsTemplates.flashcardTemplate
      .replace(/{index}/g, index)
      .replace(/{photoUrl}/g, member.photoUrl)
      .replace(/{fullName}/g, member.fullName);

    container.innerHTML = flashcardHtml;

    // Add click event to flip the card
    const flashcard = document.getElementById(`lcr-tools-flashcard-${index}`);
    flashcard.addEventListener("click", () => {
      flashcard.classList.toggle("flipped");
    });

    // Update counter
    document.getElementById("lcr-tools-flashcard-current").textContent =
      index + 1;
    document.getElementById("lcr-tools-flashcard-total").textContent =
      currentData.length;

    // Update button states
    const prevBtn = document.getElementById("lcr-tools-flashcard-prev");
    const nextBtn = document.getElementById("lcr-tools-flashcard-next");

    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === currentData.length - 1;
  }

  /**
   * Flips the current flashcard
   */
  function flipCurrentFlashcard() {
    const flashcard = document.getElementById(
      `lcr-tools-flashcard-${currentFlashcardIndex}`,
    );
    if (flashcard) {
      flashcard.classList.toggle("flipped");
    }
  }

  /**
   * Shows a warning modal before running flashcards on member directory page
   * @returns {Promise<boolean>} - True if user wants to proceed, false if cancelled
   */
  async function showDirectoryPageWarning() {
    return new Promise((resolve) => {
      const content = memberFlashcardsTemplates.directoryWarningTemplate;

      modalUtils.createStandardModal({
        id: "lcr-tools-flashcard-warning",
        title: "Member Flashcards",
        content,
        hideDefaultButtons: true,
        onClose: () => resolve(false),
      });

      // Add event listeners
      document
        .getElementById("lcr-tools-continue-here")
        .addEventListener("click", () => {
          modalUtils.closeModal("lcr-tools-flashcard-warning");
          resolve(true);
        });

      document
        .getElementById("lcr-tools-cancel")
        .addEventListener("click", () => {
          modalUtils.closeModal("lcr-tools-flashcard-warning");
          resolve(false);
        });
    });
  }

  /**
   * Collects member data from the member directory page by calling internal APIs
   * @returns {Promise<Array>} - Array of member data objects
   */
  async function collectMemberDataFromDirectory() {
    const membersByPhotoUrl = new Map();
    const newCacheEntries = {};

    // Get cache settings and current cache
    const cacheSettings = await storageUtils.getCacheSettings();
    const currentCache = cacheSettings.enabled
      ? await storageUtils.getPhotoCache()
      : {};

    // Find all rows in the table to extract UUIDs and names
    const allRows = Array.from(document.querySelectorAll('tr[id][role="row"]'));
    const membersToFetch = [];

    for (let i = 0; i < allRows.length; i++) {
      const memberInfo = lcrApiUtils.getMemberInfoFromRow(allRows[i]);
      if (!memberInfo) continue;

      const { memberId } = memberInfo;

      // Check cache first
      if (cacheSettings.enabled && currentCache[memberId]) {
        const cached = currentCache[memberId];
        const age = Date.now() - (cached.timestamp || 0);
        const isExpired = age > 24 * 60 * 60 * 1000; // 24 hours

        if (!isExpired) {
          if (cached.hasPhoto && cached.photoUrl) {
            // Use fullName from cache, fallback to constructing it from parts or directoryName
            const displayFullName =
              cached.fullName ||
              (cached.firstName && cached.lastName
                ? `${cached.firstName} ${cached.lastName}`
                : "") ||
              memberInfo.fullName; // memberInfo.fullName is First Last

            membersByPhotoUrl.set(cached.photoUrl, {
              ...cached,
              fullName: displayFullName,
            });
            continue; // Skip if we have cached photo
          } else if (cached.hasPhoto === false) {
            continue; // Skip if we know they don't have a photo
          }
        }
      }

      membersToFetch.push(memberInfo);
    }

    await lcrApiUtils.processInBatches(
      membersToFetch,
      10,
      async (memberInfo) => {
        const cardData = await lcrApiUtils.fetchMemberCard(memberInfo.memberId);

        if (
          cardData &&
          cardData.photoMetadata &&
          cardData.photoMetadata.tokenUrl
        ) {
          const photoUrl = `${cardData.photoMetadata.tokenUrl}/MEDIUM`;

          const member = {
            ...memberInfo,
            photoUrl,
            hasPhoto: true,
            timestamp: Date.now(),
          };

          membersByPhotoUrl.set(photoUrl, member);
          newCacheEntries[memberInfo.memberId] = member;
        } else {
          // No photo available or failed to fetch
          newCacheEntries[memberInfo.memberId] = {
            ...memberInfo,
            hasPhoto: false,
            timestamp: Date.now(),
          };
        }
      },
      (start, end, total) => {
        uiUtils.showLoadingIndicator(
          `Fetching member photos (processing ${start + 1}-${end} / ${total})...`,
        );
      },
    );

    // Save new entries to cache if enabled
    if (cacheSettings.enabled && Object.keys(newCacheEntries).length > 0) {
      await storageUtils.updatePhotoCache(newCacheEntries);
    }

    return Array.from(membersByPhotoUrl.values());
  }

  window.memberFlashcardsUtils = {
    collectMemberDataFromDirectory,
    createFlashcardInterface,
    waitForDirectoryDataAndProcess,
    checkCacheAndRunOrPrompt,
  };
})();
