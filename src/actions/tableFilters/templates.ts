import { escapeHtml } from '@/utils';
import { Constants, Dom } from './types';

/**
 * HTML templates for tableFilters action UI components.
 */

export const Templates = {
  /** Renders table scope pill badge indicating which tables possess this column. */
  scopeBadge: (badgeText: string): string => `
    <span class="${Dom.FILTER_SCOPE_BADGE_CLASS}" style="padding: 2px 7px; font-size: 11px; font-weight: 500; border-radius: 10px; background: #e3f2fd; color: #1565c0; border: 1px solid #bbdefb; white-space: nowrap;">${escapeHtml(badgeText)}</span>
  `,

  /** Template container for individual column filter controls. */
  filterContainer: (
    label: string,
    id: string,
    optionsHtml: string,
    badgeHtml: string = ''
  ): string => `
    <div style="margin-bottom: 12px; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px; background: #fafafa;">
      <label style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #333;" for="${escapeHtml(id)}">
        <span>${escapeHtml(label)}</span>
        ${badgeHtml}
      </label>
      <select id="${escapeHtml(id)}" style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; background: #fff;">
        <option value="">All</option>
        ${optionsHtml}
      </select>
    </div>
  `,

  /** Template container for vacant callings filter control. */
  vacancyFilterContainer: (id: string, selectedValue: string = ''): string => `
    <div style="margin-bottom: 12px; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px; background: #fafafa;">
      <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #333;" for="${escapeHtml(id)}">${Constants.VACANCY_FILTER_LABEL}</label>
      <select id="${escapeHtml(id)}" style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; background: #fff;">
        <option value="${Constants.VACANCY_OPTION_ALL}"${selectedValue === Constants.VACANCY_OPTION_ALL ? ' selected' : ''}>All Callings</option>
        <option value="${Constants.VACANCY_OPTION_EXCLUDE}"${selectedValue === Constants.VACANCY_OPTION_EXCLUDE ? ' selected' : ''}>Hide Vacant (Filled Only)</option>
        <option value="${Constants.VACANCY_OPTION_ONLY}"${selectedValue === Constants.VACANCY_OPTION_ONLY ? ' selected' : ''}>Only Vacant Callings</option>
      </select>
    </div>
  `,

  /** Template container for number/age min-max range filter controls. */
  numberRangeContainer: (
    label: string,
    minId: string,
    maxId: string,
    minValue?: number,
    maxValue?: number,
    badgeHtml: string = ''
  ): string => `
    <div style="margin-bottom: 12px; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px; background: #fafafa;">
      <label style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #333;">
        <span>${escapeHtml(label)} (Min - Max)</span>
        ${badgeHtml}
      </label>
      <div style="display: flex; gap: 8px;">
        <input type="number" id="${escapeHtml(minId)}" placeholder="Min" value="${minValue !== undefined && !isNaN(minValue) ? minValue : ''}" style="flex: 1; min-width: 0; box-sizing: border-box; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; background: #fff;" />
        <input type="number" id="${escapeHtml(maxId)}" placeholder="Max" value="${maxValue !== undefined && !isNaN(maxValue) ? maxValue : ''}" style="flex: 1; min-width: 0; box-sizing: border-box; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; background: #fff;" />
      </div>
    </div>
  `,

  /** Template container for date from-to range filter controls. */
  dateRangeContainer: (
    label: string,
    fromId: string,
    toId: string,
    fromDate?: string,
    toDate?: string,
    badgeHtml: string = ''
  ): string => `
    <div style="margin-bottom: 12px; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px; background: #fafafa;">
      <label style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #333;">
        <span>${escapeHtml(label)} (Date Range)</span>
        ${badgeHtml}
      </label>
      <div style="display: flex; gap: 8px;">
        <input type="date" id="${escapeHtml(fromId)}" value="${escapeHtml(fromDate || '')}" style="flex: 1; min-width: 0; box-sizing: border-box; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; background: #fff;" />
        <input type="date" id="${escapeHtml(toId)}" value="${escapeHtml(toDate || '')}" style="flex: 1; min-width: 0; box-sizing: border-box; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; background: #fff;" />
      </div>
      <div style="margin-top: 4px; font-size: 11px; color: #777;">Leave empty to include all dates</div>
    </div>
  `,

  /** Template container for month & day filter controls (e.g. Birthday list). */
  monthDayRangeContainer: (
    label: string,
    monthId: string,
    fromDayId: string,
    toDayId: string,
    selectedMonth?: number,
    fromDay?: number,
    toDay?: number,
    badgeHtml: string = ''
  ): string => {
    const monthOptions = Constants.MONTH_DISPLAY_NAMES.map((name, idx) => {
      const monthNum = idx + 1;
      const isSelected = selectedMonth === monthNum ? ' selected' : '';
      return `<option value="${monthNum}"${isSelected}>${escapeHtml(name)}</option>`;
    }).join('');

    return `
    <div style="margin-bottom: 12px; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px; background: #fafafa;">
      <label style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #333;" for="${escapeHtml(monthId)}">
        <span>${escapeHtml(label)} (Month & Day)</span>
        ${badgeHtml}
      </label>
      <div style="margin-bottom: 8px;">
        <select id="${escapeHtml(monthId)}" style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; background: #fff;">
          <option value="">All Months</option>
          ${monthOptions}
        </select>
      </div>
      <div style="display: flex; gap: 8px;">
        <input type="number" id="${escapeHtml(fromDayId)}" placeholder="From Day (1-31)" min="1" max="31" value="${fromDay !== undefined && !isNaN(fromDay) ? fromDay : ''}" style="flex: 1; min-width: 0; box-sizing: border-box; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; background: #fff;" />
        <input type="number" id="${escapeHtml(toDayId)}" placeholder="To Day (1-31)" min="1" max="31" value="${toDay !== undefined && !isNaN(toDay) ? toDay : ''}" style="flex: 1; min-width: 0; box-sizing: border-box; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; background: #fff;" />
      </div>
      <div style="margin-top: 4px; font-size: 11px; color: #777;">Select month or specify day range</div>
    </div>
  `;
  },

  /** Template for multi-table selector dropdown. */
  tableSelectorContainer: (tableOptionsHtml: string): string => `
    <div style="margin-bottom: 16px; padding: 12px; background: #f0f7ff; border: 1px solid #cce5ff; border-radius: 6px;">
      <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #004085;" for="${Dom.TABLE_SELECTOR_ID}">Select Table to Filter:</label>
      <select id="${Dom.TABLE_SELECTOR_ID}" style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #b8daff; border-radius: 4px; font-size: 13px; background: #fff;">
        ${tableOptionsHtml}
      </select>
    </div>
  `,

  /** Template for "Load All Data" pagination banner. */
  loadAllDataBanner: (): string => `
    <div id="${Dom.LOAD_DATA_CONTAINER_ID}" style="margin-bottom: 16px; padding: 12px; background: #fff8e1; border: 1px solid #ffe082; border-left: 4px solid #ffb300; border-radius: 6px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
        <span style="font-weight: 600; font-size: 13px; color: #b78103;">More Data Available</span>
      </div>
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #6d4c41; line-height: 1.4;">
        This table has multiple pages or scrollable content. Click below to load all rows into view before filtering.
      </p>
      <button id="${Dom.LOAD_ALL_DATA_BTN_ID}" style="width: 100%; box-sizing: border-box; padding: 8px 12px; background: #ffb300; color: #212121; font-weight: 600; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; transition: background 0.2s;">
        Load All Data
      </button>
    </div>
  `,

  /** Side modal main container body template. */
  sideModalBody: (
    tableName: string,
    filterControlsHtml: string,
    tableSelectorHtml: string = '',
    paginationBannerHtml: string = ''
  ): string => `
    ${tableSelectorHtml}
    ${paginationBannerHtml}
    <div style="margin-bottom: 16px;">
      <p id="${Dom.CURRENT_TABLE_NAME_ID}" style="margin: 0 0 6px 0; font-weight: 600; color: #00509e;">Table: ${escapeHtml(tableName)}</p>
      <p style="margin: 0; font-size: 13px; color: #666;">Apply filters below to show or hide matching table rows:</p>
    </div>
    <div id="${Dom.STATUS_ELEMENT_ID}" style="margin-bottom: 14px; padding: 10px; border-radius: 4px; font-size: 13px; display: none;"></div>
    <div id="${Dom.FILTER_CONTROLS_ID}">
      ${filterControlsHtml}
    </div>
  `,
};
