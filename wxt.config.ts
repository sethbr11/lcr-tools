import { fileURLToPath } from 'node:url';
import { defineConfig } from 'wxt';

const OPTIONAL_DEPENDENCY_STUB = fileURLToPath(
  new URL('./src/vendor/optionalDependencyStub.ts', import.meta.url)
);

export default defineConfig({
  srcDir: 'src',
  outDir: 'output',
  publicDir: 'src/public',
  vite: () => ({
    resolve: {
      // jsPDF lazy-loads these only for doc.html()/SVG, which we never call
      alias: {
        html2canvas: OPTIONAL_DEPENDENCY_STUB,
        dompurify: OPTIONAL_DEPENDENCY_STUB,
        canvg: OPTIONAL_DEPENDENCY_STUB,
      },
    },
    plugins: [
      {
        name: 'amo-sanitize-leaflet',
        transform(code, id) {
          if (!id.includes('leaflet')) return null;
          const helper = `
function __amoSanitize(el, h) {
  el.replaceChildren();
  if (h) {
    var doc = new DOMParser().parseFromString(h, 'text/html');
    Array.from(doc.body.childNodes).forEach(function(c) {
      el.appendChild(c.cloneNode(true));
    });
  }
}
`;
          const sanitized =
            helper +
            code
              .replace(
                "div.innerHTML = '<svg/>';",
                "div.replaceChildren(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));"
              )
              .replace('div.innerHTML = \'<v:shape adj="1"/>\';', 'div.replaceChildren();')
              .replace(
                'radioFragment.innerHTML = radioHtml;',
                '__amoSanitize(radioFragment, radioHtml);'
              )
              .replace("name.innerHTML = ' ' + obj.name;", "name.textContent = ' ' + obj.name;")
              .replace('link.innerHTML = html;', '__amoSanitize(link, html);')
              .replace('scale.innerHTML = text;', 'scale.textContent = text;')
              .replace(
                'this._container.innerHTML = prefixAndAttribs.join(\' <span aria-hidden="true">|</span> \');',
                "__amoSanitize(this._container, prefixAndAttribs.join(' | '));"
              )
              .replace('node.innerHTML = content;', '__amoSanitize(node, content);')
              .replace(
                'closeButton.innerHTML = \'<span aria-hidden="true">&#215;</span>\';',
                "closeButton.textContent = '×';"
              )
              .replace(
                "div.innerHTML = options.html !== false ? options.html : '';",
                "__amoSanitize(div, options.html !== false ? options.html : '');"
              );

          return { code: sanitized, map: null };
        },
      },
      {
        name: 'amo-sanitize-jspdf',
        transform(code, id) {
          if (!id.includes('jspdf')) return null;
          // jsPDF's (unused) HTML plugin builds elements via innerHTML; parse instead
          return {
            code: code.replace(
              /(\w+)\.innerHTML=(\w+)\.dompurify\.sanitize\(\2\.innerHTML\)/g,
              '$1.replaceChildren(...new DOMParser().parseFromString($2.dompurify.sanitize($2.innerHTML),"text/html").body.childNodes)'
            ),
            map: null,
          };
        },
      },
    ],
  }),
  zip: {
    exclude: ['**/*.md'],
  },
  hooks: {
    'entrypoints:resolved': (wxt, entrypoints) => {
      if (wxt.config.mode === 'development') return;
      for (let i = entrypoints.length - 1; i >= 0; i -= 1) {
        if (entrypoints[i]?.name === 'dev-dom-anonymizer') entrypoints.splice(i, 1);
      }
    },
  },
  manifest: ({ browser, mode }) => ({
    name: mode === 'development' ? 'LCR Tools (Local)' : 'LCR Tools',
    description: 'An extension to help make LCR easier to use.',
    permissions: ['scripting', 'storage'],
    host_permissions: [
      'https://lcr.churchofjesuschrist.org/*',
      'https://lcrf.churchofjesuschrist.org/*',
      'https://lcrffe.churchofjesuschrist.org/*',
      'https://directory.churchofjesuschrist.org/*',
      'https://mltp-api.churchofjesuschrist.org/*',
      'https://ws.churchofjesuschrist.org/*',
      'https://nominatim.openstreetmap.org/*',
      'https://us1.locationiq.com/*',
      'https://api.mapbox.com/*',
      'https://*.basemaps.cartocdn.com/*',
    ],
    web_accessible_resources: [
      {
        resources: ['trip-planning.html'],
        matches: [
          'https://lcr.churchofjesuschrist.org/*',
          'https://lcrf.churchofjesuschrist.org/*',
          'https://lcrffe.churchofjesuschrist.org/*',
          'https://directory.churchofjesuschrist.org/*',
        ],
      },
    ],
    icons: {
      16: 'images/icon-16.png',
      48: 'images/icon-48.png',
      128: 'images/icon-128.png',
    },
    browser_specific_settings:
      browser === 'firefox'
        ? {
            gecko: {
              id: 'lcr-tools@extension',
              strict_min_version: '140.0',
              data_collection_permissions: {
                required: ['none'],
              },
            },
            gecko_android: {
              strict_min_version: '142.0',
            },
          }
        : undefined,
  }),
});
