import { Dom } from '../types';

/* ==========================================================================
   STYLES
   ========================================================================== */

/**
 * Injected stylesheet for attendance dialogs and components.
 */
export const ATTENDANCE_STYLES = `
  .lcrx-modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .lcrx-modal-backdrop, .lcrx-modal-backdrop * { box-sizing: border-box !important; }
  .lcrx-modal-backdrop input, .lcrx-modal-backdrop select, .lcrx-modal-backdrop textarea { box-sizing: border-box !important; max-width: 100% !important; }
  .lcrx-modal-card { background: #ffffff; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1); display: flex; flex-direction: column; max-height: 90vh; border: 1px solid #e2e8f0; color: #1e293b; width: 100%; box-sizing: border-box !important; }
  .lcrx-setup-card { width: 580px; max-height: 560px; }
  .lcrx-results-card { width: 720px; max-height: 85vh; }
  .lcrx-edit-card { width: 640px; max-height: 80vh; }
  .lcrx-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; border-top-left-radius: 12px; border-top-right-radius: 12px; box-sizing: border-box !important; }
  .lcrx-modal-title { margin: 0; font-size: 17px; font-weight: 700; color: #0f172a; }
  .lcrx-modal-subtitle { font-size: 12px; color: #64748b; margin-top: 2px; }
  .lcrx-close-btn { background: none; border: none; font-size: 22px; cursor: pointer; color: #94a3b8; line-height: 1; border-radius: 4px; padding: 2px 6px; }
  .lcrx-close-btn:hover { color: #0f172a; background: #e2e8f0; }
  .lcrx-modal-body { padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; width: 100%; box-sizing: border-box !important; }
  .lcrx-modal-footer { padding: 12px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; box-sizing: border-box !important; }
  .lcrx-footer-between { justify-content: space-between; align-items: center; }
  .lcrx-footer-left { display: flex; gap: 8px; }
  .lcrx-grid-two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; box-sizing: border-box !important; }
  .lcrx-grid-three { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(0, 1.3fr) minmax(0, 1.1fr); gap: 12px; width: 100%; box-sizing: border-box !important; }
  .lcrx-field-group { display: flex; flex-direction: column; gap: 4px; min-width: 0 !important; max-width: 100% !important; width: 100% !important; box-sizing: border-box !important; }
  .lcrx-label { font-size: 12px; font-weight: 600; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lcrx-select, .lcrx-input { width: 100% !important; min-width: 0 !important; max-width: 100% !important; box-sizing: border-box !important; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #0f172a; background: #fff; outline: none; }
  .lcrx-select:focus, .lcrx-input:focus { border-color: #0284c7; box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.2); }
  input[type="number"].lcrx-input { -moz-appearance: textfield; }
  input[type="number"].lcrx-input::-webkit-inner-spin-button,
  input[type="number"].lcrx-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .lcrx-visitor-calc-box { width: 100%; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; box-sizing: border-box !important; }
  .lcrx-visitor-calc-header { display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 600; color: #166534; }
  .lcrx-visitor-calc-inputs { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  .lcrx-calc-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #334155; }
  .lcrx-calc-item label { font-weight: 600; font-size: 11px; }
  .lcrx-format-hint { width: 100%; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 8px 12px; display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #0369a1; box-sizing: border-box !important; }
  .lcrx-format-title { font-weight: 700; font-size: 11px; }
  .lcrx-format-columns { display: flex; gap: 6px; }
  .lcrx-col-pill { background: #e0f2fe; color: #0284c7; font-weight: 600; padding: 2px 6px; border-radius: 4px; border: 1px solid #7dd3fc; }
  .lcrx-format-example { color: #475569; }
  .lcrx-format-example code { background: #e2e8f0; padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: 10px; color: #0f172a; }
  .lcrx-paste-zone { width: 100%; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 16px; text-align: center; cursor: pointer; transition: all 0.2s ease; background: #fafafa; position: relative; box-sizing: border-box !important; }
  .lcrx-paste-zone:hover, .lcrx-paste-zone:focus { border-color: #0284c7; background: #f0f9ff; outline: none; }
  .lcrx-paste-prompt { display: flex; flex-direction: column; gap: 4px; align-items: center; color: #475569; font-size: 13px; }
  .lcrx-paste-icon { font-size: 22px; }
  .lcrx-paste-prompt small { font-size: 11px; color: #64748b; }
  .lcrx-paste-active { display: flex; justify-content: space-between; align-items: center; }
  .lcrx-count-badge { background: #dcfce7; color: #15803d; font-weight: 700; font-size: 13px; padding: 4px 10px; border-radius: 6px; border: 1px solid #86efac; }
  .lcrx-paste-actions { display: flex; gap: 8px; }
  .lcrx-paste-catcher { position: absolute; left: -9999px; opacity: 0; width: 1px; height: 1px; }
  .lcrx-status-banner { width: 100%; font-size: 11px; color: #64748b; padding: 6px 10px; background: #f1f5f9; border-radius: 4px; min-height: 28px; display: flex; align-items: center; justify-content: center; text-align: center; box-sizing: border-box !important; }
  .lcrx-btn { font-size: 12px; font-weight: 600; padding: 7px 14px; border-radius: 6px; border: 1px solid transparent; cursor: pointer; transition: all 0.15s ease; box-sizing: border-box !important; }
  .lcrx-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .lcrx-btn-primary { background: #0284c7; color: #fff; }
  .lcrx-btn-primary:hover:not(:disabled) { background: #0369a1; }
  .lcrx-btn-secondary { background: #fff; border-color: #cbd5e1; color: #334155; }
  .lcrx-btn-secondary:hover:not(:disabled) { background: #f1f5f9; border-color: #94a3b8; }
  .lcrx-btn-danger { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
  .lcrx-btn-danger:hover { background: #fecaca; }
  .lcrx-btn-sm { padding: 4px 8px; font-size: 11px; }
  .lcrx-metrics-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; width: 100%; box-sizing: border-box !important; }
  .lcrx-metric-pill { min-width: 0; border-radius: 8px; padding: 8px 10px; text-align: center; display: flex; flex-direction: column; gap: 2px; box-sizing: border-box !important; }
  .lcrx-metric-total { background: #f1f5f9; color: #334155; }
  .lcrx-metric-marked { background: #ecfdf5; color: #065f46; }
  .lcrx-metric-already { background: #eff6ff; color: #1e40af; }
  .lcrx-metric-unmatched { background: #f8fafc; color: #64748b; }
  .lcrx-metric-unmatched.has-unmatched { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
  .lcrx-metric-num { font-size: 18px; font-weight: 700; line-height: 1.1; }
  .lcrx-metric-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; opacity: 0.85; }
  .lcrx-visitor-bar { width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box !important; }
  .lcrx-visitor-summary { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #334155; }
  .lcrx-visitor-chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .lcrx-visitor-badge { background: #e0f2fe; color: #0369a1; font-weight: 700; padding: 2px 8px; border-radius: 10px; border: 1px solid #bae6fd; font-size: 11px; }
  .lcrx-counter-control { display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; overflow: hidden; box-sizing: border-box !important; }
  .lcrx-counter-btn { background: #f1f5f9; border: none; padding: 4px 8px; font-weight: 700; cursor: pointer; color: #475569; }
  .lcrx-counter-btn:hover { background: #e2e8f0; }
  .lcrx-visitor-val { width: 44px !important; min-width: 0 !important; max-width: 44px !important; border: none !important; text-align: center; font-weight: 700; font-size: 13px; outline: none; -moz-appearance: textfield; box-sizing: border-box !important; }
  .lcrx-visitor-val::-webkit-inner-spin-button,
  .lcrx-visitor-val::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .lcrx-skipped-bar { width: 100%; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 6px 10px; display: flex; align-items: center; gap: 8px; font-size: 11px; box-sizing: border-box !important; }
  .lcrx-skipped-title { font-weight: 600; color: #92400e; }
  .lcrx-chips-container { display: flex; flex-wrap: wrap; gap: 6px; }
  .lcrx-skip-chip { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 2px 8px; font-size: 10px; cursor: pointer; color: #78350f; font-weight: 600; }
  .lcrx-skip-chip:hover { background: #fde68a; }
  .lcrx-unmatched-container { width: 100%; display: flex; flex-direction: column; gap: 8px; box-sizing: border-box !important; }
  .lcrx-unmatched-header { display: flex; justify-content: space-between; align-items: baseline; }
  .lcrx-section-heading { margin: 0; font-size: 13px; font-weight: 700; color: #0f172a; }
  .lcrx-table-scroll { width: 100%; max-height: 240px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px; box-sizing: border-box !important; }
  .lcrx-edit-scroll { max-height: 380px; }
  .lcrx-table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
  .lcrx-table th { background: #f8fafc; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 600; position: sticky; top: 0; z-index: 1; }
  .lcrx-table td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  .lcrx-table tr:hover td { background: #f8fafc; }
  .lcrx-autocomplete-box { position: relative; width: 100%; }
  .lcrx-search-input { width: 100% !important; min-width: 0 !important; max-width: 100% !important; box-sizing: border-box !important; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; }
  .lcrx-dropdown-list { position: fixed; background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.15), 0 4px 6px -4px rgba(0,0,0,0.1); max-height: 160px; overflow-y: auto; z-index: 100020 !important; list-style: none; margin: 0; padding: 4px 0; box-sizing: border-box !important; }
  .lcrx-dropdown-item { padding: 7px 12px; cursor: pointer; font-size: 12px; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lcrx-dropdown-item:hover { background: #e0f2fe; color: #0284c7; }
  .lcrx-simulation-badge { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; font-size: 10px; padding: 2px 7px; border-radius: 4px; font-weight: 700; margin-left: 8px; letter-spacing: 0.5px; }
  .lcrx-nickname-btn { background: #0284c7; color: #fff; border: 1px solid #0369a1; font-size: 11px; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; transition: background 0.15s ease; }
  .lcrx-nickname-btn:hover { background: #0369a1; }
  .lcrx-nickname-badge { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; font-size: 10px; padding: 1px 6px; border-radius: 10px; font-weight: 600; white-space: nowrap; }
  .lcrx-search-toggle { background: none; border: none; font-size: 11px; color: #0284c7; cursor: pointer; text-align: left; padding: 0; text-decoration: underline; width: fit-content; }
  .lcrx-search-toggle:hover { color: #0369a1; }
  .lcrx-nickname-opt { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #64748b; margin-top: 3px; cursor: pointer; user-select: none; }
  .lcrx-nickname-opt input { cursor: pointer; }
  .lcrx-queued-visitor-cell, .lcrx-queued-match-cell { font-weight: 600; padding: 8px 10px; border-radius: 4px; }
  .lcrx-queued-visitor-cell { color: #0369a1; background: #f0f9ff; }
  .lcrx-queued-match-cell { color: #15803d; background: #f0fdf4; }
  .lcrx-queued-status { display: flex; justify-content: space-between; align-items: center; gap: 12px; width: 100%; }
  .lcrx-queued-undo { flex-shrink: 0; }
  .lcrx-nickname-group { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; }
  .lcrx-nickname-group-name { padding: 8px 12px 6px; font-size: 12px; font-weight: 700; color: #0f172a; background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
  .lcrx-nickname-alias-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; font-size: 12px; border-top: 1px solid #f8fafc; }
  .lcrx-nickname-alias-row:first-of-type { border-top: none; }
`;

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Injects modal CSS into the page head if not mounted, or refreshes text content if present.
 */
export function ensureAttendanceStylesInjected(): void {
  const existing = document.getElementById(Dom.ATTENDANCE_STYLES_ID);
  if (existing) {
    existing.textContent = ATTENDANCE_STYLES;
    return;
  }
  const styleEl = document.createElement('style');
  styleEl.id = Dom.ATTENDANCE_STYLES_ID;
  styleEl.textContent = ATTENDANCE_STYLES;
  document.head.appendChild(styleEl);
}
