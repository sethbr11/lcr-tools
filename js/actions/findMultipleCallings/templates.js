/**
 * Templates for the findMultipleCallings action UI
 */
(() => {
  utils.returnIfLoaded("findMultipleCallingsTemplates");

  const templates = {
    noIssues: `
      <div style="text-align: center; padding: 20px; color: #28a745;">
        <h3 style="margin: 0; color: #28a745;">✓ No Issues Found</h3>
        <p style="margin: 10px 0 0 0;">All members have only one {{scopeText}}calling each.</p>
      </div>
    `,

    multipleCallings: `
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 style="color: #dc3545; margin: 0; display: flex; align-items: center;">
            <span style="color: #dc3545; font-size: 1.2em; margin-right: 8px;">⚠</span>
            Found {{memberCount}} Members with Multiple Callings
          </h3>
          <div>
            <button id="lcr-tools-select-mode-btn" style="padding: 8px 12px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">Select</button>
          </div>
        </div>
        <div id="lcr-tools-selection-controls" style="display: none; margin-bottom: 15px; padding: 10px; background-color: #e9ecef; border-radius: 4px;">
          <button id="lcr-tools-select-all-btn" style="padding: 5px 10px; margin-right: 10px; background-color: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.85em;">Select All</button>
          <button id="lcr-tools-deselect-all-btn" style="padding: 5px 10px; background-color: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.85em;">Deselect All</button>
        </div>
        <div style="max-height: 400px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 4px; padding: 15px; background-color: #f8f9fa;">
          {{membersList}}
        </div>
      </div>
      <div id="lcr-tools-multiple-callings-status" style="margin-top:15px; padding:10px; border-radius:4px; font-size:0.9em; border:1px solid transparent; min-height: 20px; display: none;"></div>
    `,

    memberItem: `
      <div style="margin-bottom: 15px; padding: 10px; background-color: #fff; border-radius: 4px; border-left: 3px solid #dc3545;">
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
          <input type="checkbox" id="member-checkbox-{{index}}" class="member-checkbox" style="display: none; margin-right: 10px;" data-member-name="{{memberNameEscaped}}">
          <div style="font-weight: bold; color: #212529;">{{memberName}}</div>
        </div>
        <div style="font-size: 0.9em; color: #6c757d;">
          {{callingsList}}
        </div>
      </div>
    `,

    callingItem: `
      <span style="display: inline-block; margin: 2px 5px 2px 0; padding: 2px 8px; background-color: #e9ecef; border-radius: 12px; font-size: 0.8em;">{{calling}} ({{organization}})</span>
    `,

    wardCallingsAlert: `
      <div style="display: flex; align-items: center; margin-bottom: 5px;">
        <span style="color: #f39c12; font-size: 1.2em; margin-right: 8px;">ℹ️</span>
        <strong style="color: #856404;">Ward Callings Only</strong>
      </div>
      <p style="margin: 0; font-size: 0.9em; color: #856404; line-height: 1.4;">
        This analysis is limited to ward-level callings visible on this page. 
        To include stake callings and other assignments, run this tool from the 
        <a href="https://lcr.churchofjesuschrist.org/mlt/report/member-callings" target="_blank" style="color: #00509e; text-decoration: underline;">Members with Callings</a> page instead.
      </p>
    `,
  };

  window.findMultipleCallingsTemplates = templates;
})();
