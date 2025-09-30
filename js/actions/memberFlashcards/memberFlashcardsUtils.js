/**
 * Utility file specifically for the memberFlashcards action.
 * Handles the navigation, filtering, data extraction, and flashcard interface creation
 * required to generate an interactive flashcard experience for learning member names and faces.
 * This includes:
 * - Navigating to the "Manage Photos" page
 * - Navigating to the "Manage" tab on the photo management page
 * - Applying filters such as "Subject Type" to "Individual" and "Photo Filter" to "Members with Photo"
 * - Scrolling through the page to load all relevant data
 * - Extracting member photos and names from member-photo elements
 * - Creating an interactive flashcard interface with flip functionality
 *
 * Integrates with navigationUtils for page navigation and uiUtils for interface management.
 */
(() => {
  utils.returnIfLoaded("memberFlashcardsUtils");
  utils.ensureLoaded(
    "navigationUtils",
    "uiUtils",
    "modalUtils",
    "memberFlashcardsTemplates"
  );

  let currentFlashcardIndex = 0;
  let memberData = [];
  let shuffledData = [];
  let isShuffled = false;

  /**
   * Navigates to the manage photos page if not already there
   * @returns {Promise<boolean>} - True if navigation succeeded, false otherwise
   */
  async function navigateToManagePhotosPage() {
    const currentUrl = window.location.href;
    if (currentUrl.includes("manage-photos")) {
      console.log("LCR Tools: Already on manage photos page.");
      return true;
    }

    console.log("LCR Tools: Navigating to manage photos page...");
    window.location.href = "https://lcr.churchofjesuschrist.org/manage-photos";

    // Wait for page to load
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return true;
  }

  /**
   * Navigates to the "Manage" tab on the photo management page.
   * @returns {Promise<boolean>} - True if navigation succeeded, false otherwise.
   */
  async function navigateToManageTab() {
    return navigationUtils.navigateToTab({
      tabSelector: "li[ng-class*=\"mp.tab == 'manage'\"]",
      linkSelector: "a[ng-click=\"mp.switchTab('manage')\"]",
      tabName: "Manage",
      delay: 1500,
    });
  }

  /**
   * Sets the "Subject Type" filter to "Individual" if not already set.
   * @returns {Promise<boolean>} - True if the filter was successfully set, false otherwise.
   */
  async function setSubjectTypeToIndividual() {
    return uiUtils.changeDropdown({
      dropdownSelector: "select[ng-model='mp.subjectTypeFilter']",
      value: "INDIVIDUAL",
      dropdownName: "Subject Type",
    });
  }

  /**
   * Sets the "Photo Filter" filter to "Members with Photo" if not already set.
   * @returns {Promise<boolean>} - True if the filter was successfully set, false otherwise.
   */
  async function setPhotoFilterToMembersWithPhoto() {
    return uiUtils.changeDropdown({
      dropdownSelector: "select[ng-model='mp.photoFilter']",
      value: "MEMBERS_WITH_PHOTO",
      dropdownName: "Photo Filter",
    });
  }

  /**
   * Waits for filters to be applied and page content to update
   * @returns {Promise<void>}
   */
  async function waitForFiltersToApply() {
    console.log("LCR Tools: Waiting for filters to apply...");
    // Wait for the page to update after filter changes
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Wait for any loading indicators to disappear
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const loadingElements = document.querySelectorAll(
        '[ng-show*="loading"], .loading, .spinner'
      );
      const hasLoading = Array.from(loadingElements).some(
        (el) => el.style.display !== "none" && !el.classList.contains("ng-hide")
      );

      if (!hasLoading) {
        console.log("LCR Tools: Filters applied and content loaded");
        break;
      }

      console.log(
        `LCR Tools: Still waiting for content to load (attempt ${
          attempts + 1
        }/${maxAttempts})`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    // Additional wait to ensure all content is rendered
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  /**
   * Collects member data from the page by scrolling and extracting member-photo elements
   * @returns {Promise<Array>} - Array of member data objects
   */
  async function collectMemberData() {
    // First wait for filters to be applied
    await waitForFiltersToApply();

    const collectedData = await navigationUtils.collectDataWithNavigation({
      needs: ["scroll"],
      onPageData: async () => {
        const memberPhotos = document.querySelectorAll("member-photo");
        const processedMembers = [];

        memberPhotos.forEach((memberPhoto) => {
          try {
            // Check if the member-photo element is visible (not hidden by filters)
            if (
              memberPhoto.offsetParent === null ||
              memberPhoto.classList.contains("ng-hide")
            ) {
              return; // Skip hidden elements
            }

            // Extract photo URL from the img element
            const imgElement = memberPhoto.querySelector(
              "img.manage-photo-thumbnail"
            );
            if (!imgElement) return;

            const photoUrl = imgElement.src;
            if (
              !photoUrl ||
              photoUrl.includes("placeholder") ||
              photoUrl.includes("default") ||
              photoUrl.includes("no-image") ||
              photoUrl.includes("blank") ||
              photoUrl.endsWith(".gif") ||
              photoUrl.includes("data:image/svg")
            ) {
              return; // Skip if no valid photo
            }

            // Extract name from the h5 element
            const nameElement = memberPhoto.querySelector(
              "h5.manage-photo-name"
            );
            if (!nameElement) return;

            const fullName = nameElement.textContent.trim();
            if (!fullName) return;

            // Parse name (assuming format "LAST, FIRST")
            let firstName = "";
            let lastName = "";
            const commaIndex = fullName.indexOf(",");
            if (commaIndex !== -1) {
              lastName = fullName.substring(0, commaIndex).trim();
              firstName = fullName.substring(commaIndex + 1).trim();
            } else {
              const parts = fullName.split(" ").filter((p) => p);
              if (parts.length > 1) {
                lastName = parts.pop();
                firstName = parts.join(" ");
              } else if (parts.length === 1) {
                lastName = parts[0];
              }
            }

            if (firstName || lastName) {
              processedMembers.push({
                firstName,
                lastName,
                fullName: `${firstName} ${lastName}`.trim(),
                photoUrl,
                originalName: fullName,
              });
            }
          } catch (error) {
            console.warn("LCR Tools: Error processing member photo:", error);
          }
        });

        return processedMembers;
      },
    });

    // Flatten and deduplicate the collected data
    const flattenedData = collectedData.flat();
    const uniqueMembers = flattenedData.filter(
      (member, index, self) =>
        index === self.findIndex((m) => m.photoUrl === member.photoUrl)
    );

    console.log(
      `LCR Tools: Collected ${uniqueMembers.length} members with photos`
    );
    return uniqueMembers;
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

    // Create the flashcard content
    const content = `
      <div id="lcr-tools-flashcard-container">
        <!-- Flashcard content will be inserted here -->
      </div>
      <div id="lcr-tools-flashcard-controls">
        ${memberFlashcardsTemplates.flashcardControlsTemplate}
      </div>
    `;

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
          "lcr-tools-flashcard-styles"
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

    console.log(
      `LCR Tools: Created flashcard interface with ${members.length} members`
    );
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
      `lcr-tools-flashcard-${currentFlashcardIndex}`
    );
    if (flashcard) {
      flashcard.classList.toggle("flipped");
    }
  }

  window.memberFlashcardsUtils = {
    navigateToManagePhotosPage,
    navigateToManageTab,
    setSubjectTypeToIndividual,
    setPhotoFilterToMembersWithPhoto,
    collectMemberData,
    createFlashcardInterface,
  };
})();
