// Content script to remove specific elements and click the edit button on a member profile page.

(function () {
  try {
    // --- 1. Remove the specified <dl> elements ---
    // These elements are within a form named "myForm" which is inside a div with class "editable"

    // Selector for the "Mission Country" dl element
    const missionCountryDl = document.querySelector(
      'form[name="myForm"] dl[ng-if="$ctrl.canEditMission()"]'
    );
    if (missionCountryDl) {
      missionCountryDl.parentNode.removeChild(missionCountryDl);
      console.log("LCR Tools: Removed 'Mission Country' section.");
    } else {
      console.warn(
        "LCR Tools: 'Mission Country' section not found. It might have already been removed or the page structure changed."
      );
    }

    // Selector for the "Mission Language" dl element
    const missionLanguageDl = document.querySelector(
      'form[name="myForm"] dl[ng-if="mbr.missionCountryId"]'
    );
    if (missionLanguageDl) {
      missionLanguageDl.parentNode.removeChild(missionLanguageDl);
      console.log("LCR Tools: Removed 'Mission Language' section.");
    } else {
      console.warn(
        "LCR Tools: 'Mission Language' section not found. It might have already been removed or the page structure changed."
      );
    }

    // --- 2. Click the edit button ---
    // The button is an <a> tag with ng-click="edit()" inside a <p class="btn-edit">
    const editButton = document.querySelector(
      'p.btn-edit a[ng-click="edit()"]'
    );
    if (editButton) {
      console.log("LCR Tools: Clicking the edit button.");
      editButton.click();
    } else {
      console.error(
        "LCR Tools: Edit button not found. Cannot enter edit mode."
      );
      alert("LCR Tools: Could not find the edit button on the page.");
      return { result: { error: "Edit button not found." } };
    }

    return { result: "success" }; // Communicate success back to popup
  } catch (error) {
    console.error("Error in editProfile.js:", error);
    alert(
      `LCR Tools: An error occurred while trying to modify the profile page: ${error.message}`
    );
    return { result: { error: error.message } };
  }
})();
