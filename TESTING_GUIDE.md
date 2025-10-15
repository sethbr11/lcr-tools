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

- ✅ Core utility functions (dataUtils, fileUtils, utils)
- ✅ UI components (uiUtils, modalUtils)
- ✅ Table processing (tableUtils)
- ✅ Logging systems (loggingUtils)
- ✅ Action routing (actions.js)
- ✅ Popup functionality (popup.js)

### Current Coverage (as of last run)

```
Overall Coverage: ~12-15%
js/utils/:        25.55%
  - utils.js:         93.10% ⭐⭐⭐⭐⭐
  - loggingUtils.js:  95.45% ⭐⭐⭐⭐⭐
  - uiUtils.js:       73.22% ⭐⭐⭐⭐
  - fileUtils.js:     46.47% ⭐⭐⭐
  - dataUtils.js:     30.59% ⭐⭐⭐
  - tableUtils.js:    22.71% ⭐⭐
```

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
npm test -- __tests__/actions/
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

Create test files in `__tests__/` directory:

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

#### 4. **Mocking Chrome APIs**

```javascript
// Chrome APIs are already mocked in setup.js
it("should use Chrome tabs API", () => {
  chrome.tabs.query.callsArgWith(1, [{ id: 123, url: "https://test.com" }]);

  // Your code that uses chrome.tabs.query

  expect(chrome.tabs.query.called).toBe(true);
});
```

---

## Test Patterns & Best Practices

### ✅ DO's

1. **Test Real Files for Coverage**

   ```javascript
   // ✅ Good - loads real file
   require("../js/utils/dataUtils.js");
   const result = window.dataUtils.formatDate(date);
   ```

2. **Use Realistic HTML**

   ```javascript
   // ✅ Good - realistic LCR structure
   document.body.innerHTML = `
     <table class="data-table">
       <thead><tr><th>Name</th></tr></thead>
       <tbody><tr><td>John Doe</td></tr></tbody>
     </table>
   `;
   ```

3. **Test Edge Cases**

   ```javascript
   // ✅ Good - tests boundary conditions
   expect(parseDate(null)).toBe(null);
   expect(parseDate("")).toBe(null);
   expect(parseDate("invalid")).toBe(null);
   ```

4. **Use Descriptive Test Names**

   ```javascript
   // ✅ Good
   it("should parse MM/DD/YYYY format dates correctly", () => {

   // ❌ Bad
   it("should work", () => {
   ```

### ❌ DON'Ts

1. **Don't Replicate Functions**

   ```javascript
   // ❌ Bad - replicates instead of testing real code
   const formatDate = (date) => {
     /* copied implementation */
   };
   expect(formatDate(date)).toBe("01/15/2024");
   ```

2. **Don't Test Implementation Details**

   ```javascript
   // ❌ Bad - tests internal implementation
   expect(internalHelperFunction()).toBe(true);

   // ✅ Good - tests public API
   expect(window.utils.publicFunction()).toBe(true);
   ```

3. **Don't Make Tests Depend on Each Other**

   ```javascript
   // ❌ Bad
   let sharedState;
   it("first test", () => {
     sharedState = "value";
   });
   it("second test", () => {
     expect(sharedState).toBe("value");
   });

   // ✅ Good - each test is independent
   beforeEach(() => {
     sharedState = "value";
   });
   ```

---

## Common Testing Scenarios

### Testing Table Processing

```javascript
it("should extract data from LCR member table", () => {
  document.body.innerHTML = `
    <table id="members" class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Birth Date</th>
          <th>Email</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><a href="/member/1">Smith, John</a></td>
          <td>15 Jan 1990</td>
          <td>john.smith@email.com</td>
        </tr>
      </tbody>
    </table>
  `;

  const result = window.tableUtils.tableToCSV(
    "members",
    "Members",
    "data-table"
  );

  if (result) {
    expect(result.csvContent).toContain("Name");
    expect(result.csvContent).toContain("Smith, John");
  }
});
```

### Testing Date Parsing

```javascript
describe("parseLCRDate", () => {
  const testCases = [
    { input: "01/15/2024", expected: { month: 0, day: 15, year: 2024 } },
    { input: "15 Jan 2024", expected: { month: 0, day: 15, year: 2024 } },
    { input: "Jan 15, 2024", expected: { month: 0, day: 15, year: 2024 } },
  ];

  testCases.forEach(({ input, expected }) => {
    it(`should parse "${input}"`, () => {
      const result = window.dataUtils.parseLCRDate(input);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(expected.year);
      expect(result.getMonth()).toBe(expected.month);
      expect(result.getDate()).toBe(expected.day);
    });
  });
});
```

### Testing File Downloads

```javascript
it("should download CSV file", () => {
  // Mock DOM elements
  const mockLink = {
    href: "",
    download: "",
    click: jest.fn(),
  };

  document.createElement = jest.fn(() => mockLink);

  window.fileUtils.downloadCsv("Name,Age\nJohn,30", "test.csv");

  expect(mockLink.download).toBe("test.csv");
  expect(mockLink.click).toHaveBeenCalled();
});
```

