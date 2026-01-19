/**
 * ACTION: MEMBERS OUTSIDE BOUNDARY (Boundary Audit)
 *
 * This action initiates a "Boundary Audit" to identify members located outside the
 * official ward boundaries.
 *
 * Workflow:
 * 1. The user triggers the action from the extension popup.
 * 2. `membersOutsideBoundaryUtils.triggerAudit()` is called.
 * 3. This prompts the user to reload the page to capture network traffic.
 * 4. On reload, `membersOutsideBoundaryUtils` (loaded via manifest content script)
 *    detects the pending audit flag and intercepts the member list data.
 * 5. It then captures the map boundary overlay and performs a geometric analysis.
 * 6. Finally, it displays the results in a modal with CSV export options.
 */

(function () {
  utils.ensureLoaded("membersOutsideBoundaryUtils");
  membersOutsideBoundaryUtils.triggerAudit();
})();
