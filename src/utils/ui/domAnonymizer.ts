/**
 * Development-only DOM Anonymizer utility for LCR Tools.
 *
 * Sanitizes live DOM trees into structural, 100% PII-free skeletons
 * preserving tags, classes, IDs, and ARIA attributes for rapid parser development.
 */

import { Constants, Regex } from '@/types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Sanitizes an HTML element by replacing all member names, dates, phone numbers,
 * email addresses, and photos with synthetic placeholders while preserving
 * the entire DOM hierarchy, CSS class list, element IDs, and tag structure.
 *
 * @param element - Target DOM element to clone and sanitize.
 * @param maxRows - Optional maximum number of table body rows to retain (defaults to 10).
 * @returns Cleaned HTML string free of personally identifiable information.
 */
export function anonymizeElement(
  element: HTMLElement,
  maxRows: number = Constants.ANONYMIZER_MAX_SAMPLE_ROWS
): string {
  // Step 1: Deep clone target to prevent host page mutation
  const clone = element.cloneNode(true) as HTMLElement;

  // Step 2: Strip non-rendering or executable scripts/styles
  const unneeded = clone.querySelectorAll('script, style, noscript');
  unneeded.forEach((node) => node.remove());

  // Step 3: Cap table body rows to keep output concise and token-efficient for AI models
  capTableBodyRows(clone, maxRows);

  // Step 4: Anonymize all text node content via TreeWalker (preserving <th> schema headers)
  anonymizeTextNodes(clone);

  // Step 5: Sanitize sensitive attribute values across all child elements
  sanitizeElementAttributes(clone);

  return clone.outerHTML;
}

/**
 * Copies the anonymized DOM skeleton of the target element or selector
 * directly to the system clipboard.
 *
 * @param target - Optional element or CSS selector string (defaults to 'table' or body).
 * @param maxRows - Optional maximum number of table body rows to retain (defaults to 10).
 * @returns Promise resolving to the copied sanitized HTML string.
 */
export async function copyAnonymizedDOM(
  target?: HTMLElement | string | null,
  maxRows: number = Constants.ANONYMIZER_MAX_SAMPLE_ROWS
): Promise<string> {
  let element: HTMLElement | null = null;

  if (typeof target === 'string') {
    element = document.querySelector<HTMLElement>(target);
  } else if (target instanceof HTMLElement) {
    element = target;
  }

  if (!element) {
    element = document.querySelector<HTMLElement>('table') || document.body;
  }

  const sanitizedHtml = anonymizeElement(element, maxRows);

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(sanitizedHtml);
    }
  } catch {
    // Clipboard write may fail if document is not focused; sanitizedHtml is still returned
  }

  return sanitizedHtml;
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Limits tbody rows to maxRows to prevent overwhelming token windows. */
function capTableBodyRows(root: HTMLElement, maxRows: number): void {
  const tbodies = root.tagName === 'TBODY' ? [root] : Array.from(root.querySelectorAll('tbody'));
  if (tbodies.length > 0) {
    for (const tbody of tbodies) {
      const rows = Array.from(tbody.querySelectorAll(':scope > tr'));
      if (rows.length > maxRows) {
        for (let i = maxRows; i < rows.length; i++) {
          rows[i].remove();
        }
      }
    }
  } else {
    const tables = root.tagName === 'TABLE' ? [root] : Array.from(root.querySelectorAll('table'));
    for (const table of tables) {
      const rows = Array.from(table.querySelectorAll(':scope > tr, :scope > tbody > tr')).filter(
        (tr) => !tr.querySelector('th')
      );
      if (rows.length > maxRows) {
        for (let i = maxRows; i < rows.length; i++) {
          rows[i].remove();
        }
      }
    }
  }
}

/** Walks all text nodes in the element tree and replaces text with mock tokens, preserving column headers. */
function anonymizeTextNodes(root: HTMLElement): void {
  const doc = root.ownerDocument || document;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);

  let node = walker.nextNode();
  while (node) {
    // Preserve column header text inside <th> or role="columnheader" (schema metadata, not member PII)
    const parentEl = node.parentElement;
    if (parentEl && (parentEl.closest('th') || parentEl.closest('[role="columnheader"]'))) {
      node = walker.nextNode();
      continue;
    }

    const rawValue = node.nodeValue || '';
    const trimmed = rawValue.trim();

    if (trimmed.length > 0) {
      if (new RegExp(Regex.UUID_PATTERN.source, 'i').test(trimmed)) {
        node.nodeValue = Constants.MOCK_UUID;
      } else if (new RegExp(Regex.ISO_DATE_STRING.source, 'i').test(trimmed)) {
        node.nodeValue = '2026-08-02';
      } else if (new RegExp(Regex.EMAIL_ADDRESS.source, 'i').test(trimmed)) {
        node.nodeValue = 'user@example.com';
      } else if (new RegExp(Regex.PHONE_OR_NUMBERS.source).test(trimmed)) {
        node.nodeValue = '123';
      } else if (trimmed.length > 25) {
        node.nodeValue = 'Mock Description Text';
      } else {
        node.nodeValue = Constants.MOCK_PERSON_NAME;
      }
    }

    node = walker.nextNode();
  }
}

