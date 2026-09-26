/**
 * Discovery and inspection routines for identifying state select elements across LCR forms.
 */

import { getCurrentLogger } from '@/utils';
import { Constants, Dom, Regex } from './types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Logs a diagnostic status message to the browser console and active logger.
 *
 * @param message - Informational, warning, or error message text.
 * @param level - Severity level for the log entry ('info', 'warn', 'error').
 */
export function logSyncMessage(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const formatted = `${Constants.STATE_SYNC_LOG_PREFIX} ${message}`;
  if (level === 'error') {
    console.error(formatted);
  } else if (level === 'warn') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }

  const logger = getCurrentLogger();
  if (logger) {
    logger.logAction(
      'STATE_DROPDOWN_SYNC',
      { message, level },
      level.toUpperCase() as 'INFO' | 'WARN' | 'ERROR'
    );
  }
}

/**
 * Checks whether an address container or form is actively rendering an asynchronous spinner.
 *
 * @param root - Subtree root node to inspect for loading spinners.
 * @returns True if active loading spinners, progressbars, or busy containers are present.
 */
export function isAddressLoading(root?: ParentNode): boolean {
  if (typeof document === 'undefined' && !root) return false;
  const doc = root || document;

  const addressContainer = doc.querySelector(Dom.ADDRESS_CONTAINER_SELECTOR);
  if (addressContainer) {
    const spinner = addressContainer.querySelector(Dom.SPINNER_SELECTOR);
    if (spinner) return true;
    if (addressContainer.getAttribute('aria-busy') === 'true') return true;
  }

  const globalSpinner = doc.querySelector(Dom.SPINNER_SELECTOR);
  return globalSpinner !== null;
}

/**
 * Evaluates whether a state dropdown is fully mounted, enabled, and ready for user interaction.
 *
 * @param select - The HTMLSelectElement to inspect.
 * @returns True if the select is enabled, options are loaded, value is present, and no spinner is active.
 */
export function isSelectInteractable(select: HTMLSelectElement): boolean {
  if (select.disabled || select.hasAttribute('disabled')) return false;
  if (select.getAttribute('aria-disabled') === 'true') return false;

  const container =
    select.closest(Dom.EDEN_FORM_FIELD_SELECTOR) ||
    select.closest(Dom.ADDRESS_CONTAINER_SELECTOR) ||
    select.parentElement;

  if (container) {
    if (container.querySelector(Dom.SPINNER_SELECTOR)) return false;
    if (container.getAttribute('aria-busy') === 'true') return false;
  }

  const globalSpinner =
    typeof document !== 'undefined' ? document.querySelector(Dom.SPINNER_SELECTOR) : null;
  if (globalSpinner) return false;

  if (select.options.length <= 1) return false;
  if (!select.value) return false;

  return true;
}

/**
 * Evaluates whether a select DOM element functions as a state or province dropdown.
 *
 * @param select - The HTMLSelectElement to inspect.
 * @returns True if the select matches state name attributes, labels, or contains US state options.
 */
export function isStateSelect(select: HTMLSelectElement): boolean {
  if (
    Regex.COUNTRY_FIELD_PATTERN.test(select.name) ||
    Regex.COUNTRY_FIELD_PATTERN.test(select.id)
  ) {
    return false;
  }

  if (select.name === Dom.STATE_PROVINCE_ID_NAME) return true;
  if (
    Regex.STATE_OR_PROVINCE_PATTERN.test(select.name) ||
    Regex.STATE_OR_PROVINCE_PATTERN.test(select.id)
  ) {
    return true;
  }

  const ariaLabel = select.getAttribute('aria-label') || '';
  if (Regex.STATE_OR_PROVINCE_PATTERN.test(ariaLabel)) return true;

  const testId = select.getAttribute('data-testid') || '';
  if (Regex.STATE_OR_PROVINCE_PATTERN.test(testId)) return true;

  const directLabel = select.closest(Dom.LABEL_TAG_SELECTOR);
  if (directLabel && Regex.STATE_OR_PROVINCE_PATTERN.test(directLabel.textContent || '')) {
    return true;
  }

  if (select.id && typeof document !== 'undefined') {
    const forLabel = document.querySelector(`label[for="${select.id}"]`);
    if (forLabel && Regex.STATE_OR_PROVINCE_PATTERN.test(forLabel.textContent || '')) {
      return true;
    }
  }

  const formField =
    select.closest(Dom.EDEN_FORM_FIELD_SELECTOR) || select.parentElement?.parentElement;
  if (formField) {
    const fieldLabel = formField.querySelector(Dom.EDEN_LABEL_SELECTOR);
    if (fieldLabel && Regex.STATE_OR_PROVINCE_PATTERN.test(fieldLabel.textContent || '')) {
      return true;
    }
  }

  const firstOption = select.options[0]?.textContent?.trim() || '';
  if (Regex.STATE_PLACEHOLDER_PATTERN.test(firstOption)) {
    return true;
  }

  const optionValues = Array.from(select.options).map(
    (opt) => opt.value?.trim().toUpperCase() || ''
  );
  const optionTexts = Array.from(select.options).map((opt) => opt.textContent?.trim() || '');

  const hasMatchingCode = Constants.US_STATE_SAMPLE_CODES.some(
    (code) => optionValues.includes(code) || optionTexts.includes(code)
  );
  if (hasMatchingCode) return true;

  return Constants.US_STATE_SAMPLE_NAMES.some((name) =>
    optionTexts.some((text) => text.toLowerCase() === name.toLowerCase())
  );
}

/**
 * Scans the provided DOM subtree for matching state dropdown elements.
 *
 * @param root - Optional parent node to query within, defaulting to global document.
 * @returns Array of identified state select elements.
 */
export function findStateSelectElements(root?: ParentNode): HTMLSelectElement[] {
  if (typeof document === 'undefined' && !root) return [];
  const doc = root || document;
  const specific = Array.from(doc.querySelectorAll<HTMLSelectElement>(Dom.STATE_SELECT_SELECTOR));
  const general = Array.from(doc.querySelectorAll<HTMLSelectElement>(Dom.ALL_SELECTS_SELECTOR));
  const combined = Array.from(new Set([...specific, ...general]));
  return combined.filter(isStateSelect);
}
