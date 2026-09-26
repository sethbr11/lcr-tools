import { Dom, Regex } from '@/types';
import { cleanCellContent, isVisible } from './tableUtils';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Resolves human-readable display title for table from nearest section header or card container.
 *
 * @param table - HTML table element to inspect.
 * @param fallbackIndex - Fallback ordinal index for default title.
 * @returns Resolved title string.
 */
export function getTableDisplayName(table: HTMLTableElement, fallbackIndex: number = 0): string {
  const ariaLabel = table.getAttribute('aria-label') || table.getAttribute('title');
  if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

  const doc = table.ownerDocument || (typeof document !== 'undefined' ? document : null);

  let prev = table.previousElementSibling;
  let districtName = '';
  let leaderName = '';
  let siblingTitle = '';

  while (prev) {
    const txt = ((prev as HTMLElement).innerText || prev.textContent || '').trim();
    const dMatch = txt.match(Regex.DISTRICT_HEADING);
    if (dMatch && !districtName) districtName = dMatch[1];
    const pMatch = txt.match(Regex.PRESIDENCY_MEMBER);
    if (pMatch && !leaderName) {
      leaderName = pMatch[1].split(Regex.NEWLINE)[0].replace(Regex.LEADER_ACTION_TEXT, '').trim();
    }
    if (
      !siblingTitle &&
      txt.length > 0 &&
      txt.length < 80 &&
      !Regex.LEADER_ACTION_TEXT.test(txt) &&
      !Regex.HEADING_IGNORE_TEXT.test(txt)
    ) {
      const firstLine = txt.split(Regex.NEWLINE)[0].trim();
      if (
        firstLine.length > 0 &&
        !Regex.DISTRICT_HEADING.test(firstLine) &&
        !Regex.PRESIDENCY_MEMBER.test(firstLine)
      ) {
        // If the sibling is a heading tag (e.g., H3), let heading resolution handle hierarchy (H2 - H3)
        const isHeadingTag =
          prev.tagName.startsWith('H') && parseInt(prev.tagName.substring(1), 10) >= 1;
        if (!isHeadingTag) {
          siblingTitle = firstLine;
        }
      }
    }
    prev = prev.previousElementSibling;
  }

  if (districtName) {
    return leaderName ? `${districtName} (${leaderName})` : districtName;
  }
  if (siblingTitle) {
    return siblingTitle;
  }

  // Check dedicated card container ONLY if it contains just this single table
  let current: HTMLElement | null = table.parentElement;
  while (current && current !== doc?.body) {
    if (current.querySelectorAll('table').length > 1) {
      // Reached multi-table container boundary; stop traversing upward to prevent bleeding
      break;
    }
    const cardText = current.textContent || '';
    const districtMatch = cardText.match(Regex.DISTRICT_HEADING);
    if (districtMatch) {
      const leaderMatch = cardText.match(Regex.PRESIDENCY_MEMBER);
      let leader = '';
      if (leaderMatch) {
        leader = leaderMatch[1]
          .split(Regex.NEWLINE)[0]
          .replace(Regex.LEADER_ACTION_TEXT, '')
          .trim();
      }
      return leader ? `${districtMatch[1]} (${leader})` : districtMatch[1];
    }
    current = current.parentElement;
  }

  if (doc) {
    const allHeadings = Array.from(
      doc.querySelectorAll<HTMLElement>(Dom.ALL_HEADINGS_SELECTOR)
    ).filter((h) => {
      if (!isVisible(h)) return false;
      const txt = cleanCellContent(h);
      return txt.length > 0 && !Regex.HEADING_IGNORE_TEXT.test(txt);
    });

    const preceding = allHeadings.filter(
      (h) => (table.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_PRECEDING) !== 0
    );

    if (preceding.length > 0) {
      const nearest = preceding[preceding.length - 1];
      const nearestLevel = parseInt(nearest.tagName.substring(1), 10);
      const nearestText = cleanCellContent(nearest);

      if (nearestLevel >= 3) {
        const h2s = preceding.filter((h) => h.tagName.toUpperCase() === 'H2');
        if (h2s.length > 0) {
          const h2Text = cleanCellContent(h2s[h2s.length - 1]);
          if (h2Text && !nearestText.toLowerCase().startsWith(h2Text.toLowerCase())) {
            return `${h2Text} - ${nearestText}`;
          }
        }
      }

      if (nearestText) return nearestText;
    }

    // Fallback to top-level heading on page if not in ignore list
    const pageHeading = doc.querySelector('h1');
    if (pageHeading) {
      const title = cleanCellContent(pageHeading as HTMLElement);
      if (title && !Regex.HEADING_IGNORE_TEXT.test(title)) return title;
    }
  }

  return `Table ${fallbackIndex + 1}`;
}