/** Sanitizes sensitive attributes like href (mailto/tel), aria-label, title, data-*, and image src. */
function sanitizeElementAttributes(root: HTMLElement): void {
  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];

  elements.forEach((el) => {
    // 1. Sanitize href attributes (mailto:, tel:, member paths with UUIDs)
    if (el.hasAttribute('href')) {
      const href = el.getAttribute('href') || '';
      if (Regex.MAILTO_LINK.test(href)) {
        el.setAttribute('href', Constants.MOCK_MAILTO_HREF);
      } else if (Regex.TEL_LINK.test(href)) {
        el.setAttribute('href', Constants.MOCK_TEL_HREF);
      } else {
        const cleanedHref = href.replace(
          new RegExp(Regex.UUID_PATTERN.source, 'gi'),
          Constants.MOCK_UUID
        );
        if (cleanedHref !== href) {
          el.setAttribute('href', cleanedHref);
        }
      }
    }

    // 2. Sanitize aria-label (UUIDs first to prevent digit-mangling leaks)
    if (el.hasAttribute('aria-label')) {
      const current = el.getAttribute('aria-label') || '';
      if (Regex.SELECT_ROW_ARIA_PREFIX.test(current)) {
        el.setAttribute('aria-label', `Select row ${Constants.MOCK_UUID}`);
      } else {
        let sanitized = current.replace(
          new RegExp(Regex.UUID_PATTERN.source, 'gi'),
          '___MOCK_UUID___'
        );
        sanitized = sanitized.replace(
          new RegExp(Regex.LAST_FIRST_NAME_GLOBAL.source, 'g'),
          Constants.MOCK_PERSON_NAME
        );
        sanitized = sanitized.replace(
          new RegExp(Regex.EMAIL_ADDRESS.source, 'gi'),
          'user@example.com'
        );
        sanitized = sanitized.replace(new RegExp(Regex.PHONE_OR_NUMBERS.source, 'g'), '123');
        sanitized = sanitized.replace(Regex.MOCK_UUID_PLACEHOLDER, Constants.MOCK_UUID);
        el.setAttribute('aria-label', sanitized);
      }
    }

    // 3. Sanitize title and alt attributes
    if (el.hasAttribute('title')) {
      el.setAttribute('title', 'Mock Title');
    }
    if (el.hasAttribute('alt')) {
      el.setAttribute('alt', 'Member Portrait');
    }

    // 4. Sanitize input values and placeholders
    if (
      el.hasAttribute('value') &&
      !(
        el instanceof HTMLInputElement &&
        ['submit', 'button', 'checkbox', 'radio'].includes(el.type)
      )
    ) {
      el.setAttribute('value', 'Mock Value');
    }
    if (el.hasAttribute('placeholder')) {
      el.setAttribute('placeholder', 'Mock Placeholder');
    }

    // 5. Replace photo src with synthetic placeholder
    if (el.tagName === 'IMG') {
      el.setAttribute('src', Constants.MOCK_IMAGE_SRC);
      el.removeAttribute('srcset');
    }

    // 6. Sanitize sensitive data-* and identifying attributes
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      const name = attr.name.toLowerCase();
      const val = attr.value;

      if (Regex.SENSITIVE_ATTR_NAME.test(name)) {
        if (name.includes('uuid') || name.includes('id') || name.includes('mrn')) {
          el.setAttribute(attr.name, Constants.MOCK_UUID);
        } else if (name.includes('email')) {
          el.setAttribute(attr.name, 'user@example.com');
        } else if (name.includes('phone') || name.includes('tel')) {
          el.setAttribute(attr.name, '555-0101');
        } else if (name.includes('name') || name.includes('person')) {
          el.setAttribute(attr.name, Constants.MOCK_PERSON_NAME);
        } else {
          el.setAttribute(attr.name, 'mock-data');
        }
      } else {
        const replacedVal = val.replace(
          new RegExp(Regex.UUID_PATTERN.source, 'gi'),
          Constants.MOCK_UUID
        );
        if (replacedVal !== val) {
          el.setAttribute(attr.name, replacedVal);
        }
      }
    }
  });
}
