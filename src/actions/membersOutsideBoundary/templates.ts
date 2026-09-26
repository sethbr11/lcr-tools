import { escapeHtml } from '@/utils';
import { Dom, Types } from './types';

/**
 * HTML templates for membersOutsideBoundary action UI components.
 */

export const Templates = {
  /** Main audit results modal body template. */
  resultsModal: (
    insideCount: number,
    outsideCount: number,
    unmappedCount: number,
    totalCount: number,
    rowsHtml: string
  ): string => `
    <div style="padding: 10px;">
      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <div style="flex: 1; padding: 14px; background: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 8px; text-align: center;">
          <h3 style="margin: 0; color: #2e7d32; font-size: 1.8rem;">${insideCount}</h3>
          <span style="font-size: 0.9rem; color: #2e7d32; font-weight: 600;">Inside Boundary</span>
        </div>
        <div style="flex: 1; padding: 14px; background: #ffebee; border: 1px solid #ffcdd2; border-radius: 8px; text-align: center;">
          <h3 style="margin: 0; color: #c62828; font-size: 1.8rem;">${outsideCount}</h3>
          <span style="font-size: 0.9rem; color: #c62828; font-weight: 600;">Outside Boundary</span>
        </div>
        <div style="flex: 1; padding: 14px; background: #fff3e0; border: 1px solid #ffe0b2; border-radius: 8px; text-align: center;">
          <h3 style="margin: 0; color: #e65100; font-size: 1.8rem;">${unmappedCount}</h3>
          <span style="font-size: 0.9rem; color: #e65100; font-weight: 600;">Unmapped</span>
        </div>
      </div>

      <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; background: #f5f5f5; padding: 10px 14px; border-radius: 6px;">
        <div style="display: flex; gap: 14px; font-size: 13px;">
          <label style="cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <input type="radio" name="boundary-filter" value="all" checked /> Show All
          </label>
          <label style="cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <input type="radio" name="boundary-filter" value="outside" /> Outside Only
          </label>
          <label style="cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <input type="radio" name="boundary-filter" value="inside" /> Inside Only
          </label>
          <label style="cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <input type="radio" name="boundary-filter" value="unmapped" /> Unmapped Only
          </label>
        </div>
        <button id="${Dom.DOWNLOAD_CSV_BTN_ID}" class="lcr-tools-btn lcr-tools-btn-primary" style="padding: 6px 14px; font-size: 13px;">
          ⬇ Download CSV
        </button>
      </div>

      <div id="${Dom.LIST_CONTAINER_ID}" style="max-height: 400px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 6px; background: #ffffff;">
        ${rowsHtml}
        <div id="${Dom.EMPTY_STATE_ID}" style="display: none; padding: 24px; text-align: center; color: #999; font-size: 14px;">
          No members found matching filter '<span id="${Dom.EMPTY_FILTER_NAME_ID}">all</span>'.
        </div>
      </div>
      <div style="margin-top: 10px; font-size: 12px; color: #666; text-align: right;">
        Total Households: ${totalCount}
      </div>
    </div>
  `,

  /** Empty filter state template. */
  emptyState: (filter: string): string => `
    <div style="padding: 20px; text-align: center; color: #999;">
      No members found matching filter '${escapeHtml(filter)}'.
    </div>
  `,

  /** Row item template for an audited household. */
  householdItem: (item: Types.AuditedHousehold): string => {
    let statusText = 'OUTSIDE';
    let statusBg = '#ffebee';
    let statusColor = '#c62828';
    let rowBg = '#fff5f5';

    if (item.status === 'inside') {
      statusText = 'INSIDE';
      statusBg = '#e8f5e9';
      statusColor = '#2e7d32';
      rowBg = '#ffffff';
    } else if (item.status === 'unmapped') {
      statusText = 'UNMAPPED';
      statusBg = '#fff3e0';
      statusColor = '#e65100';
      rowBg = '#fffdf7';
    }

    return `
      <div class="${Dom.HOUSEHOLD_ROW_CLASS}" data-inside="${item.isInside}" data-status="${item.status}" style="padding: 12px 14px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; background: ${rowBg};">
        <div>
          <div style="font-weight: 600; color: #212529; font-size: 14px; margin-bottom: 3px;">${escapeHtml(item.name)}</div>
          <div style="font-size: 12px; color: #666;">🏠 ${escapeHtml(item.address || 'Address unlisted')}</div>
        </div>
        <div style="font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 12px; color: ${statusColor}; background: ${statusBg};">
          ${statusText}
        </div>
      </div>
    `;
  },
};
