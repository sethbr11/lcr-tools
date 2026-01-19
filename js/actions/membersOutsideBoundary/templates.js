/**
 * Templates for the membersOutsideBoundary action UI
 */
(() => {
  utils.returnIfLoaded("membersOutsideBoundaryTemplates");

  const templates = {
    resultsModalStructure: `
      <div style="padding: 10px;">
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
          <div style="flex: 1; padding: 15px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0; color: #155724; font-size: 2em;">{{insideCount}}</h3>
            <span style="font-size: 1em; color: #155724; font-weight: 500;">Inside Boundary</span>
          </div>
          <div style="flex: 1; padding: 15px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0; color: #721c24; font-size: 2em;">{{outsideCount}}</h3>
            <span style="font-size: 1em; color: #721c24; font-weight: 500;">Outside Boundary</span>
          </div>
        </div>
        
        <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; padding: 10px; border-radius: 6px;">
          <div style="display: flex; gap: 15px;">
            <label style="cursor: pointer; display: flex; align-items: center;">
              <input type="radio" name="view-filter" value="all" checked style="margin-right: 6px;"> Show All
            </label>
            <label style="cursor: pointer; display: flex; align-items: center;">
              <input type="radio" name="view-filter" value="outside" style="margin-right: 6px;"> Outside Only
            </label>
            <label style="cursor: pointer; display: flex; align-items: center;">
              <input type="radio" name="view-filter" value="inside" style="margin-right: 6px;"> Inside Only
            </label>
          </div>
          <button id="download-csv-btn" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; display: flex; align-items: center;">
            <span style="margin-right: 5px;">⬇</span> Download CSV
          </button>
        </div>

        <div id="member-list-container" style="max-height: 450px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 4px; background: #fff;">
          {{memberListHTML}}
        </div>
        <div style="margin-top: 10px; font-size: 0.85em; color: #666; text-align: right;">
          Total Households: {{totalHouseholds}}
        </div>
      </div>
    `,
    listItem: `
      <div style="padding: 12px 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: {{backgroundColor}}; transition: background 0.2s;">
        <div>
          <div style="font-weight: 600; color: #333; margin-bottom: 2px;">{{name}}</div>
          <div style="font-size: 0.85em; color: #666; display: flex; align-items: center;">
            <span style="margin-right: 10px;">🏠 {{address}}</span>
            {{reasonBadge}}
          </div>
        </div>
        <div style="font-size: 0.85em; font-weight: 700; padding: 4px 10px; border-radius: 20px; color: {{statusColor}}; background: {{statusBackground}};">
          {{status}}
        </div>
      </div>
    `,
    reasonBadge: `<span style="color: #dc3545; background: #ffebeb; padding: 1px 6px; border-radius: 4px; font-size: 0.9em;">{{reason}}</span>`,
    emptyState: `<div style="padding: 20px; text-align: center; color: #999;">No members found matching filter '{{filter}}'.</div>`,
  };

  window.membersOutsideBoundaryTemplates = templates;
})();
