#!/usr/bin/env node

/**
 * Script to automatically generate and update the Chrome Web Store description.
 * - Upholds the exact store description structure.
 * - Maintains strictly the last 3 versions in "Recent Updates".
 * - Uses local Ollama (qwen2.5-coder:7b) or agy to automatically generate release notes
 *   from git commits for new versions.
 * - Copies the final text directly to your macOS clipboard (pbcopy) for instant pasting.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGE_PATH = path.join(ROOT_DIR, 'package.json');
const CHANGELOG_PATH = path.join(ROOT_DIR, 'changelog.json');
const STORE_DOC_PATH = path.join(ROOT_DIR, 'CHROMEWEBSTORE.md');

// Base Store Description Template
const HEADER_TEXT = `[UNOFFICIAL PRODUCTIVITY TOOL]
IMPORTANT NOTICE: LCR Tools is an independent, open-source browser extension developed by and for local Church leaders to assist with administrative calling duties. It is NOT an official application, and is NOT affiliated with, authorized, maintained, sponsored, or endorsed by The Church of Jesus Christ of Latter-day Saints.

---

LCR Tools is a cross-browser extension designed to enhance the efficiency and usability of Leader and Clerk Resources (LCR) for local clerks, secretaries, and presidencies. It provides powerful client-side tools for data analysis, attendance recording, member information management, and travel planning—streamlining repetitive administrative burdens so leaders can focus on ministering.

Updated for the 2026 React (Eden) UI Overhaul! This extension has been modernized to provide seamless, high-performance support for the latest LCR interface updates.

Key Features:
- Effortless Attendance: Enter Sunday attendance via CSV or formatted roster. Automatically matches member names, handles pagination, and routes visitors to proper organization buckets.
- Trip Planning: Plan ministering routes and visits for newly moved-in families. Prefers Church Directory household coordinates and only geocodes unmatched addresses.
- Advanced Report Export: Download table data directly into clean CSV format for authorized spreadsheet tasks. Includes formula-injection protection and multi-table ZIP archiving.
- Synchronized Table Filters: Apply powerful column-based search, date filters, and calling status toggles across multi-table pages simultaneously.
- Name & Face Flashcards: Learn names and faces with interactive study flashcards. Honors member photo privacy opt-outs and automatically manages short-lived local caches.
- Ward Boundary Audit: Instantly detect households located outside official unit boundaries using geometric point-in-polygon analysis.
- Multiple Callings Finder: Audit unit records to find members holding duplicate callings or discover unfilled assignments.
- Missing Photo Tracker: Identify members lacking directory photos to coordinate portrait sessions.

Data Privacy & Security:
- 100% Client-Side: All processing occurs entirely within your local browser. Zero data is transmitted to external servers or cloud databases.
- Calling-Gated: Only operates on official Church pages where you are already signed in with authorized access.
- Zero Tracking: No telemetry, no user tracking, and no credential collection.

Please report issues, suggestions, or feedback to seth@brockefni.com.`;

const FOOTER_TEXT = `---
Note: This tool is an independent open-source project and is not an official application of The Church of Jesus Christ of Latter-day Saints.`;

async function queryOllama(prompt) {
  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-coder:7b',
        prompt,
        stream: false,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.response;
  } catch {
    return null;
  }
}

function queryAgy(prompt) {
  try {
    const escaped = prompt.replace(/"/g, '\\"');
    return execSync(`agy -p "${escaped}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

function getRecentCommits() {
  try {
    let lastTag = '';
    try {
      lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null', {
        encoding: 'utf8',
      }).trim();
    } catch {
      lastTag = 'HEAD~5';
    }
    const range = lastTag ? `${lastTag}..HEAD` : 'HEAD~5..HEAD';
    const log = execSync(`git log ${range} --oneline`, {
      encoding: 'utf8',
    }).trim();
    return log || execSync('git log -n 5 --oneline', { encoding: 'utf8' }).trim();
  } catch {
    return '';
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

  console.log('🤖 Attempting AI generation via local Ollama (qwen2.5-coder:7b)...');
  let aiOutput = await queryOllama(prompt);

  if (!aiOutput) {
    console.log("⚠️  Ollama unavailable, attempting via 'agy' CLI...");
    aiOutput = queryAgy(prompt);
  }

  if (aiOutput) {
    const lines = aiOutput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('-') || l.startsWith('*'))
      .map((l) => l.replace(/^[-*]\s*/, ''));
    if (lines.length > 0) return lines;
  }

  console.log('ℹ️  Falling back to direct git commit messages...');
  return commits
    .split('\n')
    .slice(0, 5)
    .map((line) => {
      const msg = line.replace(/^[a-f0-9]+\s+/, '');
      return `Update: ${msg}`;
    });
}

async function main() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'));
  const currentVersion = pkg.version;

  let changelog = {};
  if (fs.existsSync(CHANGELOG_PATH)) {
    changelog = JSON.parse(fs.readFileSync(CHANGELOG_PATH, 'utf8'));
  }

  // Check if current version already has notes
  if (!changelog[currentVersion] || changelog[currentVersion].length === 0) {
    console.log(`📝 Generating new release notes for v${currentVersion}...`);
    const newNotes = await generateNotesForVersion(currentVersion);
    changelog[currentVersion] = newNotes;
    fs.writeFileSync(CHANGELOG_PATH, JSON.stringify(changelog, null, 2) + '\n');
    console.log(`✅ Saved new notes to changelog.json\n`);
  } else {
    console.log(`ℹ️  Found existing notes for v${currentVersion} in changelog.json`);
  }

  // Pick top 3 versions
  const allVersions = Object.keys(changelog);
  allVersions.sort((a, b) => {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pb[i] || 0) !== (pa[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
    }
    return 0;
  });

  const last3Versions = allVersions.slice(0, 3);
  console.log(`📌 Selected last 3 versions: ${last3Versions.join(', ')}`);

  let updatesSection = 'Recent Updates:\n';
  last3Versions.forEach((v) => {
    updatesSection += `(${v})\n`;
    const notes = changelog[v] || [];
    notes.forEach((bullet) => {
      updatesSection += `- ${bullet}\n`;
    });
    updatesSection += '\n';
  });
  updatesSection = updatesSection.trim();

  // Full Store Description
  const fullDescription = `${HEADER_TEXT}\n\n${updatesSection}\n\n${FOOTER_TEXT}`;

  // Update CHROMEWEBSTORE.md
  if (fs.existsSync(STORE_DOC_PATH)) {
    let storeDoc = fs.readFileSync(STORE_DOC_PATH, 'utf8');
    const codeBlockRegex = /```text[\s\S]*?```/;
    if (codeBlockRegex.test(storeDoc)) {
      storeDoc = storeDoc.replace(codeBlockRegex, `\`\`\`text\n${fullDescription}\n\`\`\``);
      fs.writeFileSync(STORE_DOC_PATH, storeDoc);
      console.log(`✅ Updated ${STORE_DOC_PATH}`);
    }
  }

  // Copy to macOS clipboard if pbcopy is available
  try {
    execSync('pbcopy', { input: fullDescription });
    console.log('📋 Copied full description to clipboard (Ready to Cmd+V in Developer Dashboard)!');
  } catch {
    // pbcopy not available (e.g. Linux / headless CI)
  }

  console.log('\n=================== STORE DESCRIPTION PREVIEW ===================');
  console.log(fullDescription);
  console.log('=================================================================\n');
}

main().catch((err) => {
  console.error('Error generating store description:', err);
  process.exit(1);
});
