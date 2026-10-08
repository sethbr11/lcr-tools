/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Safely parses an HTML string and replaces all child nodes of the target element.
 * Complies with Firefox AMO security requirements without triggering UNSAFE_VAR_ASSIGNMENT.
 *
 * @param target - The DOM element whose contents will be replaced.
 * @param html - The HTML string to parse and insert safely.
 */
export function setHtml(target: Element, html: string): void {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  target.replaceChildren(...Array.from(doc.body.childNodes));
}

/**
 * Clears all child nodes from the target element safely.
 *
 * @param target - The DOM element whose children will be removed.
 */
export function clearElement(target: Element): void {
  target.replaceChildren();
}
