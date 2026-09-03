#!/usr/bin/env node

/**
 * Script to automatically generate and update the Chrome Web Store description.
 * - Upholds the exact store description structure.
 * - Maintains strictly the last 3 versions in "Recent Updates".
 * - Uses local Ollama (qwen2.5-coder:7b) or agy to automatically generate release notes
 *   from git commits for new versions.
 * - Copies the final text directly to your macOS clipboard (pbcopy) for instant pasting.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT_DIR, "manifest.json");
const CHANGELOG_PATH = path.join(ROOT_DIR, "changelog.json");
const STORE_DOC_PATH = path.join(ROOT_DIR, "CHROMEWEBSTORE.md");

// Base Store Description Template
const HEADER_TEXT = `An extension to help make LCR easier to use.

LCR Tools is a Google Chrome extension designed to enhance the functionality and user experience of LCR (Leader and Clerk Resources) for The Church of Jesus Christ of Latter-day Saints. It provides advanced tools for exporting data, processing attendance, managing member information, and more—streamlining common administrative tasks for clerks, secretaries, and leaders.

Updated for the 2026 React (Eden) UI Overhaul! This extension has been modernized to provide seamless, high-performance support for the latest LCR interface updates. However, the UI overhaul is still recent and issues can be expected. Please email any issues to seth@brockefni.com.

Key Features:
- Effortless Attendance: Upload your Sunday attendance via CSV. The tool handles fuzzy name matching, member pagination, and guest management automatically.
- Trip Planning: A powerful tool for planning visits. Geocode member addresses, cluster households into groups, and optimize travel routes on an interactive map.
- Advanced Report Export: Download any table from LCR directly into CSV format. Automatically identifies granular sub-sections (e.g., "Presidency" vs. "Teachers") and bundles multiple tables into organized ZIP files.
- Synchronized Table Filters: Apply powerful search and filter criteria across all organizational blocks on a page simultaneously.
- Photo Management: Learn names and faces with interactive Flashcards or download a list of individuals missing photos. Includes a high-speed stable photo cache.
- Context-Aware Actions: The extension menu automatically updates to show the most relevant tools for the specific page you are viewing.
- Boundary Audits: Instantly identify households located outside official unit boundaries using geometric analysis.
- Multiple Callings Finder: Quickly identify members holding more than one assignment to ensure ward records remain accurate.`;

const FOOTER_TEXT = `---
Note: This tool is an independent open-source project and is not an official application of The Church of Jesus Christ of Latter-day Saints.`;

async function queryOllama(prompt) {
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5-coder:7b",
        prompt: prompt,
        stream: false,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.response;
  } catch (e) {
    return null;
  }
}

function queryAgy(prompt) {
  try {
    const escaped = prompt.replace(/"/g, '\\"');
    return execSync(`agy -p "${escaped}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
  } catch (e) {
    return null;
  }
}

function getRecentCommits() {
  try {
    let lastTag = "";
    try {
      lastTag = execSync("git describe --tags --abbrev=0 2>/dev/null", {
        encoding: "utf8",
      }).trim();
    } catch (e) {
      lastTag = "HEAD~5";
    }
    const range = lastTag ? `${lastTag}..HEAD` : "HEAD~5..HEAD";
    const log = execSync(`git log ${range} --oneline`, {
      encoding: "utf8",
    }).trim();
    return log || execSync("git log -n 5 --oneline", { encoding: "utf8" }).trim();
  } catch (e) {
    return "";
  }
}

async function generateNotesForVersion(version) {
  const commits = getRecentCommits();
  console.log(`🔍 Recent commits for v${version}:\n${commits}\n`);

  const prompt = `You are generating Chrome Web Store release notes for the Chrome extension "LCR Tools".
Given the following git commit messages:
${commits}

Write 3 to 5 concise, professional bullet points summarizing these user-facing updates and fixes.
Format every bullet point as:
- Topic or Feature: Short clear description of what changed.
Do NOT include markdown headers or extra commentary. Return ONLY the bullet lines starting with "- ".`;

  console.log("🤖 Attempting AI generation via local Ollama (qwen2.5-coder:7b)...");
  let aiOutput = await queryOllama(prompt);

  if (!aiOutput) {
    console.log("⚠️  Ollama unavailable, attempting via 'agy' CLI...");
    aiOutput = queryAgy(prompt);
  }

  if (aiOutput) {
    const lines = aiOutput
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("-") || l.startsWith("*"))
      .map((l) => l.replace(/^[-*]\s*/, ""));
    if (lines.length > 0) return lines;
  }

  console.log("ℹ️  Falling back to direct git commit messages...");
  return commits
    .split("\n")
    .slice(0, 5)
    .map((line) => {
      const msg = line.replace(/^[a-f0-9]+\s+/, "");
      return `Update: ${msg}`;
    });
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const currentVersion = manifest.version;

  let changelog = {};
  if (fs.existsSync(CHANGELOG_PATH)) {
    changelog = JSON.parse(fs.readFileSync(CHANGELOG_PATH, "utf8"));
  }

  // Check if current version already has notes
  if (!changelog[currentVersion] || changelog[currentVersion].length === 0) {
    console.log(`📝 Generating new release notes for v${currentVersion}...`);
    const newNotes = await generateNotesForVersion(currentVersion);
    changelog[currentVersion] = newNotes;
    fs.writeFileSync(CHANGELOG_PATH, JSON.stringify(changelog, null, 2) + "\n");
    console.log(`✅ Saved new notes to changelog.json\n`);
  } else {
    console.log(`ℹ️  Found existing notes for v${currentVersion} in changelog.json`);
  }

  // Pick the top 3 versions
  const allVersions = Object.keys(changelog);
  // Sort versions descending (handles standard semver)
  allVersions.sort((a, b) => {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pb[i] || 0) !== (pa[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
    }
    return 0;
  });

  const last3Versions = allVersions.slice(0, 3);
  console.log(`📌 Selected last 3 versions: ${last3Versions.join(", ")}`);

  let updatesSection = "Recent Updates:\n";
  last3Versions.forEach((v) => {
    updatesSection += `(${v})\n`;
    const notes = changelog[v] || [];
    notes.forEach((bullet) => {
      updatesSection += `- ${bullet}\n`;
    });
    updatesSection += "\n";
  });
  updatesSection = updatesSection.trim();

  // Full Store Description
  const fullDescription = `${HEADER_TEXT}\n\n${updatesSection}\n\n${FOOTER_TEXT}`;

  // Update CHROMEWEBSTORE.md
  if (fs.existsSync(STORE_DOC_PATH)) {
    let storeDoc = fs.readFileSync(STORE_DOC_PATH, "utf8");
    // Replace the code block under Section 1
    const codeBlockRegex = /```text[\s\S]*?```/;
    if (codeBlockRegex.test(storeDoc)) {
      storeDoc = storeDoc.replace(codeBlockRegex, `\`\`\`text\n${fullDescription}\n\`\`\``);
      fs.writeFileSync(STORE_DOC_PATH, storeDoc);
      console.log(`✅ Updated ${STORE_DOC_PATH}`);
    }
  }

  // Copy to macOS clipboard if pbcopy is available
  try {
    execSync("pbcopy", { input: fullDescription });
    console.log("📋 Copied full description to your clipboard (Ready to Cmd+V in Developer Dashboard)!");
  } catch (e) {
    // pbcopy not available (e.g. on Linux/CI)
  }

  console.log("\n=================== STORE DESCRIPTION PREVIEW ===================");
  console.log(fullDescription);
  console.log("=================================================================\n");
}

main().catch((err) => {
  console.error("Error generating store description:", err);
  process.exit(1);
});
