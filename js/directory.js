document.addEventListener("DOMContentLoaded", () => {
  const directoryList = document.getElementById("directory-list");
  const backButton = document.getElementById("back-button");
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");

  // Handle back button
  if (backButton) {
    backButton.addEventListener("click", () => {
      const container = document.querySelector(".popup-container");
      container.classList.remove("slide-in-right");
      container.classList.add("slide-out-right");
      setTimeout(() => {
        window.location.href = "popup.html";
      }, 300);
    });
  }

  // Get action metadata from actions.js (single source of truth)
  const actionDirectory = window.ACTION_METADATA.map(action => ({
    title: action.title,
    category: action.category,
    description: action.description,
    availableOn: action.directoryPages,
    excludedPages: action.directoryExcluded
  }));

  // Create action card element
  function createActionCard(action) {
    const card = document.createElement("div");
    card.className = "action-card";
    card.dataset.category = action.category;
    card.dataset.title = action.title.toLowerCase();
    card.dataset.description = action.description.toLowerCase();

    const title = document.createElement("h3");
    title.className = "action-card-title";
    title.textContent = action.title;
    card.appendChild(title);

    const description = document.createElement("p");
    description.className = "action-card-pages";
    description.textContent = action.description;
    card.appendChild(description);

    // Available on section
    const availableSection = document.createElement("div");
    availableSection.className = "action-card-pages";

    const availableLabel = document.createElement("strong");
    availableLabel.textContent = "Available on: ";
    availableSection.appendChild(availableLabel);

    // Create page links or text
    const pageLinks = document.createElement("div");
    pageLinks.className = "page-links";

    action.availableOn.forEach(page => {
      if (page.url) {
        // Create clickable link if URL is provided
        const link = document.createElement("a");
        link.className = "page-link";
        link.href = page.url;
        link.target = "_blank";
        link.title = `Open ${page.name}`;

        link.innerHTML = `
          ${page.name}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        `;

        pageLinks.appendChild(link);
      } else {
        // Create non-clickable text if no URL
        const textSpan = document.createElement("span");
        textSpan.className = "page-text";
        textSpan.textContent = page.name;
        pageLinks.appendChild(textSpan);
      }
    });

    availableSection.appendChild(pageLinks);
    card.appendChild(availableSection);

    // Excluded pages section (if any)
    if (action.excludedPages && action.excludedPages.length > 0) {
      const excludedSection = document.createElement("p");
      excludedSection.className = "action-card-pages";
      excludedSection.style.marginTop = "8px";
      excludedSection.style.fontSize = "0.8em";
      excludedSection.style.color = "#868e96";
      excludedSection.innerHTML = `<em>Not available on: ${action.excludedPages.join(", ")}</em>`;
      card.appendChild(excludedSection);
    }

    return card;
  }

  // Filter and render actions
  function renderActions() {
    const searchQuery = searchInput.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value;

    // Filter actions
    let filteredActions = actionDirectory.filter(action => {
      // Category filter
      if (selectedCategory !== "all" && action.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const matchesTitle = action.title.toLowerCase().includes(searchQuery);
        const matchesDescription = action.description.toLowerCase().includes(searchQuery);
        return matchesTitle || matchesDescription;
      }

      return true;
    });

    // Clear directory list
    directoryList.innerHTML = "";

    // Show no results message if no actions match
    if (filteredActions.length === 0) {
      const noResults = document.createElement("div");
      noResults.className = "no-results-message";
      noResults.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <h3>No actions found</h3>
        <p>Try adjusting your search or filter criteria</p>
      `;
      directoryList.appendChild(noResults);
      return;
    }

    // Group filtered actions by category
    const categorizedActions = filteredActions.reduce((acc, action) => {
      if (!acc[action.category]) {
        acc[action.category] = [];
      }
      acc[action.category].push(action);
      return acc;
    }, {});

    // Render actions by category
    Object.keys(categorizedActions).forEach(category => {
      // Add section header
      const sectionHeader = document.createElement("div");
      sectionHeader.className = "section-header";
      sectionHeader.textContent = category;
      directoryList.appendChild(sectionHeader);

      // Add action cards for this category
      categorizedActions[category].forEach(action => {
        const card = createActionCard(action);
        directoryList.appendChild(card);
      });
    });
  }

  // Add event listeners for search and filter
  searchInput.addEventListener("input", renderActions);
  categoryFilter.addEventListener("change", renderActions);

  // Initial render
  renderActions();
});