### Testing Chrome APIs

```javascript
it("should query active tab", (done) => {
  chrome.tabs.query.callsArgWith(1, [{ id: 123, url: "https://test.com" }]);

  chrome.tabs.query({ active: true }, (tabs) => {
    expect(tabs.length).toBe(1);
    expect(tabs[0].id).toBe(123);
    done();
  });
});
```

---

## Troubleshooting

### Common Issues

#### Issue: "Cannot read property 'X' of undefined"

**Cause:** File not loaded or dependency missing

**Solution:**

```javascript
// Make sure to load dependencies
beforeEach(() => {
  window.utils = { returnIfLoaded: jest.fn(() => false) };
  require("../js/utils/utils.js"); // Load dependency first
  require("../js/utils/myFile.js"); // Then your file
});
```

#### Issue: "document.querySelector is not a function"

**Cause:** setup.js mocks querySelector

**Solution:**

```javascript
beforeEach(() => {
  // Restore real DOM methods
  document.querySelector = Document.prototype.querySelector;
  document.querySelectorAll = Document.prototype.querySelectorAll;
});
```

#### Issue: Tests timeout or hang

**Cause:** Async operations not completing

**Solution:**

```javascript
// Use done() callback
it("should complete", (done) => {
  setTimeout(() => {
    expect(true).toBe(true);
    done();
  }, 100);
});

// Or increase timeout
it("should complete", async () => {
  // test code
}, 10000); // 10 second timeout
```

#### Issue: "Module not found" or require errors

**Cause:** Incorrect path or module not loading

**Solution:**

```javascript
// Use correct relative path
require("../js/utils/utils.js"); // ✅ Good
require("js/utils/utils.js"); // ❌ Bad (wrong path)

// Clear module cache
jest.resetModules();
require("../js/utils/utils.js");
```

### Debugging Tests

```bash
# Run single test with verbose output
npm test -- myTest --verbose

# Run with node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# See which tests are running
npm test -- --listTests

# Run only failed tests
npm test -- --onlyFailures
```

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

This runs:

- All tests in CI mode (no watch)
- With coverage report
- Exits with error code if tests fail

---

## Best Practices Summary

### 1. **Always Load Real Files**

```javascript
// ✅ Do this
require("../js/utils/dataUtils.js");
const result = window.dataUtils.formatDate(date);

// ❌ Not this (replicates code, no coverage)
const formatDate = (date) => {
  /* copy of function */
};
```

### 2. **Use Realistic Test Data**

```javascript
// ✅ Real LCR HTML structures
document.body.innerHTML = `
  <table class="data-table">
    <tbody>
      <tr><td><a href="/member/123">Smith, John</a></td></tr>
    </tbody>
  </table>
`;
```

### 3. **Test Boundary Conditions**

```javascript
// Test: normal cases, edge cases, error cases
expect(parseDate("01/15/2024")).toBeInstanceOf(Date); // Normal
expect(parseDate("")).toBe(null); // Edge
expect(parseDate(null)).toBe(null); // Error
expect(parseDate("invalid")).toBe(null); // Error
```

### 4. **Keep Tests Independent**

```javascript
// Each test should work in isolation
beforeEach(() => {
  // Reset state for every test
  document.body.innerHTML = "";
  jest.resetModules();
});
```

### 5. **Use Descriptive Names**

```javascript
// ✅ Good
it("should parse MM/DD/YYYY format dates", () => {});
it("should return null for invalid date strings", () => {});

// ❌ Bad
it("works", () => {});
it("test1", () => {});
```

---

## Advanced Topics

### Testing Files with IIFEs

Most utility files use IIFEs (Immediately Invoked Function Expressions):

```javascript
(() => {
  utils.returnIfLoaded("myUtils");
  // ... code
  window.myUtils = {
    /* exports */
  };
})();
```

To test these:

```javascript
beforeEach(() => {
  // Mock utils.returnIfLoaded to NOT prevent loading
  window.utils = {
    returnIfLoaded: jest.fn(() => false), // Return false = not loaded yet
  };

  // Now load the file
  require("../js/utils/myUtils.js");

  // window.myUtils is now available
  expect(window.myUtils).toBeDefined();
});
```

### Testing DOM-Heavy Files

Files like `uiUtils.js` and `tableUtils.js` need DOM setup:

```javascript
describe("DOM Heavy Tests", () => {
  let originalQuerySelector;

  beforeEach(() => {
    // Save original (setup.js mocks it)
    originalQuerySelector = document.querySelector;

    // Restore real DOM method
    document.querySelector = Document.prototype.querySelector;

    // Setup HTML
    document.body.innerHTML = `<div id="test">Content</div>`;

    // Load file
    require("../js/utils/myFile.js");
  });

  afterEach(() => {
    // Restore mock
    document.querySelector = originalQuerySelector;
  });
});
```

### Mocking Dependencies

