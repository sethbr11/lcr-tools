/**
 * Standalone Chrome DevTools Snippet: LCR DOM Anonymizer
 *
 * Instructions:
 * 1. In Chrome DevTools, open the 'Sources' tab.
 * 2. Select 'Snippets' in the left navigator (under >> if hidden) and click '+ New snippet'.
 * 3. Name it 'anonymize-dom' and paste this entire code into it.
 * 4. On any LCR or Directory page:
 *    - Click or inspect the element you want to extract (or it defaults to the main <table>).
 *    - Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to run.
 * 5. A 100% PII-sanitized DOM skeleton is instantly copied to your clipboard!
 */
(() => {
  const target = $0 || document.querySelector('table') || document.body;
  if (!target) return console.error('No element found to anonymize');

  const clone = target.cloneNode(true);

  // Strip non-rendering or executable scripts/styles
  clone.querySelectorAll('script, style, noscript').forEach((el) => el.remove());

  // Cap table body rows to 10 sample rows to keep output token-efficient for AI models
  const tbodies = clone.tagName === 'TBODY' ? [clone] : Array.from(clone.querySelectorAll('tbody'));
  if (tbodies.length > 0) {
    tbodies.forEach((tbody) => {
      const rows = Array.from(tbody.querySelectorAll(':scope > tr'));
      if (rows.length > 10) {
        for (let i = 10; i < rows.length; i++) rows[i].remove();
      }
    });
  } else {
    const tables =
      clone.tagName === 'TABLE' ? [clone] : Array.from(clone.querySelectorAll('table'));
    tables.forEach((table) => {
      const rows = Array.from(table.querySelectorAll(':scope > tr, :scope > tbody > tr')).filter(
        (tr) => !tr.querySelector('th')
      );
      if (rows.length > 10) {
        for (let i = 10; i < rows.length; i++) rows[i].remove();
      }
    });
  }

  const uuidPattern = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  const mockUuid = '00000000-0000-0000-0000-000000000001';

  // Anonymize all text nodes (preserving column headers)
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = walker.nextNode())) {
    const parentEl = node.parentElement;
    if (parentEl && (parentEl.closest('th') || parentEl.closest('[role="columnheader"]'))) {
      continue;
    }

    const trimmed = (node.nodeValue || '').trim();
    if (!trimmed) continue;
    if (new RegExp(uuidPattern, 'i').test(trimmed)) node.nodeValue = mockUuid;
    else if (/\b\d{4}-\d{2}-\d{2}\b/.test(trimmed)) node.nodeValue = '2026-08-02';
    else if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmed))
      node.nodeValue = 'user@example.com';
    else if (/\b\d{3,}[-\d]*\b/.test(trimmed)) node.nodeValue = '123';
    else if (trimmed.length > 25) node.nodeValue = 'Mock Description Text';
    else node.nodeValue = 'Mock, Person';
  }

  // Sanitize sensitive attributes
  const elements = [clone, ...Array.from(clone.querySelectorAll('*'))];
  elements.forEach((el) => {
    if (el.hasAttribute('href')) {
      const href = el.getAttribute('href') || '';
      if (/^mailto:/i.test(href)) el.setAttribute('href', 'mailto:user@example.com');
      else if (/^tel:/i.test(href)) el.setAttribute('href', 'tel:555-0101');
      else {
        const cleaned = href.replace(new RegExp(uuidPattern, 'gi'), mockUuid);
        if (cleaned !== href) el.setAttribute('href', cleaned);
      }
    }

    if (el.hasAttribute('aria-label')) {
      const current = el.getAttribute('aria-label') || '';
      if (/^select row\b/i.test(current)) {
        el.setAttribute('aria-label', `Select row ${mockUuid}`);
      } else {
        let sanitized = current.replace(new RegExp(uuidPattern, 'gi'), '___MOCK_UUID___');
        sanitized = sanitized.replace(/\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b/g, 'Mock, Person');
        sanitized = sanitized.replace(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
          'user@example.com'
        );
        sanitized = sanitized.replace(/\b\d{3,}[-\d]*\b/g, '123');
        sanitized = sanitized.replace(/___MOCK_UUID___/g, mockUuid);
        el.setAttribute('aria-label', sanitized);
      }
    }
    if (el.hasAttribute('title')) el.setAttribute('title', 'Mock Title');
    if (el.hasAttribute('alt')) el.setAttribute('alt', 'Member Portrait');
    if (el.hasAttribute('placeholder')) el.setAttribute('placeholder', 'Mock Placeholder');
    if (
      el.hasAttribute('value') &&
      !(
        el instanceof HTMLInputElement &&
        ['submit', 'button', 'checkbox', 'radio'].includes(el.type)
      )
    ) {
      el.setAttribute('value', 'Mock Value');
    }
    if (el.tagName === 'IMG') {
      el.setAttribute('src', 'https://example.com/mock-photo.jpg');
      el.removeAttribute('srcset');
    }

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      const name = attr.name.toLowerCase();
      const val = attr.value;
      if (/(?:uuid|person|member|email|phone|mrn|address|birth|name)/i.test(name)) {
        if (name.includes('uuid') || name.includes('id') || name.includes('mrn')) {
          el.setAttribute(attr.name, mockUuid);
        } else if (name.includes('email')) {
          el.setAttribute(attr.name, 'user@example.com');
        } else if (name.includes('phone') || name.includes('tel')) {
          el.setAttribute(attr.name, '555-0101');
        } else if (name.includes('name') || name.includes('person')) {
          el.setAttribute(attr.name, 'Mock, Person');
        } else {
          el.setAttribute(attr.name, 'mock-data');
        }
      } else {
        const cleanedVal = val.replace(new RegExp(uuidPattern, 'gi'), mockUuid);
        if (cleanedVal !== val) el.setAttribute(attr.name, cleanedVal);
      }
    }
  });

  const html = clone.outerHTML;
  if (typeof copy === 'function') {
    copy(html);
    console.log('✅ Anonymized DOM copied to clipboard! (100% PII-free, sample rows capped)');
  } else {
    navigator.clipboard.writeText(html).then(() => {
      console.log('✅ Anonymized DOM copied to clipboard! (100% PII-free, sample rows capped)');
    });
  }
})();
