/**
 * ACTION: EDIT MEMBER PROFILE
 * A simple action that removes specific sections from the profile page
 * and enters edit mode.
 *
 * See editMemberProfileUtils.js for in-depth implementation—this file acts as a
 * high-level overview of everything that is happening.
 */
(async function () {
  utils.ensureLoaded("editMemberProfileUtils");

  // Remove problematic page features and click the edit button
  editMemberProfileUtils.removeMissionSections();
  editMemberProfileUtils.clickEditButton();
})();
