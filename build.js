#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const readline = require("readline");

// Prompt for user input
function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  // Read current manifest
  const manifestPath = path.join(__dirname, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  console.log("\n📋 Current manifest info:");
  console.log(`   Name: ${manifest.name}`);
  console.log(`   Version: ${manifest.version}\n`);

  // Ask about version
  const versionAnswer = await promptUser(
    `Keep version ${manifest.version}? (Y/n or enter new version): `
  );

  let newVersion = manifest.version;
  if (versionAnswer.toLowerCase() === "n") {
    newVersion = await promptUser("Enter new version number: ");
  } else if (
    versionAnswer &&
    versionAnswer.toLowerCase() !== "y" &&
    versionAnswer.toLowerCase() !== "yes"
  ) {
    // They entered a version number directly
    newVersion = versionAnswer;
  }

  // Clean up name (remove "(Local Copy)" or similar)
  const cleanName = manifest.name.replace(/\s*\(Local Copy\)\s*/gi, "").trim();

  console.log("\n✨ Build configuration:");
  console.log(`   Name: ${cleanName}`);
  console.log(`   Version: ${newVersion}\n`);

  // Clean up previous build
  console.log("🧹 Cleaning previous build...");
  if (fs.existsSync("dist")) {
    fs.rmSync("dist", { recursive: true });
  }
  if (fs.existsSync("lcr-tools-extension.zip")) {
    fs.unlinkSync("lcr-tools-extension.zip");
  }

  // Create dist directory
  fs.mkdirSync("dist", { recursive: true });

  // Files and directories to include
  const includePaths = [
    "manifest.json",
    "popup.html",
    "js",
    "css",
    "images",
    "LICENSE",
    "README.md",
    "PRIVACY_POLICY.md",
  ];

  // Copy files
  console.log("📦 Copying extension files...");
  function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) {
      console.log(`⚠️  Skipping ${src} (not found)`);
      return;
    }

    const stat = fs.statSync(src);

    if (stat.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      const entries = fs.readdirSync(src);

      for (const entry of entries) {
        copyRecursive(path.join(src, entry), path.join(dest, entry));
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  includePaths.forEach((item) => {
    const src = path.join(__dirname, item);
    const dest = path.join(__dirname, "dist", item);

    if (fs.existsSync(src)) {
      console.log(`  ✓ ${item}`);
      copyRecursive(src, dest);
    } else {
      console.log(`  ⚠️  ${item} not found, skipping`);
    }
  });

  // Update manifest in dist with clean name and version
  const distManifestPath = path.join(__dirname, "dist", "manifest.json");
  const distManifest = JSON.parse(fs.readFileSync(distManifestPath, "utf8"));
  distManifest.name = cleanName;
  distManifest.version = newVersion;
  fs.writeFileSync(distManifestPath, JSON.stringify(distManifest, null, 2));
  console.log("  ✓ Updated manifest with clean name and version");

  // Create zip file
  console.log("🗜️  Creating zip file...");
  try {
    process.chdir("dist");

    // Use platform-specific zip command
    if (process.platform === "win32") {
      execSync(
        "powershell Compress-Archive -Path * -DestinationPath ../lcr-tools-extension.zip",
        { stdio: "inherit" }
      );
    } else {
      execSync("zip -r ../lcr-tools-extension.zip *", { stdio: "inherit" });
    }

    process.chdir("..");
    console.log("✅ Build complete! Package: lcr-tools-extension.zip");
    console.log(`   Final name: ${cleanName}`);
    console.log(`   Final version: ${newVersion}`);
  } catch (error) {
    console.error("❌ Error creating zip:", error.message);
    process.exit(1);
  }
}

// Run the build
main().catch((error) => {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
});