```javascript
beforeEach(() => {
  // Mock fileUtils
  window.fileUtils = {
    downloadCsv: jest.fn(),
    formatCsvCell: jest.fn((v) => String(v)),
  };

  // Mock utils.safeCall to use mocked fileUtils
  window.utils = {
    returnIfLoaded: jest.fn(() => false),
    safeCall: jest.fn((name, callback, fallback) => {
      if (window[name]) return callback(window[name]);
      return fallback;
    }),
  };
});
```

---

## Expanding Test Coverage

### Priority Order for New Tests

**Quick Wins (High ROI):**

1. ✅ popup.js - Entry point (0% → 60-70%)
2. ✅ actions.js - Routing logic (0% → 60-70%)
3. ⚠️ modalUtils.js - Modal management (0% → 30-40%)
4. ⚠️ navigationUtils.js - Page navigation (0% → 25-35%)

**Medium Priority:** 5. Action utilities (downloadUtils, filterUtils, etc.) 6. Deeper coverage in existing files

**Lower Priority:** 7. Complex action utilities (attendanceUtils - 1817 lines!) 8. Template files (mostly static HTML strings)

### Adding Tests to Existing Files

To increase coverage in files like `dataUtils.js` (currently 30%):

1. Check coverage report: `open coverage/index.html`
2. Find uncovered lines (shown in red)
3. Add tests for those specific functions

```javascript
// Example: Adding fuzzyNameMatch tests
describe("fuzzyNameMatch", () => {
  it("should match similar names", () => {
    const result = window.dataUtils.fuzzyNameMatch(
      { firstName: "john", lastName: "smith" },
      { firstName: "jon", lastName: "smith" }
    );
    expect(result).toBe(true);
  });
});
```

---

## Example: Complete Test File

Here's a complete example following all best practices:

```javascript
/**
 * Tests for exampleUtils.js - Example utility functions
 */

describe("Example Utilities", () => {
  let originalQuerySelector;

  beforeEach(() => {
    // Save original if setup.js mocked it
    originalQuerySelector = document.querySelector;
    document.querySelector = Document.prototype.querySelector;

    // Setup DOM
    document.body.innerHTML = "";

    // Reset window variables
    if (window.exampleUtils) delete window.exampleUtils;
    if (window.utils) delete window.utils;

    // Mock dependencies
    window.utils = {
      returnIfLoaded: jest.fn(() => false),
      ensureLoaded: jest.fn(),
      safeCall: jest.fn((name, cb, fallback) => {
        if (window[name]) return cb(window[name]);
        return fallback;
      }),
    };

    // Load real file
    jest.resetModules();
    require("../js/utils/exampleUtils.js");
  });

  afterEach(() => {
    // Restore mocks
    document.querySelector = originalQuerySelector;
  });

  describe("parseData", () => {
    it("should parse valid data", () => {
      const result = window.exampleUtils.parseData("test");
      expect(result).toBeDefined();
    });

    it("should return null for invalid data", () => {
      expect(window.exampleUtils.parseData(null)).toBe(null);
      expect(window.exampleUtils.parseData("")).toBe(null);
    });
  });

  describe("processTable", () => {
    it("should process realistic table HTML", () => {
      document.body.innerHTML = `
        <table id="test">
          <thead><tr><th>Name</th></tr></thead>
          <tbody><tr><td>John</td></tr></tbody>
        </table>
      `;

      const result = window.exampleUtils.processTable("test");
      expect(result).toBeDefined();
    });
  });
});
```

---

## Next Steps

### To Reach 20% Overall Coverage

1. **Improve existing utils coverage:**
   - Add more dataUtils tests (currently 30% → target 60%)
   - Add more tableUtils tests (currently 22% → target 40%)
2. **Test remaining utils:**

   - modalUtils.js (~20-25 tests needed)
   - navigationUtils.js (~15-20 tests needed)

3. **Monitor coverage trends:**
   ```bash
   npm run test:coverage
   # Check if numbers are improving
   ```

### To Reach 40% Overall Coverage

1. Test action utilities (downloadUtils, filterUtils, etc.)
2. Test main.js files for each action
3. Add integration tests for complete workflows

### Maintenance

- Run tests before committing: `npm test`
- Check coverage regularly: `npm run test:coverage`
- Add tests when adding new features
- Update tests when refactoring code

---

## Resources

- **Jest Documentation:** https://jestjs.io/docs/getting-started
- **Testing Library:** https://testing-library.com/docs/
- **jsdom:** https://github.com/jsdom/jsdom
- **Chrome Extension Testing:** https://developer.chrome.com/docs/extensions/mv3/testing/

---

## Summary

**Current Status:**

- ✅ 180+ tests passing
- ✅ 25.55% utils coverage
- ✅ Core utilities well-tested (90%+ coverage)
- ✅ CI/CD configured and running

**Commands to Remember:**

```bash
npm test                  # Run tests
npm run test:coverage     # Check coverage
npm run test:watch        # Develop with auto-test
npm run build             # Build extension for store
```

**Files Ready for More Tests:**

- `js/utils/modalUtils.js` - 0% coverage
- `js/utils/navigationUtils.js` - 0% coverage
- `js/actions/*` - Most at 0% coverage

Happy testing! 🎉
