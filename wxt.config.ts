import { defineConfig } from 'wxt';

const DOC_MARKDOWN = /\.md$/i;
const DOC_SCREENSHOT = /(?:^|\/)attendance-.*\.(?:png|jpe?g|gif|webp)$/i;

export default defineConfig({
  srcDir: 'src',
  outDir: 'output',
  publicDir: 'src/public',
  vite: () => ({
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
    ],
  }),
  zip: {
    exclude: ['**/*.md', 'images/attendance-*'],
    excludeSources: ['images/attendance-*'],
  },
  hooks: {
    'build:publicAssets': (_wxt, files) => {
      for (let i = files.length - 1; i >= 0; i -= 1) {
        const dest = files[i]?.relativeDest ?? '';
        if (DOC_MARKDOWN.test(dest) || DOC_SCREENSHOT.test(dest)) {
          files.splice(i, 1);
        }
      }
    },
  },
  manifest: ({ browser, mode }) => ({
    name: mode === 'development' ? 'LCR Tools (Local)' : 'LCR Tools',
    version: '2.0.1',
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
