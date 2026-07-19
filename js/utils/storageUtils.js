/**
 * Utility for handling Chrome storage operations.
 * Specifically manages the photo cache for Member Flashcards and No Photo List.
 */
(() => {
  if (utils.returnIfLoaded("storageUtils")) return;
  utils.ensureLoaded("modalUtils", "uiUtils"); // Ensure modalUtils is loaded

  const PHOTO_CACHE_KEY = "lcr_photo_cache";
  const CACHE_SETTINGS_KEY = "lcr_cache_settings";

  /**
   * Gets the current photo cache from storage
   * @returns {Promise<Object>} - The cache object
   */
  async function getPhotoCache() {
    return new Promise((resolve) => {
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.local
      ) {
        chrome.storage.local.get([PHOTO_CACHE_KEY], (result) => {
          resolve(result[PHOTO_CACHE_KEY] || {});
        });
      } else {
        try {
          const val = localStorage.getItem(PHOTO_CACHE_KEY);
          resolve(val ? JSON.parse(val) : {});
        } catch (e) {
          resolve({});
        }
      }
    });
  }

  /**
   * Updates the photo cache with new member data
   * @param {Object} newEntries - Map of memberId to { hasPhoto, photoUrl, fullName }
   */
  async function updatePhotoCache(newEntries) {
    const currentCache = await getPhotoCache();
    const updatedCache = { ...currentCache, ...newEntries };

    // Limit cache size to prevent hitting storage limits (e.g., max 2000 members)
    const keys = Object.keys(updatedCache);
    if (keys.length > 2000) {
      // Simple FIFO: remove oldest entries
      const keysToRemove = keys.slice(0, keys.length - 2000);
      keysToRemove.forEach((k) => delete updatedCache[k]);
    }

    return new Promise((resolve) => {
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.local
      ) {
        chrome.storage.local.set({ [PHOTO_CACHE_KEY]: updatedCache }, () => {
          resolve();
        });
      } else {
        try {
          localStorage.setItem(PHOTO_CACHE_KEY, JSON.stringify(updatedCache));
        } catch (e) {
          console.error(
            "LCR Tools: Failed to update localStorage photo cache:",
            e,
          );
        }
        resolve();
      }
    });
  }

  /**
   * Clears the entire photo cache
   */
  async function clearPhotoCache() {
    return new Promise((resolve) => {
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.local
      ) {
        chrome.storage.local.remove([PHOTO_CACHE_KEY], () => {
          console.log("LCR Tools: Photo cache cleared.");
          uiUtils.showToast("Photo cache cleared!", "success");
          resolve();
        });
      } else {
        try {
          localStorage.removeItem(PHOTO_CACHE_KEY);
          console.log("LCR Tools: Photo cache cleared (localStorage).");
          uiUtils.showToast("Photo cache cleared!", "success");
        } catch (e) {
          console.error(
            "LCR Tools: Failed to clear localStorage photo cache:",
            e,
          );
        }
        resolve();
      }
    });
  }

  /**
   * Gets cache settings (enabled/disabled)
   * @returns {Promise<Object>} - { enabled: boolean }
   */
  async function getCacheSettings() {
    return new Promise((resolve) => {
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.local
      ) {
        chrome.storage.local.get([CACHE_SETTINGS_KEY], (result) => {
          resolve(result[CACHE_SETTINGS_KEY] || { enabled: true });
        });
      } else {
        try {
          const val = localStorage.getItem(CACHE_SETTINGS_KEY);
          resolve(val ? JSON.parse(val) : { enabled: true });
        } catch (e) {
          resolve({ enabled: true });
        }
      }
    });
  }

  /**
   * Updates cache settings
   * @param {Object} settings - { enabled: boolean }
   */
  async function setCacheSettings(settings) {
    return new Promise((resolve) => {
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.local
      ) {
        chrome.storage.local.set({ [CACHE_SETTINGS_KEY]: settings }, () => {
          resolve();
        });
      } else {
        try {
          localStorage.setItem(CACHE_SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {
          console.error("LCR Tools: Failed to set localStorage settings:", e);
        }
        resolve();
      }
    });
  }

  /**
   * Displays a modal for photo cache settings and action confirmation.
   * @param {Object} config - Configuration for the modal
   * @param {string} config.title - Modal title
   * @param {string} config.description - Main description/warning message
   * @returns {Promise<Object>} - Resolves with { proceed: boolean, enabled: boolean }
   */
  async function showPhotoActionConfirmationModal(config = {}) {
    const {
      title = "Photo Cache Settings",
      description = "Enabling photo caching speeds up subsequent runs of photo-related actions (Flashcards, No Photos Report) by storing photo availability locally. This data is stored only on your device and is never sent externally.",
    } = config;

    const currentSettings = await getCacheSettings();
    let enabled = currentSettings.enabled;

    return new Promise((resolve) => {
      const modalContent = `
        <div style="padding: 20px; line-height: 1.6;">
          <p style="margin-bottom: 20px;">
            ${description}
          </p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e9ecef;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-weight: 500;">Enable Photo Cache:</span>
              <label class="switch">
                <input type="checkbox" id="photo-cache-toggle" ${
                  enabled ? "checked" : ""
                }>
                <span class="slider round"></span>
              </label>
            </div>
            <p style="font-size: 0.85em; color: #666; margin-bottom: 15px;">
              Speeds up subsequent runs by caching photo status.
            </p>
            <button id="clear-photo-cache-button" class="lcr-tools-btn lcr-tools-btn-secondary" style="width: 100%; font-size: 0.85em;">
              Clear All Cached Photos
            </button>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="cache-settings-cancel" class="lcr-tools-btn lcr-tools-btn-secondary">
              Cancel
            </button>
            <button id="cache-settings-continue" class="lcr-tools-btn lcr-tools-btn-primary">
              Continue
            </button>
          </div>
        </div>
      `;

      modalUtils.createStandardModal({
        id: "lcr-tools-photo-action-confirmation-modal",
        title: title,
        content: modalContent,
        hideDefaultButtons: true,
        modalOptions: {
          maxWidth: "450px",
        },
        onClose: () =>
          resolve({ proceed: false, enabled: currentSettings.enabled }),
      });

      const toggle = document.getElementById("photo-cache-toggle");
      const clearBtn = document.getElementById("clear-photo-cache-button");
      const continueBtn = document.getElementById("cache-settings-continue");
      const cancelBtn = document.getElementById("cache-settings-cancel");

      if (toggle) {
        toggle.addEventListener("change", (e) => {
          enabled = e.target.checked;
        });
      }

      if (clearBtn) {
        clearBtn.addEventListener("click", async () => {
          if (confirm("Are you sure you want to clear the photo cache?")) {
            await clearPhotoCache();
            enabled = true;
            if (toggle) toggle.checked = true;
          }
        });
      }

      if (continueBtn) {
        continueBtn.addEventListener("click", async () => {
          await setCacheSettings({ enabled });
          modalUtils.closeModal("lcr-tools-photo-action-confirmation-modal");
          resolve({ proceed: true, enabled });
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
          modalUtils.closeModal("lcr-tools-photo-action-confirmation-modal");
          resolve({ proceed: false, enabled: currentSettings.enabled });
        });
      }
    });
  }

  window.storageUtils = {
    getPhotoCache,
    updatePhotoCache,
    clearPhotoCache,
    getCacheSettings,
    setCacheSettings,
    showPhotoActionConfirmationModal,
  };
})();
