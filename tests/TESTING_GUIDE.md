# LCR Tools Extension - Testing Guide

## 📚 Table of Contents

1. [Overview](#overview)
2. [Quick Start & Test Commands](#quick-start--test-commands)
3. [Test Architecture & Environment](#test-architecture--environment)
4. [Test Patterns & Best Practices](#test-patterns--best-practices)
5. [Critical Mandate: Zero PII in Fixtures](#critical-mandate-zero-pii-in-fixtures)
6. [CI/CD Integration](#cicd-integration)

---

## Overview

This repository uses **Vitest** with **JSDOM** and **@testing-library/dom** for fast, native TypeScript testing.
All tests enforce strict architectural guidelines defined in [AGENTS.md](../AGENTS.md):

- **Zero-`any` Policy**: Every mock, return value, and helper must be explicitly typed.
- **Strict 400-Line Limit**: No test file may exceed 400 lines.
- **Complete Synthetic Isolation**: 100% synthetic test data with zero real member records.

---

## Quick Start & Test Commands

```bash
# Run all unit and functional test suites once
npm test

# Run tests in watch mode for development
npm run test:watch

# Run tests with V8 coverage report
npm run test:coverage

# Run specific test file by name or pattern
npm test tests/actions/membersOutsideBoundary.test.ts
npm test -- tripPlanning
```

### Coverage Reports

Coverage outputs are generated in:

- `coverage/index.html` - Interactive HTML coverage visualization.
- `coverage/lcov.info` - LCOV report for CI analysis.

---

## Test Architecture & Environment

### Global Mocks (`tests/setup.ts`)

`tests/setup.ts` initializes the JSDOM test environment before each test suite:

- **`browser` & `chrome` Extension APIs**: Mocks `browser.storage.local`, `browser.runtime`, `browser.tabs`, and `browser.scripting`.
- **Canvas Context & DOM**: Polyfills in-memory canvas contexts and visual styles needed for Leaflet or image scans.
- **Fetch & Network**: Mockable globally with `vi.stubGlobal('fetch', ...)`.

---

## Test Patterns & Best Practices

### 1. Mocking Extension Storage

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { browser } from 'wxt/browser';

describe('Storage-Dependent Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists preferences correctly', async () => {
    await browser.storage.local.set({ myKey: 'value' });
    const stored = await browser.storage.local.get('myKey');
    expect(stored.myKey).toBe('value');
  });
});
```

### 2. Testing DOM Table Extraction

```typescript
beforeEach(() => {
  document.body.innerHTML = `
    <table id="lcr-table">
      <thead>
        <tr><th>Name</th><th>Address</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Smith, John</td>
          <td>123 Synthetic Way</td>
        </tr>
      </tbody>
    </table>
  `;
});
```

### 3. Testing Async Modal Dialogs

```typescript
it('resolves confirmation dialog choice', async () => {
  const promise = showConfirmationModal({
    title: 'Confirm Export',
    message: 'Proceed with download?',
  });

  const confirmBtn = document.querySelector<HTMLButtonElement>('.modal-confirm-btn');
  confirmBtn?.click();

  const result = await promise;
  expect(result).toBe(true);
});
```

---

## Critical Mandate: Zero PII in Fixtures

> ### ⚠️ STRICT ENFORCEMENT
>
> Every name, address, phone number, email address, member ID, unit number, calling, photo, and scrap of Church or member data used in source code, mock fixtures, tests, comments, or documentation **MUST BE 100% SYNTHETIC**.

- ✅ Allowed: `"Smith, John"`, `"Doe, Jane"`, `"123 Synthetic Ave"`, `"555-0101"`, `"unit-99999"`
- ❌ Prohibited: Real member names, real leader names, real unit numbers, or live session tokens.

---

## CI/CD Integration

Tests run automatically on pull requests and pushes to `main` via `.github/workflows/tests.yml` and `.github/workflows/release.yml`.
Run `npm run test:ci` before committing to ensure tests, types, and formatting pass.
