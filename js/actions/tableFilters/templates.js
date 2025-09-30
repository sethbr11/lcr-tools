/**
 * Templates for the tableFilters action UI
 */
(() => {
  utils.returnIfLoaded("tableFilterTemplates");

  const templates = {
    // Common styles
    filterContainer: `margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 4px;`,
    filterLabel: `display: block; margin-bottom: 5px; font-weight: bold;`,
    filterSelect: `width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 3px;`,
    filterInput: `width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 3px;`,

    // Table selection modal templates
    tableSelectionModal: `
      <div style="margin-bottom: 15px;">
        <p>{{message}}</p>
      </div>
      <div id="lcr-tools-table-selection">
        {{tableOptions}}
      </div>
    `,

    tableOption: `
      <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;" 
           data-table-index="{{index}}" class="lcr-tools-table-option">
        <strong>{{label}}</strong>
        <div style="font-size: 12px; color: #666; margin-top: 5px;">
          Type: {{type}} | ID: {{id}}
        </div>
      </div>
    `,

    // Filter modal content templates
    singleTableModalContent: `
      <div style="margin-bottom: 15px;">
        <p><strong>Filtering:</strong> {{tableLabel}}</p>
        <p style="font-size: 14px; color: #666;">Select filters to apply to the table data:</p>
      </div>
      
      <div id="lcr-tools-filter-options">
        <!-- Filter options will be populated here -->
      </div>
      
      <div id="lcr-tools-filter-status" style="display: none; margin-top: 15px; padding: 10px; border-radius: 4px;"></div>
    `,

    multiTableModalContent: `
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: bold;">Select Table to Filter:</label>
        <select id="lcr-tools-table-selector" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
          <option value="">Choose a table...</option>
          {{tableOptions}}
        </select>
      </div>
      
      <div id="lcr-tools-filter-options" style="display: none;">
        <!-- Filter options will be populated here -->
      </div>
      
      <div id="lcr-tools-filter-status" style="display: none; margin-top: 15px; padding: 10px; border-radius: 4px;"></div>
    `,

    filterOptionsContent: `
      <div style="margin-bottom: 15px;">
        <p><strong>Filtering:</strong> {{tableLabel}}</p>
        <p style="font-size: 14px; color: #666;">Select filters to apply to the table data:</p>
      </div>
      
      <div id="lcr-tools-filter-options">
        {{filterOptions}}
      </div>
      
      <div id="lcr-tools-filter-status" style="display: none; margin-top: 15px; padding: 10px; border-radius: 4px;"></div>
    `,

    // Filter control templates
    genderFilter: `
      <div style="{{filterContainer}}">
        <label style="{{filterLabel}}">{{header}}</label>
        <select id="lcr-tools-filter-{{columnIndex}}" style="{{filterSelect}}">
          <option value="">All</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
        </select>
      </div>
    `,

    statusFilter: `
      <div style="{{filterContainer}}">
        <label style="{{filterLabel}}">{{header}}</label>
        <select id="lcr-tools-filter-{{columnIndex}}" style="{{filterSelect}}">
          <option value="">All</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
    `,

    booleanFilter: `
      <div style="{{filterContainer}}">
        <label style="{{filterLabel}}">{{header}}</label>
        <select id="lcr-tools-filter-{{columnIndex}}" style="{{filterSelect}}">
          <option value="">All</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>
    `,

    dropdownFilter: `
      <div style="{{filterContainer}}">
        <label style="{{filterLabel}}">{{header}}</label>
        <select id="lcr-tools-filter-{{columnIndex}}" style="{{filterSelect}}">
          <option value="">All</option>
          {{options}}
        </select>
      </div>
    `,

    ageFilter: `
      <div style="{{filterContainer}}">
        <label style="{{filterLabel}}">{{header}}</label>
        <div style="display: flex; gap: 10px;">
          <input type="number" id="lcr-tools-filter-{{columnIndex}}-min" placeholder="Min age" style="flex: 1; {{filterInput}}">
          <input type="number" id="lcr-tools-filter-{{columnIndex}}-max" placeholder="Max age" style="flex: 1; {{filterInput}}">
        </div>
      </div>
    `,

    dateFilter: `
      <div style="{{filterContainer}}">
        <label style="{{filterLabel}}">{{header}}</label>
        <div style="display: flex; gap: 10px;">
          <input type="date" id="lcr-tools-filter-{{columnIndex}}-from" placeholder="From date" style="flex: 1; {{filterInput}}">
          <input type="date" id="lcr-tools-filter-{{columnIndex}}-to" placeholder="To date" style="flex: 1; {{filterInput}}">
        </div>
        <div style="margin-top: 5px; font-size: 12px; color: #666;">
          Leave empty to include all dates in that range
        </div>
      </div>
    `,

    textFilter: `
      <div style="{{filterContainer}}">
        <label style="{{filterLabel}}">{{header}}</label>
        <input type="text" id="lcr-tools-filter-{{columnIndex}}" placeholder="Filter by {{headerLower}}" style="{{filterInput}}">
      </div>
    `,

    // Status message templates
    filterStatusActive: `
      <strong>Active filters:</strong> {{activeFilters}}
    `,

    filterStatusApplied: `
      <strong>Filter applied:</strong> Showing {{visibleCount}} of {{totalCount}} rows
    `,

    dropdownOption: `<option value="{{value}}">{{value}}</option>`,

    // Navigation button template
    navigationButton: `
      <div style="margin: 20px 0; padding: 15px; background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border: 1px solid #ffeaa7; border-radius: 8px; border-left: 4px solid #ffc107;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
          <span style="font-size: 18px;">📜</span>
          <h4 style="margin: 0; color: #856404; font-weight: 600;">Load All Data</h4>
        </div>
        <p style="margin: 0 0 12px 0; font-size: 13px; color: #856404; line-height: 1.4;">
          This page may have more data that needs to be loaded by scrolling. 
          Click the button below to scroll and load all data, then return to the top.
        </p>
        <button id="lcr-tools-load-data-btn" style="padding: 10px 16px; background: #ffc107; color: #212529; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; width: 100%;">
          Load All Data
        </button>
      </div>
    `,
  };

  window.tableFilterTemplates = templates;
})();
