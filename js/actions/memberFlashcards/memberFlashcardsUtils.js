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
  utils.returnIfLoaded("memberFlashcardsUtils");
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
        if (cached.hasPhoto && cached.photoUrl) {
          // Use fullName from cache, fallback to constructing it from parts or directoryName
          const displayFullName = cached.fullName || 
                                 (cached.firstName && cached.lastName ? `${cached.firstName} ${cached.lastName}` : "") || 
                                 memberInfo.fullName; // memberInfo.fullName is First Last
          
          membersByPhotoUrl.set(cached.photoUrl, {
            ...cached,
            fullName: displayFullName
          });
          continue; // Skip if we have cached photo
        } else if (cached.hasPhoto === false) {
          continue; // Skip if we know they don't have a photo
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
  };
})();
