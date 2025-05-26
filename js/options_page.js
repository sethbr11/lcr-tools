document.addEventListener("DOMContentLoaded", () => {
  const optionsContent = document.getElementById("options-content");
  const urlParams = new URLSearchParams(window.location.search);
  const section = urlParams.get("section"); // Get context from URL parameter

  optionsContent.innerHTML = ""; // Clear loading message

  if (section === "membership") loadMembershipOptions();
  else {
    optionsContent.innerHTML =
      "<p>No specific options loaded. Select a tool from the LCR Tools popup.</p>";
  }

  /** Example code for loading a page action instead of a script. Not in use */
  function loadMembershipOptions() {
    loadPartial("load_membership_options.inc").then((html) => {
      optionsContent.innerHTML = html;

      document
        .getElementById("execute-member-action")
        .addEventListener("click", () => {
          const filter = document.getElementById("member-filter").value;
          const action = document.getElementById("member-action").value;
          const statusDiv = document.getElementById("member-action-status");

          statusDiv.textContent = `Executing "${action}" with filter "${filter}"... (This is a placeholder)`;
          // In a real scenario, you might send messages to background.js or content scripts
          // to perform these actions, as options pages don't have direct access to web page DOMs.
          console.log("Action:", action, "Filter:", filter);

          // Example: If you needed to interact with the active LCR tab, you'd use messaging:
          // chrome.runtime.sendMessage({
          //     type: "FROM_OPTIONS_PAGE",
          //     action: "PERFORM_MEMBER_TASK",
          //     payload: { filter, task: action }
          // }, response => {
          //     if (response && response.status === 'success') {
          //         statusDiv.textContent = 'Task initiated successfully on LCR page.';
          //     } else {
          //         statusDiv.textContent = 'Failed to initiate task. Ensure you are on an LCR page.';
          //     }
          // });
        });
    });
  }

  // Add functions for other sections like loadAnotherSectionOptions() if needed
});

// Function to load HTML partials dynamically
function loadPartial(partialName) {
  return fetch("options_page_partials/" + partialName).then((response) =>
    response.text()
  );
}
