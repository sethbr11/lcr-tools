# Testing Setup for LCR Tools Extension

This directory contains the automated test suite for the LCR Tools extension. The tests use **Jest** and **jsdom** to simulate the browser environment and verify the functionality of utilities, UI components, and complex actions.

## 🚀 Quick Start

### Common Commands

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run a specific test file
npm test -- membersOutsideBoundary

# Run tests matching a pattern
npm test -- -t "triggerAudit"
```

## 📂 Test Directory Structure

The `tests/` directory mirrors the source code structure (`js/`):

```
tests/
├── setup.js                        # Global Jest configuration and mocks (Chrome API, DOM)
├── README.md                       # This file
├── TESTING_GUIDE.md                # Detailed guide on writing and debugging tests
├── actions/                        # Action-specific tests
│   ├── membersOutsideBoundary/     # Boundary Audit tests
│   │   └── membersOutsideBoundaryUtils.test.js # Canvas geometry & network interception
│   ├── processAttendance/          # Attendance processing tests
│   │   └── attendanceUtils.test.js # CSV parsing & logic
│   ├── tripPlanning/               # Trip Planning feature tests
│   │   ├── tripClustering.test.js
│   │   ├── tripExport.test.js
│   │   ├── tripGeocoding.test.js
│   │   ├── tripMap.test.js
│   │   ├── tripRouting.test.js
│   │   └── tripUtils.test.js
│   ├── actions.test.js             # URL pattern matching
│   └── actions.real.test.js        # Integration tests
├── ui/                             # UI Component tests
│   ├── directory.test.js
│   ├── popup.test.js
│   └── popup.real.test.js
└── utils/                          # Core Utility tests
    ├── dataUtils.test.js
    ├── fileUtils.test.js
    ├── loggingUtils.test.js
    ├── modalUtils.test.js
    ├── navigationUtils.test.js
    ├── tableUtils.test.js
    ├── uiUtils.test.js
    ├── utils.core.test.js
    └── utils.test.js
```

## 📊 Test Coverage Summary

**Total**: ~450+ tests passing across 20+ test suites.

### Key Areas Covered
- **Core Utilities**: `utils.js`, `loggingUtils.js` (High coverage)
- **Feature Actions**:
    - **Trip Planning**: Comprehensive coverage of routing, mapping, and export.
    - **Boundary Audit**: Canvas geometry, network interception, and UI flows.
    - **Attendance**: CSV parsing and validation.
- **UI Components**: Loading indicators, modals, and popup interactions.

## 🛠 Testing Strategy

### 1. Unit Tests
Target core utility functions and isolated business logic.
- **Framework**: Jest
- **Location**: `tests/utils/*.test.js`

### 2. Integration Tests
Target component interactions, DOM manipulation, and complex workflows.
- **Location**: `tests/actions/*.test.js`, `tests/ui/*.test.js`

### 3. Chrome API Mocking
We use a custom mock setup in `setup.js` to simulate the Chrome Extension API (`chrome.runtime`, `chrome.tabs`, `chrome.scripting`, etc.). This allows us to test extension logic without running in a real browser.

### 4. DOM Simulation
**jsdom** is used to simulate the DOM. Tests can create mock HTML structures (tables, modals, inputs) and assert on their state changes.
- **Special Case**: `membersOutsideBoundary` tests mock the HTML5 Canvas API and `Image` loading to test geometric analysis logic.

## 📝 Writing Tests

For a detailed guide on how to write tests, including patterns for async code, DOM manipulation, and mocking, please refer to [TESTING_GUIDE.md](TESTING_GUIDE.md).

### Quick Template

```javascript
/**
 * Tests for myFeature.js
 */
describe("My Feature", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset global state if needed
  });

  test("should perform expected action", () => {
    // Arrange
    document.body.innerHTML = '<div id="target"></div>';
    
    // Act
    window.myFeature.doSomething();
    
    // Assert
    expect(document.getElementById("target").textContent).toBe("Done");
  });
});
```

## 🔄 CI/CD

Tests are automatically run via GitHub Actions on every push and pull request to `main` or `develop`. See `.github/workflows/tests.yml` for configuration.