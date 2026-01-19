# LCR Tools Extension - Testing Guide

## 📚 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Running Tests](#running-tests)
4. [Test Coverage](#test-coverage)
5. [Writing New Tests](#writing-new-tests)
6. [Test Patterns & Best Practices](#test-patterns--best-practices)
7. [Troubleshooting](#troubleshooting)
8. [CI/CD Integration](#cicd-integration)

---

## Overview

This extension uses **Jest** with **jsdom** for testing. We test:

- ✅ Core utility functions (`dataUtils`, `fileUtils`, `utils`)
- ✅ UI components (`uiUtils`, `modalUtils`)
- ✅ Complex Actions (`membersOutsideBoundary`, `tripPlanning`, `processAttendance`)
- ✅ Table processing (`tableUtils`)
- ✅ Logging systems (`loggingUtils`)
- ✅ Action routing (`actions.js`)
- ✅ Popup functionality (`popup.js`)

### Current Coverage Status

- **Core Utilities**: High coverage (90%+)
- **Trip Planning**: High coverage (Logic & Math)
- **Boundary Audit**: High coverage (Canvas & Network logic)
- **UI Utils**: Good coverage (70%+)
- **Legacy Actions**: varying coverage

---

## Quick Start

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- loggingUtils

# Run tests matching a pattern
npm test -- utils
```

---

## Running Tests

### Test Commands

| Command                 | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `npm test`              | Run all tests once                             |
| `npm run test:watch`    | Run tests in watch mode                        |
| `npm run test:coverage` | Run tests with coverage report                 |
| `npm run test:ci`       | Run tests in CI mode (no watch, with coverage) |

### Running Specific Tests

```bash
# Run single test file
npm test -- tableUtils.test.js

# Run tests matching pattern
npm test -- "utils"

# Run only tests with specific description
npm test -- -t "should parse dates"

# Run tests for specific directory
npm test -- tests/actions/
```

### Test Output

Coverage reports are generated in:

- `coverage/` - HTML coverage report (open `coverage/index.html` in browser)
- `coverage/lcov.info` - LCOV format for CI tools

---

## Test Coverage

### Viewing Coverage

**HTML Report (Recommended):**

```bash
npm run test:coverage
open coverage/index.html  # macOS
# or
xdg-open coverage/index.html  # Linux
```

**Terminal Output:**

```bash
npm run test:coverage
# Shows table with % coverage by file
```

### Coverage Goals

| Target        | Statement % | Branch % | Function % |
| ------------- | ----------- | -------- | ---------- |
| **Minimum**   | 20%         | 15%      | 20%        |
| **Good**      | 40%         | 30%      | 40%        |
| **Excellent** | 60%+        | 50%+     | 60%+       |

**Note:** Don't aim for 100% - diminishing returns after 60-70%!

---

## Writing New Tests

### Test File Structure

Create test files in `tests/` directory:

```javascript
/**
 * Tests for myUtility.js - description
 */

describe("My Utility", () => {
  beforeEach(() => {
    // Reset window variables
    if (window.myUtility) delete window.myUtility;
    if (window.utils) delete window.utils;

    // Mock utils
    window.utils = {
      returnIfLoaded: jest.fn(() => false),
      ensureLoaded: jest.fn(),
      safeCall: jest.fn((name, cb, fallback) => {
        if (window[name]) return cb(window[name]);
        return fallback;
      }),
    };

    // Load the real file
    jest.resetModules();
    require("../js/utils/myUtility.js");
  });

  describe("Feature Name", () => {
    it("should do something specific", () => {
      const result = window.myUtility.someFunction("input");
      expect(result).toBe("expected output");
    });
  });
});
```

### Key Patterns

#### 1. **Loading Real Files (Gets Actual Coverage)**

```javascript
beforeEach(() => {
  // Always reset modules
  jest.resetModules();

  // Mock utils.returnIfLoaded to return false (allow loading)
  window.utils = {
    returnIfLoaded: jest.fn(() => false),
  };

  // Load the real file
  require("../js/utils/myUtility.js");
});
```

#### 2. **Testing DOM Manipulation**

```javascript
beforeEach(() => {
  // Setup realistic HTML
  document.body.innerHTML = `
    <table id="test-table">
      <thead>
        <tr><th>Name</th><th>Age</th></tr>
      </thead>
      <tbody>
        <tr><td>John Doe</td><td>30</td></tr>
      </tbody>
    </table>
  `;

  // Restore real DOM methods (setup.js mocks them)
  document.querySelector = Document.prototype.querySelector;
  document.querySelectorAll = Document.prototype.querySelectorAll;
});
```

#### 3. **Testing Async Functions**

```javascript
it("should handle async operations", async () => {
  const result = await window.myUtility.asyncFunction();
  expect(result).toBeDefined();
});

// Or with callbacks
it("should handle callbacks", (done) => {
  window.myUtility.callbackFunction((result) => {
    expect(result).toBe("success");
    done();
  });
});
```

#### 4. **Mocking Canvas & Images (Advanced)**

For tests like `membersOutsideBoundary`, you need to mock the Canvas API and Image loading:

```javascript
// Mock Canvas Context
const mockContext = {
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({ data: [0, 0, 0, 255] })),
};
HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext);

// Mock Image Loading
global.Image = class {
  constructor() {
    setTimeout(() => { if (this.onload) this.onload(); }, 10);
  }
};
```

---

## Test Patterns & Best Practices

### ✅ DO's

1. **Test Real Files for Coverage**
2. **Use Realistic HTML**
3. **Test Edge Cases**
4. **Use Descriptive Test Names**

### ❌ DON'Ts

1. **Don't Replicate Functions**
2. **Don't Test Implementation Details**
3. **Don't Make Tests Depend on Each Other**

---

## CI/CD Integration

### GitHub Actions

Tests run automatically on:

- Push to `main` or `develop`
- Pull requests to `main` or `develop`

See `.github/workflows/tests.yml` for configuration.

### Local CI Testing

```bash
# Run tests exactly as CI does
npm run test:ci
```