import { Dom, Types } from '../types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Safely parses an HTML string and replaces all child nodes of the target element.
 * Complies with Firefox AMO security requirements without triggering UNSAFE_VAR_ASSIGNMENT.
 * Table contexts (`tr`, `tbody`/`thead`/`tfoot`, `table`) are parsed inside a matching wrapper so
 * `td`/`th`/`tr` tags are not dropped by the HTML parser.
 *
 * @param target - The DOM element whose contents will be replaced.
 * @param html - The HTML string to parse and insert safely.
 */
export function setHtml(target: Element, html: string): void {
  const { markup, selector } = getParseContext(target, html);
  const doc = new DOMParser().parseFromString(markup, 'text/html');
  const container = doc.querySelector(selector) ?? doc.body;
  target.replaceChildren(...Array.from(container.childNodes));
}

/**
 * Clears all child nodes from the target element safely.
 *
 * @param target - The DOM element whose children will be removed.
 */
export function clearElement(target: Element): void {
  target.replaceChildren();
}

/**
 * Creates a full-screen, centered modal backdrop with the shared backdrop class.
 *
 * @param style - Extra or overriding styles (background color, z-index, alignment, font).
 * @param id - Optional element ID.
 * @returns The unattached backdrop element.
 */
export function createBackdrop(style: Partial<CSSStyleDeclaration>, id?: string): HTMLElement {
  const backdrop = document.createElement('div');
  if (id) backdrop.id = id;
  backdrop.className = Dom.MODAL_BACKDROP_CLASS;
  Object.assign(backdrop.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    ...style,
  });
  return backdrop;
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/**
 * Chooses the wrapper markup and selector used to parse html for the given target.
 *
 * @param target - The element that will receive the parsed nodes.
 * @param html - The raw HTML string.
 * @returns The markup to parse and the selector locating the element holding the result.
 */
function getParseContext(target: Element, html: string): Types.HtmlParseContext {
  switch (target.tagName) {
    case 'TR':
      return { markup: `<table><tbody><tr>${html}</tr></tbody></table>`, selector: 'tr' };
    case 'TBODY':
    case 'THEAD':
    case 'TFOOT':
      return { markup: `<table><tbody>${html}</tbody></table>`, selector: 'tbody' };
    case 'TABLE':
      return { markup: `<table>${html}</table>`, selector: 'table' };
    default:
      return { markup: html, selector: 'body' };
  }
}
