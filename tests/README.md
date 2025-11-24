# Testing Setup for LCR Tools Extension

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Run tests:

```bash
npm test
```

3. Run tests in watch mode:

```bash
npm run test:watch
```

4. Generate coverage report:

```bash
npm run test:coverage
```

## Test Directory Structure

Tests are organized to mirror the source code structure:

```
tests/
├── setup.js                    # Jest configuration and global mocks
├── README.md                   # This file
├── actions/                    # Action-related tests
│   ├── actions.test.js         # URL pattern matching and action logic
│   ├── actions.real.test.js    # Integration tests for actions
│   └── tripPlanning/           # Trip Planning feature tests
│       ├── tripUtils.test.js           # 31 tests - State management
│       ├── tripMap.test.js             # 30 tests - Leaflet map integration
│       ├── tripExport.test.js          # 11 tests - CSV/PDF export
│       ├── tripGeocoding.test.js       # 23 tests - Address geocoding
│       ├── tripClustering.test.js      # 30 tests - K-means clustering
│       └── tripRouting.test.js         # 33 tests - TSP optimization
├── utils/                      # Utility function tests
│   ├── dataUtils.test.js       # Data processing utilities
│   ├── fileUtils.test.js       # File download and ZIP generation
│   ├── loggingUtils.test.js    # Logging functionality
│   ├── modalUtils.test.js      # 19 tests - Modal UI components
│   ├── navigationUtils.test.js # 10 tests - URL navigation
│   ├── tableUtils.test.js      # Table manipulation
│   ├── uiUtils.test.js         # UI helper functions
│   ├── utils.test.js           # Core utility functions
│   └── utils.core.test.js      # Additional utility tests
└── ui/                         # UI component tests
    ├── directory.test.js       # 19 tests - Directory page
    ├── popup.test.js           # Popup functionality
    └── popup.real.test.js      # Popup integration tests
```

## Test Coverage Summary

**Total**: 439 tests passing (1 skipped) across 20 test suites

### By Category
- **Trip Planning**: 158 tests (6 modules)
- **Utilities**: ~150 tests (9 modules)
- **UI Components**: ~50 tests (3 modules)
- **Actions**: ~80 tests (2 modules)

## Chrome API Mocking

The setup uses a custom mock built with `sinon` to mock Chrome extension APIs. Note that all LCR sites are password-protected, so tests use mock data rather than actual site interactions.

- `chrome.runtime` - Extension info and error handling
- `chrome.tabs` - Tab management and querying
- `chrome.scripting` - Content script injection (Manifest V3)

Global mocks in `setup.js`:
- `window.alert`, `window.confirm`, `window.prompt` - Dialog methods
- `localStorage` - Browser storage
- `fetch` - Network requests
- `console` methods - Logging (to reduce test noise)

## Writing Tests

### Testing Chrome APIs

```javascript
// Mock Chrome API calls
chrome.runtime.sendMessage.resolves({ success: true });

// Verify calls were made
expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expectedMessage);
```

### Testing Async Functions

```javascript
test("should handle async operations", async () => {
  chrome.storage.local.get.resolves({ data: "value" });

  const result = await someAsyncFunction();
  expect(result).toBe("expected");
});
```

### Testing DOM Manipulation

```javascript
test("should manipulate DOM", () => {
  document.querySelector.mockReturnValue(mockElement);

  // Test your DOM code
  expect(document.querySelector).toHaveBeenCalledWith(".selector");
});
```

### Testing Trip Planning Modules

Trip Planning modules are wrapped in IIFEs and exposed via `window.tripX`:

```javascript
// Access exposed functions
const result = await window.tripGeocoding.geocodeAddressMulti(address, provider, apiKey);

// Mock external dependencies
global.turf = {
  distance: jest.fn(() => 1.5),
  point: jest.fn((coords) => ({ geometry: { coordinates: coords } }))
};

global.fetch = jest.fn(() => Promise.resolve({
  json: () => Promise.resolve({ /* mock response */ })
}));
```

## Best Practices

1. **Test Isolation**: Each test should be independent. Use `beforeEach` to reset state.
2. **Mock External Dependencies**: Mock APIs, file system, and browser APIs.
3. **Test Edge Cases**: Empty arrays, null values, invalid input, etc.
4. **Descriptive Test Names**: Use "should..." format for clarity.
5. **Arrange-Act-Assert**: Structure tests clearly with setup, execution, and verification.

## Running Specific Tests

```bash
# Run a specific test file
npm test tripGeocoding.test.js

# Run tests in a specific directory
npm test tests/actions/tripPlanning

# Run tests matching a pattern
npm test -- --testNamePattern="geocoding"
```

## Coverage Goals

- **Unit Tests**: All business logic and utility functions
- **Integration Tests**: Key workflows (geocoding → clustering → routing → export)
- **Edge Cases**: Error handling, empty data, invalid input

Current coverage is comprehensive for all core functionality. E2E testing could be added for UI workflows if needed.
