import { Dom, Constants, Types } from '../types';
import { createStandardModal } from './modalUtils';
import { hideLoadingIndicator } from './uiUtils';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Displays a standard maintenance modal notifying the user of an unexpected LCR layout update
 * and prompts them to reach out to the developer for maintenance.
 *
 * Automatically dismisses any active loading spinners, formats the maintainer contact mailto link
 * using the centralized Constants.MAINTENANCE_EMAIL, and cleanly closes off execution.
 *
 * @param optionsOrReason - String explanation or options object specifying actionName and reason.
 * @param maybeReason - Optional details string if the first argument was an action name string.
 * @returns The created modal backdrop container element.
 */
export function showLcrMaintenanceModal(
  optionsOrReason?: string | Types.MaintenanceModalOptions,
  maybeReason?: string
): HTMLElement {
  hideLoadingIndicator();

  let actionName: string | undefined;
  let reason: string | undefined;

  if (typeof optionsOrReason === 'string') {
    if (maybeReason !== undefined) {
      actionName = optionsOrReason;
      reason = maybeReason;
    } else {
      reason = optionsOrReason;
    }
  } else if (optionsOrReason && typeof optionsOrReason === 'object') {
    actionName = optionsOrReason.actionName;
    reason = optionsOrReason.reason;
  }

  const maintenanceEmail = Constants.MAINTENANCE_EMAIL;
  const contextText = actionName ? ` for <strong>${actionName}</strong>` : '';
  const reasonText = reason
    ? `<p style="margin: 0 0 12px 0; color: #b91c1c; font-size: 13px; font-weight: 500;">Details: ${reason}</p>`
    : '';

  const subjectLine = actionName
    ? `LCR%20Maintenance%20Request%20-%20${encodeURIComponent(actionName)}`
    : 'LCR%20Maintenance%20Request';

  const content = `
    <div style="font-size: 14px; line-height: 1.6; color: #334155;">
      <p style="margin: 0 0 12px 0;">
        The Church appears to have updated the layout or structure of this LCR page${contextText}, and the extension automation setup does not match what is expected.
      </p>
      ${reasonText}
      <p style="margin: 0 0 12px 0;">
        This action has been safely closed off to prevent unintended changes. Please reach out to me so I can update the extension to support this layout:
      </p>
      <div style="background-color: #f1f5f9; border-radius: 6px; padding: 12px 16px; margin-bottom: 8px;">
        <span style="font-weight: 600; color: #0f172a;">Maintainer Contact: </span>
        <a href="mailto:${maintenanceEmail}?subject=${subjectLine}" style="color: #0284c7; font-weight: 600; text-decoration: underline;">
          ${maintenanceEmail}
        </a>
      </div>
    </div>
  `;

  return createStandardModal({
    id: Dom.MAINTENANCE_MODAL_ID,
    title: 'LCR Maintenance Required',
    content,
    width: '520px',
    buttons: [
      {
        text: 'Close',
        type: 'secondary',
        onClick: () => {},
      },
    ],
  });
}
