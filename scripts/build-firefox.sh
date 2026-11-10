#!/usr/bin/env sh
# Rebuilds the Firefox (AMO) package from source. Run from the extension folder:
#   sh scripts/build-firefox.sh
# Output: output/firefox-mv2 (the files inside lcr-tools-extension-<version>-firefox.zip)
set -e

cd "$(dirname "$0")/.."

# Vite 7 requires Node.js ^20.19.0 or >=22.12.0
node -e '
  const [major, minor] = process.versions.node.split(".").map(Number);
  const ok = (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22;
  if (!ok) {
    console.error("Node.js " + process.versions.node + " found; need 20.19+ or 22.12+.");
    process.exit(1);
  }
'
echo "Node $(node --version), npm $(npm --version)"

# Install the exact dependency versions from package-lock.json
npm ci --no-audit --no-fund

# Bundle and minify the Firefox MV2 build with WXT/Vite
npm run build:firefox

echo "Done: output/firefox-mv2"
