import { describe, it, expect, vi, beforeEach } from 'vitest';
import { anonymizeElement, copyAnonymizedDOM } from '@/utils/ui/domAnonymizer';

describe('domAnonymizer - PII sanitization and structural cloning', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should strip script, style, and noscript elements from output', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div>Content</div>
      <script>console.log("secret");</script>
      <style>.hidden { display: none; }</style>
      <noscript>No JS</noscript>
    `;

    const html = anonymizeElement(container);

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<style>');
    expect(html).not.toContain('<noscript>');
    expect(html).toContain('Mock, Person');
  });

  it('should anonymize member names, dates, phone numbers, and emails in text nodes', () => {
    const table = document.createElement('table');
    table.innerHTML = `
      <tbody>
        <tr>
          <td>Smith, John</td>
          <td>555-1234</td>
          <td>john.smith@domain.com</td>
          <td>2026-08-02</td>
          <td>This is a very long descriptive note about calling assignments and notes</td>
        </tr>
      </tbody>
    `;

    const html = anonymizeElement(table);

    expect(html).not.toContain('Smith, John');
    expect(html).not.toContain('555-1234');
    expect(html).not.toContain('john.smith@domain.com');
    expect(html).toContain('Mock, Person');
    expect(html).toContain('123');
    expect(html).toContain('user@example.com');
    expect(html).toContain('Mock Description Text');
  });

  it('should sanitize aria-label, title, and img src attributes', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button aria-label="Doe, Jane, 2026-08-02, Relief Society"></button>
      <a href="#link" title="Contact Doe, Jane at jane@domain.com">Profile</a>
      <img src="https://ws.churchofjesuschrist.org/api/img/private-token" alt="Photo" />
    `;

    const html = anonymizeElement(container);

    expect(html).not.toContain('Doe, Jane');
    expect(html).not.toContain('private-token');
    expect(html).toContain('Mock, Person');
    expect(html).toContain('https://example.com/mock-photo.jpg');
    expect(html).toContain('alt="Member Portrait"');
  });

  it('should sanitize mailto: and tel: links in href attributes', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <a href="mailto:real.bishop@churchofjesuschrist.org">Email Bishop</a>
      <a href="tel:+18015559876">Call Clerk</a>
    `;

    const html = anonymizeElement(container);

    expect(html).not.toContain('real.bishop@churchofjesuschrist.org');
    expect(html).not.toContain('+18015559876');
    expect(html).toContain('href="mailto:user@example.com"');
    expect(html).toContain('href="tel:555-0101"');
  });

  it('should sanitize data-member-card-person-uuid and sensitive data attributes', () => {
    const tr = document.createElement('tr');
    tr.setAttribute('data-member-card-person-uuid', '3a7b6c8d-1234-4567-89ab-cdef01234567');
    tr.setAttribute('data-email', 'confidential@example.org');
    tr.setAttribute('data-phone', '801-555-1234');
    tr.setAttribute('data-member-name', 'Johnson, Robert');
    tr.setAttribute('id', 'row-3a7b6c8d-1234-4567-89ab-cdef01234567');
    tr.innerHTML = `
      <td><a href="/mlt/records/member-profile/3a7b6c8d-1234-4567-89ab-cdef01234567">View</a></td>
      <td><input value="Confidential Note" placeholder="Search Johnson, Robert" /></td>
    `;

    const html = anonymizeElement(tr);

    expect(html).not.toContain('3a7b6c8d-1234-4567-89ab-cdef01234567');
    expect(html).not.toContain('confidential@example.org');
    expect(html).not.toContain('Johnson, Robert');
    expect(html).toContain('data-member-card-person-uuid="00000000-0000-0000-0000-000000000001"');
    expect(html).toContain('data-email="user@example.com"');
    expect(html).toContain('data-phone="555-0101"');
    expect(html).toContain('data-member-name="Mock, Person"');
    expect(html).toContain('id="row-00000000-0000-0000-0000-000000000001"');
    expect(html).toContain('/mlt/records/member-profile/00000000-0000-0000-0000-000000000001');
    expect(html).toContain('value="Mock Value"');
    expect(html).toContain('placeholder="Mock Placeholder"');
  });

  it('should copy sanitized HTML to clipboard in copyAnonymizedDOM', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      configurable: true,
    });

    const table = document.createElement('table');
    table.innerHTML = '<tbody><tr><td>Elder Adams</td></tr></tbody>';
    document.body.appendChild(table);

    const result = await copyAnonymizedDOM('table');

    expect(writeTextSpy).toHaveBeenCalledTimes(1);
    expect(result).toContain('Mock, Person');
  });

  it('should preserve column headers in thead th elements for AI schema parsing', () => {
    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Name</th>
          <th>Gender</th>
          <th>Birth Date</th>
          <th>Phone</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Smith, John</td>
          <td>Male</td>
          <td>1990-05-15</td>
          <td>555-0199</td>
        </tr>
      </tbody>
    `;

    const html = anonymizeElement(table);

    // Column headers must be preserved
    expect(html).toContain('<th>Name</th>');
    expect(html).toContain('<th>Gender</th>');
    expect(html).toContain('<th>Birth Date</th>');
    expect(html).toContain('<th>Phone</th>');

    // Data row text must be anonymized
    expect(html).not.toContain('Smith, John');
    expect(html).not.toContain('1990-05-15');
    expect(html).not.toContain('555-0199');
    expect(html).toContain('Mock, Person');
  });

  it('should cap tbody rows to maxRows to keep snippets token-efficient', () => {
    const table = document.createElement('table');
    const rowsHtml = Array.from({ length: 30 }, (_, i) => `<tr><td>Member ${i + 1}</td></tr>`).join(
      ''
    );
    table.innerHTML = `<tbody>${rowsHtml}</tbody>`;

    const html = anonymizeElement(table, 5);

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const remainingRows = doc.querySelectorAll('tbody tr');
    expect(remainingRows.length).toBe(5);
  });

  it('should completely sanitize aria-label with Select row and UUID without digit mangling leaks', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <input aria-label="Select row 4025b67f-1496-4ad2-83df-6b9e04dd1a11" type="checkbox" />
      <button aria-label="5437b98e-f048-4bfc-8fec-26f9110e2001, Doe, Jane, 555-1234"></button>
    `;

    const html = anonymizeElement(container);

    expect(html).not.toContain('4025b67f');
    expect(html).not.toContain('5437b98e');
    expect(html).not.toContain('1496');
    expect(html).toContain('aria-label="Select row 00000000-0000-0000-0000-000000000001"');
    expect(html).toContain('aria-label="00000000-0000-0000-0000-000000000001, Mock, Person, 123"');
  });
});
