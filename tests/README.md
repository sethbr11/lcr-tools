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

## Test Structure

- `setup.js` - Jest configuration and Chrome API mocking
- `popup.test.js` - Tests for popup functionality and script injection
- `actions.test.js` - Tests for URL pattern matching and action logic
- `utils.test.js` - Tests for utility functions

## Chrome API Mocking

The setup uses a custom mock built with `sinon` to mock Chrome extension APIs. Note that all LCR sites are password-protected, so tests use mock data rather than actual site interactions.

- `chrome.runtime` - Extension info and error handling
- `chrome.tabs` - Tab management and querying
- `chrome.scripting` - Content script injection (Manifest V3)

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

## Coverage

Tests cover:

- Popup UI functionality and script injection
- URL pattern matching for LCR sites
- Action determination logic
- Chrome API interactions (tabs, scripting)
- Utility function logic
- Error handling scenarios
- Edge cases and validation

Run `npm run test:coverage` to see detailed coverage reports.
