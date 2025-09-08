/**
 * Utility file specifically for the editMemberProfile action.
 * Handles the removal of specific sections and entering edit mode on the profile page.
 */
(() => {
  utils.returnIfLoaded("editMemberProfileUtils");
  utils.ensureLoaded("uiUtils");

  /**
   * Removes the mission <dl> elements from the profile page
   * that cause the page to stall.
   */
  function removeMissionSections() {
    uiUtils.removeElement(
      'form[name="myForm"] dl[ng-if="$ctrl.canEditMission()"]',
      "Mission Country section"
    );
    uiUtils.removeElement(
      'form[name="myForm"] dl[ng-if="mbr.missionCountryId"]',
      "Mission Language section"
    );
  }

  /**
   * Clicks the edit button to enter edit mode.
   * @returns {boolean} - True if the button was clicked, false otherwise.
   */
  function clickEditButton() {
    return uiUtils.clickButton(
      'p.btn-edit a[ng-click="edit()"]',
      "Edit button"
    );
  }

  window.editMemberProfileUtils = {
    removeMissionSections,
    clickEditButton,
  };
})();
