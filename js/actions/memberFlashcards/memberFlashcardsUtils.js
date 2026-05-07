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

    // Update shuffle button to show current state
    const shuffleBtn = document.getElementById("lcr-tools-flashcard-shuffle");
    if (shuffleBtn) {
      shuffleBtn.textContent = "↩️ Unshuffle";
    }

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
    const shuffleBtn = document.getElementById("lcr-tools-flashcard-shuffle");
    const resetBtn = document.getElementById("lcr-tools-flashcard-reset");

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

    // Shuffle button
    if (shuffleBtn) {
      shuffleBtn.addEventListener("click", () => {
        if (!isShuffled) {
          // Shuffle the data using Fisher-Yates shuffle
          shuffledData = [...memberData];
          for (let i = shuffledData.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledData[i], shuffledData[j]] = [
              shuffledData[j],
              shuffledData[i],
            ];
          }
          isShuffled = true;
          currentFlashcardIndex = 0;
          shuffleBtn.textContent = "↩️ Unshuffle";
          showFlashcard(0);
        } else {
          // Unshuffle - return to original order
          isShuffled = false;
          currentFlashcardIndex = 0;
          shuffleBtn.textContent = "🔀 Shuffle";
          showFlashcard(0);
        }
      });
    }

    // Reset button
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        currentFlashcardIndex = 0;
        showFlashcard(0);
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
   * Waits for a popover to appear and be fully loaded
   * @param {number} maxWaitMs - Maximum time to wait in milliseconds
   * @returns {Promise<Element|null>} - The popover element or null
   */
  async function waitForPopover(maxWaitMs = 1500) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const popover = document.querySelector(
        'dialog[data-testid="popover"][open].member-card__styled-member-card-popover',
      );

      if (popover) {
        const nameDiv = popover.querySelector(".member-card__styled-div");
        if (nameDiv) {
          // Give it a tiny bit more time for content to settle
          await utils.sleep(150);
          return popover;
        }
      }

      await utils.sleep(50);
    }

    return null;
  }

  /**
   * Collects member data from the member directory page by clicking names to reveal popovers
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

    // Find all rows in the table that have an ID
    const allRows = Array.from(document.querySelectorAll('tr[id][role="row"]'));

    const totalCount = allRows.length;

    for (let i = 0; i < allRows.length; i++) {
      if (uiUtils.isAborted()) {
        break;
      }

      const row = allRows[i];
      const rowId = row.id;

      // Check cache first
      if (cacheSettings.enabled && currentCache[rowId]) {
        const cached = currentCache[rowId];
        if (cached.hasPhoto && cached.photoUrl) {
          membersByPhotoUrl.set(cached.photoUrl, cached);
          continue; // Skip clicking if we have cached photo
        } else if (cached.hasPhoto === false) {
          continue; // Skip if we know they don't have a photo
        }
      }

      try {
        // Find the member card button inside this row
        const link = row.querySelector("button.member-card__styled-ghost");
        if (!link) {
          continue;
        }

        uiUtils.showLoadingIndicator(
          `Collecting member photos (processing ${i + 1} / ${totalCount})...`,
        );

        // Scroll row into view to ensure it's visible (still needed for clickability)
        row.scrollIntoView({ behavior: "instant", block: "center" });
        await utils.sleep(150);

        // Click the button to show popover
        link.click();

        // Wait for popover
        const popover = await waitForPopover();

        if (popover) {
          // Extract full name and image
          const nameDiv = popover.querySelector(".member-card__styled-div");
          const img = popover.querySelector(
            "img.eden-image.eden-avatar__image-decorator",
          );

          if (nameDiv) {
            const fullNameWithAge = nameDiv.textContent.trim();
            const fullName = fullNameWithAge.replace(/\s*\(\d+\)$/, "");

            let hasPhoto = false;
            let photoUrl = null;

            if (img && img.src) {
              photoUrl = img.src;

              // Check if it's a valid photo (not a placeholder)
              const isPlaceholder =
                photoUrl.includes("placeholder") ||
                photoUrl.includes("default") ||
                photoUrl.includes("no-image") ||
                photoUrl.includes("blank") ||
                photoUrl.endsWith(".gif") ||
                photoUrl.includes("data:image/svg");

              const parts = fullName.split(" ").filter((p) => p);
              let firstName = "";
              let lastName = "";

              if (parts.length > 1) {
                lastName = parts.pop();
                firstName = parts.join(" ");
              } else if (parts.length === 1) {
                lastName = parts[0];
              }

              if (!isPlaceholder) {
                hasPhoto = true;

                if (firstName || lastName) {
                  const member = {
                    firstName,
                    lastName,
                    fullName: fullName,
                    photoUrl,
                    originalName: fullNameWithAge,
                    hasPhoto: true,
                    rowId,
                  };
                  membersByPhotoUrl.set(photoUrl, member);
                  newCacheEntries[rowId] = member;
                }
              } else {
                // It's a placeholder
                newCacheEntries[rowId] = {
                  firstName,
                  lastName,
                  fullName,
                  hasPhoto: false,
                  timestamp: Date.now(),
                };
              }
            } else {
              // No img element at all
              newCacheEntries[rowId] = {
                fullName,
                hasPhoto: false,
                timestamp: Date.now(),
              };
            }
          }
        }

        // Close the popover
        document.body.click();
        await utils.sleep(200);
      } catch (error) {
        console.warn(`LCR Tools: Error processing row ${rowId}:`, error);
        document.body.click();
        await utils.sleep(100);
      }
    }

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
